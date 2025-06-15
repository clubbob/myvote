'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { db, auth } from '@/lib/firebase'
import {
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  reauthenticateWithCredential,
  updatePassword,
  EmailAuthProvider,
} from 'firebase/auth'
import { toast } from 'sonner'

const birthYearList = Array.from({ length: 100 }, (_, i) => (2024 - i).toString()) // 1924~2024

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [nickname, setNickname] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchUser = async () => {
      const ref = doc(db, 'users', user.uid)
      const snap = await getDoc(ref)
      if (snap.exists()) {
        const data = snap.data()
        setNickname(data.nickname || '')
        setBirthYear(data.birthYear || '')
        setGender(data.gender || '')
      }
    }
    fetchUser()
  }, [user])

  const handleProfileSave = async () => {
    if (!user) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        nickname,
        birthYear,
        gender,
      })
      toast.success('✅ 프로필이 저장되었습니다.')
    } catch (err) {
      toast.error('❌ 저장 실패. 다시 시도해 주세요.')
    }
    setLoading(false)
  }

  const handlePasswordChange = async () => {
    const currentUser = auth.currentUser

    if (!currentUser?.email || !password || !newPassword) {
      toast.warning('모든 항목을 입력해 주세요.')
      return
    }

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, password)
      await reauthenticateWithCredential(currentUser, credential)
      await updatePassword(currentUser, newPassword)
      toast.success('🔐 비밀번호가 변경되었습니다.')
      setPassword('')
      setNewPassword('')
    } catch (err: any) {
      toast.error(`❌ 변경 실패: ${err?.message || '오류 발생'}`)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-purple-700">👤 내 프로필</h1>

      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-1">닉네임</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">출생연도 (birthYear)</label>
          <select
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
            className="w-full border p-2 rounded"
          >
            <option value="">선택</option>
            {birthYearList.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium mb-1">성별</label>
          <div className="flex gap-4">
            <label>
              <input
                type="radio"
                name="gender"
                value="남"
                checked={gender === '남'}
                onChange={() => setGender('남')}
              />
              <span className="ml-1">남</span>
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="여"
                checked={gender === '여'}
                onChange={() => setGender('여')}
              />
              <span className="ml-1">여</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleProfileSave}
          disabled={loading}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          프로필 저장
        </button>
      </div>

      <hr className="my-8" />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">🔐 비밀번호 변경</h2>
        <input
          type="password"
          placeholder="현재 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="password"
          placeholder="새 비밀번호"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <button
          onClick={handlePasswordChange}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          비밀번호 변경
        </button>
      </div>
    </div>
  )
}

