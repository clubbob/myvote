'use client'

import { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  writeBatch,
  deleteDoc,
  addDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from 'sonner'
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd'
import { categoryImages } from '@/data/categoryImages'

interface Category {
  id: string
  name: string
  imagePath: string
  order: number
}

export default function AdminCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [newImagePath, setNewImagePath] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editImagePath, setEditImagePath] = useState('')
  const [loading, setLoading] = useState(true)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, 'categories'), orderBy('order', 'asc'))
        const snapshot = await getDocs(q)
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          imagePath: doc.data().imagePath ?? '',
          order: doc.data().order ?? 0,
        }))
        setCategories(list)
      } catch (error) {
        toast.error('카테고리 불러오기 실패')
      } finally {
        setLoading(false)
      }
    }
    fetchCategories()
  }, [])

  const normalizeImagePath = (filename: string) => {
    return filename.startsWith('/images/category/')
      ? filename
      : `/images/category/${filename}`
  }

  const handleAdd = async () => {
    if (!newCategory.trim() || !newImagePath.trim()) return
    const fullPath = normalizeImagePath(newImagePath)
    const nextOrder = categories.length + 1
    const docRef = await addDoc(collection(db, 'categories'), {
      name: newCategory.trim(),
      imagePath: fullPath,
      order: nextOrder,
    })
    setCategories([...categories, {
      id: docRef.id,
      name: newCategory.trim(),
      imagePath: fullPath,
      order: nextOrder,
    }])
    setNewCategory('')
    setNewImagePath('')
    toast.success('카테고리가 추가되었습니다!')
  }

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'categories', id))
    setCategories(categories.filter(cat => cat.id !== id))
    setIsDirty(true)
    toast.info('카테고리가 삭제되었습니다.')
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const reordered = [...categories]
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)
    const updated = reordered.map((cat, idx) => ({ ...cat, order: idx + 1 }))
    setCategories(updated)
    setIsDirty(true)
  }

  const handleSaveOrder = async () => {
    try {
      const batch = writeBatch(db)
      categories.forEach(cat => {
        const docRef = doc(db, 'categories', cat.id)
        batch.update(docRef, { order: cat.order })
      })
      await batch.commit()
      toast.success('순서가 저장되었습니다.')
      setIsDirty(false)
    } catch (err) {
      toast.error('순서 저장 실패')
    }
  }

  const handleUpdate = async (id: string, name: string, imagePath: string) => {
    const fullPath = normalizeImagePath(imagePath)
    const docRef = doc(db, 'categories', id)
    await updateDoc(docRef, { name, imagePath: fullPath })
    setCategories(prev =>
      prev.map(cat =>
        cat.id === id ? { ...cat, name, imagePath: fullPath } : cat
      )
    )
    toast.success('카테고리 수정 완료!')
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-purple-700 mb-4">📁 카테고리 관리</h1>

      {/* 추가 폼 */}
      <div className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="카테고리명"
          className="border px-3 py-2 rounded shadow-sm"
        />
        <select
          value={newImagePath}
          onChange={(e) => setNewImagePath(e.target.value)}
          className="border px-3 py-2 rounded"
        >
          <option value="">파일 선택</option>
          {categoryImages.map(({ filename, label }) => (
            <option key={filename} value={filename}>
              {filename} ({label})
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          추가
        </button>
      </div>

      {/* 리스트 */}
      {loading ? (
        <p className="text-gray-500">카테고리를 불러오는 중...</p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {categories.map((cat, index) => (
                  <Draggable key={cat.id} draggableId={cat.id} index={index}>
                    {(provided, snapshot) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-gray-50 px-4 py-3 border rounded shadow-sm ${
                          snapshot.isDragging ? 'bg-purple-100' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div {...provided.dragHandleProps} className="text-gray-400 cursor-grab pt-1">⠿</div>
                          <div className="flex-1">
                            {editId === cat.id ? (
                              <>
                                <input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="border px-2 py-1 rounded text-sm w-full mb-1"
                                />
                                <select
                                  value={editImagePath.replace('/images/category/', '')}
                                  onChange={(e) => setEditImagePath(e.target.value)}
                                  className="border px-2 py-1 rounded text-sm w-full"
                                >
                                  <option value="">파일 선택</option>
                                  {categoryImages.map(({ filename, label }) => (
                                    <option key={filename} value={filename}>
                                      {filename} ({label})
                                    </option>
                                  ))}
                                </select>
                                <div className="mt-2 flex gap-3 text-sm">
                                  <button
                                    onClick={() => {
                                      handleUpdate(cat.id, editName, editImagePath)
                                      setEditId(null)
                                    }}
                                    className="text-blue-600 hover:underline"
                                  >
                                    저장
                                  </button>
                                  <button
                                    onClick={() => setEditId(null)}
                                    className="text-gray-500 hover:underline"
                                  >
                                    취소
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="font-medium">{cat.name}</div>
                                <div className="text-xs text-gray-500 break-all">{cat.imagePath}</div>
                              </>
                            )}
                          </div>
                          {editId !== cat.id && (
                            <div className="flex flex-col gap-1 text-right text-sm whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setEditId(cat.id)
                                  setEditName(cat.name)
                                  setEditImagePath(cat.imagePath)
                                }}
                                className="text-blue-600 hover:underline"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => {
                                  const ok = confirm('정말 이 카테고리를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')
                                  if (ok) {
                                    handleDelete(cat.id)
                                  }
                                }}
                                className="text-red-500 hover:underline"
                              >
                                삭제
                              </button>
                            </div>
                          )}
                        </div>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {isDirty && (
        <button
          onClick={handleSaveOrder}
          className="mt-6 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          순서 저장
        </button>
      )}
    </div>
  )
}



