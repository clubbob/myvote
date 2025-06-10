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
  createdAt: string | Timestamp
  deadline?: string | Timestamp
  isPublic: boolean
  maxParticipants?: number
}

export default function AdminPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [filter, setFilter] = useState<'active' | 'closed'>('active')
  const [visibleCount, setVisibleCount] = useState(9)

  useEffect(() => {
    const fetchPolls = async () => {
      const snapshot = await getDocs(collection(db, 'polls'))
      const pollList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Poll[]

      pollList.sort((a, b) => {
        const getTime = (v: any) =>
          typeof v === 'string' ? new Date(v).getTime() : v.toDate().getTime()
        return getTime(b.createdAt) - getTime(a.createdAt)
      })

      setPolls(pollList)
    }

    fetchPolls()
  }, [])

  const now = new Date()

  const filteredPolls = polls.filter(p => {
    if (!p.deadline) return filter === 'active'
    const deadline =
      typeof p.deadline === 'string'
        ? new Date(p.deadline)
        : p.deadline.toDate()
    return filter === 'active' ? deadline > now : deadline <= now
  })
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">📊 투표 목록</h1>

      {/* 필터 탭 */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            setFilter('active')
            setVisibleCount(9)
          }}
          className={`px-4 py-1 rounded-full text-sm ${
            filter === 'active' ? 'bg-gray-800 text-white' : 'bg-gray-200'
          }`}
        >
          진행중
        </button>
        <button
          onClick={() => {
            setFilter('closed')
            setVisibleCount(9)
          }}
          className={`px-4 py-1 rounded-full text-sm ${
            filter === 'closed' ? 'bg-purple-600 text-white' : 'bg-gray-200'
          }`}
        >
          마감됨
        </button>
      </div>

      {/* 투표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPolls.slice(0, visibleCount).map((poll) => {
          const createdDate =
            typeof poll.createdAt === 'string'
              ? new Date(poll.createdAt)
              : poll.createdAt.toDate()

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
              className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition space-y-1 relative"
            >
              <h2 className="text-xl font-bold break-words whitespace-normal text-left">
                <Link
                  href={`/admin/polls/${poll.id}`}
                  className="text-purple-800 hover:underline break-words whitespace-normal"
                >
                  {poll.title}
                </Link>
                {!poll.isPublic && (
                  <span className="text-xs text-white bg-red-400 rounded-full px-2 py-0.5 ml-2 whitespace-nowrap">
                    비공개
                  </span>
                )}
              </h2>

              <p className="text-sm">📂 카테고리: {poll.category}</p>
              <p className="text-sm">🛠 제작일: {format(createdDate, 'yyyy. M. d.')}</p>

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

      {/* 더 보기 버튼 */}
      {visibleCount < filteredPolls.length && (
        <div className="text-center mt-6">
          <button
            onClick={() => setVisibleCount(prev => prev + 9)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            🔽 더 보기
          </button>
        </div>
      )}
    </div>
  )
}

