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

interface Category {
  id: string
  name: string
  order: number
}

interface EditState {
  [key: string]: {
    name: string
    originalName: string
    isEditing: boolean
  }
}

export default function AdminCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [editState, setEditState] = useState<EditState>({})

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

        // 초기 editState 세팅
        const initialEditState: EditState = {}
        list.forEach(cat => {
          initialEditState[cat.id] = {
            name: cat.name,
            originalName: cat.name,
            isEditing: false,
          }
        })
        setEditState(initialEditState)
      } catch (error) {
        console.error('카테고리 불러오기 실패:', error)
        toast.error('카테고리 불러오기 실패')
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
    const newCat = { id: docRef.id, name: newCategory.trim(), order: nextOrder }
    setCategories([...categories, newCat])
    setEditState(prev => ({
      ...prev,
      [newCat.id]: {
        name: newCat.name,
        originalName: newCat.name,
        isEditing: false,
      },
    }))
    setNewCategory('')
    toast.success('카테고리가 추가되었습니다!')
  }

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'categories', id))
    setCategories(categories.filter((cat) => cat.id !== id))
    setEditState(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    toast.info('카테고리가 삭제되었습니다.')
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const reordered = Array.from(categories)
    const [removed] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, removed)

    const updated = reordered.map((cat, idx) => ({
      ...cat,
      order: idx + 1,
    }))

    setCategories(updated)

    try {
      const batch = writeBatch(db)
      updated.forEach(cat => {
        const docRef = doc(db, 'categories', cat.id)
        batch.update(docRef, { order: cat.order })
      })
      await batch.commit()
      toast.success('순서가 저장되었습니다.')
    } catch (err) {
      console.error('순서 저장 오류:', err)
      toast.error('순서 저장에 실패했습니다.')
    }
  }

  const startEdit = (id: string) => {
    setEditState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isEditing: true,
      }
    }))
  }

  const cancelEdit = (id: string) => {
    setEditState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        name: prev[id].originalName,
        isEditing: false,
      }
    }))
  }

  const changeName = (id: string, newName: string) => {
    setEditState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        name: newName,
      }
    }))
  }

  const saveName = async (id: string) => {
    const newName = editState[id].name.trim()
    if (!newName) {
      toast.error('카테고리 이름을 비워둘 수 없습니다.')
      return
    }
    try {
      const docRef = doc(db, 'categories', id)
      await updateDoc(docRef, { name: newName })
      setCategories(prev =>
        prev.map(cat => (cat.id === id ? { ...cat, name: newName } : cat))
      )
      setEditState(prev => ({
        ...prev,
        [id]: {
          name: newName,
          originalName: newName,
          isEditing: false,
        }
      }))
      toast.success('카테고리 이름이 저장되었습니다.')
    } catch (error) {
      console.error('카테고리 이름 저장 실패:', error)
      toast.error('카테고리 이름 저장에 실패했습니다.')
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
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
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {categories.map((cat, index) => {
                  const isEditing = editState[cat.id]?.isEditing || false
                  return (
                    <Draggable key={cat.id} draggableId={cat.id} index={index}>
                      {(provided, snapshot) => (
                        <li
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 px-4 py-2 border rounded gap-2 select-none ${
                            snapshot.isDragging ? 'bg-purple-100 shadow-lg cursor-grabbing' : 'cursor-grab'
                          }`}
                        >
                          <div className="flex gap-2 items-center w-full sm:w-auto">
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={editState[cat.id].name}
                                  onChange={(e) => changeName(cat.id, e.target.value)}
                                  className="border px-2 py-1 rounded text-sm flex-1"
                                />
                                <button
                                  onClick={() => saveName(cat.id)}
                                  className="text-blue-600 text-sm hover:underline"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={() => cancelEdit(cat.id)}
                                  className="text-gray-600 text-sm hover:underline"
                                >
                                  취소
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1">{cat.name}</span>
                                <button
                                  onClick={() => startEdit(cat.id)}
                                  className="text-blue-600 text-sm hover:underline"
                                >
                                  수정
                                </button>
                              </>
                            )}
                          </div>

                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleDelete(cat.id)}
                              className="text-red-500 text-sm hover:underline"
                            >
                              삭제
                            </button>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  )
                })}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  )
}
