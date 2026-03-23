import { useState, useCallback, useEffect } from 'react'
import type { AuctionParticipation } from '../../../types/participation.types'
import {
  getParticipation,
  registerForAuction,
  submitBankTransferRef,
} from '../../../services/participation.service'
import { useAuthStore } from '../../../store/authStore'

// ─────────────────────────────────────────────────────────────────────────────

interface UseParticipationOptions {
  auctionId: string
  feeAmount: number
  currency: string
}

export function useParticipation({ auctionId, feeAmount, currency }: UseParticipationOptions) {
  const user = useAuthStore((s) => s.user)

  const [participation, setParticipation] = useState<AuctionParticipation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch participation on mount / when user changes
  useEffect(() => {
    if (!user) { setParticipation(null); return }
    getParticipation(auctionId, user.id).then(setParticipation).catch(() => {})
  }, [auctionId, user?.id])

  const register = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError('')
    try {
      const p = await registerForAuction(auctionId, user.id, feeAmount, currency)
      setParticipation(p)
    } catch {
      setError('Failed to register. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [user, auctionId, feeAmount, currency])

  const submitRef = useCallback(async (ref: string) => {
    if (!participation) return
    setIsLoading(true)
    setError('')
    try {
      await submitBankTransferRef(participation.id, ref)
      setParticipation((prev) =>
        prev
          ? { ...prev, bank_transfer_ref: ref, payment_status: 'pending_review', submitted_at: new Date().toISOString() }
          : prev
      )
    } catch {
      setError('Failed to submit reference. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [participation])

  const refresh = useCallback(() => {
    if (!user) return
    getParticipation(auctionId, user.id).then(setParticipation).catch(() => {})
  }, [user, auctionId])

  return { participation, register, submitRef, refresh, isLoading, error }
}
