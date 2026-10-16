import { renderToString } from 'react-dom/server'
import { Route, Routes, StaticRouter } from 'react-router-dom'
import { BlogSnapshotProvider } from '@/components/marketing/BlogSnapshot'
import LandingPage from '@/pages/landing/LandingPage'
import SolutionPage from '@/pages/landing/SolutionPage'
import NotFoundPage from '@/pages/landing/NotFoundPage'
import BlogIndexPage from '@/pages/blog/BlogIndexPage'
import BlogPostPage from '@/pages/blog/BlogPostPage'
import { SEO_PAGES, getSeoPage, buildStructuredData, SITE_URL } from '@/lib/marketing'
import { BLOG_META, BLOG_POSTS, blogCover, buildBlogIndexStructuredData, buildBlogStructuredData, type BlogPost } from '@/lib/blog'

export { SEO_PAGES, BLOG_POSTS }

export function marketingMetadata(path: string, posts: BlogPost[] = BLOG_POSTS) {
  const slug = path.match(/^\/blog\/([^/]+)$/)?.[1]
  const post = slug ? posts.find(item => item.slug === slug) : undefined
  const page = getSeoPage(path)
  const isBlog = path === '/blog'
  if (!page && !isBlog && !post) return null
  const image = post ? blogCover(post) : '/og-image.png'
  return {
    title: post?.title || (isBlog ? BLOG_META.title : page!.title),
    description: post?.description || (isBlog ? BLOG_META.description : page!.description),
    canonical: `${SITE_URL}${path}`,
    locale: page?.locale || 'es-CO',
    image: image.startsWith('https://') ? image : `${SITE_URL}${image}`,
    imageAlt: post?.imageAlt || 'Control G: encuestas offline y mapa territorial',
    type: post ? 'article' : 'website',
    publishedAt: post?.publishedAt,
    updatedAt: post?.updatedAt,
    structuredData: post ? buildBlogStructuredData(post) : isBlog ? buildBlogIndexStructuredData(posts) : buildStructuredData(page!),
  }
}

export function renderMarketingRoute(path: string, posts: BlogPost[] = BLOG_POSTS) {
  return renderToString(<StaticRouter location={path}><BlogSnapshotProvider value={posts}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      {SEO_PAGES.filter(page => page.path !== '/').map(page => <Route key={page.path} path={page.path} element={<SolutionPage path={page.path} />} />)}
      <Route path="/blog" element={<BlogIndexPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </BlogSnapshotProvider></StaticRouter>)
}
