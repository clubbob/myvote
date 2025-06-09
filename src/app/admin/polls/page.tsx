'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import Link from 'next/link'
import { format, differenceInCalendarDays, isValid } from 'date-fns'

interface Poll {
  id: string
  title: string
  category: string
  createdAt: Timestamp
  deadline?: string | Timestamp
  isPublic: boolean
  maxParticipants?: number
}

export default function AdminPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])

  useEffect(() => {
    const fetchPolls = async () => {
      const snapshot = await getDocs(collection(db, 'polls'))
      const pollList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Poll[]

      // 최신순 정렬
      pollList.sort((a, b) =>
        b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      )

      setPolls(pollList)
    }

    fetchPolls()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">📊 투표 목록</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map((poll) => {
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

          return (
            <div
              key={poll.id}
              className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition space-y-1"
            >
              <h2 className="text-xl font-bold break-words">{poll.title}</h2>

              <p className="text-sm">📂 카테고리: {poll.category}</p>
              <p className="text-sm">🛠️ 제작일: {format(createdDate, 'yyyy. M. d.')}</p>

              {isDeadlineValid && (
                <p className="text-sm">
                  ⏰ 마감일: {format(deadlineDate, 'yyyy. M. d.')} (
                  D{dday! >= 0 ? `-${dday}` : `+${Math.abs(dday!)}`})
                </p>
              )}

              <p className="text-sm">
                👥 참여제한: {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}
              </p>

              <Link
                href={`/admin/polls/${poll.id}/edit`}
                className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm mt-2"
              >
                ✏️ 수정
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
