'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { toast } from 'sonner'
import Image from 'next/image'
import { format, addDays } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'

interface PollOption {
  id: string
  text: string
  imageUrl?: string
  votes?: string[]
}

interface PollData {
  title: string
  isPublic: boolean
  password?: string
  deadline?: string
  maxParticipants?: number
  mainImageUrl?: string
  options: PollOption[]
  category: string
  votedUsers?: string[]
}

export default function AdminEditPollPage() {
  const { id } = useParams()
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [deadline, setDeadline] = useState('')
  const [maxParticipants, setMaxParticipants] = useState<number | undefined>()
  const [mainImageUrl, setMainImageUrl] = useState('')
  const [mainImageFile, setMainImageFile] = useState<File | null>(null)
  const [options, setOptions] = useState<PollOption[]>([])
  const [category, setCategory] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [loading, setLoading] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')
  const maxDate = format(addDays(new Date(), 30), 'yyyy-MM-dd')

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const refDoc = doc(db, 'polls', id as string)
        const snapshot = await getDoc(refDoc)
        if (!snapshot.exists()) {
          toast.error('투표를 찾을 수 없습니다.')
          router.push('/admin/polls')
          return
        }

        const data = snapshot.data() as PollData
        setTitle(data.title)
        setIsPublic(data.isPublic)
        setPassword(data.password ?? '')
        setPasswordConfirm(data.password ?? '')
        setDeadline(data.deadline ?? '')
        setMaxParticipants(data.maxParticipants)
        setMainImageUrl(data.mainImageUrl ?? '')
        setOptions(data.options ?? [])
        setCategory(data.category)
        setIsLocked((data.votedUsers?.length ?? 0) > 0)
      } catch (err) {
        toast.error('데이터를 불러오는 데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchPoll()
  }, [id, router])

  if (loading) return <div className="p-6">로딩 중...</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-purple-700 text-center mb-6">🛠️ 투표 수정</h1>

      {/* 공개 여부 */}
      <div>
        <label className="block font-semibold mb-1">공개 여부</label>
        <select
          value={isPublic ? 'public' : 'private'}
          onChange={(e) => setIsPublic(e.target.value === 'public')}
          disabled={isLocked}
          className="w-full border rounded px-3 py-2"
        >
          <option value="public">공개 투표</option>
          <option value="private">비공개 투표</option>
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
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isLocked}
          className="w-full border rounded px-3 py-2"
        />
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
            <Image src={mainImageUrl} alt="대표 이미지" width={640} height={360} className="rounded border" />
            {!isLocked && (
              <button
                onClick={() => setMainImageUrl('')}
                className="text-sm text-red-500 hover:underline mt-1 block"
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
              <div className="mb-1">
                <Image src={opt.imageUrl} alt="옵션 이미지" width={300} height={200} className="rounded border" />
                {!isLocked && (
                  <button
                    onClick={() => {
                      const updated = [...options]
                      updated[idx].imageUrl = ''
                      setOptions(updated)
                    }}
                    className="text-sm text-red-500 hover:underline mt-1 block"
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
                  const file = e.target.files?.[0]
                  if (!file) return
                  const upload = async () => {
                    const refPath = `polls/options/${opt.id}`
                    const storageRef = ref(storage, refPath)
                    await uploadBytes(storageRef, file)
                    const url = await getDownloadURL(storageRef)
                    const updated = [...options]
                    updated[idx].imageUrl = url
                    setOptions(updated)
                  }
                  upload()
                }}
              />
            )}
          </div>
        ))}
        {!isLocked && options.length < 10 && (
          <button
            onClick={() => setOptions([...options, { id: uuidv4(), text: '' }])}
            className="text-sm text-purple-600 hover:underline"
          >
            + 옵션 추가
          </button>
        )}
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
              const confirmDelete = window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')
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






