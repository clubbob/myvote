'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { format, differenceInCalendarDays } from 'date-fns'
import Image from 'next/image'

export default function AdminPollDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, loading } = useAuthStore()
  const [poll, setPoll] = useState<any>(null)

  useEffect(() => {
    if (!loading) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      const isAdmin = user?.email === adminEmail
      if (!user || !isAdmin) {
        router.replace('/')
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchPoll = async () => {
      if (!id) return
      const ref = doc(db, 'polls', id as string)
      const snapshot = await getDoc(ref)
      if (snapshot.exists()) {
        setPoll(snapshot.data())
      }
    }
    fetchPoll()
  }, [id])

  if (!poll) return <div className="p-6">로딩 중...</div>

  const deadline = poll.deadline?.toDate?.() || new Date(poll.deadline)
  const dday = differenceInCalendarDays(deadline, new Date())
  const totalVotes = poll.votedUsers?.length || 0
  const hasMainImage =
    typeof poll.mainImageUrl === 'string' && poll.mainImageUrl.trim() !== ''

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-purple-700 mb-4">🛠️ 관리자용 투표 상세</h1>

      <h2 className="text-2xl font-semibold mb-4">{poll.title}</h2>

      {/* ✅ 사용자 페이지처럼: 대표 이미지 */}
      <div className="mb-6">
        <Image
          src={
            hasMainImage
              ? poll.mainImageUrl
              : '/images/default_main.jpg'
          }
          alt="대표 이미지"
          width={600}
          height={300}
          className="rounded-lg border object-cover"
        />
      </div>

      <div className="text-sm text-gray-700 space-y-1 mb-6">
        <p>📁 <b>카테고리:</b> {poll.category}</p>
        <p>🛠️ <b>제작일:</b> {format(poll.createdAt.toDate(), 'yyyy. M. d.')}</p>
        <p>⏰ <b>마감일:</b> {format(deadline, 'yyyy. M. d.')} (D-{dday})</p>
        <p>🔓 <b>공개 여부:</b> {poll.isPublic ? '공개' : '비공개'}</p>
        <p>👥 <b>참여 제한:</b> {poll.maxParticipants || '제한 없음'}명</p>
      </div>

      {poll.options && poll.options.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-bold text-purple-700 mb-2">🗳️ 투표 항목</h3>
          {poll.options.map((option: any, index: number) => {
            const voteCount = option.votes?.length || 0
            const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
            const hasImage =
              typeof option.imageUrl === 'string' && option.imageUrl.trim() !== ''

            return (
              <div key={index} className="p-4 border rounded bg-gray-50 shadow-sm">
                <p className="font-semibold mb-2">✅ {option.text}</p>

                {hasImage && (
                  <img
                    src={option.imageUrl}
                    alt={option.text}
                    className="w-48 max-h-40 object-contain rounded border mb-2"
                  />
                )}

                <p className="text-sm text-gray-600 mb-1">
                  득표 수: {voteCount}표 · 비율: {percent}%
                </p>
                <div className="w-full bg-gray-300 h-2 rounded">
                  <div
                    className="bg-blue-500 h-2 rounded"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}




