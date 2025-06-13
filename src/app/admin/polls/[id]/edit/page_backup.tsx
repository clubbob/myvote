'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { toast } from 'sonner'
import { format, addDays } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import Link from 'next/link'
import { getCategoryDefaultImage } from '@/utils/getCategoryDefaultImage'
import { useCategoryList } from '@/hooks/useCategoryList'
import Image from 'next/image'

interface PollOption {
  id: string
  text: string
  imageUrl?: string
  votes?: string[]
}

export default function AdminPollEditPage() {
  const router = useRouter()
  const { id } = useParams()
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
  const [createdAt, setCreatedAt] = useState<string | undefined>()

  const today = format(new Date(), 'yyyy-MM-dd')
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')

  // Firestore Timestamp와 string 모두 지원하도록 변환
  const isLocked =
    createdAt &&
    new Date(
      typeof createdAt === 'string'
        ? createdAt
        : // @ts-ignore
          createdAt.toDate?.() || createdAt
    ) < new Date()

  useEffect(() => {
    const fetch = async () => {
      const refDoc = doc(db, 'polls', id as string)
      const snap = await getDoc(refDoc)
      if (snap.exists()) {
        const data = snap.data()
        setTitle(data.title || '')
        setIsPublic(data.isPublic ?? true)
        setPassword(data.password || '')
        setDeadline(data.deadline || '')
        setMaxParticipants(data.maxParticipants ?? null)
        setMainImageUrl(data.mainImageUrl || '')
        setOptions(data.options || [])
        setCategory(data.category || '')
        // createdAt은 string 또는 Timestamp를 string으로 변환 저장
        if (typeof data.createdAt === 'object' && data.createdAt?.toDate) {
          setCreatedAt(data.createdAt.toDate().toISOString())
        } else {
          setCreatedAt(data.createdAt)
        }
      }
    }

    fetch()
  }, [id])

  const handleOptionImageChange = async (file: File, index: number) => {
    if (!file || !file.type.startsWith('image/')) return
    const refPath = `polls/options/${id}/${uuidv4()}`
    const storageRef = ref(storage, refPath)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)

    const updatedOptions = [...options]
    updatedOptions[index].imageUrl = url
    setOptions(updatedOptions)
  }

  const handleOptionDelete = (index: number) => {
    if (options.length <= 2) {
      toast.warning('옵션은 최소 2개 이상이어야 합니다.')
      return
    }
    const updated = [...options]
    updated.splice(index, 1)
    setOptions(updated)
  }

  const handleOptionTextChange = (text: string, index: number) => {
    const updated = [...options]
    updated[index].text = text
    setOptions(updated)
  }
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Link
        href="/admin/polls"
        className="text-sm text-purple-600 hover:underline mb-4 inline-block"
      >
        ← 투표 현황으로 돌아가기
      </Link>

      <h1 className="text-2xl font-bold text-purple-700 mb-6">🛠️ 관리자 투표 수정</h1>

      {/* 공개 여부 */}
      <div className="flex items-center gap-4">
        <label className="font-semibold">공개 여부</label>
        <select
          value={isPublic ? 'public' : 'private'}
          onChange={(e) => setIsPublic(e.target.value === 'public')}
          className="border rounded px-3 py-2"
          disabled={isLocked}
        >
          <option value="public">공개</option>
          <option value="private">비공개</option>
        </select>
      </div>

      {/* 비공개일 경우 비밀번호 입력 */}
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
              placeholder="6~12자, 영문/숫자 조합"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">비밀번호 확인</label>
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
            const selectedSlug = e.target.value
            setCategory(selectedSlug)

            const selected = categories?.find((c) => c.slug === selectedSlug)
            if (!mainImageFile && selected) {
              const defaultImage = getCategoryDefaultImage(selected.name, categories!)
              setMainImageUrl(defaultImage)
            }
          }}
          className="w-full border rounded px-3 py-2"
          disabled={isLocked}
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
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLocked}
          className="w-full border rounded px-3 py-2"
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
              width={600}
              height={360}
              className="rounded border object-cover"
            />
            {!isLocked && (
              <button
                type="button"
                onClick={async () => {
                  const path = `polls/main/${id}`
                  await deleteObject(ref(storage, path))
                  setMainImageUrl('')
                }}
                className="text-sm text-red-500 underline mt-1"
              >
                이미지 삭제
              </button>
            )}
          </div>
        )}
        {!isLocked && (
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setMainImageFile(e.target.files[0])
              }
            }}
          />
        )}
      </div>

      {/* 옵션 목록 */}
      <div>
        <label className="block font-semibold mb-1">투표 옵션</label>
        {options.map((opt, i) => (
          <div key={opt.id} className="mb-4 border rounded p-4 space-y-2">
            <input
              type="text"
              value={opt.text}
              onChange={(e) => handleOptionTextChange(e.target.value, i)}
              className="w-full border rounded px-3 py-2"
              disabled={isLocked}
            />
            {opt.imageUrl && (
              <Image
                src={opt.imageUrl}
                alt={`옵션 ${i + 1}`}
                width={300}
                height={180}
                className="rounded border"
              />
            )}
            {!isLocked && (
              <div className="flex gap-4 mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleOptionImageChange(e.target.files[0], i)
                    }
                  }}
                />
                <button
                  onClick={() => handleOptionDelete(i)}
                  className="text-red-500 underline"
                >
                  삭제
                </button>
              </div>
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

      {/* 버튼 */}
      {!isLocked && (
        <div className="flex gap-4 mt-6">
          <button
            onClick={async () => {
              const confirmDelete = window.confirm(
                '정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
              )
              if (!confirmDelete) return
              await deleteDoc(doc(db, 'polls', id as string))
              toast.success('삭제되었습니다.')
              router.push('/admin/polls')
            }}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            삭제
          </button>
          <button
            onClick={async () => {
              if (!title.trim()) {
                toast.warning('제목을 입력해주세요.')
                return
              }
              if (!isPublic) {
                if (password.length < 6 || password.length > 12) {
                  toast.warning('비밀번호는 6~12자여야 합니다.')
                  return
                }
                if (password !== passwordConfirm) {
                  toast.warning('비밀번호가 일치하지 않습니다.')
                  return
                }
              }

              try {
                const docRef = doc(db, 'polls', id as string)

                if (mainImageFile) {
                  const refPath = `polls/main/${id}`
                  const storageRef = ref(storage, refPath)
                  await uploadBytes(storageRef, mainImageFile)
                  const url = await getDownloadURL(storageRef)
                  setMainImageUrl(url)
                }

                await updateDoc(docRef, {
                  title,
                  isPublic,
                  ...(isPublic ? {} : { password }),
                  deadline,
                  maxParticipants,
                  mainImageUrl,
                  options,
                  category,
                })

                toast.success('수정이 완료되었습니다.')
                router.push('/admin/polls')
              } catch {
                toast.error('수정 중 오류가 발생했습니다.')
              }
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            수정
          </button>
        </div>
      )}
    </div>
  )
}
