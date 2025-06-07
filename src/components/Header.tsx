// src/components/Header.tsx

'use client'

import Link from 'next/link'
import { useAdminStore } from '@/stores/adminStore'
import { useRouter } from 'next/navigation'

export default function Header() {
  const { isAdmin, setAdmin } = useAdminStore()
  const router = useRouter()

  const handleLogout = () => {
    setAdmin(false)
    router.push('/')
  }

  return (
    <header className="flex justify-between items-center px-6 py-4 shadow bg-white">
      <Link href="/" className="text-2xl font-bold text-purple-600">MyVote</Link>

      {isAdmin ? (
        <nav className="flex gap-4 text-sm text-purple-700 font-semibold">
          <Link href="/admin/info">회원정보</Link>
          <Link href="/admin">투표리스트</Link>
          <button onClick={handleLogout} className="hover:underline">로그아웃</button>
        </nav>
      ) : (
        <nav className="flex gap-4 text-sm text-purple-700 font-semibold">
          <Link href="/login">로그인</Link>
          <Link href="/signup">회원가입</Link>
        </nav>
      )}
    </header>
  )
}
