import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import axios from "axios";
import sharp from "sharp";
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const NOTION_TOKEN = process.env.NOTION_TOKEN as string
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID as string

if (!NOTION_TOKEN || !NOTION_DATABASE_ID){
    console.error("[!] Missing NOTION_DATABASE_ID or TOKEN in .env file");
    process.exit(1);
}

const notionClient = new Client({ auth: NOTION_TOKEN });
const notionToMarkdown = new NotionToMarkdown({ notionClient: notionClient });

// ===== 图片处理参数 =====
// 最大输出宽度:超过则缩放(不放大)
const MAX_IMAGE_WIDTH = 1600;
// PNG 超过该字节数视为"照片型",转 JPEG 压缩
const PNG_TO_JPEG_THRESHOLD = 2 * 1024 * 1024; // 2MB

async function syncPosts() {
    console.log("[+] Cleaning content and images folders.")
    const postsDir = path.join(process.cwd(), 'content/posts');
    if (fs.existsSync(postsDir)) {
        fs.rmSync(postsDir, { recursive: true, force: true });
    }
    fs.mkdirSync(postsDir, { recursive: true });

    const imagesDir = path.join(process.cwd(), 'public/images/posts');
    if (fs.existsSync(imagesDir)) {
        fs.rmSync(imagesDir, { recursive: true, force: true });
    }
    fs.mkdirSync(imagesDir, { recursive: true });

    console.log("[+] Fetching from notion database.")

    try {
        let response = await notionClient.databases.query({database_id : NOTION_DATABASE_ID})
        let posts = response.results;

        // 保护:数据库返回 0 篇文章,说明 API/权限异常。此时 content/posts 已被清空,
        // 若继续提交会把空内容推上去,导致 Netlify 构建 ENOENT。必须中止并报错。
        if (posts.length === 0) {
            console.error("[!] Notion 数据库返回 0 篇文章,疑似 API/权限问题。中止同步,防止清空线上内容。");
            process.exit(1);
        }

        for (const rawPostData of posts) {
            let postData = JSON.parse(JSON.stringify(rawPostData));

            if (!postData.properties.Published.checkbox) continue;

            // 检查是否有自定义的 id 栏位
            const customId = postData.properties.id?.rich_text?.[0]?.plain_text ||
                           postData.properties.id?.title?.[0]?.plain_text ||
                           postData.properties.ID?.rich_text?.[0]?.plain_text ||
                           postData.properties.ID?.title?.[0]?.plain_text;

            if (!customId) {
                console.error(`[!] Missing custom id field for post: ${postData.properties.Title.title[0].plain_text}`);
                continue;
            }

            // 清理档案名称，移除不允许的字符
            const safeFileName = customId.replace(/[^a-zA-Z0-9\-_]/g, '-').toLowerCase();

            let markdownBlocks = await notionToMarkdown.pageToMarkdown(postData.id);
            const processedBlocks = await Promise.all(markdownBlocks.map(block => parseMarkdownBlock(block)));
            let markdownContent = notionToMarkdown.toMarkdownString(processedBlocks).parent;

            const thumbnailUrl = postData.properties.Thumbnail.files[0].file.url;
            const localThumbnailUrl = await downloadImage(thumbnailUrl, postData.properties.Title.title[0].plain_text);

            let markdownFrontmatter = parseMarkdownFrontmatter(
                postData.properties.Title.title[0].plain_text,
                postData.properties.Description.rich_text[0].plain_text,
                localThumbnailUrl,
                postData.properties.Date.date.start,
                parsePostTags(postData.properties.Tags.multi_select)
            );

            const filePath = path.join(postsDir, `${safeFileName}.md`);
            fs.writeFileSync(filePath, markdownFrontmatter + markdownContent);

            console.log(`[+] Created post: ${filePath}`);
        }
    }
    catch(error){
        console.log("[!] Fetch from notion database failed.")
        console.error(error);
    }
}

function parseMarkdownFrontmatter(
    title: string,
    description: string,
    thumbnail: string,
    date: string,
    tags: Array<string>
): string {
    return `---
title: "${title}"
description: "${description}"
thumbnail: "${thumbnail}"
date: "${date}"
tags: ${JSON.stringify(tags)}
---
`
}

function parsePostTags(rawTags: Array<Object>): Array<string> {
    let result: Array<string> = [];
    rawTags.forEach((rawTag) => {
        result.push(
        JSON.parse(JSON.stringify(rawTag)).name
        );
    });
    return result;
}

