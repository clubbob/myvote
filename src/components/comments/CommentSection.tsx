'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  onSnapshot,
  Timestamp,
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

    const q = query(
      collection(db, 'comments'),
      where('pollId', '==', pollId),
      orderBy('createdAt', 'desc') // ✅ 최신순으로 변경
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Comment[] = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          text: data.text,
          uid: data.uid,
          nickname: data.nickname,
          parentId: data.parentId ?? null,
          createdAt: (data.createdAt instanceof Timestamp)
            ? data.createdAt.toDate().toISOString()
            : typeof data.createdAt === 'string'
              ? data.createdAt
              : '',
          updatedAt: data.updatedAt ?? '',
        }
      })

      console.log('🧾 실시간 댓글 수신:', list.length)
      setComments(list)
    })

    return () => unsubscribe()
  }, [pollId])

  const handleSubmit = async () => {
    if (!user || !user.nickname || !newComment.trim()) return

    const newCommentData = {
      pollId,
      text: newComment.trim(),
      uid: user.uid,
      nickname: user.nickname,
      createdAt: new Date().toISOString(),
      parentId: null,
    }

    try {
      const docRef = await addDoc(collection(db, 'comments'), newCommentData)

      setComments((prev) => [
        {
          ...newCommentData,
          id: docRef.id,
          updatedAt: '',
        },
        ...prev, // ✅ 최신 댓글을 위에 추가
      ])

      setNewComment('')
    } catch (err) {
      console.error('❌ 댓글 등록 실패:', err)
    }
  }

  const topLevelComments = comments.filter((c) => !c.parentId)
  const visibleComments = showAllComments
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
        {visibleComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            allComments={comments}
            pollId={pollId}
            setComments={setComments}
          />
        ))}

        {/* 댓글 더보기/접기 버튼 */}
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








