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
        const sharp = (await import('sharp')).default
        const meta = await sharp(file).metadata()
        if (meta.width && meta.height) {
          size = { width: meta.width, height: meta.height }
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