/**
 * 下载图片并统一处理：
 * 1. HEIC(iPhone 照片)→ 转码为 JPEG,否则浏览器无法显示
 *    - 优先 sharp(unlimited 模式,绕过 libheif iloc 安全限制)
 *    - 失败时回退 ImageMagick convert(workflow 已安装)
 * 2. 超大 PNG(照片型,>2MB 或 >1600px)→ 转 JPEG 压缩
 * 3. 所有图片宽度限制在 MAX_IMAGE_WIDTH 内(不放大)
 * 4. 应用 EXIF 方向(rotate),手机竖拍图不会歪
 */
// 下载超时(毫秒)
const DOWNLOAD_TIMEOUT = 60000;
// 下载重试次数(Notion S3 偶发限流/瞬时失败)
const DOWNLOAD_RETRY = 3;
// 全局下载并发上限(56 张图同时并发极可能触发 Notion S3 限流)
const MAX_CONCURRENT_DOWNLOADS = 4;

// 简单的并发限制器(信号量)
let activeDownloads = 0;
const downloadQueue: Array<() => void> = [];

async function withDownloadLimit<T>(task: () => Promise<T>): Promise<T> {
    if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
        activeDownloads++;
        try {
            return await task();
        } finally {
            activeDownloads--;
            downloadQueue.shift()?.();
        }
    }
    return new Promise<T>((resolve, reject) => {
        downloadQueue.push(() => {
            activeDownloads++;
            task().then(resolve, reject).finally(() => {
                activeDownloads--;
                downloadQueue.shift()?.();
            });
        });
    });
}

async function downloadImage(imageUrl: string, altText: string): Promise<string> {
    return withDownloadLimit(() => downloadImageInner(imageUrl, altText));
}

async function downloadImageInner(imageUrl: string, altText: string): Promise<string> {
    try {
        const imageDir = path.join(process.cwd(), 'public/images/posts');
        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
        }

        // 下载(带重试,打印 HTTP 状态码便于排查)
        let buffer: Buffer | undefined;
        let contentType = '';
        let lastError: unknown;
        for (let attempt = 1; attempt <= DOWNLOAD_RETRY; attempt++) {
            try {
                const response = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: DOWNLOAD_TIMEOUT,
                    maxRedirects: 5,
                });
                buffer = Buffer.from(response.data);
                contentType = (response.headers['content-type'] as string) || '';
                break;
            } catch (err: any) {
                lastError = err;
                const httpStatus = err?.response?.status ? ` HTTP ${err.response.status}` : '';
                console.error(`[!] Download attempt ${attempt}/${DOWNLOAD_RETRY} failed (${altText || 'image'}): ${err?.message}${httpStatus}`);
                if (attempt < DOWNLOAD_RETRY) {
                    await new Promise(r => setTimeout(r, 3000 * attempt));
                }
            }
        }
        if (!buffer) {
            console.error(`[!] Failed to download image after ${DOWNLOAD_RETRY} attempts: ${imageUrl}`);
            console.error(lastError);
            return imageUrl;
        }

        const extFromHeader = (contentType.split(';')[0].split('/')[1] || 'jpg').toLowerCase();

        // 检测真实格式(不信任 content-type,避免 HEIC 被标成 jpeg)
        const boxType = buffer.subarray(4, 12).toString('ascii');
        const isHeic = /^ftyp(heic|heix|hevc|heim|heis|mif1|msf1)/.test(boxType);

        let ext: string;
        let outBuffer: Buffer;

        if (isHeic) {
            // HEIC → JPEG(浏览器兼容)
            console.log(`[+] HEIC detected (${altText || imageUrl}), converting to JPEG...`);
            outBuffer = await convertHeicToJpeg(buffer);
            ext = 'jpg';
        } else {
            const metadata = await sharp(buffer, { failOn: 'none' }).metadata();
            const width = metadata.width || 0;

            if (metadata.format === 'png' && (width > MAX_IMAGE_WIDTH || buffer.length > PNG_TO_JPEG_THRESHOLD)) {
                // 大 PNG(照片型)→ JPEG,大幅减小体积
                console.log(`[+] Large PNG (${(buffer.length / 1024 / 1024).toFixed(1)}MB) detected, converting to JPEG...`);
                outBuffer = await sharp(buffer, { failOn: 'none' })
                    .rotate()
                    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
                    .jpeg({ quality: 82, mozjpeg: true })
                    .toBuffer();
                ext = 'jpg';
            } else if (width > MAX_IMAGE_WIDTH) {
                // 普通大图 → 仅缩放
                outBuffer = await sharp(buffer, { failOn: 'none' })
                    .rotate()
                    .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
                    .toBuffer();
                ext = extFromHeader === 'jpeg' ? 'jpg' : extFromHeader;
            } else {
                // 小图 → 保留原格式,仅应用方向
                outBuffer = await sharp(buffer, { failOn: 'none' }).rotate().toBuffer();
                ext = extFromHeader === 'jpeg' ? 'jpg' : extFromHeader;
            }
        }

        if (!['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'].includes(ext)) {
            ext = 'jpg';
        }

        const filename = `${uuidv4()}.${ext}`;
        const imagePath = path.join(imageDir, filename);
        fs.writeFileSync(imagePath, outBuffer);

        console.log(`[+] Saved image: ${filename} (${(outBuffer.length / 1024).toFixed(0)}KB)`);

        return `/images/posts/${filename}`;
    } catch (error) {
        console.error(`[!] Failed to download image: ${imageUrl}`);
        console.error(error);
        return imageUrl;
    }
}

