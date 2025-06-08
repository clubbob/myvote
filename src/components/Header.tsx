'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()

  const handleLogout = () => {
    // 관리자 로그아웃 로직은 제거됨
    router.push('/')
  }

  return (
    <header className="flex justify-between items-center px-6 py-4 shadow bg-white">
      <Link href="/" className="text-2xl font-bold text-purple-600">MyVote</Link>

      <nav className="flex gap-4 text-sm text-purple-700 font-semibold">
        <Link href="/login">로그인</Link>
        <Link href="/signup">회원가입</Link>
      </nav>
    </header>
  )
}
