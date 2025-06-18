'use client'

import { useEffect, useState, useRef } from 'react'
import {
  collection,
  getDocs,
  getCountFromServer,
  orderBy,
  query,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { format, differenceInCalendarDays } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Poll {
  id: string
  title: string
  category: string
  createdAt: string | Timestamp
  deadline?: string | Timestamp
  maxParticipants?: number
  isPublic: boolean
  createdBy: string
}

interface Category {
  name: string
  slug: string
}

type FilterStatus = 'active' | 'closed'

export default function PublicPollsPage() {
  const [allPolls, setAllPolls] = useState<Poll[]>([])
  const [displayedPolls, setDisplayedPolls] = useState<Poll[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [nicknames, setNicknames] = useState<Record<string, string>>({})
  const [searchInput, setSearchInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchCategory, setSearchCategory] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active')
  const [visibleCount, setVisibleCount] = useState(9)
  const searchParams = useSearchParams()
  const now = new Date()

  const cardRefs = useRef<(HTMLLIElement | null)[]>([])

  const syncHeights = () => {
    let currentRowTop = -1
    let currentRow: HTMLLIElement[] = []

    cardRefs.current.forEach((el) => {
      if (!el) return
      el.style.height = 'auto'
    })

    cardRefs.current.forEach((el) => {
      if (!el) return
      const top = el.offsetTop
      if (top !== currentRowTop) {
        const maxHeight = Math.max(...currentRow.map((e) => e.offsetHeight))
        currentRow.forEach((e) => (e.style.height = `${maxHeight}px`))
        currentRow = [el]
        currentRowTop = top
      } else {
        currentRow.push(el)
      }
    })

    const maxHeight = Math.max(...currentRow.map((e) => e.offsetHeight))
    currentRow.forEach((e) => (e.style.height = `${maxHeight}px`))
  }

  useEffect(() => {
    const fetchPolls = async () => {
      const snapshot = await getDocs(query(collection(db, 'polls'), orderBy('createdAt', 'desc')))
      const fetchedPolls = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Poll))
        .filter((p) => p.isPublic)

      setAllPolls(fetchedPolls)
      setDisplayedPolls(filterAndSlice(fetchedPolls, '', '', 'active', 9))

      const uidList = Array.from(new Set(fetchedPolls.map((p) => p.createdBy).filter(Boolean)))
      const nicknameMap: Record<string, string> = {}

      await Promise.all(
        uidList.map(async (uid) => {
          const userSnap = await getDoc(doc(db, 'users', uid))
          if (userSnap.exists()) {
            const data = userSnap.data()
            nicknameMap[uid] = data.nickname || '작성자'
          } else {
            nicknameMap[uid] = '작성자'
          }
        })
      )

      setNicknames(nicknameMap)

      const voteCountPromises = fetchedPolls.map(async (poll) => {
        const voteRef = collection(db, 'polls', poll.id, 'votes')
        const snapshot = await getCountFromServer(voteRef)
        return { id: poll.id, count: snapshot.data().count }
      })

      const counts = await Promise.all(voteCountPromises)
      const countsMap = Object.fromEntries(counts.map(({ id, count }) => [id, count]))
      setVoteCounts(countsMap)
    }

    const fetchCategories = async () => {
      const snapshot = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')))
      const data = snapshot.docs.map((doc) => doc.data() as Category)
      setCategories(data)
    }

    fetchPolls()
    fetchCategories()
  }, [])
  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      setSearchInput('')
      setSearchKeyword('')
      setSelectedCategory('')
      setSearchCategory('')
      setFilterStatus('active')
      setVisibleCount(9)

      const filtered = filterAndSlice(allPolls, '', '', 'active', 9)
      setDisplayedPolls(filtered)
    }
  }, [searchParams, allPolls])

  useEffect(() => {
    syncHeights()
    window.addEventListener('resize', syncHeights)
    return () => window.removeEventListener('resize', syncHeights)
  }, [displayedPolls])

  const filterAndSlice = (
    polls: Poll[],
    keyword: string,
    category: string,
    status: FilterStatus,
    count: number
  ): Poll[] => {
    return polls
      .filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(keyword.toLowerCase())
        const categoryMatch = category ? p.category === category : true

        let deadlineValid = true
        if (p.deadline) {
          const d = p.deadline instanceof Timestamp ? p.deadline.toDate() : new Date(p.deadline)
          deadlineValid = status === 'active' ? d >= now : d < now
        }

        return titleMatch && categoryMatch && deadlineValid
      })
      .slice(0, count)
  }

  const handleSearch = () => {
    setSearchKeyword(searchInput)
    setSearchCategory(selectedCategory)
    setVisibleCount(9)

    const filtered = filterAndSlice(allPolls, searchInput, selectedCategory, filterStatus, 9)
    setDisplayedPolls(filtered)
  }

  const handleLoadMore = () => {
    const nextCount = visibleCount + 9
    setVisibleCount(nextCount)

    const filtered = filterAndSlice(allPolls, searchKeyword, searchCategory, filterStatus, nextCount)
    setDisplayedPolls(filtered)
  }

  const handleStatusChange = (status: FilterStatus) => {
    setFilterStatus(status)
    setVisibleCount(9)

    const filtered = filterAndSlice(allPolls, searchKeyword, searchCategory, status, 9)
    setDisplayedPolls(filtered)
  }

  return (
    <div className="bg-gray-50 py-10 min-h-screen">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-3xl font-bold text-purple-700 mb-4">🗳️ 전체 공개 투표</h1>

        <div className="mb-6 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목으로 검색"
            className="flex-1 min-w-[200px] max-w-md px-4 py-2 border rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
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
            onClick={handleSearch}
            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
          >
            검색
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => handleStatusChange('active')}
            className={`px-4 py-1 rounded-full ${
              filterStatus === 'active'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            진행중
          </button>
          <button
            onClick={() => handleStatusChange('closed')}
            className={`px-4 py-1 rounded-full ${
              filterStatus === 'closed'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            마감됨
          </button>
        </div>

        {displayedPolls.length === 0 ? (
          <p className="text-gray-500">조건에 맞는 투표가 없습니다.</p>
        ) : (
          <>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedPolls.map((poll, idx) => {
                const createdDate =
                  typeof poll.createdAt === 'string'
                    ? new Date(poll.createdAt)
                    : poll.createdAt.toDate()

                const deadlineDate = poll.deadline
                  ? poll.deadline instanceof Timestamp
                    ? poll.deadline.toDate()
                    : new Date(poll.deadline)
                  : null

                const dday = deadlineDate
                  ? differenceInCalendarDays(deadlineDate, new Date())
                  : null

                return (
                  <li
                    key={poll.id}
                    ref={(el) => {
                      cardRefs.current[idx] = el
                    }}
                    className="w-full sm:w-[340px]"
                  >
                    <Link
                      href={`/polls/${poll.id}`}
                      className="block bg-white p-5 rounded-2xl shadow-md hover:ring-2 hover:ring-purple-300 transition h-full"
                    >
                      <h2 className="text-lg font-semibold mb-2 text-gray-900 break-words whitespace-normal">
                        {poll.title}
                      </h2>

                      {/* ✅ 수정된 메타 정보 줄 */}
                      <div className="flex flex-wrap gap-2 items-center text-sm text-gray-600 mt-2">
                        <span className="flex items-center gap-1">📁 {poll.category}</span>
                        {deadlineDate && (
                          <span className="flex items-center gap-1">⏳ D-{dday}일</span>
                        )}
                        <span className="flex items-center gap-1">✏️ {nicknames[poll.createdBy] ?? '작성자'}</span>
                      </div>

                      <div className="text-sm text-gray-700 space-y-1 mt-3">
                        <p>🛠 <strong>제작일:</strong> {format(createdDate, 'yyyy. M. d.')}</p>
                        {deadlineDate && (
                          <p>⏰ <strong>마감일:</strong> {format(deadlineDate, 'yyyy. M. d.')}</p>
                        )}
                        <p>👥 <strong>참여자 수:</strong> {voteCounts[poll.id] ?? '로딩 중...'}</p>
                        <p>👥 <strong>참여제한:</strong> {poll.maxParticipants ? `${poll.maxParticipants}명` : '제한 없음'}</p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>

            {displayedPolls.length < allPolls.filter((poll) => {
              const titleMatch = poll.title.toLowerCase().includes(searchKeyword.toLowerCase())
              const categoryMatch = searchCategory ? poll.category === searchCategory : true

              let isDeadlineValid = true
              if (poll.deadline) {
                const deadlineDate =
                  poll.deadline instanceof Timestamp
                    ? poll.deadline.toDate()
                    : new Date(poll.deadline)
                isDeadlineValid = filterStatus === 'active' ? deadlineDate >= now : deadlineDate < now
              }

              return titleMatch && categoryMatch && isDeadlineValid
            }).length && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2 bg-purple-600 text-white text-base font-medium rounded-full shadow hover:bg-purple-700 transition"
                >
                  <span className="[&::before]:content-none">더 보기</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}