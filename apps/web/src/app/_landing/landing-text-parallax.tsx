'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { useRef, type ReactNode } from 'react'

const IMG_PADDING = 12

interface TextParallaxBlockProps {
  imgUrl: string
  subheading: string
  heading: string
  children?: ReactNode
}

/**
 * Container that arranges three composable layers — sticky background image,
 * parallax overlay copy, and a body section — for a "scroll into the story"
 * effect. Pass any ReactNode as `children` for body content; we ship a
 * default body component (`TextParallaxBody`) that fits the brand palette.
 */
export function TextParallaxBlock({
  imgUrl,
  subheading,
  heading,
  children,
}: TextParallaxBlockProps) {
  return (
    <div
      style={{ paddingLeft: IMG_PADDING, paddingRight: IMG_PADDING }}
      className="bg-background"
    >
      <div className="relative h-[150vh]">
        <StickyImage imgUrl={imgUrl} />
        <OverlayCopy heading={heading} subheading={subheading} />
      </div>
      {children}
    </div>
  )
}

interface StickyImageProps {
  imgUrl: string
}

function StickyImage({ imgUrl }: StickyImageProps) {
  const targetRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['end end', 'end start'],
  })
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.85])
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])

  return (
    <motion.div
      ref={targetRef}
      style={{
        backgroundImage: `url(${imgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: `calc(100vh - ${IMG_PADDING * 2}px)`,
        top: IMG_PADDING,
        scale,
      }}
      className="sticky z-0 overflow-hidden rounded-3xl"
    >
      {/* Brand-tinted dark veil — uses brand-dark, never neutral black */}
      <motion.div
        aria-hidden
        style={{
          opacity,
          background:
            'linear-gradient(180deg, rgba(18, 75, 43, 0.75) 0%, rgba(18, 75, 43, 0.65) 60%, rgba(18, 75, 43, 0.55) 100%)',
        }}
        className="absolute inset-0"
      />
    </motion.div>
  )
}

interface OverlayCopyProps {
  subheading: string
  heading: string
}

function OverlayCopy({ subheading, heading }: OverlayCopyProps) {
  const targetRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [220, -220])
  const opacity = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [0, 1, 0])

  return (
    <motion.div
      ref={targetRef}
      style={{ y, opacity }}
      className="absolute top-0 left-0 flex h-screen w-full flex-col items-center justify-center px-6 text-white"
    >
      <p className="mb-2 text-center text-lg font-medium tracking-wider uppercase md:text-2xl">
        {subheading}
      </p>
      <p className="text-center text-4xl font-bold tracking-tight md:text-7xl">
        {heading}
      </p>
    </motion.div>
  )
}

interface TextParallaxBodyProps {
  title: string
  body: string
  ctaLabel: string
  ctaHref: string
}

/** Default body section beneath each parallax block. */
export function TextParallaxBody({
  title,
  body,
  ctaLabel,
  ctaHref,
}: TextParallaxBodyProps) {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-4 pt-12 pb-24 md:grid-cols-12 md:px-6">
      <h2 className="text-foreground col-span-1 text-2xl font-bold tracking-tight md:col-span-4 md:text-3xl">
        {title}
      </h2>
      <div className="col-span-1 md:col-span-8">
        <p className="text-muted-foreground mb-6 text-lg leading-relaxed md:text-xl">
          {body}
        </p>
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--brand-dark)] bg-white px-6 py-3 text-base font-semibold text-[var(--brand-dark)] transition-colors hover:bg-[var(--brand-base)] hover:text-white"
        >
          {ctaLabel}
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}

interface LandingTextParallaxProps {
  blocks: ReadonlyArray<{
    imgUrl: string
    subheading: string
    heading: string
    title: string
    body: string
    ctaLabel: string
    ctaHref: string
  }>
}

/** Convenience wrapper rendering N blocks in order. */
export function LandingTextParallax({ blocks }: LandingTextParallaxProps) {
  return (
    <div className="bg-background">
      {blocks.map((b) => (
        <TextParallaxBlock
          key={b.heading}
          imgUrl={b.imgUrl}
          subheading={b.subheading}
          heading={b.heading}
        >
          <TextParallaxBody
            title={b.title}
            body={b.body}
            ctaLabel={b.ctaLabel}
            ctaHref={b.ctaHref}
          />
        </TextParallaxBlock>
      ))}
    </div>
  )
}
