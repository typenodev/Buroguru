'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { GalleryImage } from '@/lib/content-blocks'
import Lightbox from './Lightbox'

export type ImageLayout = 'gallery' | 'two-column' | 'stack'

interface ImageGalleryProps {
  images: GalleryImage[]
  layout?: ImageLayout
  /** justified 画廊的基准行高（桌面端），移动端按此值等比缩小 */
  rowHeight?: number
  gap?: number
  radius?: number
  lightbox?: boolean
  /** 双栏模式下是否统一裁剪为 4:3；关闭则保留图片原始比例 */
  uniformRatio?: boolean
}

export default function ImageGallery({
  images,
  layout = 'gallery',
  rowHeight = 260,
  gap = 8,
  radius = 8,
  lightbox = true,
  uniformRatio = true,
}: ImageGalleryProps) {
  const [openIndex, setOpenIndex] = useState(-1)

  if (!images.length) return null

  const openLightbox = (index: number) => {
    if (lightbox) setOpenIndex(index)
  }

  const viewer =
    lightbox && openIndex >= 0 ? (
      <Lightbox
        images={images}
        index={openIndex}
        onClose={() => setOpenIndex(-1)}
        onNavigate={(next) => setOpenIndex(next)}
      />
    ) : null

  // 原样堆叠：保持全宽显示（旧行为）
  if (layout === 'stack') {
    return (
      <div className="not-prose my-8 flex flex-col" style={{ gap }}>
        {images.map((image, index) => (
          <div key={`${image.src}-${index}`} className="relative w-full">
            <Image
              src={image.src}
              alt={image.alt || ''}
              width={image.width}
              height={image.height}
              sizes="(max-width: 1024px) 100vw, 896px"
              className="h-auto w-full rounded-lg"
              style={{ borderRadius: radius }}
            />
          </div>
        ))}
        {viewer}
      </div>
    )
  }

  // 双栏网格
  if (layout === 'two-column') {
    return (
      <div className="not-prose my-6 grid grid-cols-2" style={{ gap }}>
        {images.map((image, index) => (
          <button
            key={`${image.src}-${index}`}
            type="button"
            onClick={() => openLightbox(index)}
            className="group relative block w-full overflow-hidden bg-muted"
            style={{
              aspectRatio: uniformRatio ? '4 / 3' : `${image.width} / ${image.height}`,
              borderRadius: radius,
            }}
          >
            <Image
              src={image.src}
              alt={image.alt || ''}
              fill
              sizes="(max-width: 1024px) 50vw, 440px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </button>
        ))}
        {viewer}
      </div>
    )
  }

  // justified 画廊：按图片原始宽高比自动排布，每行等高铺满
  // 只有一张图时退回整行大图，避免被压成小方块
  if (images.length === 1) {
    const only = images[0]
    return (
      <div className="not-prose my-8">
        <button
          type="button"
          onClick={() => openLightbox(0)}
          className="relative block w-full overflow-hidden bg-muted"
          style={{ borderRadius: radius }}
        >
          <Image
            src={only.src}
            alt={only.alt || ''}
            width={only.width}
            height={only.height}
            sizes="(max-width: 1024px) 100vw, 896px"
            className="h-auto w-full"
          />
        </button>
        {viewer}
      </div>
    )
  }

  return (
    <div
      className="not-prose gallery-justified my-6 flex flex-wrap"
      style={{ gap, ['--gallery-row-h-base' as string]: `${rowHeight}px` } as React.CSSProperties}
    >
      {images.map((image, index) => {
        const ratio = image.width / image.height
        return (
          <button
            key={`${image.src}-${index}`}
            type="button"
            onClick={() => openLightbox(index)}
            className="group relative block overflow-hidden bg-muted"
            style={{
              flexGrow: ratio,
              flexBasis: `calc(${ratio.toFixed(4)} * var(--gallery-row-h))`,
              height: 'var(--gallery-row-h)',
              borderRadius: radius,
            }}
          >
            <Image
              src={image.src}
              alt={image.alt || ''}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </button>
        )
      })}
      {/* 占位元素：吸收最后一行的剩余空间，避免最后几张被拉伸变形 */}
      <span aria-hidden className="block" style={{ flexGrow: 1e9 }} />
      {viewer}
    </div>
  )
}
