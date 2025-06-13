import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Category {
  id: string
  name: string
  slug: string
  imagePath: string
  order: number
}

export function useCategoryList() {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoryData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Category[]
      setCategories(categoryData)
    })

    return () => unsubscribe()
  }, [])

  return { categories }  // ✅ 구조 분해 할당을 위해 객체로 반환
}
