'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import Image from 'next/image'
import Link from 'next/link'
import Head from 'next/head'
import { format, differenceInCalendarDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import CommentSection from '@/components/comments/CommentSection'

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
  createdAt: string | { toDate: () => Date }
  deadline?: string
  maxParticipants?: number
  votedUsers?: string[]
  category: string
  mainImageUrl?: string
  password?: string
  createdBy?: string
}

export default function PollDetailPage() {
  const { id } = useParams()
  console.log('[페이지 디버깅] useParams id:', id)
  const router = useRouter()
  const { user } = useAuthStore()
  const [poll, setPoll] = useState<PollData | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordVerified, setPasswordVerified] = useState(false)

  useEffect(() => {
    const fetchPoll = async () => {
      const docRef = doc(db, 'polls', id as string)
      const snapshot = await getDoc(docRef)
      if (snapshot.exists()) {
        const data = snapshot.data() as PollData

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

        const isOwner = data.createdBy === user?.uid
        const alreadyVoted = user && data.votedUsers?.includes(user.uid)

        if (alreadyVoted) setHasVoted(true)
        if (isOwner || alreadyVoted) setPasswordVerified(true)

        setPoll(data)
      }
    }

    fetchPoll()
  }, [id, user])

  const handleVote = async () => {
    if (!poll || !selectedOptionId) return

    if (!user) {
      alert('투표에 참여하려면 로그인이 필요합니다.')
      router.push(`/login?redirect=/polls/${id}`)
      return
    }

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

    setPoll({
      ...poll,
      options: updatedOptions,
      votedUsers: [...(poll.votedUsers || []), user.uid],
    })
    setHasVoted(true)
  }

  const goToRandomPoll = async () => {
    const snapshot = await getDocs(
      query(
        collection(db, 'polls'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(10)
      )
    )

    const others = snapshot.docs
      .map(doc => ({ id: doc.id }))
      .filter(p => p.id !== id)

    if (others.length === 0) return
    const random = others[Math.floor(Math.random() * others.length)]
    router.push(`/polls/${random.id}`)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('📋 복사 완료! 친구에게 공유해보세요!')
  }

  if (!poll) return <p className="p-4">투표 정보를 불러오는 중...</p>

  const createdAtDate = typeof poll.createdAt === 'string'
    ? new Date(poll.createdAt)
    : poll.createdAt?.toDate?.() ?? new Date()

  const createdText = format(createdAtDate, 'yyyy. M. d.', { locale: ko })

  return (
    <>
      <Head>
        <title>{poll.title} | MyVote</title>
        <meta property="og:title" content={poll.title} />
        <meta property="og:description" content="내 투표에 참여해보세요!" />
        <meta property="og:image" content={poll.mainImageUrl ?? '/images/default_main.jpg'} />
        <meta property="og:url" content={`https://myvote.com/polls/${id}`} />
      </Head>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4 break-words whitespace-normal">{poll.title}</h1>

        <div className="mb-6">
          <Image
            src={poll.mainImageUrl?.trim() || '/images/default_main.jpg'}
            alt="대표 이미지"
            width={600}
            height={300}
            className="rounded-lg border object-cover"
          />
        </div>

        <div className="text-sm text-gray-700 space-y-1 mb-6">
          <p>📂 <b>카테고리:</b> {poll.category}</p>
          <p>🛠️ <b>제작일:</b> {createdText}</p>
          <p>⏰ <b>마감일:</b> 
            {poll.deadline 
              ? `${format(new Date(poll.deadline), 'yyyy. M. d.', { locale: ko })} (D-${Math.max(0, differenceInCalendarDays(new Date(poll.deadline), new Date()))})`
              : '마감일 없음'}
          </p>
          <p>👥 <b>참여제한:</b> {poll.maxParticipants ?? '제한 없음'}명</p>
        </div>

        <div className="space-y-4">
          {poll.options.map((option) => {
            const voteCount = option.votes?.length || 0
            const percent = poll.votedUsers?.length
              ? (voteCount / poll.votedUsers.length) * 100
              : 0
            const isMyVote = hasVoted && option.votes?.includes(user?.uid ?? '')
            const isSelected = selectedOptionId === option.id

            return (
              <div
                key={option.id}
                className={`p-4 rounded-lg bg-gray-100 relative cursor-pointer transition ${
                  isMyVote
                    ? 'border-2 border-green-600'
                    : isSelected
                      ? 'border-2 border-blue-500 bg-blue-50'
                      : 'border border-gray-200'
                }`}
                onClick={() => !hasVoted && setSelectedOptionId(option.id)}
              >
                <p className="mb-1 font-medium text-gray-800 flex items-center gap-1">
                  {option.text}
                  {isSelected && !hasVoted && (
                    <span className="text-blue-600 text-xs font-semibold bg-blue-100 px-2 py-0.5 rounded-full">
                      ✅ 선택됨
                    </span>
                  )}
                  {isMyVote && (
                    <span className="text-green-700 text-xs font-semibold bg-green-100 px-2 py-0.5 rounded-full">
                      👉 내가 선택함
                    </span>
                  )}
                </p>
                {option.imageUrl && (
                  <Image
                    src={option.imageUrl}
                    alt="Option image"
                    width={120}
                    height={120}
                    className="mt-2 rounded"
                  />
                )}
                {hasVoted && (
                  <>
                    <p className="text-sm text-gray-600">
                      {voteCount}표 · {percent.toFixed(1)}%
                    </p>
                    <div className="w-full bg-gray-300 h-2 rounded">
                      <div className="bg-blue-500 h-2 rounded" style={{ width: `${percent}%` }} />
                    </div>
                  </>
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
              <Link href="/create" className="inline-flex items-center gap-1 px-4 py-2 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition">
                ✏️ 새 투표 만들기
              </Link>
              <Link href="/mypage" className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200 transition">
                📋 마이페이지로 이동
              </Link>
              <button onClick={goToRandomPoll} className="inline-flex items-center gap-1 px-4 py-2 bg-purple-100 text-purple-800 rounded-full hover:bg-purple-200 transition">
                🔄 다른 투표 보기
              </button>
              <button onClick={handleCopyLink} className="inline-flex items-center gap-1 px-4 py-2 bg-green-100 text-green-800 rounded-full hover:bg-green-200 transition">
                📋 투표 공유하기
              </button>
            </div>
          </div>
        )}

        {/* 댓글 섹션 */}
        <div className="mt-10">
          <CommentSection pollId={id as string} />
        </div>
      </div>
    </>
  )
}

