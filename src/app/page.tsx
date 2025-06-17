'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  Timestamp,
  DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { differenceInCalendarDays } from 'date-fns'
import { useAuthStore } from '@/stores/authStore'

interface Poll {
  id: string
  title: string
  category: string
  createdAt: string | Timestamp
  deadline?: string | Timestamp
  mainImageUrl?: string
  isPublic?: boolean
  createdBy: string
  nickname?: string // 닉네임 매핑 후 추가됨
}

const PAGE_SIZE = 8

export default function HomePage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchPollsWithNicknames = async () => {
      const pollSnap = await getDocs(collection(db, 'polls'))
      const rawPolls = pollSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as DocumentData),
      })) as Poll[]

      // createdBy(uid) 목록 수집
      const uids = Array.from(new Set(rawPolls.map(p => p.createdBy)))

      // users 컬렉션에서 닉네임 매핑
      const userSnap = await getDocs(collection(db, 'users'))
      const userMap = new Map(
        userSnap.docs.map(doc => [doc.id, doc.data().nickname])
      )

      // poll에 nickname 추가
      const enrichedPolls: Poll[] = rawPolls.map(p => ({
        ...p,
        nickname: userMap.get(p.createdBy) || '익명',
      }))

      const now = new Date()
      const filteredPolls = enrichedPolls
        .filter(p => {
          const deadline =
            typeof p.deadline === 'string'
              ? new Date(p.deadline)
              : p.deadline?.toDate?.()
          return (
            p.isPublic !== false &&
            deadline &&
            deadline > now
          )
        })
        .sort((a, b) => {
          const aTime = typeof a.createdAt === 'string'
            ? new Date(a.createdAt).getTime()
            : a.createdAt.toDate().getTime()
          const bTime = typeof b.createdAt === 'string'
            ? new Date(b.createdAt).getTime()
            : b.createdAt.toDate().getTime()
          return bTime - aTime
        })

      setPolls(filteredPolls)
    }

    fetchPollsWithNicknames()
  }, [])

  const handleMore = () => {
    setVisibleCount(prev => prev + PAGE_SIZE)
  }

  const handleCreateClick = () => {
    if (!user) {
      alert('로그인 해 주세요')
      router.push('/login?redirect=/create')
      return
    }
    router.push('/create')
  }

  const handlePollClick = (id: string) => {
    if (!user) {
      alert('로그인 후 투표 내용을 확인할 수 있어요!')
      router.push('/login')
      return
    }
    router.push(`/polls/${id}`)
  }
  return (
    <div className="bg-white min-h-screen py-10 px-4">
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold text-purple-700 mb-3">🎉 PollsDay에 오신 걸 환영합니다!</h1>
        <p className="text-gray-600 text-lg">함께 투표하고, 나만의 투표도 만들어 보세요.</p>
        <div className="mt-6">
          <button
            onClick={handleCreateClick}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition"
          >
            ✏️ 지금 투표 만들기
          </button>
        </div>
      </section>

      {/* 실시간 인기 투표 */}
      <section className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">🔥 실시간 인기 투표</h2>

        {polls.length === 0 ? (
          <p className="text-gray-400">등록된 투표가 아직 없어요.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {polls.slice(0, visibleCount).map((poll) => {
                const deadlineDate =
                  typeof poll.deadline === 'string'
                    ? new Date(poll.deadline)
                    : poll.deadline?.toDate?.()
                const dDay = deadlineDate
                  ? differenceInCalendarDays(deadlineDate, new Date())
                  : ''

                return (
                  <div
                    key={poll.id}
                    className="cursor-pointer rounded-xl overflow-hidden shadow hover:ring-2 hover:ring-purple-300 transition"
                    onClick={() => handlePollClick(poll.id)}
                  >
                    <img
                      src={poll.mainImageUrl || '/images/default_main.jpg'}
                      alt="대표 이미지"
                      className="w-full aspect-[4/3] object-cover"
                    />
                    <div className="p-4">
                      <h3 className="text-base font-semibold text-neutral-900 line-clamp-2 break-words whitespace-normal">
                        {poll.title}
                      </h3>
                      <div className="text-sm text-gray-600 mt-1 flex justify-between items-center">
                        <div className="flex gap-2">
                          <span>📂 {poll.category}</span>
                          <span>• ⏳ D-{dDay}일</span>
                        </div>
                        {poll.nickname && (
                          <span className="text-xs text-gray-500 truncate">✏ {poll.nickname}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {visibleCount < polls.length && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleMore}
                  className="text-purple-600 hover:underline font-medium"
                >
                  ▼ 더 보기
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

