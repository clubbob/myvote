'use client'

import { useState } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
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
  setComments: React.Dispatch<React.SetStateAction<Comment[]>>
}

export default function CommentItem({ comment, allComments, pollId, setComments }: Props) {
  const { user } = useAuthStore()
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState(comment.text)
  const [showAllReplies, setShowAllReplies] = useState(false)

  const replies = allComments
    .filter((c) => c.parentId === comment.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // 최신순

  const visibleReplies = showAllReplies ? replies : replies.slice(0, 1)

  const handleReply = async () => {
    if (!user || !user.nickname || !replyText.trim()) return

    try {
      await addDoc(collection(db, 'comments'), {
        pollId,
        text: replyText.trim(),
        uid: user.uid,
        nickname: user.nickname,
        parentId: comment.id,
        createdAt: serverTimestamp(),
      })

      setReplyText('')
      setShowReply(false)
    } catch (err) {
      console.error('답글 등록 실패:', err)
    }
  }

  const handleUpdate = async () => {
    if (!editText.trim()) return

    try {
      await updateDoc(doc(db, 'comments', comment.id), {
        text: editText.trim(),
        updatedAt: new Date().toISOString(),
      })

      setEditMode(false)
    } catch (err) {
      console.error('댓글 수정 실패:', err)
    }
  }

  return (
    <div className="border rounded p-3 bg-white text-black">
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

      <div className="mt-2 ml-4">
        {visibleReplies.map((reply) => (
          <div key={reply.id} className="mt-3 border-l pl-3">
            <CommentItem
              comment={reply}
              allComments={allComments}
              pollId={pollId}
              setComments={setComments}
            />
          </div>
        ))}

        {replies.length > 1 && (
          <div className="ml-4 mt-2">
            <button
              onClick={() => setShowAllReplies((prev) => !prev)}
              className="text-xs text-gray-500 hover:underline"
            >
              {showAllReplies
                ? '🔽 답글 접기'
                : `↪️ 답글 ${replies.length - 1}개 더보기`}
            </button>
          </div>
        )}

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








