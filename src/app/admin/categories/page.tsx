'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface Category {
  id: string
  name: string
  order: number
}

export default function AdminCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, 'categories'), orderBy('order', 'asc'))
        const snapshot = await getDocs(q)
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          order: doc.data().order ?? 0,
        }))
        setCategories(list)
      } catch (error) {
        console.error('카테고리 불러오기 실패:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const handleAdd = async () => {
    if (!newCategory.trim()) return
    const nextOrder = categories.length + 1
    const docRef = await addDoc(collection(db, 'categories'), {
      name: newCategory.trim(),
      order: nextOrder,
    })
    setCategories([...categories, { id: docRef.id, name: newCategory.trim(), order: nextOrder }])
    setNewCategory('')
  }

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'categories', id))
    setCategories(categories.filter((cat) => cat.id !== id))
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">📁 카테고리 관리</h1>

      <div className="flex mb-4 gap-2">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="새 카테고리명 입력"
          className="flex-1 border px-3 py-2 rounded shadow-sm"
        />
        <button
          onClick={handleAdd}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          추가
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">카테고리를 불러오는 중...</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-500">등록된 카테고리가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex justify-between items-center bg-gray-50 px-4 py-2 border rounded"
            >
              <span>{cat.name}</span>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-red-500 text-sm hover:underline"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}



