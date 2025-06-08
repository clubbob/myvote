'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { format, differenceInCalendarDays } from 'date-fns'

interface Poll {
  id: string
  title: string
  category: string
  createdAt: Timestamp
  deadline?: string | Timestamp
  maxParticipants?: number
  isPublic: boolean
}

export default function PublicPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    const fetchPolls = async () => {
      const snapshot = await getDocs(collection(db, 'polls'))
      const pollList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as Poll[]

      const publicPolls = pollList
        .filter(poll => poll.isPublic)
        .sort(
          (a, b) =>
            b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
        )

      setPolls(publicPolls)
    }

    fetchPolls()
  }, [])

  const handleClick = (pollId: string) => {
    if (!user) {
      alert('로그인 후 투표 내용을 확인할 수 있어요!')
      router.push('/login')
      return
    }

    router.push(`/polls/${pollId}`)
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">🗳️ 전체 공개 투표</h1>

      <div className="space-y-4">
        {polls.map(poll => {
          const createdDate = poll.createdAt.toDate()
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
            <div
              key={poll.id}
              className="p-4 border rounded bg-white shadow-sm space-y-1 cursor-pointer hover:bg-gray-50 transition"
              onClick={() => handleClick(poll.id)}
            >
              <h2 className="text-xl font-semibold text-purple-800">
                {poll.title}
              </h2>
              <p className="text-sm">📁 <strong>카테고리:</strong> {poll.category}</p>
              <p className="text-sm">🛠 <strong>생성일:</strong> {format(createdDate, 'yyyy. M. d.')}</p>

              {deadlineDate && (
                <p className="text-sm">
                  ⏰ <strong>마감일:</strong> {format(deadlineDate, 'yyyy. M. d.')} (D-{dday})
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

