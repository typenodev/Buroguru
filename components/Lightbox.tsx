'use client'

import { useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { GalleryImage } from '@/lib/content-blocks'

interface LightboxProps {
  images: GalleryImage[]
  index: number
  onClose: () => void
  onNavigate: (next: number) => void
}

export default function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const touchStartX = useRef<number | null>(null)
  const total = images.length
  const current = images[index]

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + total) % total)
  }, [index, total, onNavigate])

  const goNext = useCallback(() => {
    onNavigate((index + 1) % total)
  }, [index, total, onNavigate])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, goPrev, goNext])

  // 预加载前后各一张，切换更顺滑
  useEffect(() => {
    ;[index + 1, index - 1].forEach((i) => {
      const neighbour = images[(i + total) % total]
      if (neighbour) {
        const img = new window.Image()
        img.src = neighbour.src
      }
    })
  }, [index, images, total])

  if (!current) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="关闭"
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
      >
        <X className="h-6 w-6" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="上一张"
            className="absolute left-2 md:left-6 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            onClick={(event) => {
              event.stopPropagation()
              goPrev()
            }}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label="下一张"
            className="absolute right-2 md:right-6 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20"
            onClick={(event) => {
              event.stopPropagation()
              goNext()
            }}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        className="flex max-h-[92vh] max-w-[95vw] items-center justify-center"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          touchStartX.current = event.touches[0]?.clientX ?? null
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null) return
          const delta = event.changedTouches[0].clientX - touchStartX.current
          if (Math.abs(delta) > 50) {
            if (delta > 0) {
              goPrev()
            } else {
              goNext()
            }
          }
          touchStartX.current = null
        }}
      >
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt || ''}
          width={current.width}
          height={current.height}
          sizes="95vw"
          quality={90}
          priority
          className="h-auto max-h-[92vh] w-auto max-w-[95vw] object-contain"
        />
      </div>

      {total > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-sm text-white/90">
          {index + 1} / {total}
        </div>
      )}
    </div>
  )
}
