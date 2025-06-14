// src/app/polls/page.tsx
import { Suspense } from 'react'
import PublicPollsPage from './PublicPollsPage'

export default function PublicPollsPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">불러오는 중...</div>}>
      <PublicPollsPage />
    </Suspense>
  )
}
