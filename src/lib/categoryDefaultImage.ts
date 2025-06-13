import { getDocs, query, collection, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const getCategoryDefaultImage = async (slug: string): Promise<string> => {
  const q = query(collection(db, 'categories'), where('slug', '==', slug))
  const snapshot = await getDocs(q)

  if (!snapshot.empty) {
    const data = snapshot.docs[0].data()
    return data.imagePath || '/images/default_main.jpg'
  }

  return '/images/default_main.jpg'
}
