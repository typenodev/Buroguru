import fs from 'fs'
import path from 'path'

export interface GalleryImage {
  src: string
  alt: string
  width: number
  height: number
}

export type ContentBlock =
  | { type: 'markdown'; content: string }
  | { type: 'images'; images: GalleryImage[] }

const IMAGE_SOURCE = String.raw`!\[([^\]]*)\]\(\s*<?([^\s>)]+)>?(?:\s+["'][^"']*["'])?\s*\)`
const DEFAULT_SIZE = { width: 1200, height: 800 }

const sizeCache = new Map<string, { width: number; height: number }>()

/** 只读文件头部 64KB，足够解析出绝大多数图片的宽高 */
const HEAD_BYTES = 64 * 1024

/**
 * 从图片文件头部字节解析宽高，纯 Node 实现，不依赖 sharp。
 * 支持 JPEG / PNG / GIF / WebP；无法识别时返回 null。
 */
function sizeFromBuffer(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null

  // PNG：8 字节签名 + IHDR 长度(4) + "IHDR"(4) + width(4) + height(4)
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }

  // GIF：GIF8x + width(2, LE) + height(2, LE)
  if (buf.slice(0, 3).toString('ascii') === 'GIF') {
    return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) }
  }

  // WebP：RIFF....WEBP<fourcc>
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
    const fourcc = buf.slice(12, 16).toString('ascii')
    if (fourcc === 'VP8 ') {
      return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff }
    }
    if (fourcc === 'VP8L') {
      const v = buf.readUInt32LE(21)
      return { width: (v & 0x3fff) + 1, height: ((v >> 14) & 0x3fff) + 1 }
    }
    if (fourcc === 'VP8X') {
      return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 }
    }
    return null
  }

  // JPEG：跳过各个 marker 段，找到 SOFn
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) {
        offset += 1
        continue
      }
      const marker = buf[offset + 1]
      if (marker === 0xff) {
        offset += 1
        continue
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2
        continue
      }
      const length = buf.readUInt16BE(offset + 2)
      // SOF0~SOF15，排除 DHT(JPG) / JPG / DAC
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) }
      }
      if (length < 2) break
      offset += 2 + length
    }
  }

  return null
}

/**
 * 读取文章图片的原始宽高（服务端，构建期执行，带内存缓存）。
 * 读取失败时回退到 3:2，保证布局不塌陷。
 */
async function readImageSize(src: string): Promise<{ width: number; height: number }> {
  const cached = sizeCache.get(src)
  if (cached) return cached

  let size = { ...DEFAULT_SIZE }
  try {
    if (src.startsWith('/') && !src.startsWith('//')) {
      const publicDir = path.join(process.cwd(), 'public')
      const rel = decodeURIComponent(src.split(/[?#]/)[0]).replace(/^\/+/, '')
      const file = path.resolve(publicDir, rel)
      if (file.startsWith(publicDir + path.sep) && fs.existsSync(file)) {
        const handle = await fs.promises.open(file, 'r')
        try {
          const buf = Buffer.alloc(HEAD_BYTES)
          const { bytesRead } = await handle.read(buf, 0, HEAD_BYTES, 0)
          const parsed = sizeFromBuffer(buf.subarray(0, bytesRead))
          if (parsed && parsed.width > 0 && parsed.height > 0) {
            size = parsed
          }
        } finally {
          await handle.close()
        }
      }
    }
  } catch {
    // 忽略：使用默认比例
  }

  sizeCache.set(src, size)
  return size
}

/** 判断一个 markdown 段落是否为「纯图片段」，是则返回其中的图片列表 */
function extractImages(segment: string): { src: string; alt: string }[] | null {
  const lines = segment.split('\n').map((line) => line.trim()).filter(Boolean)
  if (!lines.length) return null

  const found: { src: string; alt: string }[] = []
  for (const line of lines) {
    const re = new RegExp(IMAGE_SOURCE, 'g')
    const matches = [...line.matchAll(re)]
    if (!matches.length) return null
    // 行内除图片语法外还有其它文字，说明不是纯图片段
    if (line.replace(new RegExp(IMAGE_SOURCE, 'g'), '').trim()) return null
    for (const m of matches) {
      found.push({ alt: m[1] || '', src: m[2] })
    }
  }
  return found.length ? found : null
}

/**
 * 把 markdown 拆成「文本块 / 图片块」序列：
 * 连续的纯图片段落会被合并成一个图片块，交给画廊组件排版。
 */
export async function parseContentBlocks(markdown: string): Promise<ContentBlock[]> {
  const segments = markdown.split(/\n[ \t]*\n+/)
  const blocks: ContentBlock[] = []
  let pending: { src: string; alt: string }[] = []

  const flush = async () => {
    if (!pending.length) return
    const images = await Promise.all(
      pending.map(async (image) => ({ ...image, ...(await readImageSize(image.src)) }))
    )
    blocks.push({ type: 'images', images })
    pending = []
  }

  for (const segment of segments) {
    const images = extractImages(segment)
    if (images) {
      pending.push(...images)
      continue
    }
    await flush()
    if (segment.trim()) {
      blocks.push({ type: 'markdown', content: segment })
    }
  }
  await flush()

  return blocks
}
