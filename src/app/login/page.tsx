// src/app/login/page.tsx
'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

// dynamic import로 LoginInner 컴포넌트를 불러옴
const LoginInner = dynamic(() => import('./LoginInner'), { ssr: false })

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-20">로딩 중...</div>}>
      <LoginInner />
    </Suspense>
  )
}





