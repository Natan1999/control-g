import { createContext, useContext } from 'react'
import type { BlogPost } from '@/lib/blog'

const BlogSnapshotContext = createContext<BlogPost[]>([])
export const BlogSnapshotProvider = BlogSnapshotContext.Provider
export const useBlogSnapshot = () => useContext(BlogSnapshotContext)

// Only the public editorial projection is embedded; no account/session data.
export function readBlogSnapshot(): BlogPost[] {
  if (typeof document === 'undefined') return []
  try {
    const value = JSON.parse(document.getElementById('control-g-blog-snapshot')?.textContent || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}
