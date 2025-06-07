'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { format, differenceInCalendarDays } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Poll {
  id: string
  title: string
  category: string
  createdAt?: any
  deadline?: any
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
      setPolls(list)
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>🔥</span> 실시간 투표 목록
      </h1>

      {isLoading ? (
        <p className="text-gray-500">투표 불러오는 중...</p>
      ) : polls.length === 0 ? (
        <p className="text-gray-500">공개된 투표가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
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
                className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => handleClick(poll.id)}
              >
                <div className="block p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{poll.title}</h2>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>📂 <span className="font-bold">카테고리:</span> {poll.category}</p>
                    <p>🛠️ <span className="font-bold">제작일:</span> {createdText}</p>
                    <p>⏰ <span className="font-bold">마감일:</span> {deadlineText}</p>
                    <p>👥 <span className="font-bold">참여제한:</span> {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}









