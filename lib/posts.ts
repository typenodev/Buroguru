import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface Post {
  id: string
  title: string
  description: string
  date: string
  thumbnail?: string
  tags: string[]
  content?: string
}

export class PostsManager {
  private static postsDirectory = path.join(process.cwd(), 'content/posts')

  static getAllPosts(): Post[] {
    const postFiles = fs.readdirSync(this.postsDirectory)
    
    return postFiles.map((fileName) => {
      const id = fileName.replace(/\.md$/, '')
      const fullPath = path.join(this.postsDirectory, fileName)
      const fileContents = fs.readFileSync(fullPath, 'utf8')
      const { data } = matter(fileContents)
      
      return {
        id,
        title: data.title,
        description: data.description,
        date: data.date,
        thumbnail: data.thumbnail,
        tags: data.tags || []
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  static getPostsByTag(tag: string): Post[] {
    return this.getAllPosts().filter(post => 
      post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    )
  }

  static getPostById(id: string): (Post & { content: string }) | null {
    const postPath = path.join(this.postsDirectory, `${id}.md`)
    
    // 檢查檔案是否存在
    if (!fs.existsSync(postPath)) {
      return null
    }
    
    try {
      const fileContents = fs.readFileSync(postPath, 'utf8')
      const { data, content } = matter(fileContents)
      
      return {
        id,
        title: data.title,
        description: data.description,
        date: data.date,
        thumbnail: data.thumbnail,
        tags: data.tags || [],
        content
      }
    } catch (error) {
      console.error(`Error reading post file: ${postPath}`, error)
      return null
    }
  }

  static getAllTags(): { name: string; count: number }[] {
    const posts = this.getAllPosts()
    const tags = Array.from(new Set(posts.flatMap(post => post.tags)))
    return tags.map(tag => ({
      name: tag,
      count: posts.filter(post => post.tags.includes(tag)).length
    })).sort((a, b) => b.count - a.count)
  }

  /**
   * 相关文章：先按标签命中筛选，再按「时间接近」排序；
   * 标签命中的文章不足时，用时间最接近的文章补足，保证区块永不为空。
   *
   * 排序规则（同一批次内依次比较）：
   * 1. |候选文章时间 − 当前文章时间| 越小越靠前；
   * 2. 时间差相同时，标签重合数多的靠前；
   * 3. 仍相同时，日期较新的靠前。
   */
  static getRelatedPosts(currentId: string, tags: string[], limit = 3, currentDate?: string): Post[] {
    const allPosts = this.getAllPosts()
    const currentTags = (tags || []).map(tag => tag.toLowerCase()).filter(Boolean)

    // 基准时间：优先使用传入的当前文章日期，回退为从列表中查找
    const baseDateRaw = currentDate ?? allPosts.find(post => post.id === currentId)?.date
    const baseTime = baseDateRaw ? new Date(baseDateRaw).getTime() : NaN

    const timeDistance = (post: Post): number => {
      const postTime = new Date(post.date).getTime()
      if (!Number.isFinite(baseTime) || !Number.isFinite(postTime)) return Number.POSITIVE_INFINITY
      return Math.abs(postTime - baseTime)
    }

    const overlapCount = (post: Post): number =>
      post.tags.filter(tag => currentTags.includes(tag.toLowerCase())).length

    // 时间接近优先 → 标签重合数 → 日期较新
    const byTimeProximity = (a: Post, b: Post): number =>
      timeDistance(a) - timeDistance(b) ||
      overlapCount(b) - overlapCount(a) ||
      new Date(b.date).getTime() - new Date(a.date).getTime()

    const pool = allPosts.filter(post => post.id !== currentId)

    // 1. 标签命中的文章：按时间接近排序后取前 limit 篇
    const tagged = pool
      .filter(post => overlapCount(post) > 0)
      .sort(byTimeProximity)
      .slice(0, limit)

    if (tagged.length >= limit) return tagged

    // 2. 标签命中不足时，用剩余文章中时间最接近的补足
    const pickedIds = new Set(tagged.map(post => post.id))
    const fallback = pool
      .filter(post => !pickedIds.has(post.id))
      .sort(byTimeProximity)
      .slice(0, limit - tagged.length)

    return [...tagged, ...fallback]
  }

  static getPostsByMonth(): { [key: string]: Post[] } {
    const posts = this.getAllPosts()
    return posts.reduce((acc, post) => {
      const date = new Date(post.date)
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      if (!acc[monthYear]) acc[monthYear] = []
      acc[monthYear].push(post)
      return acc
    }, {} as { [key: string]: Post[] })
  }
} 