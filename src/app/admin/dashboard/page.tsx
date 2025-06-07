'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      const isAdmin = user?.email === adminEmail

      if (!user || !isAdmin) {
        router.replace('/')
      }
    }
  }, [user, loading, router])

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  if (loading || !user || !isAdmin) {
    return null
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">🎛️ 관리자 대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/categories">
          <div className="border rounded-lg p-4 shadow hover:shadow-md transition cursor-pointer">
            <h2 className="text-xl font-semibold mb-2">카테고리 관리</h2>
            <p className="text-sm text-gray-600">투표 카테고리를 추가/수정/삭제할 수 있습니다.</p>
          </div>
        </Link>

        <div className="border rounded-lg p-4 shadow hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">회원 목록</h2>
          <p className="text-sm text-gray-600">가입된 회원들의 정보를 확인할 수 있습니다.</p>
        </div>

        <div className="border rounded-lg p-4 shadow hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">투표 현황</h2>
          <p className="text-sm text-gray-600">실시간 투표 진행 상황을 모니터링합니다.</p>
        </div>

        <div className="border rounded-lg p-4 shadow hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">신고 콘텐츠 관리</h2>
          <p className="text-sm text-gray-600">사용자가 신고한 콘텐츠를 확인하고 조치할 수 있습니다.</p>
        </div>
      </div>
    </div>
  )
}
