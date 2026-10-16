import { useEffect, useMemo, useState } from 'react'
import { BLOG_POSTS, type BlogPost } from '@/lib/blog'
import { useBlogSnapshot } from '@/components/marketing/BlogSnapshot'

function mergePosts(remote: BlogPost[]) {
  const posts = new Map(BLOG_POSTS.map(post => [post.slug, post]))
  remote.forEach(post => posts.set(post.slug, post))
  return [...posts.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title))
}

export function usePublishedBlogPosts(enabled = true) {
  const initialPosts = useBlogSnapshot()
  const [remotePosts, setRemotePosts] = useState<BlogPost[]>(initialPosts)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    let active = true
    // The public projection also powers server-rendered HTML and the sitemap.
    fetch('/api/marketing?path=/blog-catalog.json', { signal: AbortSignal.timeout(10000) })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Public catalog unavailable')))
      .then(data => {
        if (active && Array.isArray(data.posts)) setRemotePosts(data.posts)
        if (active) setLoading(false)
      })
      .catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [enabled])

  return { posts: useMemo(() => mergePosts(remotePosts), [remotePosts]), loading }
}

export function usePublishedBlogPost(slug: string) {
  const { posts, loading } = usePublishedBlogPosts(Boolean(slug))
  return { post: posts.find(item => item.slug === slug), loading }
}
