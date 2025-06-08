'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

interface Poll {
  id: string
  title: string
  category: string
  createdAt: Timestamp
  mainImageUrl?: string
}

export default function HomePage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [visibleCount, setVisibleCount] = useState(6)
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    const fetchPolls = async () => {
      const snapshot = await getDocs(collection(db, 'polls'))
      const pollList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() })) as Poll[]
      const publicPolls = pollList
        .filter(p => p.mainImageUrl)
        .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
      setPolls(publicPolls)
    }

    fetchPolls()
  }, [])

  const handleMore = () => {
    setVisibleCount(prev => prev + 10)
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
        <h1 className="text-4xl font-bold text-purple-700 mb-3">🎉 MyVote에 오신 걸 환영합니다!</h1>
        <p className="text-gray-600 text-lg">
          팬들과 함께 투표하고, 나만의 투표도 만들어 보세요.
        </p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {polls.slice(0, visibleCount).map((poll) => (
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
                    <h3 className="font-semibold text-lg">{poll.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      📂 {poll.category} · 🛠 {format(poll.createdAt.toDate(), 'yyyy. M. d.')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {visibleCount < polls.length && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleMore}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  더 보기
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
