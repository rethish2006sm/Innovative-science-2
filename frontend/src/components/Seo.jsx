import { useEffect } from 'react'

const SITE_NAME = 'Innovative Science 2'
const DEFAULT_DESCRIPTION =
  'Innovative Science 2 is a science learning platform for chapter practice, objective questions, tests, progress tracking, and student rankings.'
const DEFAULT_IMAGE = '/logo.svg'

const ensureMetaTag = (selector, attributes) => {
  let tag = document.head.querySelector(selector)

  if (!tag) {
    tag = document.createElement('meta')
    document.head.appendChild(tag)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      tag.setAttribute(key, value)
    }
  })

  return tag
}

const ensureLinkTag = (selector, attributes) => {
  let tag = document.head.querySelector(selector)

  if (!tag) {
    tag = document.createElement('link')
    document.head.appendChild(tag)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      tag.setAttribute(key, value)
    }
  })

  return tag
}

const buildCanonicalUrl = (canonicalPath) => {
  if (/^https?:\/\//i.test(canonicalPath)) {
    return canonicalPath
  }

  const normalizedPath = `${canonicalPath || '/'}`.replace(/\/+$/, '') || '/'
  const hashPath = normalizedPath === '/' ? '/' : normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`

  return `${window.location.origin}/#${hashPath}`
}

const Seo = ({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  canonicalPath = '',
  noindex = false,
}) => {
  useEffect(() => {
    const previousTitle = document.title
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME
    const canonicalUrl = buildCanonicalUrl(canonicalPath || window.location.hash?.slice(1) || '/')
    const robots = noindex ? 'noindex, nofollow' : 'index, follow'

    document.title = fullTitle

    ensureMetaTag('meta[name="description"]', {
      name: 'description',
      content: description,
    })
    ensureMetaTag('meta[name="robots"]', {
      name: 'robots',
      content: robots,
    })
    ensureMetaTag('meta[name="theme-color"]', {
      name: 'theme-color',
      content: '#0f172a',
    })
    ensureMetaTag('meta[property="og:title"]', {
      property: 'og:title',
      content: fullTitle,
    })
    ensureMetaTag('meta[property="og:description"]', {
      property: 'og:description',
      content: description,
    })
    ensureMetaTag('meta[property="og:type"]', {
      property: 'og:type',
      content: 'website',
    })
    ensureMetaTag('meta[property="og:site_name"]', {
      property: 'og:site_name',
      content: SITE_NAME,
    })
    ensureMetaTag('meta[property="og:image"]', {
      property: 'og:image',
      content: image,
    })
    ensureMetaTag('meta[property="og:url"]', {
      property: 'og:url',
      content: canonicalUrl,
    })
    ensureMetaTag('meta[name="twitter:card"]', {
      name: 'twitter:card',
      content: 'summary_large_image',
    })
    ensureMetaTag('meta[name="twitter:title"]', {
      name: 'twitter:title',
      content: fullTitle,
    })
    ensureMetaTag('meta[name="twitter:description"]', {
      name: 'twitter:description',
      content: description,
    })
    ensureMetaTag('meta[name="twitter:image"]', {
      name: 'twitter:image',
      content: image,
    })
    ensureLinkTag('link[rel="canonical"]', {
      rel: 'canonical',
      href: canonicalUrl,
    })

    return () => {
      document.title = previousTitle
    }
  }, [canonicalPath, description, image, noindex, title])

  return null
}

export default Seo
