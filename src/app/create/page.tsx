'use client'

import { useEffect, useState } from 'react'
import { addDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db, storage } from '@/lib/firebase'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { toast } from 'sonner'

interface Option {
  text: string
  imageFile?: File | null
  imagePreview?: string | null
  imageUrl?: string | null
}

interface CategoryDoc {
  name: string
  slug: string
  imagePath: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024
const isValidImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  return validTypes.includes(file.type)
}

export default function CreatePollPage() {
  const router = useRouter()
  const { user } = useAuthStore()

  const [categories, setCategories] = useState<CategoryDoc[]>([])
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [options, setOptions] = useState<Option[]>([{ text: '' }, { text: '' }])
  const [mainImage, setMainImage] = useState<File | null>(null)
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [deadline, setDeadline] = useState('')
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 30)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  const getCategoryDefaultImage = (name: string) =>
    categories.find((c) => c.name === name)?.imagePath || '/images/default_main.jpg'

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, 'categories'), orderBy('order', 'asc'))
        const snapshot = await getDocs(q)
        const list = snapshot.docs.map(doc => doc.data() as CategoryDoc)
        setCategories(list)
      } catch (error) {
        console.error('카테고리 불러오기 실패:', error)
        toast.error('카테고리 불러오기 실패')
      }
    }
    fetchCategories()
  }, [])

  useEffect(() => {
    if (!mainImage && category) {
      const fallback = getCategoryDefaultImage(category)
      setMainImagePreview(fallback)
    }
  }, [category, mainImage, categories])

  const handleDeleteMainImage = () => {
    const fallback = getCategoryDefaultImage(category)
    setMainImage(null)
    setMainImagePreview(fallback)
  }

  const handleMainImageChange = (file: File | null) => {
    if (!file) return
    if (!isValidImageType(file)) {
      alert('지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WEBP만 가능)')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('이미지 크기는 5MB 이하여야 합니다.')
      return
    }
    setMainImage(file)
    setMainImagePreview(URL.createObjectURL(file))
  }

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...options]
    updated[index].text = value
    setOptions(updated)
  }

  const handleOptionImageChange = (index: number, file: File | null) => {
    if (!file) return
    if (!isValidImageType(file)) {
      alert('지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WEBP만 가능)')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      alert('이미지 크기는 5MB 이하여야 합니다.')
      return
    }

    const updated = [...options]
    updated[index].imageFile = file
    updated[index].imagePreview = URL.createObjectURL(file)
    setOptions(updated)
  }

  const handleDeleteOptionImage = (index: number) => {
    const updated = [...options]
    updated[index].imageFile = null
    updated[index].imagePreview = null
    updated[index].imageUrl = null
    setOptions(updated)
  }

  const handleAddOption = () => {
    if (options.length < 10) setOptions([...options, { text: '' }])
  }

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (!user) {
        alert('로그인이 필요합니다.')
        return
      }

      if (!category) {
        alert('카테고리를 선택하세요.')
        return
      }

      if (!title.trim()) {
        alert('제목을 입력하세요.')
        return
      }

      if (options.some((opt) => !opt.text.trim())) {
        alert('빈 옵션이 있습니다.')
        return
      }

      if (options.filter((opt) => opt.text.trim()).length < 2) {
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

      const uploadedOptions = await Promise.all(
        options.map(async (opt) => {
          let imageUrl = null
          if (opt.imageFile) {
            const optionRef = ref(storage, `polls/options/${uuidv4()}`)
            await uploadBytes(optionRef, opt.imageFile)
            imageUrl = await getDownloadURL(optionRef)
          }
          return {
            id: uuidv4(),
            text: opt.text.trim(),
            imageUrl,
            votes: [],
          }
        })
      )

      let mainImageUrl = mainImagePreview || getCategoryDefaultImage(category)

      if (mainImage) {
        try {
          const mainRef = ref(storage, `polls/main/${uuidv4()}`)
          await uploadBytes(mainRef, mainImage)
          mainImageUrl = await getDownloadURL(mainRef)
        } catch (err) {
          console.error('대표 이미지 업로드 실패:', err)
          alert('대표 이미지 업로드 실패. 기본 이미지로 대체됩니다.')
        }
      }

      await addDoc(collection(db, 'polls'), {
        title,
        category,
        options: uploadedOptions,
        isPublic,
        password: isPublic ? null : password,
        deadline: new Date(deadline),
        maxParticipants: maxParticipants || null,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        mainImageUrl,
      })

      alert('투표가 등록되었습니다.')
      router.push('/mypage')
    } catch (err) {
      console.error('투표 등록 오류:', err)
      alert('투표 등록 중 오류가 발생했습니다.')
    }
  }
  return (
    <div className="max-w-2xl mx-auto py-12 px-8 bg-white shadow-md rounded-xl">
      <h1 className="text-2xl font-bold text-center mb-10 text-purple-700">📝 투표 만들기</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 공개 여부 */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">공개 여부</label>
          <select
            value={isPublic ? 'public' : 'private'}
            onChange={(e) => setIsPublic(e.target.value === 'public')}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
          >
            <option value="public">공개 투표</option>
            <option value="private">비공개 투표</option>
          </select>
        </div>

        {/* 비공개일 경우 비밀번호 입력 */}
        {!isPublic && (
          <div className="space-y-3">
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="6~12자 입력"
              />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 mb-1">비밀번호 재입력</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
                placeholder="비밀번호 다시 입력"
              />
            </div>
          </div>
        )}

        {/* 카테고리 */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">카테고리</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            required
          >
            <option value="">-- 선택하세요 --</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        {/* 대표 이미지 */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">대표 이미지 (선택)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleMainImageChange(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {mainImagePreview && (
            <div className="relative">
              <img src={mainImagePreview} className="w-full mt-3 rounded border" />
              <button
                type="button"
                onClick={handleDeleteMainImage}
                className="absolute top-2 right-2 text-xs bg-red-600 text-white px-2 py-1 rounded"
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {/* 옵션 */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">투표 옵션</label>
          <div className="space-y-4">
            {options.map((opt, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                    placeholder={`옵션 ${idx + 1}`}
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-red-600 text-sm"
                    >
                      🗑 삭제
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleOptionImageChange(idx, e.target.files?.[0] ?? null)}
                    className="text-sm"
                  />
                  {opt.imagePreview && (
                    <div className="relative w-32">
                      <img src={opt.imagePreview} className="w-full rounded border" />
                      <button
                        type="button"
                        onClick={() => handleDeleteOptionImage(idx)}
                        className="absolute top-1 right-1 text-xs bg-red-500 text-white px-2 py-1 rounded"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="text-sm text-purple-600 mt-3 hover:underline"
            >
              + 옵션 추가
            </button>
          )}
        </div>

        {/* 마감일 */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">마감일</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={today}
            max={maxDateStr}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        {/* 참여자 수 제한 */}
        <div>
          <label className="block text-base font-semibold text-gray-800 mb-2">참여자 수 제한 (선택)</label>
          <input
            type="number"
            min={1}
            value={maxParticipants ?? ''}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
            placeholder="예: 100"
          />
        </div>

        {/* 등록 버튼 */}
        <div className="text-right pt-4">
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
