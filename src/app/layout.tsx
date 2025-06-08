'use client'

import './globals.css'
import Link from 'next/link'
import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useRouter, usePathname } from 'next/navigation'
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: ReactNode }) {
  const { user, loading, setUser, setLoading } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
  const isAdmin = user?.email === adminEmail
  const isAdminPage = pathname.startsWith('/admin')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [setUser, setLoading])

  const handleLogout = async () => {
    await signOut(auth)
    setUser(null)
    router.push('/login')
  }

  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        {/* 상단 */}
        <header className="bg-slate-100 px-6 py-4 shadow-md flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-purple-600">MyVote</Link>

          <nav className="flex gap-4 text-sm font-medium text-purple-700">
            {user ? (
              isAdmin && isAdminPage ? (
                <>
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    🏠 홈페이지 보기 →
                  </a>
                  <Link href="/admin/dashboard" className="hover:underline">관리자 대시보드</Link>
                  <button onClick={handleLogout} className="hover:underline">로그아웃</button>
                </>
              ) : (
                <>
                  <Link href="/polls" className="hover:underline">전체 투표</Link>
                  <Link href="/create" className="hover:underline">투표 만들기</Link>
                  <Link href="/mypage" className="hover:underline">마이페이지</Link>
                  <button onClick={handleLogout} className="hover:underline">로그아웃</button>
                </>
              )
            ) : (
              <>
                <Link href="/login" className="hover:underline">로그인</Link>
                <Link href="/signup" className="hover:underline">회원가입</Link>
              </>
            )}
          </nav>
        </header>

        {/* 중간 콘텐츠 */}
        <main className="flex-1 px-6 py-8 bg-white">
          {children}
        </main>

        {/* sonner 알림 출력 위치 */}
        <Toaster position="top-center" richColors />

        {/* 하단 푸터 */}
        <footer className="bg-slate-200 text-center text-sm text-gray-600 py-4">
          © 2025 MyVote. 팬들의 힘으로 세상을 움직이다.
        </footer>
      </body>
    </html>
  )
}


