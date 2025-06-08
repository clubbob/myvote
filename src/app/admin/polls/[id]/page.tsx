'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Timestamp } from 'firebase/firestore'
import { format, differenceInCalendarDays, isValid } from 'date-fns'

interface PollOption {
  id: string
  text: string
  imageUrl?: string
  votes?: string[]
}

interface PollData {
  title: string
  category: string
  createdAt: Timestamp
  deadline?: string | Timestamp
  isPublic: boolean
  maxParticipants?: number
  options: PollOption[]
  mainImageUrl?: string
}

export default function AdminPollDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [poll, setPoll] = useState<PollData | null>(null)

  useEffect(() => {
    const fetchPoll = async () => {
      const ref = doc(db, 'polls', String(id))
      const snapshot = await getDoc(ref)
      if (snapshot.exists()) {
        const data = snapshot.data() as PollData
        setPoll(data)
      }
    }

    if (id) fetchPoll()
  }, [id])

  if (!poll) return null

  const createdDate = poll.createdAt.toDate()

  let deadlineDate: Date | null = null
  if (poll.deadline instanceof Timestamp) {
    deadlineDate = poll.deadline.toDate()
  } else if (typeof poll.deadline === 'string') {
    deadlineDate = new Date(poll.deadline)
  }

  const isDeadlineValid = deadlineDate && isValid(deadlineDate)
  const dday = isDeadlineValid
    ? differenceInCalendarDays(deadlineDate, new Date())
    : null

  const totalVotes = poll.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0)

  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* 🔙 돌아가기 */}
      <button
        onClick={() => router.push('/admin/polls')}
        className="text-sm text-purple-600 hover:underline mb-4 inline-block"
      >
        ← 투표 현황으로 돌아가기
      </button>

      <h1 className="text-2xl font-bold text-purple-700 text-center mb-4">
        🛠 관리자용 투표 상세
      </h1>

      <h2 className="text-lg font-semibold text-center mb-4">{poll.title}</h2>

      {poll.mainImageUrl && (
        <img
          src={poll.mainImageUrl}
          alt="대표 이미지"
          className="w-full max-w-md mx-auto rounded mb-6"
        />
      )}

      <ul className="text-sm text-gray-700 space-y-1 mb-6">
        <li>📁 카테고리: {poll.category}</li>
        <li>🛠 제작일: {format(createdDate, 'yyyy. M. d.')}</li>
        {isDeadlineValid && (
          <li>
            ⏰ 마감일: {format(deadlineDate, 'yyyy. M. d.')} (D{dday! >= 0 ? `-${dday}` : `+${Math.abs(dday!)}`})
          </li>
        )}
        <li>🔐 공개 여부: {poll.isPublic ? '공개' : '비공개'}</li>
        <li>👥 참여 제한: {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}</li>
      </ul>

      <h3 className="text-xl font-bold text-purple-700 mb-3 text-center">📊 투표 항목</h3>

      <div className="space-y-4">
        {poll.options.map(option => {
          const count = option.votes?.length || 0
          const percentage = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100)

          return (
            <div key={option.id} className="border rounded p-4 bg-white shadow-sm">
              <p className="font-semibold mb-1">{option.text}</p>
              <p className="text-sm text-gray-600 mb-1 text-left">
                투표 수: {count}표 · 비율: {percentage}%
              </p>
              <div className="w-full bg-gray-200 h-2 rounded">
                <div
                  className="bg-blue-500 h-2 rounded"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}




