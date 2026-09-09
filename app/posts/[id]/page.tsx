import { PostsManager } from '@/lib/posts'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { ProfileCard } from '@/components/ProfileCard'
import { formatDate } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { blog } from '@/lib/config'
import { parseContentBlocks } from '@/lib/content-blocks'
import ImageGallery from '@/components/ImageGallery'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'

// Import highlight.js theme
import 'highlight.js/styles/github-dark.css'

const markdownComponents: Components = {
  // Custom heading styling
  h1: ({ ...props }) => (
    <h1 className="text-3xl md:text-4xl font-serif font-bold mb-6 mt-8 text-foreground" {...props} />
  ),
  h2: ({ ...props }) => (
    <h2 className="text-2xl md:text-3xl font-serif font-semibold mb-4 mt-8 text-foreground" {...props} />
  ),
  h3: ({ ...props }) => (
    <h3 className="text-xl md:text-2xl font-serif font-semibold mb-3 mt-6 text-foreground" {...props} />
  ),
  h4: ({ ...props }) => (
    <h4 className="text-lg md:text-xl font-serif font-semibold mb-2 mt-4 text-foreground" {...props} />
  ),
  h5: ({ ...props }) => (
    <h5 className="text-base md:text-lg font-serif font-semibold mb-2 mt-4 text-foreground" {...props} />
  ),
  h6: ({ ...props }) => (
    <h6 className="text-sm md:text-base font-serif font-semibold mb-2 mt-4 text-foreground" {...props} />
  ),
  // Custom paragraph styling
  p: ({ ...props }) => (
    <div className="font-serif text-base md:text-lg leading-relaxed mb-6 text-foreground" {...props} />
  ),
  // Custom list styling
  ul: ({ ...props }) => (
    <ul className="font-serif text-base md:text-lg leading-relaxed mb-6 ml-6 space-y-2" {...props} />
  ),
  ol: ({ ...props }) => (
    <ol className="font-serif text-base md:text-lg leading-relaxed mb-6 ml-6 space-y-2" {...props} />
  ),
  li: ({ ...props }) => (
    <li className="font-serif" {...props} />
  ),
  // Custom blockquote styling
  blockquote: ({ ...props }) => (
    <blockquote className="border-l-4 border-primary pl-6 py-2 my-6 italic font-serif text-base md:text-lg bg-secondary/30 rounded-r-lg" {...props} />
  ),
  // Custom image handling
  img: ({ ...props }) => (
    <div className="relative w-full my-8">
      <Image
        src={props.src || ''}
        alt={props.alt || ''}
        width={800}
        height={400}
        className="rounded-lg shadow-lg"
        style={{ width: '100%', height: 'auto' }}
      />
    </div>
  ),
  // Custom link handling
  a: ({ ...props }) => (
    <Link
      href={props.href || '#'}
      className="text-primary hover:underline font-serif decoration-2 underline-offset-2"
      target={props.href?.startsWith('http') ? '_blank' : undefined}
      rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {props.children}
    </Link>
  ),
  // Custom code block styling
  pre: ({ ...props }) => (
    <pre className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto my-6 border border-border" {...props} />
  ),
  // Custom inline code styling
  code: ({ className, ...props }) => {
    const match = /language-(\w+)/.exec(className || '')
    return match ? (
      <code className={className} {...props} />
    ) : (
      <code className="bg-secondary px-2 py-1 rounded text-sm font-mono" {...props} />
    )
  },
  // Custom table styling
  table: ({ ...props }) => (
    <div className="my-6 overflow-x-auto">
      <table className="min-w-full border-collapse border border-border rounded-lg" {...props} />
    </div>
  ),
  th: ({ ...props }) => (
    <th className="border border-border px-4 py-2 bg-secondary font-serif font-semibold text-left" {...props} />
  ),
  td: ({ ...props }) => (
    <td className="border border-border px-4 py-2 font-serif" {...props} />
  ),
  // Custom horizontal rule
  hr: ({ ...props }) => (
    <hr className="my-8 border-border" {...props} />
  )
}

