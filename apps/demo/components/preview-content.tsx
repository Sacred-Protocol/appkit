'use client'

import { useEffect } from 'react'
import { useState } from 'react'

import { useAppKitState } from '@laughingwhales/appkit/react'

export function PreviewContent() {
  const [shouldRender, setShouldRender] = useState(false)
  const { initialized: isInitialized } = useAppKitState()

  useEffect(() => {
    setShouldRender(isInitialized)
  }, [isInitialized])

  if (!shouldRender) {
    return null
  }

  return (
    <>
      <div className="w-full max-w-[400px] py-8 mx-auto flex-grow flex-1 flex flex-col items-center justify-center gap-6">
        {/* Main Modal Component */}
        {shouldRender ? <appkit-modal class="appkit-modal" /> : null}
      </div>
    </>
  )
}
