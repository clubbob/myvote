'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import Image from 'next/image'
import Link from 'next/link'
import { format, differenceInCalendarDays } from 'date-fns'
import { ko } from 'date-fns/locale'

interface PollOption {
  id: string
  text: string
  imageUrl?: string
  votes?: string[]
}

interface PollData {
  title: string
  options: PollOption[]
  isPublic: boolean
  createdAt: any
  deadline?: string
  maxParticipants?: number
  votedUsers?: string[]
  category: string
}

export default function PollDetailPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const [poll, setPoll] = useState<PollData | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)

  useEffect(() => {
    const fetchPoll = async () => {
      const docRef = doc(db, 'polls', id as string)
      const snapshot = await getDoc(docRef)
      if (snapshot.exists()) {
        const data = snapshot.data() as PollData

        // ✅ 마감일 타입 안전 처리
        const rawDeadline = data.deadline
        let deadlineFormatted: string | undefined = undefined

        if (typeof rawDeadline === 'string') {
          const d = new Date(rawDeadline)
          if (!isNaN(d.getTime())) {
            deadlineFormatted = d.toISOString().slice(0, 10)
          }
        } else if (
          typeof rawDeadline === 'object' &&
          rawDeadline !== null &&
          'toDate' in rawDeadline &&
          typeof (rawDeadline as any).toDate === 'function'
        ) {
          const d = (rawDeadline as any).toDate()
          if (!isNaN(d.getTime())) {
            deadlineFormatted = d.toISOString().slice(0, 10)
          }
        }

        data.deadline = deadlineFormatted
        setPoll(data)

        if (user && data.votedUsers?.includes(user.uid)) {
          setHasVoted(true)
        }
      }
    }

    fetchPoll()
  }, [id, user])

  const handleVote = async () => {
    if (!poll || !user || !selectedOptionId) return

    const docRef = doc(db, 'polls', id as string)
    const updatedOptions = poll.options.map((option) => {
      if (option.id === selectedOptionId) {
        return {
          ...option,
          votes: option.votes ? [...option.votes, user.uid] : [user.uid],
        }
      }
      return option
    })

    await updateDoc(docRef, {
      options: updatedOptions,
      votedUsers: arrayUnion(user.uid),
    })

    setPoll({ ...poll, options: updatedOptions, votedUsers: [...(poll.votedUsers || []), user.uid] })
    setHasVoted(true)
  }

  if (!poll) return <p className="p-4">투표 정보를 불러오는 중...</p>

  const totalVotes = poll.options.reduce(
    (acc, option) => acc + (option.votes?.length || 0),
    0
  )

  const createdText = poll.createdAt?.toDate
    ? format(poll.createdAt.toDate(), 'yyyy. M. d.', { locale: ko })
    : '날짜 없음'

  const deadlineText = poll.deadline
    ? `${format(new Date(poll.deadline), 'yyyy. M. d.', { locale: ko })} (D-${Math.max(
        0,
        differenceInCalendarDays(new Date(poll.deadline), new Date())
      )})`
    : '마감일 없음'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{poll.title}</h1>

      <div className="text-sm text-gray-700 space-y-1 mb-6">
        <p>📂 <b>카테고리:</b> {poll.category}</p>
        <p>🛠️ <b>제작일:</b> {createdText}</p>
        <p>⏰ <b>마감일:</b> {deadlineText}</p>
        <p>👥 <b>참여제한:</b> {poll.maxParticipants ?? '제한 없음'}명</p>
      </div>

      <div className="space-y-4">
        {poll.options.map((option) => {
          const voteCount = option.votes?.length || 0
          const percent = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0

          return (
            <div
              key={option.id}
              className={`p-4 rounded-lg bg-gray-100 cursor-pointer ${
                selectedOptionId === option.id ? 'ring-2 ring-blue-500' : ''
              }`}
              style={{ opacity: hasVoted ? 1 : 0.8 }}
              onClick={() => !hasVoted && setSelectedOptionId(option.id)}
            >
              <p className="mb-1">{option.text}</p>
              {hasVoted ? (
                <>
                  <p className="text-sm text-gray-600">{voteCount}표 · {percent.toFixed(1)}%</p>
                  <div className="w-full bg-gray-300 h-2 rounded">
                    <div
                      className="bg-blue-500 h-2 rounded"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </>
              ) : (
                option.imageUrl && (
                  <Image
                    src={option.imageUrl}
                    alt="Option image"
                    width={120}
                    height={120}
                    className="mt-2 rounded"
                  />
                )
              )}
            </div>
          )
        })}
      </div>

      {!hasVoted && (
        <button
          onClick={handleVote}
          disabled={!selectedOptionId}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
        >
          투표하기
        </button>
      )}

      {hasVoted && (
        <div className="mt-6">
          <p className="text-green-600 font-semibold">투표해 주셔서 감사합니다!</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-1 px-4 py-2 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition"
            >
              ✏️ 새 투표 만들기
            </Link>
            <Link
              href="/mypage"
              className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition"
            >
              📋 마이페이지로 이동
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-4 py-2 bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition"
            >
              🏠 메인으로 가기
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

