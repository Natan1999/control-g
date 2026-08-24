import blogPostsData from '@/config/blog-posts.json'
import { SITE_URL } from '@/lib/marketing'

export interface BlogParagraphSection {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export interface BlogComparisonRow {
  label: string
  controlG: string
  alternative: string
}

export interface BlogPost {
  slug: string
  title: string
  description: string
  excerpt: string
  category: string
  country: string
  publishedAt: string
  updatedAt: string
  readingMinutes: number
  keywords: string[]
  whatsappMessage: string
  intro: string[]
  sections: BlogParagraphSection[]
  comparison: BlogComparisonRow[]
  verdict: string
  faqs: Array<{ question: string; answer: string }>
  sources: Array<{ title: string; publisher: string; url: string }>
}

export const BLOG_POSTS = blogPostsData as BlogPost[]

export const BLOG_META = {
  title: 'Blog de encuestas offline y trabajo de campo | Control G',
  description: 'Guías y comparaciones profesionales sobre caracterización social, encuestas offline y levantamiento de información en Latinoamérica.',
  whatsappMessage: 'Hola, llegué desde el blog de Control G. Quiero orientación para un proyecto de recolección de información en campo.',
}

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find(post => post.slug === slug)
}

export function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
}

export function relatedBlogPosts(post: BlogPost, limit = 3) {
  return BLOG_POSTS
    .filter(candidate => candidate.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category) || Number(b.country === post.country) - Number(a.country === post.country))
    .slice(0, limit)
}

const organization = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Control G by DRAN Digital',
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/pwa-512x512.png` },
}

export function buildBlogIndexStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'Blog',
        '@id': `${SITE_URL}/blog#blog`,
        url: `${SITE_URL}/blog`,
        name: BLOG_META.title,
        description: BLOG_META.description,
        inLanguage: 'es',
        publisher: { '@id': `${SITE_URL}/#organization` },
        blogPost: BLOG_POSTS.map(post => ({ '@id': `${SITE_URL}/blog/${post.slug}#article` })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
        ],
      },
    ],
  }
}

export function buildBlogStructuredData(post: BlogPost) {
  const canonical = `${SITE_URL}/blog/${post.slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      {
        '@type': 'BlogPosting',
        '@id': `${canonical}#article`,
        headline: post.title,
        description: post.description,
        url: canonical,
        mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
        image: [`${SITE_URL}/og-image.png`],
        datePublished: post.publishedAt,
        dateModified: post.updatedAt,
        inLanguage: 'es',
        author: { '@id': `${SITE_URL}/#organization` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        articleSection: post.category,
        keywords: post.keywords.join(', '),
        about: [post.category, post.country, ...post.keywords],
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: canonical },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: post.faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: { '@type': 'Answer', text: faq.answer },
        })),
      },
    ],
  }
}
