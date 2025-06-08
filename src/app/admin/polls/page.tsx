'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { db } from '@/lib/firebase'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { format, differenceInCalendarDays, isValid } from 'date-fns'

interface Poll {
  id: string
  title: string
  category: string
  createdAt: Timestamp
  deadline?: string | Timestamp
  maxParticipants?: number
  isPublic: boolean
}

export default function AdminPollsPage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()
  const [polls, setPolls] = useState<Poll[]>([])

  useEffect(() => {
    if (!loading) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      const isAdmin = user?.email === adminEmail

      if (!user || !isAdmin) {
        router.replace('/')
      }
    }
  }, [user, loading, router])

  useEffect(() => {
    const fetchPolls = async () => {
      const snapshot = await getDocs(collection(db, 'polls'))
      const pollList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Poll[]

      pollList.sort(
        (a, b) =>
          b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime()
      )

      setPolls(pollList)
    }

    if (user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      fetchPolls()
    }
  }, [user])

  if (loading || !user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return null
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-8">📊 투표 현황</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.map(poll => {
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
              onClick={() => router.push(`/admin/polls/${poll.id}`)}
              className="p-5 bg-white rounded-xl shadow border border-gray-200 hover:ring-2 hover:ring-purple-300 transition cursor-pointer space-y-1"
            >
              <h2 className="text-lg font-bold text-gray-800">{poll.title}</h2>
              <p className="text-sm text-gray-600">
                {poll.isPublic ? '🔓 공개 투표' : '🔒 비공개 투표'}
              </p>
              <p className="text-sm text-gray-600">📁 카테고리: {poll.category}</p>
              <p className="text-sm text-gray-600">
                🛠 제작일: {format(createdDate, 'yyyy. M. d.')}
              </p>
              {isDeadlineValid && (
                <p className="text-sm text-gray-600">
                  ⏰ 마감일: {format(deadlineDate, 'yyyy. M. d.')} (D{dday! >= 0 ? `-${dday}` : `+${Math.abs(dday!)}`})
                </p>
              )}
              <p className="text-sm text-gray-600">
                👥 참여제한: {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}




