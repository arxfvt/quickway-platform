// ─────────────────────────────────────────────────────────────────────────────
// Serve resized images from Supabase Storage instead of full-size originals.
//
// Originals are ~1800px / 500–650 KB. Through the render endpoint a 160px
// thumbnail is ~4 KB and a 1000px main photo ~130 KB — a big saving on
// Ugandan mobile data. Non-Supabase URLs are returned unchanged.
// ─────────────────────────────────────────────────────────────────────────────

const OBJECT_PATH = '/storage/v1/object/public/'
const RENDER_PATH = '/storage/v1/render/image/public/'

export const IMG = {
  thumb: 200,   // gallery thumbnails, small cards
  card: 640,    // listing cards
  main: 1080,   // main gallery photo
  share: 1200,  // social preview
} as const

export function sizedImage(url: string | null | undefined, width: number, quality = 70): string {
  if (!url) return ''
  if (!url.includes('.supabase.co') || !url.includes(OBJECT_PATH)) return url
  const rendered = url.replace(OBJECT_PATH, RENDER_PATH)
  const sep = rendered.includes('?') ? '&' : '?'
  return `${rendered}${sep}width=${width}&quality=${quality}&resize=contain`
}
