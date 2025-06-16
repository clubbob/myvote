'use client'

import './globals.css'
import Link from 'next/link'
import Image from 'next/image'
import { ReactNode, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          const userData = userDoc.exists() ? userDoc.data() : {}

          // ✅ 닉네임 누락 시 로그인 거부 처리
          if (!userData.nickname) {
            console.warn('닉네임 없음 - userData:', userData)
            setUser(null)
            setLoading(false)
            return
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            nickname: userData.nickname,
          })
        } catch (error) {
          console.error('사용자 정보 가져오기 실패:', error)
          setUser(null)
        }
      } else {
        setUser(null)
      }
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
        <header className="bg-slate-100 px-6 py-2 shadow-md flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/images/pollsday-logo.png"
              alt="PollsDay Logo"
              width={140}
              height={40}
            />
          </Link>

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
                  <button
                    onClick={() => router.push('/polls?reset=1')}
                    className="hover:underline"
                  >
                    전체 투표
                  </button>
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
          © 2025 PollsDay. 참여의 힘으로 세상을 움직이다.
        </footer>
      </body>
    </html>
  )
}
