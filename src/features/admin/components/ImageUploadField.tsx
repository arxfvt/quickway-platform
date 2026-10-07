import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { uploadAuctionImage } from '../../../services/auctions.service'
import { compressImage } from '../../../lib/imageUtils'

// ─────────────────────────────────────────────────────────────────────────────

interface ImageUploadFieldProps {
  value: string
  onChange: (url: string) => void
  /** If provided, the file is uploaded to Supabase Storage at this path and the
   *  public URL is returned.  Otherwise a local object URL is used (preview only). */
  uploadPath?: string
  label?: string
  className?: string
  /** Called with true when an upload starts and false when it ends */
  onBusyChange?: (busy: boolean) => void
}

export default function ImageUploadField({
  value,
  onChange,
  uploadPath,
  label,
  className,
  onBusyChange,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploadError('')

    if (uploadPath) {
      onBusyChange?.(true)
      try {
        setCompressing(true)
        const compressed = await compressImage(file)
        setCompressing(false)
        setUploading(true)
        // A new file name per upload, so replacing one photo never overwrites another
        const url = await uploadAuctionImage(compressed, `${uploadPath}-${Date.now()}.jpg`)
        onChange(url)
      } catch {
        setUploadError('Upload failed. Check your internet connection and try again.')
      } finally {
        setCompressing(false)
        setUploading(false)
        onBusyChange?.(false)
      }
    } else {
      // Fallback: local preview (no persistent URL)
      onChange(URL.createObjectURL(file))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">{label}</p>
      )}

      {value ? (
        /* ── Preview — click "Change" to replace without removing first ── */
        <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
          <img src={value} alt="Preview" className="w-full h-36 object-cover" />
          {(compressing || uploading) ? (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-1.5">
              <Loader2 size={20} className="text-brand animate-spin" />
              <p className="text-xs text-brand font-medium">{compressing ? 'Compressing…' : 'Uploading…'}</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-semibold transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
              >
                <ImagePlus size={11} />Change
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                aria-label="Remove image"
              >
                <X size={12} className="text-white" />
              </button>
            </>
          )}
        </div>
      ) : (
        /* ── Drop zone ── */
        <div
          role="button"
          tabIndex={0}
          onClick={() => !compressing && !uploading && inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && !compressing && !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 h-36 rounded-xl border-2 border-dashed transition-colors',
            (compressing || uploading)
              ? 'border-brand/40 bg-brand-light/30 cursor-wait'
              : 'border-slate-200 hover:border-brand/40 hover:bg-slate-50/50 cursor-pointer'
          )}
        >
          {compressing ? (
            <>
              <Loader2 size={20} className="text-brand animate-spin" />
              <p className="text-xs text-brand font-medium">Compressing…</p>
            </>
          ) : uploading ? (
            <>
              <Loader2 size={20} className="text-brand animate-spin" />
              <p className="text-xs text-brand font-medium">Uploading…</p>
            </>
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <ImagePlus size={16} className="text-slate-400" />
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-slate-600">Click to upload</p>
                <p className="text-[10px] text-slate-400">or drag and drop · PNG, JPG, WEBP</p>
              </div>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-[10px] text-red-500">{uploadError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={compressing || uploading}
        onChange={handleInputChange}
      />
    </div>
  )
}
