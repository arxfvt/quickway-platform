import heic2any from 'heic2any'

/**
 * Convert any image to a compressed JPEG before upload.
 * - HEIC/HEIF: converted via heic2any library
 * - All other images: drawn to canvas and exported as JPEG
 * - PDFs: returned as-is
 * - Max width 1800px, 0.85 quality
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && file.type !== '') return file

  const baseName = file.name.replace(/\.\w+$/, '.jpg')
  const name = file.name.toLowerCase()
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
                 name.endsWith('.heic') || name.endsWith('.heif')

  // Step 1: convert HEIC → JPEG blob, or use file directly for other formats
  let sourceBlob: Blob
  if (isHeic) {
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
    sourceBlob = Array.isArray(result) ? result[0] : result
  } else {
    sourceBlob = file
  }

  // Step 2: resize via canvas if wider than 1800px
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(sourceBlob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX_W = 1800
      const scale = img.width > MAX_W ? MAX_W / img.width : 1
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('Image conversion failed'))
          resolve(new File([blob], baseName, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not process image'))
    }
    img.src = url
  })
}
