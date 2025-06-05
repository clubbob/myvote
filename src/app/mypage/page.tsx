'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'
import { format, differenceInCalendarDays } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Poll {
  id: string
  title: string
  category: string
  isPublic: boolean
  createdAt?: string
  deadline?: string
  maxParticipants?: number
}

export default function MyPage() {
  const { user } = useAuthStore()
  const [polls, setPolls] = useState<Poll[]>([])

  useEffect(() => {
    if (!user) return

    const fetchPolls = async () => {
      const q = query(
        collection(db, 'polls'),
        where('createdBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)

      const list = snapshot.docs.map(doc => {
        const data = doc.data()
        const createdAt =
          data.createdAt?.toDate instanceof Function
            ? data.createdAt.toDate().toISOString()
            : typeof data.createdAt === 'string'
            ? data.createdAt
            : null

        const deadline =
          data.deadline?.toDate instanceof Function
            ? data.deadline.toDate().toISOString()
            : typeof data.deadline === 'string'
            ? data.deadline
            : null

        return {
          id: doc.id,
          title: data.title,
          category: data.category,
          isPublic: data.isPublic,
          createdAt,
          deadline,
          maxParticipants: data.maxParticipants ?? null,
        }
      })

      setPolls(list)
    }

    fetchPolls()
  }, [user])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>📋</span> 내가 만든 투표
      </h1>

      {polls.length === 0 ? (
        <p className="text-gray-500">아직 만든 투표가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {polls.map((poll) => {
            const createdText = poll.createdAt
              ? format(new Date(poll.createdAt), 'yyyy. M. d.', { locale: ko })
              : '날짜 없음'

            const deadlineDate = poll.deadline ? new Date(poll.deadline) : null
            const isValidDeadline = deadlineDate && !isNaN(deadlineDate.getTime())

            const deadlineText = isValidDeadline
              ? `${format(deadlineDate, 'yyyy. M. d.', { locale: ko })} (D-${Math.max(
                  0,
                  differenceInCalendarDays(deadlineDate, new Date())
                )})`
              : '마감일 없음'

            return (
              <li
                key={poll.id}
                className="border border-gray-200 rounded-xl bg-white shadow-md hover:shadow-lg transition duration-200"
              >
                <Link href={`/polls/${poll.id}`} className="block p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold text-gray-900">{poll.title}</h2>
                    {!poll.isPublic && (
                      <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full">
                        비공개
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>📂 <span className="font-bold">카테고리:</span> {poll.category}</p>
                    <p>🛠️ <span className="font-bold">제작일:</span> {createdText}</p>
                    <p>⏰ <span className="font-bold">마감일:</span> {deadlineText}</p>
                    <p>👥 <span className="font-bold">참여제한:</span> {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}</p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}








