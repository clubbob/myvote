'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { setDoc, doc, serverTimestamp } from 'firebase/firestore'

function getFirebaseLoginError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return '존재하지 않는 사용자입니다.'
    case 'auth/wrong-password':
      return '비밀번호가 일치하지 않습니다.'
    case 'auth/invalid-email':
      return '이메일 형식이 올바르지 않습니다.'
    case 'auth/too-many-requests':
      return '잠시 후 다시 시도해주세요.'
    default:
      return '로그인에 실패했습니다.'
  }
}

export default function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'

  const [form, setForm] = useState({ email: '', password: '', rememberEmail: true })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setForm((prev) => ({ ...prev, email: savedEmail }))
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, form.email, form.password)
      const user = userCredential.user

      if (!user.emailVerified) {
        setError('이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.')
        setLoading(false)
        return
      }

      await setDoc(
        doc(db, 'users', user.uid),
        { lastLoginAt: serverTimestamp() },
        { merge: true }
      )

      if (form.rememberEmail) {
        localStorage.setItem('rememberedEmail', form.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      alert('로그인 성공!')
      router.push(redirect)
    } catch (err: any) {
      console.error('[로그인 오류]', err)
      const code = err.code || ''
      setError(getFirebaseLoginError(code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-8 bg-white shadow-md rounded-xl">
      <h1 className="text-2xl font-bold text-center mb-8">로그인</h1>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
          <input
            name="email"
            type="email"
            required
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={form.email}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
          <input
            name="password"
            type="password"
            required
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={form.password}
            onChange={handleChange}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="rememberEmail"
            name="rememberEmail"
            type="checkbox"
            checked={form.rememberEmail}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <label htmlFor="rememberEmail" className="text-sm text-gray-700">
            이메일 저장
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition disabled:opacity-50"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-2 text-sm text-gray-600">
        <p>
          계정이 없으신가요?{' '}
          <a href="/signup" className="text-purple-600 hover:underline">
            회원가입
          </a>
        </p>
        <p>
          <a href="/forgot-password" className="text-purple-600 hover:underline">
            비밀번호를 잊으셨나요?
          </a>
        </p>
      </div>
    </div>
  )
}
