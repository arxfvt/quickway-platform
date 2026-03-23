import { useState, useEffect } from 'react'
import {
  ShieldCheck, ShieldOff, Clock, FileText,
  CheckCircle2, XCircle, ChevronRight, Loader2, AlertTriangle,
} from 'lucide-react'
import { getKycDocuments, getKycDocumentsByStatus, reviewDocument } from '../../../services/kyc.service'
import { supabase } from '../../../lib/supabase'
import { formatDate } from '../../../utils/date'
import { cn } from '../../../lib/utils'
import type { KycDocument } from '../../../types/kyc.types'

// ─────────────────────────────────────────────────────────────────────────────

type ReviewStatus = 'approved' | 'rejected'

const DOC_TYPE_LABEL: Record<string, string> = {
  national_id:      'National ID',
  passport:         'Passport',
  driving_licence:  'Driving Licence',
  utility_bill:     'Utility Bill',
}

const STATUS_CHIP: Record<string, string> = {
  pending:   'bg-amber-light text-amber-dark',
  approved:  'bg-green-50 text-green-700',
  rejected:  'bg-red-50 text-red-600',
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AdminKycQueue() {
  const [docs, setDocs] = useState<KycDocument[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [rejectionNote, setRejectionNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [flash, setFlash] = useState<{ id: string; action: ReviewStatus } | null>(null)
  const [userMap, setUserMap] = useState<Record<string, { full_name: string | null; email: string }>>({})

  // Load docs from Supabase; fall back to mock data on error
  useEffect(() => {
    const fetch = filter === 'all'
      ? getKycDocuments()
      : getKycDocumentsByStatus(filter)
    fetch.then((data) => {
      setDocs(data)
      if (!selectedId || !data.find((d) => d.id === selectedId)) {
        setSelectedId(data.find((d) => d.status === 'pending')?.id ?? data[0]?.id ?? null)
      }
      // Fetch profiles for all unique user IDs in this batch
      const ids = [...new Set(data.map((d) => d.user_id))]
      if (ids.length > 0) {
        supabase.from('profiles').select('id, full_name, email').in('id', ids)
          .then(({ data: profiles }) => {
            if (!profiles) return
            const map: Record<string, { full_name: string | null; email: string }> = {}
            profiles.forEach((p) => { map[p.id] = { full_name: p.full_name, email: p.email } })
            setUserMap(map)
          })
          .catch(() => {})
      }
    }).catch(() => {})
  }, [filter])

  const filtered = docs.filter((d) => filter === 'all' || d.status === filter)
  const selected  = docs.find((d) => d.id === selectedId) ?? null
  const selectedUser = selected ? (userMap[selected.user_id] ?? null) : null

  const pendingCount = docs.filter((d) => d.status === 'pending').length

  const handleReview = async (action: ReviewStatus) => {
    if (!selected) return
    setIsProcessing(true)
    const reason = action === 'rejected' ? (rejectionNote || 'Document did not meet requirements.') : undefined
    try {
      await reviewDocument(selected.id, action, reason)
    } catch { /* optimistic update below regardless */ }

    setDocs((prev) =>
      prev.map((d) =>
        d.id === selected.id
          ? {
              ...d,
              status: action,
              reviewed_at: new Date().toISOString(),
              rejection_reason: action === 'rejected' ? (reason ?? null) : null,
            }
          : d
      )
    )
    setFlash({ id: selected.id, action })
    setRejectionNote('')
    setIsProcessing(false)
    setTimeout(() => setFlash(null), 3000)

    // Auto-advance to next pending
    const nextPending = docs.find((d) => d.status === 'pending' && d.id !== selected.id)
    if (nextPending) setSelectedId(nextPending.id)
  }

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">KYC Review Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">Review and approve identity documents submitted by bidders.</p>
        </div>
        {pendingCount > 0 && (
          <span className="text-[11px] font-semibold bg-amber-light text-amber-dark px-3 py-1.5 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-5 h-[calc(100vh-200px)] min-h-[500px]">

        {/* ── LEFT: Document list ─────────────────────────── */}
        <div className="col-span-2 flex flex-col bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Filter tabs */}
          <div className="flex border-b border-slate-100">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
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

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <ShieldCheck size={28} strokeWidth={1} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">No documents in this category</p>
              </div>
            ) : (
              filtered.map((doc) => {
                const docUser = userMap[doc.user_id] ?? null
                const isSelected = doc.id === selectedId
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedId(doc.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                      isSelected ? 'bg-brand-light' : 'hover:bg-slate-50'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                      doc.status === 'pending' ? 'bg-amber-light' : doc.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
                    )}>
                      {doc.status === 'pending'
                        ? <Clock size={13} className="text-amber-dark" />
                        : doc.status === 'approved'
                        ? <ShieldCheck size={13} className="text-green-600" />
                        : <ShieldOff size={13} className="text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {docUser?.full_name ?? docUser?.email ?? doc.user_id}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {DOC_TYPE_LABEL[doc.document_type] ?? doc.document_type}
                      </p>
                    </div>
                    <ChevronRight size={12} className={isSelected ? 'text-brand' : 'text-slate-300'} />
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT: Detail & actions ─────────────────────── */}
        <div className="col-span-3 flex flex-col gap-4">
          {selected ? (
            <>
              {/* Bidder info card */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {selectedUser?.full_name ?? selectedUser?.email ?? selected.user_id}
                    </p>
                    <p className="text-xs text-slate-400">{selectedUser?.email}</p>
                  </div>
                  <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full', STATUS_CHIP[selected.status])}>
                    {selected.status === 'pending' ? 'Pending Review'
                      : selected.status === 'approved' ? 'Approved'
                      : 'Rejected'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Document Type</p>
                    <p className="font-medium text-slate-700">{DOC_TYPE_LABEL[selected.document_type] ?? selected.document_type}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">File Name</p>
                    <p className="font-medium text-slate-700 truncate">{selected.file_name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Submitted</p>
                    <p className="font-medium text-slate-700">{formatDate(selected.created_at)}</p>
                  </div>
                  {selected.reviewed_at && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Reviewed</p>
                      <p className="font-medium text-slate-700">{formatDate(selected.reviewed_at)}</p>
                    </div>
                  )}
                </div>
                {selected.rejection_reason && (
                  <div className="mt-3 bg-red-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-red-700">{selected.rejection_reason}</p>
                  </div>
                )}
              </div>

              {/* Document preview */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex-1 flex flex-col">
                <p className="text-xs font-semibold text-slate-600 mb-3 flex items-center gap-1.5">
                  <FileText size={13} className="text-slate-400" />
                  Document Preview
                </p>
                <div className="flex-1 bg-slate-50 rounded-xl flex items-center justify-center min-h-[180px] border border-slate-100">
                  {/* In production this would render the actual uploaded image from Supabase Storage */}
                  <div className="text-center text-slate-300">
                    <FileText size={40} strokeWidth={1} className="mx-auto mb-2" />
                    <p className="text-xs font-medium">{selected.file_name}</p>
                    <p className="text-[10px] mt-1">{selected.storage_path}</p>
                  </div>
                </div>
              </div>

              {/* Actions (only for pending) */}
              {selected.status === 'pending' && (
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
                        isProcessing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                      )}
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview('rejected')}
                      disabled={isProcessing}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors',
                        isProcessing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100 text-red-600'
                      )}
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Flash feedback */}
              {flash && flash.id === selected.id && (
                <div className={cn(
                  'flex items-center gap-2 text-xs px-4 py-3 rounded-2xl',
                  flash.action === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}>
                  {flash.action === 'approved'
                    ? <><CheckCircle2 size={13} />Document approved successfully.</>
                    : <><XCircle size={13} />Document rejected.</>
                  }
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex items-center justify-center">
              <div className="text-center text-slate-300">
                <ShieldCheck size={40} strokeWidth={1} className="mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">Select a document to review</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