// 图片排版配置：兼容 buroguru-config.ts 尚未声明 imageLayout 字段的情况
type ImageLayoutConfig = {
  mode?: 'gallery' | 'two-column' | 'stack'
  rowHeight?: number
  gap?: number
  radius?: number
  lightbox?: boolean
  uniformRatio?: boolean
}

const DEFAULT_IMAGE_LAYOUT: Required<ImageLayoutConfig> = {
  mode: 'gallery',
  rowHeight: 260,
  gap: 8,
  radius: 8,
  lightbox: true,
  uniformRatio: true,
}

interface PostPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function PostPage({ params }: PostPageProps) {
  const resolvedParams = await params
  const post = PostsManager.getPostById(resolvedParams.id)

  if (!post) {
    notFound()
  }

  // 正文按「文本块 / 图片块」拆分，图片块交给画廊组件排版
  const blocks = await parseContentBlocks(post.content)
  const imageLayout: Required<ImageLayoutConfig> = {
    ...DEFAULT_IMAGE_LAYOUT,
    ...((blog as unknown as { imageLayout?: ImageLayoutConfig }).imageLayout ?? {}),
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-4 md:mx-auto px-4 py-8 md:py-16" style={{ minHeight: 'calc(100vh - 64px - 120px)' }}>
        {/* Back Navigation */}
        <div className="mb-8">
          <Link 
            href="/posts" 
            className="inline-flex items-center gap-2 text-sm font-serif text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Posts
          </Link>
        </div>

        {/* Post Header */}
        <header className="mb-8 md:mb-12">
          {post.thumbnail && (
            <div className="relative w-full mb-8 rounded-lg overflow-hidden">
              <Image
                src={post.thumbnail}
                alt={post.title}
                width={1200}
                height={600}
                className="w-full h-auto rounded-lg"
                style={{ aspectRatio: '2/1', objectFit: 'cover' }}
                priority
              />
            </div>
          )}
          
          {blog.showTags && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/posts?tag=${encodeURIComponent(tag)}`}
                  className="px-3 py-1 text-xs font-serif bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif mb-4 leading-tight">
            {post.title}
          </h1>
          
          <p className="text-lg font-serif text-muted-foreground mb-4 leading-relaxed">
            {post.description}
          </p>
          
          <time className="text-sm text-muted-foreground font-serif">
            Published on {formatDate(post.date)}
          </time>
        </header>

        {/* Post Content */}
        <article className="prose prose-gray dark:prose-invert max-w-none font-serif prose-headings:font-serif prose-p:font-serif prose-li:font-serif">
          {blocks.map((block, index) =>
            block.type === 'images' ? (
              <ImageGallery
                key={`images-${index}`}
                images={block.images}
                layout={imageLayout.mode}
                rowHeight={imageLayout.rowHeight}
                gap={imageLayout.gap}
                radius={imageLayout.radius}
                lightbox={imageLayout.lightbox}
                uniformRatio={imageLayout.uniformRatio}
              />
            ) : (
              <ReactMarkdown
                key={`text-${index}`}
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={markdownComponents}
              >
                {block.content}
              </ReactMarkdown>
            )
          )}
        </article>

        {/* Related Posts Navigation */}
        <div className="mt-16 pt-8 border-t">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-serif text-muted-foreground mb-2">More posts</p>
              <Link 
                href="/posts" 
                className="text-primary hover:underline font-serif decoration-2 underline-offset-2"
              >
                View all posts →
              </Link>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <ProfileCard />
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PostPageProps) {
  const resolvedParams = await params
  const post = PostsManager.getPostById(resolvedParams.id)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      images: post.thumbnail ? [post.thumbnail] : [],
    },
  }
}

// Generate static params for static generation
export async function generateStaticParams() {
  const posts = PostsManager.getAllPosts()
  
  return posts.map((post) => ({
    id: post.id,
  }))
} 