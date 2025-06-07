'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { db } from '@/lib/firebase'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale' // ✅ 수정된 부분

interface User {
  uid: string
  email?: string
  name?: string
  createdAt: any
  lastLoginAt?: any
}

export default function AdminUsersPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL

  useEffect(() => {
    if (!user || user.email !== adminEmail) {
      router.replace('/')
    }
  }, [user, router, adminEmail])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        const userList: User[] = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            uid: doc.id,
            email: data.email,
            name: data.name,
            createdAt: data.createdAt,
            lastLoginAt: data.lastLoginAt,
          }
        })
        setUsers(userList)
      } catch (error) {
        console.error('유저 데이터를 불러오는 중 오류 발생:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.email === adminEmail) {
      fetchUsers()
    }
  }, [user, adminEmail])

  if (!user || user.email !== adminEmail) return null

  const keyword = search.trim().toLowerCase()
  const filteredUsers = users.filter((u) => {
    const name = (u.name || '').toLowerCase()
    return name.includes(keyword)
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">👥 회원 목록</h1>

      <input
        type="text"
        placeholder="이름 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 px-4 py-2 border rounded-md w-full max-w-md focus:outline-none focus:ring-2 focus:ring-purple-500"
      />

      {loading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto border border-gray-300">
            <thead className="bg-purple-100 text-left">
              <tr>
                <th className="p-2 border">이름</th>
                <th className="p-2 border">이메일</th>
                <th className="p-2 border">UID</th>
                <th className="p-2 border">가입일</th>
                <th className="p-2 border">최근 로그인</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.uid} className="text-sm text-gray-800">
                  <td className="p-2 border">{u.name || '이름 없음'}</td>
                  <td className="p-2 border">{u.email || '없음'}</td>
                  <td className="p-2 border">{u.uid}</td>
                  <td className="p-2 border">
                    {u.createdAt?.toDate
                      ? format(u.createdAt.toDate(), 'yyyy-MM-dd HH:mm', { locale: ko })
                      : '정보 없음'}
                  </td>
                  <td className="p-2 border">
                    {u.lastLoginAt?.toDate
                      ? format(u.lastLoginAt.toDate(), 'yyyy-MM-dd HH:mm', { locale: ko })
                      : '정보 없음'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}





