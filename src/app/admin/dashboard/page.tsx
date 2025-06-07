'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function AdminDashboardPage() {
  const { user, loading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // 인증 로딩 끝난 뒤에만 검사
    if (!loading) {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      const currentEmail = user?.email

      if (!user || currentEmail !== adminEmail) {
        router.replace('/')
      }
    }
  }, [user, loading, router])

  if (loading || !user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return null // 또는 로딩 메시지
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-purple-700 mb-6">🎛️ 관리자 대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 shadow hover:shadow-md transition">
          <h2 className="text-xl font-semibold mb-2">카테고리 관리</h2>
          <p className="text-sm text-gray-600">투표 카테고리를 추가/수정/삭제할 수 있습니다.</p>
        </div>

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
