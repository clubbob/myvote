'use client'

import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await sendPasswordResetEmail(auth, email)
      setEmailSent(true)
    } catch (err: any) {
      setError('유효하지 않은 이메일이거나 등록되지 않은 계정입니다.')
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-8 bg-white shadow-md rounded-xl">
      <h2 className="text-2xl font-bold text-center mb-6">비밀번호 재설정</h2>

      {emailSent && (
        <div className="text-green-600 text-sm mb-6 leading-relaxed">
          비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요. <br />
          등록되지 않은 이메일인 경우 메일이 발송되지 않습니다.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일 주소
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition"
        >
          재설정 이메일 보내기
        </button>

        <div className="text-center mt-4">
          <a href="/login" className="text-sm text-purple-600 hover:underline">
            로그인으로 돌아가기
          </a>
        </div>
      </form>
    </div>
  )
}








