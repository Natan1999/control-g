import { useEffect, useMemo, useState } from 'react'
import { BLOG_POSTS, normalizeBlogRow, type BlogPost } from '@/lib/blog'
import { supabase } from '@/lib/supabase'

function mergePosts(remote: BlogPost[]) {
  const posts = new Map(BLOG_POSTS.map(post => [post.slug, post]))
  remote.forEach(post => posts.set(post.slug, post))
  return [...posts.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title))
}

export function usePublishedBlogPosts(enabled = true) {
  const [remotePosts, setRemotePosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) { setLoading(false); return }
    let active = true
    supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .then(({ data }) => {
        if (active && data) setRemotePosts(data.map(normalizeBlogRow))
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [enabled])

  return { posts: useMemo(() => mergePosts(remotePosts), [remotePosts]), loading }
}

export function usePublishedBlogPost(slug: string) {
  const { posts, loading } = usePublishedBlogPosts(Boolean(slug))
  return { post: posts.find(item => item.slug === slug), loading }
}
