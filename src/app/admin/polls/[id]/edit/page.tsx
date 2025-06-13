'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { toast } from 'sonner'
import Image from 'next/image'
import { format, addDays } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import Link from 'next/link'
import { useCategoryList } from '@/hooks/useCategoryList'
import { getCategoryDefaultImage } from '@/utils/getCategoryDefaultImage'

interface PollOption {
  id: string
  text: string
  imageUrl?: string
  votes?: string[]
}

export default function AdminPollEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const { categories } = useCategoryList()

  const [title, setTitle] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [deadline, setDeadline] = useState('')
  const [maxParticipants, setMaxParticipants] = useState<number | null>(null)
  const [mainImageUrl, setMainImageUrl] = useState('')
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [options, setOptions] = useState<PollOption[]>([])
  const [category, setCategory] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')

  useEffect(() => {
    const fetchPoll = async () => {
      const docRef = doc(db, 'polls', id as string)
      const snapshot = await getDoc(docRef)

      if (!snapshot.exists()) {
        toast.error('투표를 찾을 수 없습니다.')
        router.push('/admin/polls')
        return
      }

      const data = snapshot.data()
      setTitle(data.title || '')
      setIsPublic(data.isPublic ?? true)
      setPassword(data.password || '')
      setPasswordConfirm(data.password || '')
      setDeadline(data.deadline || '')
      setMaxParticipants(data.maxParticipants ?? null)
      setOptions(data.options || [])
      setCategory(data.category || '')
      setCreatedAt(
        typeof data.createdAt === 'object' && data.createdAt?.toDate
          ? format(data.createdAt.toDate(), 'yyyy-MM-dd')
          : data.createdAt || ''
      )

      const defaultImg = getCategoryDefaultImage(
        data.category,
        categories || []
      )
      setMainImageUrl(data.mainImageUrl || `${defaultImg}?t=${Date.now()}`)

      setIsLocked((data.votedUsers?.length ?? 0) > 0)
      setLoading(false)
    }

    fetchPoll()
  }, [id, categories, router])
  useEffect(() => {
    if (!mainImageFile && (!mainImageUrl || mainImageUrl.includes('/default-image.png'))) {
      const fallback = getCategoryDefaultImage(category, categories || [])
      setMainImageUrl(`${fallback}?t=${Date.now()}`)
    }
  }, [category, categories, mainImageFile])

  if (loading) return <div className="p-6">로딩 중...</div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Link href="/admin/polls" className="text-sm text-gray-600 hover:underline mb-4">
        ← 투표 현황으로 돌아가기
      </Link>

      <h1 className="text-2xl font-bold text-purple-700 mb-6 text-center">🛠️ 관리자 투표 수정</h1>

      {isLocked && (
        <div className="mb-6 p-4 bg-yellow-100 text-yellow-800 rounded text-sm">
          ⚠️ 참여자가 있는 투표는 수정할 수 없습니다.
        </div>
      )}

      <div className="space-y-4">
        <div className="text-sm text-gray-500">등록일: {createdAt}</div>

        {/* 공개 여부 */}
        <div>
          <label className="font-semibold block mb-1">공개 여부</label>
          <select
            value={isPublic ? 'public' : 'private'}
            onChange={(e) => setIsPublic(e.target.value === 'public')}
            disabled={isLocked}
            className="w-full border rounded px-3 py-2"
          >
            <option value="public">공개</option>
            <option value="private">비공개</option>
          </select>
        </div>

        {!isPublic && (
          <>
            <div>
              <label className="block font-semibold mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLocked}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">비밀번호 재입력</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={isLocked}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </>
        )}

        {/* 카테고리 */}
        <div>
          <label className="block font-semibold mb-1">카테고리</label>
          <select
            value={category}
            onChange={(e) => {
              const selected = e.target.value
              setCategory(selected)
              if (!mainImageFile) {
                const fallback = getCategoryDefaultImage(selected, categories || [])
                setMainImageUrl(`${fallback}?t=${Date.now()}`)
              }
            }}
            disabled={isLocked}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">카테고리를 선택하세요</option>
            {categories &&
              categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>

        {/* 제목 */}
        <div>
          <label className="block font-semibold mb-1">제목</label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLocked}
            className="w-full border rounded px-3 py-2 resize-none break-words"
            rows={2}
          />
        </div>

        {/* 대표 이미지 */}
        <div>
          <label className="block font-semibold mb-1">대표 이미지</label>
          {mainImageUrl && (
            <div className="mb-2">
              <Image
                src={mainImageUrl}
                alt="대표 이미지"
                width={640}
                height={360}
                className="rounded border"
              />
              {!isLocked && (
                <button
                  onClick={async () => {
                    const refPath = `polls/main/${id}`
                    await deleteObject(ref(storage, refPath)).catch(() => {})
                    const fallback = getCategoryDefaultImage(category, categories || [])
                    setMainImageUrl(`${fallback}?t=${Date.now()}`)
                    toast.success('대표 이미지 삭제 완료')
                  }}
                  className="text-sm text-red-500 hover:underline mt-1 ml-2"
                >
                  삭제
                </button>
              )}
            </div>
          )}
          {!isLocked && (
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setMainImageFile(file)
              }}
            />
          )}
        </div>
        {/* 옵션 목록 */}
        <div>
          <label className="block font-semibold mb-1">옵션 목록</label>
          {options.map((opt, idx) => (
            <div key={opt.id} className="mb-4">
              <input
                type="text"
                value={opt.text}
                onChange={(e) => {
                  const updated = [...options]
                  updated[idx].text = e.target.value
                  setOptions(updated)
                }}
                disabled={isLocked}
                className="w-full border rounded px-3 py-2 mb-1"
              />
              {opt.imageUrl && (
                <div>
                  <Image
                    src={opt.imageUrl}
                    alt="옵션 이미지"
                    width={300}
                    height={200}
                    className="rounded border"
                  />
                  {!isLocked && (
                    <button
                      onClick={async () => {
                        const refPath = `polls/options/${opt.id}`
                        await deleteObject(ref(storage, refPath)).catch(() => {})
                        const updated = [...options]
                        updated[idx].imageUrl = ''
                        setOptions(updated)
                        toast.success('옵션 이미지 삭제 완료')
                      }}
                      className="text-sm text-red-500 hover:underline mt-1 ml-2"
                    >
                      삭제
                    </button>
                  )}
                </div>
              )}
              {!isLocked && (
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const storageRef = ref(storage, `polls/options/${opt.id}`)
                    await uploadBytes(storageRef, file)
                    const url = await getDownloadURL(storageRef)
                    const updated = [...options]
                    updated[idx].imageUrl = url
                    setOptions(updated)
                  }}
                />
              )}
              {!isLocked && options.length > 2 && (
                <button
                  onClick={() => {
                    const updated = options.filter((_, i) => i !== idx)
                    setOptions(updated)
                  }}
                  className="text-sm text-red-500 hover:underline mt-1"
                >
                  옵션 삭제
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 마감일 */}
        <div>
          <label className="block font-semibold mb-1">마감일</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={isLocked}
            min={today}
            max={maxDate}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {/* 참여자 수 제한 */}
        <div>
          <label className="block font-semibold mb-1">참여자 수 제한</label>
          <input
            type="number"
            value={maxParticipants ?? ''}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            disabled={isLocked}
            className="w-full border rounded px-3 py-2"
            placeholder="예: 100"
          />
        </div>

        {!isLocked && (
          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={async () => {
                const confirm = window.confirm('정말로 이 투표를 삭제하시겠습니까?')
                if (!confirm) return
                await deleteDoc(doc(db, 'polls', id as string))
                toast.success('삭제 완료')
                router.push('/admin/polls')
              }}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              삭제
            </button>
            <button
              onClick={async () => {
                if (!title.trim()) {
                  toast.warning('제목을 입력하세요.')
                  return
                }
                if (!isPublic) {
                  if (!/^[a-zA-Z0-9]{6,12}$/.test(password)) {
                    toast.warning('비밀번호는 6~12자의 영문/숫자만 가능합니다.')
                    return
                  }
                  if (password !== passwordConfirm) {
                    toast.warning('비밀번호가 일치하지 않습니다.')
                    return
                  }
                }
                if (options.some((opt) => !opt.text.trim())) {
                  toast.warning('모든 옵션의 텍스트를 입력하세요.')
                  return
                }

                let uploadedImageUrl = mainImageUrl
                if (mainImageFile) {
                  const storageRef = ref(storage, `polls/main/${id}`)
                  await uploadBytes(storageRef, mainImageFile)
                  uploadedImageUrl = await getDownloadURL(storageRef)
                }

                await updateDoc(doc(db, 'polls', id as string), {
                  title,
                  isPublic,
                  ...(isPublic ? {} : { password }),
                  category,
                  deadline,
                  maxParticipants,
                  mainImageUrl: uploadedImageUrl,
                  options,
                  createdAt,
                })

                toast.success('수정 완료!')
                router.push('/admin/polls')
              }}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              수정
            </button>
          </div>
        )}
      </div>
    </div>
  )
}





