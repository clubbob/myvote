'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { db } from '@/lib/firebase'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import Link from 'next/link'
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

  // 관리자 이메일 확인
  useEffect(() => {
    if (!loading) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      const isAdmin = user?.email === adminEmail

      if (!user || !isAdmin) {
        router.replace('/')
      }
    }
  }, [user, loading, router])

  // 전체 투표 불러오기 + 최신순 정렬
  useEffect(() => {
    const fetchPolls = async () => {
      const snapshot = await getDocs(collection(db, 'polls'))
      const pollList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Poll[]

      // 🔽 최신순 정렬
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
      <h1 className="text-3xl font-bold text-purple-700 mb-6">📊 투표 현황</h1>

      <div className="space-y-4">
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
              className="p-4 border rounded shadow-sm bg-white space-y-1"
            >
              <h2 className="text-xl font-semibold">{poll.title}</h2>

              <p className="text-sm">
                {poll.isPublic ? '🔓 공개 투표' : '🔒 비공개 투표'}
              </p>
              <p className="text-sm">
                📁 <strong>카테고리:</strong> {poll.category}
              </p>
              <p className="text-sm">
                🛠 <strong>제작일:</strong>{' '}
                {format(createdDate, 'yyyy. M. d.')}
              </p>

              {isDeadlineValid && (
                <p className="text-sm">
                  ⏰ <strong>마감일:</strong>{' '}
                  {format(deadlineDate, 'yyyy. M. d.')} (
                  D{dday! >= 0 ? `-${dday}` : `+${Math.abs(dday!)}`})
                </p>
              )}

              <p className="text-sm">
                👥 <strong>참여제한:</strong>{' '}
                {poll.maxParticipants
                  ? `${poll.maxParticipants}명`
                  : '제한 없음'}
              </p>

              <Link
                href={`/admin/polls/${poll.id}`}
                className="text-blue-600 underline text-sm inline-block mt-1"
              >
                자세히 보기 →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}




