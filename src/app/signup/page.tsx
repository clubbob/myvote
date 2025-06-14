'use client'

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
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
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    nickname: '',
    birthYear: '',
    gender: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [nicknameExists, setNicknameExists] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    const checkNickname = async () => {
      if (form.nickname.trim() === '') return
      const q = query(
        collection(db, 'users'),
        where('nickname', '==', form.nickname.trim())
      )
      const snapshot = await getDocs(q)
      setNicknameExists(!snapshot.empty)
    }
    checkNickname()
  }, [form.nickname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (nicknameExists) {
      setError('이미 사용 중인 닉네임입니다.')
      return
    }

    if (!form.name || !form.nickname || !form.birthYear || !form.gender) {
      setError('모든 회원 정보를 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      )
      const user = userCredential.user

      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: form.name,
        nickname: form.nickname.trim(),
        birthYear: form.birthYear,
        gender: form.gender,
        createdAt: serverTimestamp(),
      })

      await sendEmailVerification(user)

      alert('회원가입 성공! 이메일 인증을 완료해주세요.')
      router.push('/login')
    } catch (err: any) {
      console.error('[회원가입 오류]', err)
      setError(getFirebaseErrorMessage(err.code || ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12 px-6 bg-white shadow-md rounded-xl">
      <h1 className="text-2xl font-bold text-center mb-8">회원가입</h1>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 로그인 정보 */}
        <div className="border border-gray-300 p-4 rounded-lg space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">🔐 로그인 정보</h2>

          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <input
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">비밀번호 확인</label>
            <input
              name="confirmPassword"
              type="password"
              required
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
          </div>
        </div>
        {/* 회원 정보 */}
        <div className="border border-gray-300 p-4 rounded-lg space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">🙋 회원 정보</h2>

          <div>
            <label className="block text-sm font-medium mb-1">이름</label>
            <input
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">닉네임 (표시용)</label>
            <input
              name="nickname"
              type="text"
              required
              value={form.nickname}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md text-sm ${
                nicknameExists ? 'border-red-400' : ''
              }`}
            />
            {nicknameExists && (
              <p className="text-xs text-red-500 mt-1">이미 사용 중인 닉네임입니다.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">출생년도</label>
            <select
              name="birthYear"
              required
              value={form.birthYear}
              onChange={handleChange}
              className="w-full px-4 py-2 border rounded-md text-sm"
            >
              <option value="">출생년도를 선택하세요</option>
              {Array.from({ length: 100 }, (_, i) => 2024 - i).map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">성별</label>
            <div className="flex gap-4 mt-1">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  value="남"
                  checked={form.gender === '남'}
                  onChange={handleChange}
                />
                남
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="gender"
                  value="여"
                  checked={form.gender === '여'}
                  onChange={handleChange}
                />
                여
              </label>
            </div>
          </div>
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


