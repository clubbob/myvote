'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  getCountFromServer,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore'
import { deleteObject, ref } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
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
  isDisabled?: boolean
  createdAt?: string
  deadline?: string
  maxParticipants?: number
  password?: string
  voteCount?: number
}

type FilterType = 'active' | 'closed'

export default function MyPage() {
  const { user } = useAuthStore()
  const [myPolls, setMyPolls] = useState<Poll[]>([])
  const [votedPolls, setVotedPolls] = useState<Poll[]>([])

  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([])

  const [myFilter, setMyFilter] = useState<FilterType>('active')
  const [votedFilter, setVotedFilter] = useState<FilterType>('active')

  const [mySearchInput, setMySearchInput] = useState('')
  const [mySelectedCategory, setMySelectedCategory] = useState('')
  const [myFilteredPolls, setMyFilteredPolls] = useState<Poll[]>([])
  const [visibleMyCount, setVisibleMyCount] = useState(9)

  const [votedSearchInput, setVotedSearchInput] = useState('')
  const [votedSelectedCategory, setVotedSelectedCategory] = useState('')
  const [votedFilteredPolls, setVotedFilteredPolls] = useState<Poll[]>([])
  const [visibleVotedCount, setVisibleVotedCount] = useState(9)

  const now = new Date()

  useEffect(() => {
    if (!user) return

    const fetchPolls = async () => {
      const createdQ = query(
        collection(db, 'polls'),
        where('createdBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const createdSnap = await getDocs(createdQ)
      const myList = await Promise.all(
        createdSnap.docs.map(async doc => {
          const data = doc.data()
          const voteCountSnap = await getCountFromServer(collection(db, `polls/${doc.id}/votes`))
          return formatPoll(doc.id, data, voteCountSnap.data().count)
        })
      )
      setMyPolls(myList)
      setMyFilteredPolls(myList)

      const votedQ = query(
        collection(db, 'polls'),
        where('votedUsers', 'array-contains', user.uid),
        orderBy('createdAt', 'desc')
      )
      const votedSnap = await getDocs(votedQ)
      const votedList = await Promise.all(
        votedSnap.docs.map(async doc => {
          const data = doc.data()
          const voteCountSnap = await getCountFromServer(collection(db, `polls/${doc.id}/votes`))
          return formatPoll(doc.id, data, voteCountSnap.data().count)
        })
      )
      setVotedPolls(votedList)
      setVotedFilteredPolls(votedList)
    }

    const fetchCategories = async () => {
      const snapshot = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')))
      const data = snapshot.docs.map(doc => doc.data() as { name: string; slug: string })
      setCategories(data)
    }

    fetchPolls()
    fetchCategories()
  }, [user])

  const formatPoll = (id: string, data: any, voteCount: number): Poll => {
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
      isDisabled: data.isDisabled ?? false,
      createdAt,
      deadline,
      maxParticipants: data.maxParticipants ?? null,
      password: data.password ?? '',
      voteCount,
    }
  }

  const filterPolls = (polls: Poll[], filter: FilterType) =>
    polls.filter((poll) => {
      if (!poll.deadline) return true
      const deadlineDate = new Date(poll.deadline)
      return filter === 'active'
        ? deadlineDate >= now
        : deadlineDate < now
    })

  const handleMySearch = () => {
    const result = myPolls.filter(p => {
      const titleMatch = p.title.toLowerCase().includes(mySearchInput.toLowerCase())
      const categoryMatch = mySelectedCategory ? p.category === mySelectedCategory : true
      const deadlineMatch = filterPolls([p], myFilter).length > 0
      return titleMatch && categoryMatch && deadlineMatch
    })
    setMyFilteredPolls(result)
    setVisibleMyCount(9)
  }

  const handleVotedSearch = () => {
    const result = votedPolls.filter(p => {
      const titleMatch = p.title.toLowerCase().includes(votedSearchInput.toLowerCase())
      const categoryMatch = votedSelectedCategory ? p.category === votedSelectedCategory : true
      const deadlineMatch = filterPolls([p], votedFilter).length > 0
      return titleMatch && categoryMatch && deadlineMatch
    })
    setVotedFilteredPolls(result)
    setVisibleVotedCount(9)
  }

  const handleDeletePoll = async (pollId: string) => {
    const confirmed = confirm('이 투표를 삭제하시겠습니까? (참여자가 있어도 삭제됩니다)')
    if (!confirmed) return

    try {
      const pollDoc = await getDoc(doc(db, 'polls', pollId))
      const pollData = pollDoc.data()

      if (pollData?.mainImageUrl) {
        try {
          await deleteObject(ref(storage, pollData.mainImageUrl))
        } catch (e) {
          console.warn('대표 이미지 삭제 실패:', e)
        }
      }

      if (pollData?.options && Array.isArray(pollData.options)) {
        for (const opt of pollData.options) {
          if (opt.imageUrl) {
            try {
              await deleteObject(ref(storage, opt.imageUrl))
            } catch (e) {
              console.warn('옵션 이미지 삭제 실패:', e)
            }
          }
        }
      }

      const votesSnap = await getDocs(collection(db, `polls/${pollId}/votes`))
      await Promise.all(votesSnap.docs.map(doc => deleteDoc(doc.ref)))
      const commentsSnap = await getDocs(collection(db, `comments`))
      const relatedComments = commentsSnap.docs.filter(
        (doc) => doc.data().pollId === pollId
      )
      await Promise.all(relatedComments.map((doc) => deleteDoc(doc.ref)))

      await deleteDoc(doc(db, 'polls', pollId))

      toast.success('삭제 완료!')
      setMyPolls((prev) => prev.filter((p) => p.id !== pollId))
      setMyFilteredPolls((prev) => prev.filter((p) => p.id !== pollId))
    } catch (error) {
      console.error('삭제 오류:', error)
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-purple-700">🧑 마이페이지</h1>
        <Link
          href="/mypage/profile"
          className="text-sm text-blue-600 hover:underline"
        >
          내 프로필 보기 / 수정
        </Link>
      </div>

      {/* 내가 만든 투표 */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">📌 내가 만든 투표</h2>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <input
            type="text"
            value={mySearchInput}
            onChange={(e) => setMySearchInput(e.target.value)}
            placeholder="제목으로 검색"
            className="px-4 py-2 border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <select
            value={mySelectedCategory}
            onChange={(e) => setMySelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-full"
          >
            <option value="">전체 카테고리</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleMySearch}
            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
          >
            검색
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                setMyFilter('active')
                handleMySearch()
              }}
              className={`px-4 py-1 rounded-full text-sm ${myFilter === 'active' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
            >
              진행중
            </button>
            <button
              onClick={() => {
                setMyFilter('closed')
                handleMySearch()
              }}
              className={`px-4 py-1 rounded-full text-sm ${myFilter === 'closed' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
            >
              마감됨
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myFilteredPolls.slice(0, visibleMyCount).map((poll) => {
            const deadlineDate = poll.deadline ? new Date(poll.deadline) : null
            const dday = deadlineDate
              ? differenceInCalendarDays(deadlineDate, new Date())
              : null

            return (
              <div
                key={poll.id}
                className={`border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition space-y-1 relative ${poll.isDisabled ? 'opacity-60' : ''
                  }`}
              >
                <h3 className="text-lg font-bold break-words whitespace-normal text-left">
                  <Link
                    href={`/polls/${poll.id}`}
                    className="text-purple-800 hover:underline"
                  >
                    {poll.title}
                  </Link>
                  {!poll.isPublic && (
                    <span className="text-xs text-white bg-red-400 rounded-full px-2 py-0.5 ml-2">
                      비공개
                    </span>
                  )}
                  {poll.isDisabled && (
                    <span className="text-xs text-white bg-gray-500 rounded-full px-2 py-0.5 ml-2">
                      비활성화
                    </span>
                  )}
                </h3>
                <p className="text-sm">📂 카테고리: {poll.category}</p>
                {poll.createdAt && (
                  <p className="text-sm">
                    🛠 제작일:{' '}
                    {format(new Date(poll.createdAt), 'yyyy.MM.dd', { locale: ko })}
                  </p>
                )}
                {deadlineDate && (
                  <p className="text-sm">
                    ⏰ 마감일: {format(deadlineDate, 'yyyy.MM.dd')} (
                    D{dday! >= 0 ? `-${dday}` : `+${Math.abs(dday!)}`})
                  </p>
                )}
                <p className="text-sm">👥 참여자 수: {poll.voteCount ?? 0}</p>
                <p className="text-sm">
                  👥 참여제한: {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}
                </p>
                <div className="flex gap-3 mt-2">
                  <Link
                    href={`/mypage/polls/${poll.id}/edit`}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    ✏️ 수정
                  </Link>
                  <button
                    onClick={() => handleDeletePoll(poll.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    🗑 삭제
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {visibleMyCount < myFilteredPolls.length && (
          <div className="text-center mt-6">
            <button
              onClick={() => setVisibleMyCount(prev => prev + 9)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              🔽 더 보기
            </button>
          </div>
        )}
      </section>

      {/* 내가 참여한 투표 */}
      <section>
        <h2 className="text-2xl font-bold mb-4">🙋 내가 참여한 투표</h2>

        <div className="flex flex-wrap gap-3 items-center mb-4">
          <input
            type="text"
            value={votedSearchInput}
            onChange={(e) => setVotedSearchInput(e.target.value)}
            placeholder="제목으로 검색"
            className="px-4 py-2 border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <select
            value={votedSelectedCategory}
            onChange={(e) => setVotedSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-full"
          >
            <option value="">전체 카테고리</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleVotedSearch}
            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
          >
            검색
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => {
                setVotedFilter('active')
                handleVotedSearch()
              }}
              className={`px-4 py-1 rounded-full text-sm ${votedFilter === 'active' ? 'bg-gray-800 text-white' : 'bg-gray-200'}`}
            >
              진행중
            </button>
            <button
              onClick={() => {
                setVotedFilter('closed')
                handleVotedSearch()
              }}
              className={`px-4 py-1 rounded-full text-sm ${votedFilter === 'closed' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
            >
              마감됨
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {votedFilteredPolls.slice(0, visibleVotedCount).map((poll) => {
            const deadlineDate = poll.deadline ? new Date(poll.deadline) : null
            const dday = deadlineDate
              ? differenceInCalendarDays(deadlineDate, new Date())
              : null

            return (
              <div
                key={poll.id}
                className={`border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition space-y-1 relative ${poll.isDisabled ? 'opacity-60' : ''
                  }`}
              >
                <h3 className="text-lg font-bold break-words whitespace-normal text-left">
                  <Link
                    href={`/polls/${poll.id}`}
                    className="text-purple-800 hover:underline"
                  >
                    {poll.title}
                  </Link>
                  {!poll.isPublic && (
                    <span className="text-xs text-white bg-red-400 rounded-full px-2 py-0.5 ml-2">
                      비공개
                    </span>
                  )}
                  {poll.isDisabled && (
                    <span className="text-xs text-white bg-gray-500 rounded-full px-2 py-0.5 ml-2">
                      비활성화
                    </span>
                  )}
                </h3>
                <p className="text-sm">📂 카테고리: {poll.category}</p>
                {poll.createdAt && (
                  <p className="text-sm">
                    🛠 제작일:{' '}
                    {format(new Date(poll.createdAt), 'yyyy.MM.dd', { locale: ko })}
                  </p>
                )}
                {deadlineDate && (
                  <p className="text-sm">
                    ⏰ 마감일: {format(deadlineDate, 'yyyy.MM.dd')} (
                    D{dday! >= 0 ? `-${dday}` : `+${Math.abs(dday!)}`})
                  </p>
                )}
                <p className="text-sm">👥 참여자 수: {poll.voteCount ?? 0}</p>
                <p className="text-sm">
                  👥 참여제한: {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}
                </p>
              </div>
            )
          })}
        </div>

        {visibleVotedCount < votedFilteredPolls.length && (
          <div className="text-center mt-6">
            <button
              onClick={() => setVisibleVotedCount(prev => prev + 9)}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
            >
              🔽 더 보기
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

