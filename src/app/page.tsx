'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { format, differenceInCalendarDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import Link from 'next/link'

interface Poll {
  id: string
  title: string
  category: string
  createdAt?: string
  deadline?: string
  maxParticipants?: number
}

export default function HomePage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const fetchPolls = async () => {
      const q = query(
        collection(db, 'polls'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const list = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title,
          category: data.category,
          createdAt: data.createdAt?.toDate().toISOString() ?? null,
          deadline: data.deadline?.toDate?.() instanceof Date
            ? data.deadline.toDate().toISOString()
            : typeof data.deadline === 'string'
            ? data.deadline
            : null,
          maxParticipants: data.maxParticipants ?? null,
        }
      })

      // 최대 6개까지만
      setPolls(list.slice(0, 6))
      setIsLoading(false)
    }

    fetchPolls()
  }, [])

  const handleClick = (pollId: string) => {
    if (!user) {
      alert('로그인 후 투표 가능합니다.')
      router.push('/login')
      return
    }
    router.push(`/polls/${pollId}`)
  }

  return (
    <div className="bg-gray-50 py-10 min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-3xl font-bold mb-8 text-purple-700 flex items-center gap-2">
          <span>🔥</span> 실시간 인기 투표
        </h1>

        {isLoading ? (
          <p className="text-gray-500">투표 불러오는 중...</p>
        ) : polls.length === 0 ? (
          <p className="text-gray-500">공개된 투표가 없습니다.</p>
        ) : (
          <>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {polls.map((poll) => {
                const createdText = poll.createdAt
                  ? format(new Date(poll.createdAt), 'yyyy. M. d.', { locale: ko })
                  : '날짜 없음'

                const deadlineText = poll.deadline
                  ? `${format(new Date(poll.deadline), 'yyyy. M. d.', { locale: ko })} (D-${differenceInCalendarDays(new Date(poll.deadline), new Date())})`
                  : '마감일 없음'

                return (
                  <li
                    key={poll.id}
                    className="bg-white p-5 rounded-2xl shadow-md hover:ring-2 hover:ring-purple-300 transition cursor-pointer"
                    onClick={() => handleClick(poll.id)}
                  >
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">{poll.title}</h2>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p>📂 <strong>카테고리:</strong> {poll.category}</p>
                      <p>🛠️ <strong>제작일:</strong> {createdText}</p>
                      <p>⏰ <strong>마감일:</strong> {deadlineText}</p>
                      <p>👥 <strong>참여제한:</strong> {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}</p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="mt-10 text-right">
              <Link
                href="/polls"
                className="inline-block text-purple-700 hover:underline font-medium"
              >
                전체 투표 보기 →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}










