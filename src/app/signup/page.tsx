'use client'

import { useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/weak-password':
      return '비밀번호는 최소 6자 이상이어야 합니다.'
    case 'auth/email-already-in-use':
      return '이미 사용 중인 이메일입니다.'
    case 'auth/invalid-email':
      return '올바르지 않은 이메일 형식입니다.'
    case 'auth/missing-email':
      return '이메일을 입력해주세요.'
    case 'auth/internal-error':
      return '요청을 처리할 수 없습니다. 다시 시도해주세요.'
    default:
      return '회원가입 중 오류가 발생했습니다.'
  }
}

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    try {
      setLoading(true)
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password)
      const user = userCredential.user

      await setDoc(doc(db, 'users', user.uid), {
        name: form.name,
        email: user.email,
        createdAt: serverTimestamp(),
      })

      await sendEmailVerification(user)

      alert('회원가입 성공! 이메일 인증을 완료해주세요.')
      router.push('/login')
    } catch (err: any) {
      console.error('[회원가입 오류]', err)
      const code = err.code || ''
      setError(getFirebaseErrorMessage(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-8 bg-white shadow-md rounded-xl">
      <h1 className="text-2xl font-bold text-center mb-8">회원가입</h1>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
          <input
            name="name"
            type="text"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
          <input
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
          <input
            name="password"
            type="password"
            required
            value={form.password}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
          <input
            name="confirmPassword"
            type="password"
            required
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>
      </form>

      <div className="text-center mt-6 text-sm text-gray-600">
        이미 계정이 있으신가요?{' '}
        <a href="/login" className="text-purple-600 hover:underline">
          로그인
        </a>
      </div>
    </div>
  )
}