// HEIC 解码全局串行锁(libheif-js WASM 并发解码易内存压力/卡死)
let heicLockChain: Promise<unknown> = Promise.resolve();
function withHeicLock<T>(task: () => Promise<T>): Promise<T> {
    const run = heicLockChain.then(task);
    heicLockChain = run.catch(() => {});
    return run;
}

// libheif-js 解码超时(WASM 卡死保护,超时后继续处理其他图)
const HEIC_DECODE_TIMEOUT = 90000; // 90s

/**
 * HEIC → JPEG 转码。
 * 优先 sharp(unlimited 模式可绕过 libheif 的 iloc 安全限制);
 * 若 sharp 解码失败(部分 iPhone HEIC 多 item 文件会报 bad seek),
 * 回退到 libheif-js(WASM 纯 JS 实现,不依赖系统库,GitHub Actions 也可用)。
 */
async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
    // 尝试 1: sharp + unlimited
    try {
        const out = await sharp(buffer, { failOn: 'none', unlimited: true })
            .rotate()
            .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
            .jpeg({ quality: 82, mozjpeg: true })
            .toBuffer();
        console.log(`[+]   via sharp: ${(out.length / 1024).toFixed(0)}KB`);
        return out;
    } catch (err) {
        console.log(`[!]   sharp failed, trying libheif-js (WASM): ${(err as Error).message.split('\n')[0]}`);
    }

    // 尝试 2: libheif-js (WASM, 纯 JS, 无系统依赖) — 串行 + 超时保护
    return withHeicLock(async () => {
        try {
            const heicConvert = (await import('heic-convert')).default ?? (await import('heic-convert')) as any;
            const rawJpeg = await Promise.race([
                heicConvert({ buffer, format: 'JPEG', quality: 0.85 }),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`libheif-js 解码超时(>${HEIC_DECODE_TIMEOUT / 1000}s)`)), HEIC_DECODE_TIMEOUT)
                ),
            ]);
            const out = await sharp(Buffer.from(rawJpeg))
                .rotate()
                .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
                .jpeg({ quality: 82, mozjpeg: true })
                .toBuffer();
            console.log(`[+]   via libheif-js: ${(out.length / 1024).toFixed(0)}KB`);
            return out;
        } catch (err) {
            console.log(`[!]   libheif-js failed: ${(err as Error).message.split('\n')[0]}`);
            throw new Error(`HEIC 转码失败: sharp 与 libheif-js 均无法解码 (${(err as Error).message.split('\n')[0]})`);
        }
    });
}

async function parseMarkdownBlock(block: any): Promise<any> {
    if (block.type === 'image') {
        try {
            const markdownImageRegex = /!\[(.*?)\]\((.*?)\)/;
            const match = block.parent.match(markdownImageRegex);

            if (!match) {
                console.error(`[!] Invalid image markdown syntax: ${block.parent}`);
                return block;
            }

            const [_, altText, imageUrl] = match;
            const localImageUrl = await downloadImage(imageUrl, altText);
            block.parent = `![${altText}](${localImageUrl})`;
        } catch (error) {
            console.error(`[!] Failed to process image: ${block.parent}`);
            console.error(error);
        }
    }

    if (block.children && block.children.length > 0) {
        block.children = await Promise.all(block.children.map((child: any) => parseMarkdownBlock(child)));
    }

    return block;
}

syncPosts()
