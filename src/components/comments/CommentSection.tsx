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

  useEffect(() => {
    if (!pollId) return

    const q = query(
      collection(db, 'comments'),
      where('pollId', '==', pollId),
      orderBy('createdAt', 'asc')
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
            : data.createdAt ?? '',
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

    await addDoc(collection(db, 'comments'), {
      pollId,
      text: newComment.trim(),
      uid: user.uid,
      nickname: user.nickname,
      createdAt: new Date().toISOString(),
      parentId: null,
    })

    setNewComment('')
  }

  const topLevelComments = comments.filter((c) => !c.parentId)

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
        {topLevelComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            allComments={comments}
            pollId={pollId}
          />
        ))}
      </div>
    </div>
  )
}









