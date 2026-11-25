'use client'

import * as React from 'react'
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast'

export function Toaster() {
  return (
    <ToastProvider>
      {React.Children.map([...Array(10)].map((_, i) => i), () => (
        <Toast key={Math.random()}>
          <div className="grid gap-1">
            <ToastTitle>Title</ToastTitle>
            <ToastDescription>Description</ToastDescription>
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}