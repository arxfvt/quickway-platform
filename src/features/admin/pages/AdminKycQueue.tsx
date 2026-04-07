import { useState, useEffect } from 'react'
import {
  ShieldCheck, ShieldOff, Clock, FileText,
  CheckCircle2, XCircle, Loader2, AlertTriangle, ExternalLink,
} from 'lucide-react'
import { getKycDocuments, reviewDocument, getDocumentSignedUrl } from '../../../services/kyc.service'
import { getUsers, updateUserKycStatus } from '../../../services/users.service'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../../utils/date'
import { cn } from '../../../lib/utils'
import type { KycDocument } from '../../../types/kyc.types'
import type { User } from '../../../types/user.types'

// ─────────────────────────────────────────────────────────────────────────────

type KycFilter = 'pending' | 'approved' | 'rejected' | 'all'
type ReviewAction = 'approved' | 'rejected'

interface KycEntry {
  user: User
  documents: KycDocument[]
}

const DOC_TYPE_LABEL: Record<string, string> = {
  national_id:      'National ID',
  passport:         'Passport',
  driving_licence:  'Driving Licence',
  utility_bill:     'Utility Bill',
}

const STATUS_CHIP: Record<string, string> = {
  pending:       'bg-amber-light text-amber-dark',
  approved:      'bg-green-50 text-green-700',
  rejected:      'bg-red-50 text-red-600',
  not_submitted: 'bg-slate-100 text-slate-400',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminKycQueue() {
  const [entries, setEntries]       = useState<KycEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter]         = useState<KycFilter>('pending')
  const [rejectionNote, setRejectionNote] = useState('')
  const [isProcessing, setIsProcessing]   = useState(false)
  const [flash, setFlash]           = useState<{ id: string; action: ReviewAction } | null>(null)
  const [isLoading, setIsLoading]   = useState(true)
  const [docUrls, setDocUrls]       = useState<Record<string, string>>({})

  // Load all users + all KYC documents once; filter client-side by tab
  useEffect(() => {
    Promise.all([getUsers(), getKycDocuments()])
      .then(([users, docs]) => {
        const built: KycEntry[] = users
          .filter((u) => u.kyc_status !== 'not_submitted' || u.role === 'bidder')
          .map((u) => ({ user: u, documents: docs.filter((d) => d.user_id === u.id) }))
        setEntries(built)

        // Auto-select first pending user
        const firstPending = built.find((e) => e.user.kyc_status === 'pending')
        setSelectedId(firstPending?.user.id ?? built[0]?.user.id ?? null)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const filtered: KycEntry[] = entries.filter((e) => {
    if (filter === 'all')      return e.user.kyc_status !== 'not_submitted'
    return e.user.kyc_status === filter
  })

  const selected = entries.find((e) => e.user.id === selectedId) ?? null

  const pendingCount = entries.filter((e) => e.user.kyc_status === 'pending').length

  // Load signed URLs for documents of the selected user
  useEffect(() => {
    if (!selected) return
    selected.documents.forEach((doc) => {
      if (docUrls[doc.id]) return
      getDocumentSignedUrl(doc.storage_path)
        .then((url) => { if (url) setDocUrls((prev) => ({ ...prev, [doc.id]: url })) })
        .catch(() => {})
    })
  }, [selected?.user.id, selected?.documents.length])

  const handleReview = async (action: ReviewAction) => {
    if (!selected) return
    setIsProcessing(true)
    const reason = action === 'rejected'
      ? (rejectionNote.trim() || 'Document did not meet requirements.')
      : undefined

    try {
      // 1. Update profile kyc_status
      await updateUserKycStatus(selected.user.id, action)

      // 2. Sync any pending documents for this user
      await Promise.all(
        selected.documents
          .filter((d) => d.status === 'pending')
          .map((d) => reviewDocument(d.id, action, reason))
      )

      // 3. Send email notification on approval (fire-and-forget)
      if (action === 'approved') {
        supabase.functions.invoke('notify-kyc-approved', {
          body: { email: selected.user.email, fullName: selected.user.full_name },
        }).catch(() => {})
      }
    } catch { /* optimistic update below regardless */ }

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.user.id === selected.user.id
          ? {
              ...e,
              user: { ...e.user, kyc_status: action },
              documents: e.documents.map((d) =>
                d.status === 'pending'
                  ? { ...d, status: action, reviewed_at: new Date().toISOString(), rejection_reason: reason ?? null }
                  : d
              ),
            }
          : e
      )
    )

    setFlash({ id: selected.user.id, action })
    setRejectionNote('')
    setIsProcessing(false)
    setTimeout(() => setFlash(null), 3000)

    // Auto-advance to next pending
    const nextPending = entries.find(
      (e) => e.user.kyc_status === 'pending' && e.user.id !== selected.user.id
    )
    if (nextPending) setSelectedId(nextPending.user.id)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-brand" />
    </div>
  )

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">KYC Review Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">Review and approve identity verification for bidders.</p>
        </div>
        {pendingCount > 0 && (
          <span className="text-[11px] font-semibold bg-amber-light text-amber-dark px-3 py-1.5 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 h-auto lg:h-[calc(100vh-200px)] min-h-[500px]">

        {/* ── LEFT: User list ─────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Filter tabs */}
          <div className="flex border-b border-slate-100">
            {(['pending', 'approved', 'rejected', 'all'] as KycFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                  filter === f
                    ? 'text-brand border-b-2 border-brand'
                    : 'text-slate-400 hover:text-slate-600'
                )}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>

          {/* User list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <ShieldCheck size={28} strokeWidth={1} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">No users in this category</p>
              </div>
            ) : (
              filtered.map(({ user, documents }) => {
                const isSelected = user.id === selectedId
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedId(user.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      isSelected ? 'bg-brand-light' : 'hover:bg-slate-50'
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-bold',
                      user.kyc_status === 'pending'  ? 'bg-amber-light text-amber-dark'
                        : user.kyc_status === 'approved' ? 'bg-green-50 text-green-700'
                        : user.kyc_status === 'rejected' ? 'bg-red-50 text-red-600'
                        : 'bg-slate-100 text-slate-400'
                    )}>
                      {(user.full_name ?? user.email)[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {user.full_name ?? user.email}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </div>

                    {/* Doc count badge */}
                    {documents.length > 0 && (
                      <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full shrink-0">
                        {documents.length} doc{documents.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Detail & actions ─────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto">
          {selected ? (
            <>
              {/* User info card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {selected.user.full_name ?? selected.user.email}
                    </p>
                    <p className="text-xs text-slate-400">{selected.user.email}</p>
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold px-2.5 py-1 rounded-full',
                    STATUS_CHIP[selected.user.kyc_status]
                  )}>
                    {selected.user.kyc_status === 'pending'       ? 'Pending Review'
                      : selected.user.kyc_status === 'approved'   ? 'Approved'
                      : selected.user.kyc_status === 'rejected'   ? 'Rejected'
                      : 'Not Submitted'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Role</p>
                    <p className="font-medium text-slate-700 capitalize">{selected.user.role.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Joined</p>
                    <p className="font-medium text-slate-700">{formatDate(selected.user.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-400" />
                  Uploaded Documents
                  <span className="ml-auto text-[10px] text-slate-400 font-normal">
                    {selected.documents.length} file{selected.documents.length !== 1 ? 's' : ''}
                  </span>
                </p>

                {selected.documents.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl px-4 py-5 text-center text-slate-400">
                    <FileText size={24} strokeWidth={1} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">No documents uploaded</p>
                    <p className="text-[10px] mt-0.5">You can still approve this user manually</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                        <div className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                          doc.status === 'pending'  ? 'bg-amber-light'
                            : doc.status === 'approved' ? 'bg-green-50'
                            : 'bg-red-50'
                        )}>
                          {doc.status === 'pending'
                            ? <Clock size={12} className="text-amber-dark" />
                            : doc.status === 'approved'
                            ? <ShieldCheck size={12} className="text-green-600" />
                            : <ShieldOff size={12} className="text-red-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700">
                            {DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(doc.created_at)}</p>
                        </div>
                        {docUrls[doc.id] && (
                          <a
                            href={docUrls[doc.id]}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] font-semibold text-brand hover:underline shrink-0"
                          >
                            View <ExternalLink size={10} />
                          </a>
                        )}
                        {doc.rejection_reason && (
                          <div className="col-span-full mt-1 flex items-start gap-1.5 bg-red-50 rounded-lg px-2.5 py-1.5">
                            <AlertTriangle size={10} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-red-700">{doc.rejection_reason}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions — only for pending */}
              {selected.user.kyc_status === 'pending' && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Review Decision</p>

                  <textarea
                    placeholder="Rejection reason (required only if rejecting)…"
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors resize-none"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReview('approved')}
                      disabled={isProcessing}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                        isProcessing
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      )}
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Approve KYC
                    </button>
                    <button
                      onClick={() => handleReview('rejected')}
                      disabled={isProcessing}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                        isProcessing
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-red-50 hover:bg-red-100 text-red-600'
                      )}
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                      Reject KYC
                    </button>
                  </div>
                </div>
              )}

              {/* Flash feedback */}
              {flash && flash.id === selected.user.id && (
                <div className={cn(
                  'flex items-center gap-2 text-xs px-4 py-3 rounded-2xl',
                  flash.action === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                  {flash.action === 'approved'
                    ? <><CheckCircle2 size={13} />KYC approved — user can now bid.</>
                    : <><XCircle size={13} />KYC rejected.</>
                  }
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex items-center justify-center">
              <div className="text-center text-slate-300">
                <ShieldCheck size={40} strokeWidth={1} className="mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">Select a user to review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
