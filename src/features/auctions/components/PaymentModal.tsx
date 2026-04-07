import { useRef, useState } from 'react'
import { X, Ticket, CheckCircle2, AlertCircle, Copy, Loader2, Paperclip } from 'lucide-react'
import { formatCurrency } from '../../../utils/currency'
import { cn } from '../../../lib/utils'
import type { AuctionParticipation } from '../../../types/participation.types'

// ─────────────────────────────────────────────────────────────────────────────

interface PaymentModalProps {
  auctionTitle: string
  feeAmount: number
  currency: string
  bankDetails: string
  participation: AuctionParticipation | null
  onClose: () => void
  onRegister: () => void
  onSubmitRef: (ref: string, proofFile?: File) => void
  isLoading: boolean
}

type Step = 'details' | 'reference' | 'confirmed'

export default function PaymentModal({
  auctionTitle,
  feeAmount,
  currency,
  bankDetails,
  participation,
  onClose,
  onRegister,
  onSubmitRef,
  isLoading,
}: PaymentModalProps) {
  const [step, setStep] = useState<Step>(() => {
    if (!participation || participation.payment_status === 'unpaid') return 'details'
    if (participation.payment_status === 'pending_review') return 'confirmed'
    if (participation.payment_status === 'rejected') return 'reference'
    return 'details'
  })
  const [ref, setRef] = useState(participation?.bank_transfer_ref ?? '')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [copied, setCopied] = useState(false)
  const proofInputRef = useRef<HTMLInputElement>(null)

  const formattedFee = formatCurrency(feeAmount, currency, 'en-UG')

  const copyBankDetails = () => {
    navigator.clipboard.writeText(bankDetails).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegisterAndContinue = () => {
    if (!participation) onRegister()
    setStep('reference')
  }

  const handleSubmit = () => {
    if (!ref.trim()) return
    onSubmitRef(ref.trim(), proofFile ?? undefined)
    setStep('confirmed')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Ticket size={16} className="text-brand" />
                <h2 className="text-sm font-bold text-slate-900">Register for Auction</h2>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{auctionTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-100">
            {(['details', 'reference', 'confirmed'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                  step === s
                    ? 'bg-brand text-white'
                    : (['details', 'reference', 'confirmed'].indexOf(step) > i)
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                )}>
                  {(['details', 'reference', 'confirmed'].indexOf(step) > i) ? '✓' : i + 1}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  step === s ? 'text-brand' : 'text-slate-400'
                )}>
                  {s === 'details' ? 'Fee Details' : s === 'reference' ? 'Submit Ref' : 'Done'}
                </span>
                {i < 2 && <div className="w-6 h-px bg-slate-200" />}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="p-5">

            {/* Step 1: Fee details + bank info */}
            {step === 'details' && (
              <div className="space-y-4">
                <div className="bg-brand-light rounded-xl p-4 text-center">
                  <p className="text-[11px] text-brand mb-1">Participation Fee</p>
                  <p className="text-2xl font-bold text-brand">{formattedFee}</p>
                  <p className="text-[10px] text-brand/70 mt-1">{currency}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-700">Bank Transfer Details</p>
                    <button
                      onClick={copyBankDetails}
                      className="flex items-center gap-1 text-[10px] text-brand hover:underline"
                    >
                      <Copy size={10} />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3.5 text-[11px] text-slate-600 leading-relaxed whitespace-pre-line border border-slate-100">
                    {bankDetails}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Make the bank transfer using the details above, then click below to submit your reference number. Your participation will be approved within 24 hours.
                </p>

                <button
                  onClick={handleRegisterAndContinue}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  {isLoading && <Loader2 size={14} className="animate-spin" />}
                  I've Made the Transfer →
                </button>
              </div>
            )}

            {/* Step 2: Submit reference */}
            {step === 'reference' && (
              <div className="space-y-4">
                {participation?.payment_status === 'rejected' && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Previous payment was rejected</p>
                      {participation.rejection_reason && (
                        <p className="mt-0.5 text-red-600/80">{participation.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Bank Transfer Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    placeholder="e.g. EQB-20250301-001234"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Enter the reference number from your bank transfer receipt.
                  </p>
                </div>

                {/* Proof upload */}
                <div>
                  <p className="text-xs font-medium text-slate-700 mb-1.5">
                    Upload Payment Proof <span className="text-slate-400 font-normal">(optional)</span>
                  </p>
                  {proofFile ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50">
                      <Paperclip size={12} className="text-brand shrink-0" />
                      <span className="text-[11px] text-slate-700 truncate flex-1">{proofFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setProofFile(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => proofInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-slate-200 hover:border-brand/40 text-[11px] text-slate-500 hover:text-brand transition-colors"
                    >
                      <Paperclip size={12} />
                      Attach screenshot or PDF
                    </button>
                  )}
                  <input
                    ref={proofInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) setProofFile(f)
                      e.target.value = ''
                    }}
                  />
                </div>

                <p className="text-[10px] text-slate-400 bg-amber-light border border-amber/20 rounded-xl px-3 py-2.5 leading-relaxed text-amber-dark">
                  Make sure the amount transferred matches exactly: <strong>{formattedFee}</strong>. Use your registered email as the payment reference/narration.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep('details')}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!ref.trim() || isLoading}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                      !ref.trim() || isLoading
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-brand hover:bg-brand-dark text-white'
                    )}
                  >
                    {isLoading && <Loader2 size={14} className="animate-spin" />}
                    Submit Reference
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmed */}
            {step === 'confirmed' && (
              <div className="text-center space-y-4 py-2">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} className="text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-1">Reference Submitted!</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Your payment reference has been submitted. An admin will verify and approve your participation within <strong>24 hours</strong>.
                  </p>
                </div>
                {ref && (
                  <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs">
                    <p className="text-slate-400 mb-0.5">Your reference</p>
                    <p className="font-mono font-semibold text-slate-700">{ref}</p>
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="w-full bg-brand hover:bg-brand-dark text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
