'use client'

import { useState } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { useAuthStore } from '@/stores/authStore'

interface Comment {
  id: string
  text: string
  uid: string
  nickname: string
  createdAt: string
  updatedAt?: string
  parentId?: string
}

interface Props {
  comment: Comment
  allComments: Comment[]
  pollId: string
}

export default function CommentItem({ comment, allComments, pollId }: Props) {
  const { user } = useAuthStore()
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState(comment.text)

  console.log('[디버깅] 렌더링 댓글:', comment)

  const replies = allComments.filter((c) => c.parentId === comment.id)

  const handleReply = async () => {
    if (!user || !user.nickname || !replyText.trim()) return

    await addDoc(collection(db, 'comments'), {
      pollId,
      text: replyText.trim(),
      uid: user.uid,
      nickname: user.nickname,
      parentId: comment.id,
      createdAt: new Date().toISOString(),
    })

    setReplyText('')
    setShowReply(false)
  }

  const handleUpdate = async () => {
    if (!editText.trim()) return

    await updateDoc(doc(db, 'comments', comment.id), {
      text: editText.trim(),
      updatedAt: new Date().toISOString(),
    })

    setEditMode(false)
  }

  return (
    <div className="border rounded p-3 bg-white text-black">
      {/* 닉네임 + 수정 버튼 */}
      <div className="flex justify-between items-start">
        <p className="text-sm text-gray-700 font-medium">
          {comment.nickname || '익명'}
        </p>
        {user?.uid === comment.uid && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="text-xs text-blue-500 hover:underline"
          >
            ✏️ 수정
          </button>
        )}
      </div>

      {/* 본문 or 수정창 */}
      {!editMode ? (
        <div className="text-sm mt-1 whitespace-pre-line">
          {comment.text}
          {comment.updatedAt && (
            <span className="ml-2 text-xs text-gray-400">(수정됨)</span>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full border rounded p-2 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              저장
            </button>
            <button
              onClick={() => {
                setEditText(comment.text)
                setEditMode(false)
              }}
              className="px-3 py-1 bg-gray-300 text-sm rounded hover:bg-gray-400"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 답글 */}
      <div className="mt-2">
        {replies.map((reply) => (
          <div key={reply.id} className="mt-3 ml-4 border-l pl-3">
            <CommentItem comment={reply} allComments={allComments} pollId={pollId} />
          </div>
        ))}

        {/* 답글 작성 UI */}
        {user && !comment.parentId && (
          <div className="mt-2">
            {!showReply ? (
              <button
                onClick={() => setShowReply(true)}
                className="text-xs text-gray-500 hover:underline"
              >
                ↪️ 답글 쓰기
              </button>
            ) : (
              <div className="mt-2 space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full border rounded p-2 text-sm resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReply}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    작성
                  </button>
                  <button
                    onClick={() => {
                      setReplyText('')
                      setShowReply(false)
                    }}
                    className="px-3 py-1 bg-gray-300 text-sm rounded hover:bg-gray-400"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


