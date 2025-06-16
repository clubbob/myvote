'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()

  const handleLogout = () => {
    router.push('/')
  }

  return (
    <header className="flex justify-between items-center px-6 py-4 shadow bg-white">
      <Link href="/" className="flex items-center space-x-2">
        <Image
          src="/images/pollsday-logo.png" // public/images 폴더에 저장한 로고
          alt="PollsDay Logo"
          width={140} // 크기는 필요에 따라 100~160 사이로 조정 가능
          height={40}
        />
      </Link>

      <nav className="flex gap-4 text-sm text-purple-700 font-semibold">
        <Link href="/login">로그인</Link>
        <Link href="/signup">회원가입</Link>
      </nav>
    </header>
  )
}

