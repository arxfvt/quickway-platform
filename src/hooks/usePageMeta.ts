import { useEffect } from 'react'
import { SITE } from '../config/site'

interface PageMeta {
  title?: string
  description?: string
  image?: string
  path?: string
}

/** Collapse whitespace and cut to ~160 characters at a word boundary. */
function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  return cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s,.;:—-]+$/, '') + '…'
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

/**
 * Sets the browser-tab title, meta description, canonical URL and social
 * preview tags for the current page. (Link previews for crawlers that don't
 * run JavaScript are handled server-side by the Netlify edge function.)
 */
export function usePageMeta({ title, description, image, path }: PageMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE.shortName} Auctioneers` : SITE.defaultTitle
    const desc = clip(description || SITE.defaultDescription)
    const url = SITE.url + (path ?? window.location.pathname)

    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:type', 'website')
    if (image) setMeta('property', 'og:image', image)
    setCanonical(url)
  }, [title, description, image, path])
}
