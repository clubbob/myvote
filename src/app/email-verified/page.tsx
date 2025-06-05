'use client'

import { useRouter } from 'next/navigation'

export default function EmailVerifiedPage() {
  const router = useRouter()

  return (
    <div className="flex-1 flex items-center justify-center px-4 bg-white">
      <div className="bg-white shadow-md rounded-xl p-8 max-w-md w-full text-center border border-gray-200">
        <h1 className="text-2xl font-bold text-purple-600 mb-4">🎉 이메일 인증 완료</h1>
        <p className="text-gray-700 mb-6">이제 새 계정으로 로그인하실 수 있습니다.</p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-2 bg-purple-600 text-white font-semibold rounded hover:bg-purple-700 transition"
        >
          로그인 하러가기
        </button>
      </div>
    </div>
  )
}

