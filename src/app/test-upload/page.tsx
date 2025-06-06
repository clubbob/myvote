'use client'

import { useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import { v4 as uuidv4 } from 'uuid'

const MAX_FILE_SIZE = 5 * 1024 * 1024

const isValidImageType = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  return validTypes.includes(file.type)
}

const getExtension = (mimeType: string): string => {
  switch (mimeType) {
    case 'image/jpeg': return 'jpg'
    case 'image/png': return 'png'
    case 'image/webp': return 'webp'
    case 'image/gif': return 'gif'
    default: return 'bin'
  }
}

export default function TestUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    setError(null)
    setUploadUrl(null)

    if (!file) return setError('⚠️ 파일을 먼저 선택해주세요.')
    if (!isValidImageType(file)) return setError('❌ 지원하지 않는 이미지 형식입니다.')
    if (file.size > MAX_FILE_SIZE) return setError('❌ 이미지 크기는 5MB 이하여야 합니다.')

    try {
      setLoading(true)
      const ext = getExtension(file.type)
      const filename = `${uuidv4()}_${Date.now()}.${ext}`
      const imageRef = ref(storage, `test-uploads/${filename}`)

      console.log('📤 업로드 시작:', file.name)
      await uploadBytes(imageRef, file)

      const url = await getDownloadURL(imageRef)
      console.log('✅ 업로드 완료 URL:', url)

      setUploadUrl(url)
      alert('✅ 업로드 성공!')
    } catch (err) {
      console.error('❌ 업로드 실패:', err)
      setError('❌ 이미지 업로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-6">
      <h1 className="text-xl font-bold">🧪 이미지 업로드 테스트</h1>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const selected = e.target.files?.[0] || null
          setFile(selected)
          setUploadUrl(null)
          if (selected) setPreview(URL.createObjectURL(selected))
        }}
      />

      {preview && (
        <div>
          <p className="text-sm text-gray-600 mt-4">🖼 미리보기</p>
          <img src={preview} className="w-64 rounded shadow border" />
        </div>
      )}

      <button
        onClick={handleUpload}
        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? '업로드 중...' : '업로드'}
      </button>

      {uploadUrl && (
        <p className="text-green-600 text-sm break-all">
          ✅ 업로드 완료:&nbsp;
          <a href={uploadUrl} target="_blank" className="underline">{uploadUrl}</a>
        </p>
      )}

      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
