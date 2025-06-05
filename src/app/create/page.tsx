'use client'

import { useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

const categories = [
  '팬덤', '연예·사랑', '방송·채널', '패션·뷰티', '음식·요리',
  '취미·여행', '일상', '사회·문화', '기술', '정치', '경제', '교육', '자유주제'
]

export default function CreatePollPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [isPublic, setIsPublic] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [deadline, setDeadline] = useState('')
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options]
    updated[index] = value
    setOptions(updated)
  }

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !title || !category || options.some((opt) => !opt.trim())) return
    if (options.filter((opt) => opt.trim()).length < 2) {
      alert('옵션은 최소 2개 이상 입력해야 합니다.')
      return
    }

    if (!isPublic) {
      if (password.length < 6 || password.length > 12) {
        alert('비밀번호는 6자 이상 12자 이하로 입력하세요.')
        return
      }
      if (password !== passwordConfirm) {
        alert('비밀번호가 일치하지 않습니다.')
        return
      }
    }

    const structuredOptions = options.map((text) => ({
      id: uuidv4(),
      text: text.trim(),
      imageUrl: null,
      votes: [],
    }))

    await addDoc(collection(db, 'polls'), {
      title,
      category,
      options: structuredOptions,
      isPublic,
      password: isPublic ? null : password,
      deadline: new Date(deadline),
      maxParticipants: maxParticipants || null,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
    })

    router.push('/mypage')
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-8 bg-white shadow-md rounded-xl">
      <h1 className="text-2xl font-bold text-center mb-8">📝 투표 만들기</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 공개 여부 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">공개 여부</label>
          <select
            value={isPublic ? 'public' : 'private'}
            onChange={(e) => setIsPublic(e.target.value === 'public')}
            className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="public">공개 투표</option>
            <option value="private">비공개 투표</option>
          </select>
        </div>

        {!isPublic && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 (6~12자)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                placeholder="비밀번호 재입력"
              />
            </div>
          </div>
        )}

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-purple-500"
            required
          >
            <option value="">-- 선택하세요 --</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* 옵션 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">투표 옵션</label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder={`옵션 ${idx + 1}`}
                  required
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-sm px-3 py-1.5 rounded-md hover:bg-red-100 transition"
                  >
                    🗑 <span className="font-medium">삭제</span>
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="text-sm text-purple-600 mt-2 hover:underline"
            >
              + 옵션 추가
            </button>
          )}
        </div>

        {/* 마감일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={today}
            max={maxDateStr}
            className="w-full px-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-purple-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">오늘부터 30일 이내만 설정할 수 있습니다.</p>
        </div>

        {/* 참여자 수 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">참여자 수 (선택) : 참여자 수가 참여하면 투표는 바로 마감됩니다.</label>
          <input
            type="number"
            min={1}
            value={maxParticipants ?? ''}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            className="w-full px-4 py-2 border rounded-md text-sm focus:ring-2 focus:ring-purple-500"
            placeholder="예: 100"
          />
        </div>

        <div className="text-right">
          <button
            type="submit"
            className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition"
          >
            등록하기
          </button>
        </div>
      </form>
    </div>
  )
}






