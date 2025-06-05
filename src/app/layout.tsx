'use client'

import './globals.css'
import Link from 'next/link'
import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'

export default function RootLayout({ children }: { children: ReactNode }) {
  const { user, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [setUser, setLoading])

  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        {/* 상단 */}
        <header className="bg-slate-100 px-6 py-4 shadow-md flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-purple-600">MyVote</Link>
          <nav className="flex gap-4 text-sm font-medium text-purple-700">
            {/* 공통 메뉴 */}
            <Link href="/" className="hover:underline">투표 리스트</Link>

            {user ? (
              <>
                <Link href="/create" className="hover:underline">투표 만들기</Link>
                <Link href="/mypage" className="hover:underline">마이페이지</Link>
                <button
                  onClick={() => signOut(auth)}
                  className="hover:underline"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:underline">로그인</Link>
                <Link href="/signup" className="hover:underline">회원가입</Link>
              </>
            )}
          </nav>
        </header>

        {/* 중간 콘텐츠 */}
        <main className="flex-1 px-6 py-8 bg-white">{children}</main>

        {/* 하단 푸터 */}
        <footer className="bg-slate-200 text-center text-sm text-gray-600 py-4">
          © 2025 MyVote. 팬들의 힘으로 세상을 움직이다.
        </footer>
      </body>
    </html>
  )
}












