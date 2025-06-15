'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  addDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { useAuthStore } from '@/stores/authStore'
import CommentItem from './CommentItem'

interface Comment {
  id: string
  text: string
  uid: string
  nickname: string
  createdAt: string
  updatedAt?: string
  parentId?: string | null
}

export default function CommentSection({ pollId }: { pollId: string }) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [showAllComments, setShowAllComments] = useState(false)

  useEffect(() => {
    if (!pollId) return

    const q = query(collection(db, 'comments'), where('pollId', '==', pollId))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = snapshot.docs
        .map((doc) => {
          const data = doc.data()
          const createdAt =
            data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : typeof data.createdAt === 'string'
              ? data.createdAt
              : null

          if (!createdAt) return null

          return {
            id: doc.id,
            text: data.text,
            uid: data.uid,
            nickname: data.nickname,
            parentId: data.parentId ?? null,
            createdAt,
            updatedAt: data.updatedAt ?? '',
          }
        })
        .filter((c) => c !== null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // 최신순

      setComments(list)
    })

    return () => unsubscribe()
  }, [pollId])

  const handleSubmit = async () => {
    if (!user || !user.nickname || !newComment.trim()) return

    try {
      await addDoc(collection(db, 'comments'), {
        pollId,
        text: newComment.trim(),
        uid: user.uid,
        nickname: user.nickname,
        createdAt: serverTimestamp(),
        parentId: null,
      })
      setNewComment('')
    } catch (err) {
      console.error('❌ 댓글 등록 실패:', err)
    }
  }

  const topLevelComments = comments.filter((c) => !c.parentId)
  const visibleTopLevelComments = showAllComments
    ? topLevelComments
    : topLevelComments.slice(0, 2)

  return (
    <div className="mt-10">
      <h3 className="text-lg font-semibold mb-4">💬 댓글</h3>

      {/* 댓글 작성 영역 */}
      <div className="mb-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="댓글을 입력하세요"
          className="w-full p-3 border rounded resize-none text-sm"
        />
        <button
          onClick={handleSubmit}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          댓글 작성
        </button>
      </div>

      {/* 댓글 목록 */}
      <div className="space-y-4">
        {topLevelComments.length === 0 && (
          <p className="text-sm text-gray-500">등록된 댓글이 없습니다.</p>
        )}
        {visibleTopLevelComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            allComments={comments}
            pollId={pollId}
            setComments={setComments}
          />
        ))}

        {/* 더보기 / 접기 */}
        {topLevelComments.length > 2 && (
          <button
            onClick={() => setShowAllComments((prev) => !prev)}
            className="text-xs text-gray-500 hover:underline mt-2"
          >
            {showAllComments
              ? '🔽 댓글 접기'
              : `💬 댓글 ${topLevelComments.length - 2}개 더보기`}
          </button>
        )}
      </div>
    </div>
  )
}
