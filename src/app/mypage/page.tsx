'use client'

import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { format, differenceInCalendarDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'

interface Poll {
  id: string
  title: string
  category: string
  isPublic: boolean
  createdAt?: string
  deadline?: string
  maxParticipants?: number
  password?: string
}

type FilterType = 'active' | 'closed'

export default function MyPage() {
  const { user } = useAuthStore()
  const [myPolls, setMyPolls] = useState<Poll[]>([])
  const [votedPolls, setVotedPolls] = useState<Poll[]>([])
  const [myFilter, setMyFilter] = useState<FilterType>('active')
  const [votedFilter, setVotedFilter] = useState<FilterType>('active')
  const [visibleMyCount, setVisibleMyCount] = useState(9)
  const [visibleVotedCount, setVisibleVotedCount] = useState(9)

  useEffect(() => {
    if (!user) return

    const fetchPolls = async () => {
      const createdQ = query(
        collection(db, 'polls'),
        where('createdBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const createdSnap = await getDocs(createdQ)
      const myList = createdSnap.docs.map(doc => formatPoll(doc.id, doc.data()))
      setMyPolls(myList)

      const votedQ = query(
        collection(db, 'polls'),
        where('votedUsers', 'array-contains', user.uid),
        orderBy('createdAt', 'desc')
      )
      const votedSnap = await getDocs(votedQ)
      const votedList = votedSnap.docs.map(doc => formatPoll(doc.id, doc.data()))
      setVotedPolls(votedList)
    }

    fetchPolls()
  }, [user])

  const formatPoll = (id: string, data: any): Poll => {
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
      id,
      title: data.title,
      category: data.category,
      isPublic: data.isPublic,
      createdAt,
      deadline,
      maxParticipants: data.maxParticipants ?? null,
      password: data.password ?? '',
    }
  }
  const handleCopy = (poll: Poll) => {
    const url = `${window.location.origin}/polls/${poll.id}`
    const text = poll.isPublic
      ? `📊 MyVote 투표에 참여해보세요!\n${url}`
      : `📊 MyVote 투표에 참여해보세요!\n${url}\n비밀번호: ${poll.password || ''}`

    navigator.clipboard.writeText(text)
    toast.success('복사되었습니다!')
  }

  const now = new Date()

  const filterPolls = (polls: Poll[], filter: FilterType) =>
    polls.filter((poll) => {
      if (!poll.deadline) return true
      const deadlineDate = new Date(poll.deadline)
      return filter === 'active'
        ? deadlineDate >= now
        : deadlineDate < now
    })

  const renderPollList = (polls: Poll[], visibleCount: number, isMine: boolean) =>
    polls.length === 0 ? (
      <p className="text-gray-500">표시할 투표가 없습니다.</p>
    ) : (
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {polls.slice(0, visibleCount).map((poll) => {
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
              className="min-w-[300px] bg-white p-5 rounded-2xl shadow-md hover:ring-2 hover:ring-purple-300 transition overflow-hidden"
            >
              <div className="flex justify-between items-start gap-2 mb-2">
                <h2 className="text-lg font-semibold text-gray-900 leading-snug w-full max-w-full">
                  <Link
                    href={`/polls/${poll.id}`}
                    className="hover:underline block break-words whitespace-normal"
                  >
                    {poll.title}
                  </Link>
                </h2>
                {!poll.isPublic && (
                  <span className="text-xs bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                    비공개
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-700 space-y-1 mb-3">
                <p>📂 <span className="font-bold">카테고리:</span> {poll.category}</p>
                <p>🛠️ <span className="font-bold">제작일:</span> {createdText}</p>
                <p>⏰ <span className="font-bold">마감일:</span> {deadlineText}</p>
                <p>👥 <span className="font-bold">참여제한:</span> {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}</p>
              </div>

              <div className="mt-4 text-right space-x-2">
                {isMine && (
                  <Link
                    href={`/mypage/polls/${poll.id}/edit`}
                    className="inline-block text-sm text-blue-600 hover:underline"
                  >
                    ✏️ 수정
                  </Link>
                )}
                <button
                  onClick={() => handleCopy(poll)}
                  className="bg-purple-600 text-white px-4 py-1.5 text-sm rounded-full hover:bg-purple-700 transition"
                >
                  📎 링크 복사
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    )

  return (
    <div className="bg-gray-50 py-10 min-h-screen">
      <div className="max-w-6xl mx-auto px-6">
        <h1 className="text-3xl font-bold mb-4 flex items-center gap-2">📋 내가 만든 투표</h1>
        <div className="flex gap-4 mb-6">
          <button
            className={`px-3 py-1 rounded-full ${myFilter === 'active' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            onClick={() => setMyFilter('active')}
          >
            진행중
          </button>
          <button
            className={`px-3 py-1 rounded-full ${myFilter === 'closed' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            onClick={() => setMyFilter('closed')}
          >
            마감됨
          </button>
        </div>
        {renderPollList(filterPolls(myPolls, myFilter), visibleMyCount, true)}
        {filterPolls(myPolls, myFilter).length > visibleMyCount && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setVisibleMyCount((prev) => prev + 9)}
              className="text-sm px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300"
            >
              더 보기
            </button>
          </div>
        )}

        <h1 className="text-3xl font-bold mt-12 mb-4 flex items-center gap-2">🗳️ 내가 참여한 투표</h1>
        <div className="flex gap-4 mb-6">
          <button
            className={`px-3 py-1 rounded-full ${votedFilter === 'active' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            onClick={() => setVotedFilter('active')}
          >
            진행중
          </button>
          <button
            className={`px-3 py-1 rounded-full ${votedFilter === 'closed' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800'}`}
            onClick={() => setVotedFilter('closed')}
          >
            마감됨
          </button>
        </div>
        {renderPollList(filterPolls(votedPolls, votedFilter), visibleVotedCount, false)}
        {filterPolls(votedPolls, votedFilter).length > visibleVotedCount && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setVisibleVotedCount((prev) => prev + 9)}
              className="text-sm px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300"
            >
              더 보기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

