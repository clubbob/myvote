'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  Timestamp,
  orderBy,
  query,
  getCountFromServer,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import { ref as storageRef, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import Link from 'next/link'
import { format, differenceInCalendarDays, isValid } from 'date-fns'
import { toast } from 'sonner'

interface Poll {
  id: string
  title: string
  category: string
  createdAt: string | Timestamp
  deadline?: string | Timestamp
  isPublic: boolean
  maxParticipants?: number
  mainImageUrl?: string
  options?: { imageUrl?: string }[]
}

interface Category {
  name: string
  slug: string
}

export default function AdminPollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState<'active' | 'closed'>('active')
  const [visibleCount, setVisibleCount] = useState(9)
  const [filteredPolls, setFilteredPolls] = useState<Poll[]>([])

  const now = new Date()
  useEffect(() => {
    const fetchAll = async () => {
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
      setFilteredPolls(applyFilter(pollList, '', '', 'active'))

      const voteCountPromises = pollList.map(async (poll) => {
        const voteRef = collection(db, 'polls', poll.id, 'votes')
        const snapshot = await getCountFromServer(voteRef)
        return { id: poll.id, count: snapshot.data().count }
      })
      const counts = await Promise.all(voteCountPromises)
      const countsMap = Object.fromEntries(counts.map(({ id, count }) => [id, count]))
      setVoteCounts(countsMap)
    }

    const fetchCategories = async () => {
      const snapshot = await getDocs(
        query(collection(db, 'categories'), orderBy('order', 'asc'))
      )
      const data = snapshot.docs.map(doc => doc.data() as Category)
      setCategories(data)
    }

    fetchAll()
    fetchCategories()
  }, [])

  const applyFilter = (
    data: Poll[],
    keyword: string,
    category: string,
    status: 'active' | 'closed'
  ) => {
    return data.filter(p => {
      const titleMatch = p.title.toLowerCase().includes(keyword.toLowerCase())
      const categoryMatch = category ? p.category === category : true

      const deadlineDate =
        typeof p.deadline === 'string'
          ? new Date(p.deadline)
          : p.deadline instanceof Timestamp
            ? p.deadline.toDate()
            : null

      const deadlineValid = deadlineDate
        ? status === 'active'
          ? deadlineDate > now
          : deadlineDate <= now
        : status === 'active'

      return titleMatch && categoryMatch && deadlineValid
    })
  }

  const handleSearch = () => {
    const result = applyFilter(polls, searchInput, selectedCategory, filterStatus)
    setFilteredPolls(result)
    setVisibleCount(9)
  }

  const handleDelete = async (pollId: string, mainImageUrl?: string, options?: { imageUrl?: string }[]) => {
    const confirmDelete = confirm('정말 이 투표를 삭제하시겠습니까? 삭제 시 복구할 수 없습니다.')
    if (!confirmDelete) return

    try {
      // 대표 이미지 삭제
      if (mainImageUrl) {
        const ref = storageRef(storage, mainImageUrl)
        await deleteObject(ref).catch(() => {})
      }

      // 옵션 이미지 삭제
      if (options) {
        await Promise.all(
          options.map(async (opt) => {
            if (opt.imageUrl) {
              const ref = storageRef(storage, opt.imageUrl)
              await deleteObject(ref).catch(() => {})
            }
          })
        )
      }

      // 서브컬렉션 votes, comments 삭제
      const subcollections = ['votes', 'comments']
      for (const sub of subcollections) {
        const snap = await getDocs(collection(db, 'polls', pollId, sub))
        await Promise.all(snap.docs.map((doc) => deleteDoc(doc.ref)))
      }

      // 본문 삭제
      await deleteDoc(doc(db, 'polls', pollId))
      setPolls(prev => prev.filter(p => p.id !== pollId))
      setFilteredPolls(prev => prev.filter(p => p.id !== pollId))
      toast.success('투표가 삭제되었습니다.')
    } catch (error) {
      console.error(error)
      toast.error('삭제 중 오류가 발생했습니다.')
    }
  }
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">📊 투표 목록</h1>

      {/* 검색창, 카테고리, 검색 버튼 */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="제목으로 검색"
          className="flex-1 min-w-[200px] max-w-md px-4 py-2 border rounded-full shadow-sm"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border rounded-full"
        >
          <option value="">전체 카테고리</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
        >
          검색
        </button>
      </div>

      {/* 진행중/마감됨 탭 */}
      <div className="flex gap-3 mb-6">
        {(['active', 'closed'] as const).map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilterStatus(status)
              setVisibleCount(9)
              setFilteredPolls(applyFilter(polls, searchInput, selectedCategory, status))
            }}
            className={`px-4 py-1 rounded-full text-sm ${
              filterStatus === status
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200'
            }`}
          >
            {status === 'active' ? '진행중' : '마감됨'}
          </button>
        ))}
      </div>

      {/* 투표 카드 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPolls.slice(0, visibleCount).map((poll) => {
          const createdDate = typeof poll.createdAt === 'string'
            ? new Date(poll.createdAt)
            : poll.createdAt.toDate()

          const deadlineDate = typeof poll.deadline === 'string'
            ? new Date(poll.deadline)
            : poll.deadline?.toDate?.() || null

          const dday = deadlineDate ? differenceInCalendarDays(deadlineDate, new Date()) : null

          return (
            <div key={poll.id} className="border rounded-lg p-4 shadow-sm bg-white space-y-2">
              <h2 className="text-xl font-bold break-words whitespace-normal text-left">
                <Link
                  href={`/admin/polls/${poll.id}`}
                  className="text-purple-800 hover:underline"
                >
                  {poll.title}
                </Link>
                {!poll.isPublic && (
                  <span className="text-xs text-white bg-red-400 rounded-full px-2 py-0.5 ml-2">
                    비공개
                  </span>
                )}
              </h2>
              <p className="text-sm">📂 {poll.category}</p>
              <p className="text-sm">🛠 {format(createdDate, 'yyyy. M. d.')}</p>
              {deadlineDate && (
                <p className="text-sm">
                  ⏰ {format(deadlineDate, 'yyyy. M. d.')} (D{dday! >= 0 ? `-${dday}` : `+${Math.abs(dday!)}`})
                </p>
              )}
              <p className="text-sm">👥 참여자 수: {voteCounts[poll.id] ?? '로딩 중...'}</p>
              <p className="text-sm">👥 제한: {poll.maxParticipants ?? '없음'}</p>

              <div className="flex gap-3 text-sm mt-2">
                <Link
                  href={`/admin/polls/${poll.id}/edit`}
                  className="text-blue-600 hover:underline"
                >
                  ✏️ 수정
                </Link>
                <button
                  onClick={() => handleDelete(poll.id, poll.mainImageUrl, poll.options)}
                  className="text-red-500 hover:underline"
                >
                  🗑 삭제
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {visibleCount < filteredPolls.length && (
        <div className="text-center mt-6">
          <button
            onClick={() => setVisibleCount((prev) => prev + 9)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            🔽 더 보기
          </button>
        </div>
      )}
    </div>
  )
}

