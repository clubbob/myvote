'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { format, differenceInCalendarDays } from 'date-fns'
import Image from 'next/image'
import Link from 'next/link'

interface PollOption {
  id: string
  text: string
  imageUrl?: string
  votes?: string[]
}

interface PollData {
  title: string
  isPublic: boolean
  password?: string
  deadline?: string
  maxParticipants?: number
  mainImageUrl?: string
  options: PollOption[]
  category: string
  votedUsers?: string[]
  createdAt?: string
}

export default function AdminPollDetailPage() {
  const { id } = useParams()
  const [poll, setPoll] = useState<PollData | null>(null)

  useEffect(() => {
    const fetch = async () => {
      const ref = doc(db, 'polls', id as string)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data() as PollData
        setPoll(data)
      }
    }

    fetch()
  }, [id])

  if (!poll) return <div className="p-6">로딩 중...</div>

  const createdDate = poll.createdAt ? new Date(poll.createdAt) : null
  const deadlineDate = poll.deadline ? new Date(poll.deadline) : null
  const dday = deadlineDate
    ? differenceInCalendarDays(deadlineDate, new Date())
    : null

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link href="/admin/polls" className="text-sm text-purple-600 hover:underline mb-4 inline-block">
        ← 투표 현황으로 돌아가기
      </Link>

      <h1 className="text-2xl font-bold text-purple-700 mb-4">🛠️ 관리자용 투표 상세</h1>

      <h2 className="text-xl font-bold break-words whitespace-normal text-left mb-4">
        {poll.title}
      </h2>

      <div className="mb-6">
        <Image
          src={poll.mainImageUrl || '/images/default_main.jpg'}
          alt="대표 이미지"
          width={600}
          height={360}
          className="rounded border object-cover"
        />
      </div>

      <div className="text-sm text-gray-700 space-y-1 mb-6">
        <p>📂 <b>카테고리:</b> {poll.category}</p>
        {createdDate && <p>🛠 <b>제작일:</b> {format(createdDate, 'yyyy. M. d.')}</p>}
        {deadlineDate && (
          <p>⏰ <b>마감일:</b> {format(deadlineDate, 'yyyy. M. d.')} (D-{dday})</p>
        )}
        <p>🔐 <b>공개 여부:</b> {poll.isPublic ? '공개' : '비공개'}</p>
        <p>👥 <b>참여 제한:</b> {poll.maxParticipants ?? '제한 없음'}명</p>
      </div>

      <h3 className="text-xl font-semibold text-purple-700 mb-2">📊 투표 항목</h3>
      <ul className="space-y-4">
        {poll.options.map((option, i) => (
          <li key={option.id} className="border rounded p-4">
            <p className="font-semibold mb-2">항목 {i + 1}: {option.text}</p>
            {option.imageUrl && (
              <Image
                src={option.imageUrl}
                alt={`옵션 ${i + 1}`}
                width={240}
                height={160}
                className="rounded border"
              />
            )}
            <p className="text-sm text-gray-600 mt-2">
              투표 수: {option.votes?.length ?? 0}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

  





