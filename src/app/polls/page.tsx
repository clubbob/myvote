'use client'

import { useEffect, useState, useRef } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { format, differenceInCalendarDays } from 'date-fns'

interface Poll {
  id: string
  title: string
  category: string
  createdAt: string | Timestamp
  deadline?: string | Timestamp
  maxParticipants?: number
  isPublic: boolean
}

export default function PublicPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const hasFetchedRef = useRef(false)
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!hasFetchedRef.current) {
      fetchPolls()
      hasFetchedRef.current = true
    }
  }, [])

  const fetchPolls = async () => {
    setIsLoading(true)

    const baseQuery = query(
      collection(db, 'polls'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(9) // ✅ 9개씩 로드
    )

    const q = lastDoc ? query(baseQuery, startAfter(lastDoc)) : baseQuery
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      setHasMore(false)
      setIsLoading(false)
      return
    }

    const newPolls = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Poll[]

    setPolls(prev => [...prev, ...newPolls])
    setLastDoc(snapshot.docs[snapshot.docs.length - 1])
    if (snapshot.docs.length < 9) setHasMore(false)

    setIsLoading(false)
  }

  const handleClick = (pollId: string) => {
    if (!user) {
      alert('로그인 후 투표 내용을 확인할 수 있어요!')
      router.push('/login')
      return
    }

    router.push(`/polls/${pollId}`)
  }

  return (
    <div className="bg-gray-50 py-10 min-h-screen">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-purple-700 mb-8 flex items-center gap-2">
          🗳️ 전체 공개 투표
        </h1>

        {polls.length === 0 ? (
          <p className="text-gray-500">공개된 투표가 없습니다.</p>
        ) : (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {polls.map((poll) => {
                const createdDate = typeof poll.createdAt === 'string'
                  ? new Date(poll.createdAt)
                  : poll.createdAt.toDate()

                let deadlineDate: Date | null = null
                if (poll.deadline instanceof Timestamp) {
                  deadlineDate = poll.deadline.toDate()
                } else if (typeof poll.deadline === 'string') {
                  deadlineDate = new Date(poll.deadline)
                }

                const dday = deadlineDate
                  ? differenceInCalendarDays(deadlineDate, new Date())
                  : null

                return (
                  <li
                    key={poll.id}
                    className="bg-white p-5 rounded-2xl shadow-md hover:ring-2 hover:ring-purple-300 transition cursor-pointer"
                    onClick={() => handleClick(poll.id)}
                  >
                    <h2 className="text-lg font-semibold text-gray-900 mb-2 break-words whitespace-normal text-left">
                      {poll.title}
                    </h2>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p>📁 <strong>카테고리:</strong> {poll.category}</p>
                      <p>🛠 <strong>제작일:</strong> {format(createdDate, 'yyyy. M. d.')}</p>
                      {deadlineDate && (
                        <p>
                          ⏰ <strong>마감일:</strong> {format(deadlineDate, 'yyyy. M. d.')} (D-{dday})
                        </p>
                      )}
                      <p>
                        👥 <strong>참여제한:</strong>{' '}
                        {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={fetchPolls}
                  disabled={isLoading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50"
                >
                  {isLoading ? '불러오는 중...' : '더 보기'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}



