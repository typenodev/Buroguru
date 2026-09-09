import { PostsManager } from '@/lib/posts'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/Navbar'
import { formatDate } from '@/lib/utils'
import { ProfileCard } from '@/components/ProfileCard'
import { Footer } from '@/components/Footer'
import { getPostsPerPage, blog } from '@/lib/config'

export default async function PostsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; tag?: string; month?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const currentPage = Number(resolvedSearchParams.page) || 1
  const selectedTag = resolvedSearchParams.tag
  const selectedMonth = resolvedSearchParams.month

  let allPosts = PostsManager.getAllPosts()
  const tags = PostsManager.getAllTags()
  const postsByMonth = PostsManager.getPostsByMonth()

  // Apply filters
  if (selectedTag) {
    allPosts = allPosts.filter(post => post.tags.includes(selectedTag))
  }
  if (selectedMonth) {
    allPosts = allPosts.filter(post => {
      const postMonth = new Date(post.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      return postMonth === selectedMonth
    })
  }

  const postsPerPage = getPostsPerPage()
  const totalPages = Math.ceil(allPosts.length / postsPerPage)
  const offset = (currentPage - 1) * postsPerPage
  const posts = allPosts.slice(offset, offset + postsPerPage)

  return (
    <div>
      <Navbar />
      <div className="max-w-6xl min-h-screen mx-4 md:mx-auto px-4 py-8 md:py-16">
        {/* Mobile Filter Bar */}
        <div className="md:hidden space-y-8 mb-8">
          {/* Archive Dropdown */}
          <div>
            <h2 className="text-lg font-serif mb-4">Archive</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(postsByMonth).map(([month, monthPosts]) => (
                <Link
                  key={month}
                  href={`/posts?month=${encodeURIComponent(month)}`}
                  className={`text-sm font-serif hover:text-primary transition-colors ${
                    selectedMonth === month ? 'text-primary font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {month} ({monthPosts.length})
                </Link>
              ))}
            </div>
          </div>

          {/* Topics Dropdown */}
          <div>
            <h2 className="text-lg font-serif mb-4">Topics</h2>
            <div className="grid grid-cols-2 gap-2">
              {tags.map(({ name, count }) => (
                <Link
                  key={name}
                  href={`/posts?tag=${encodeURIComponent(name)}`}
                  className={`text-sm font-serif hover:text-primary transition-colors ${
                    selectedTag === name ? 'text-primary font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {name} ({count})
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:gap-8">
          {/* Left Sidebar - Calendar (Desktop) */}
          <aside className="hidden md:block w-48 shrink-0">
            <h2 className="text-lg font-serif mb-4">Archive</h2>
            <div className="space-y-2">
              {Object.entries(postsByMonth).map(([month, monthPosts]) => (
                <Link
                  key={month}
                  href={`/posts?month=${encodeURIComponent(month)}`}
                  className={`block text-sm font-serif hover:text-primary transition-colors ${
                    selectedMonth === month ? 'text-primary font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {month} ({monthPosts.length})
                </Link>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <header className="mb-8 md:mb-12">
              <h1 className="text-3xl md:text-4xl font-serif mb-4">
                {selectedTag ? `Posts tagged "${selectedTag}"` : 
                 selectedMonth ? `Posts from ${selectedMonth}` : 
                 'All Posts'}
              </h1>
              <p className="text-muted-foreground font-serif">
                {allPosts.length} post{allPosts.length !== 1 ? 's' : ''}
              </p>
            </header>

            <div className="space-y-8 mb-12">
              {posts.map((post, index) => (
                <Link 
                  key={post.id} 
                  href={`/posts/${post.id}`}
                  className="block group"
                >
                  <article className={`flex flex-col sm:flex-row items-start gap-4 sm:gap-6 py-4 ${index !== posts.length - 1 ? 'border-b border-border' : ''}`}>
                    {post.thumbnail && (
                      <div className="relative w-full sm:w-32 h-48 sm:h-24 shrink-0">
                        <Image
                          src={post.thumbnail}
                          alt={post.title}
                          fill
                          className="object-cover rounded-md"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {blog.showTags && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {post.tags.map((tag) => (
                            <span 
                              key={tag}
                              className="text-xs text-muted-foreground font-serif"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <h3 className="text-lg font-serif mb-2 group-hover:text-primary transition-colors line-clamp-1">
                        {post.title}
                      </h3>
                      {blog.showExcerpt && (
                        <p className="text-sm text-muted-foreground font-serif mb-2 line-clamp-2">
                          {post.description}
                        </p>
                      )}
                      <time className="text-xs text-muted-foreground font-serif">
                        {formatDate(post.date)}
                      </time>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-2 flex-wrap">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Link
                    key={page}
                    href={`/posts?page=${page}${selectedTag ? `&tag=${selectedTag}` : ''}${selectedMonth ? `&month=${selectedMonth}` : ''}`}
                    className={`px-4 py-2 rounded-md font-serif transition-colors ${
                      currentPage === page
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    {page}
                  </Link>
                ))}
              </div>
            )}
          </main>

          {/* Right Sidebar - Tags (Desktop) */}
          <aside className="hidden md:block w-48 shrink-0">
            <h2 className="text-lg font-serif mb-4">Topics</h2>
            <div className="space-y-2">
              {tags.map(({ name, count }) => (
                <Link
                  key={name}
                  href={`/posts?tag=${encodeURIComponent(name)}`}
                  className={`block text-sm font-serif hover:text-primary transition-colors ${
                    selectedTag === name ? 'text-primary font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {name} ({count})
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
      <Footer />
      <ProfileCard />
    </div>
  )
} 