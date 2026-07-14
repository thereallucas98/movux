'use client'

import { motion, useAnimation, useInView } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { cn } from '~/lib/utils'

interface RevealProps {
  children: React.ReactNode
  className?: string
  /** Tailwind bg class used for the wipe overlay (matches section bg for a clean reveal) */
  wipeColor?: string
  delay?: number
}

export function Reveal({
  children,
  className,
  wipeColor = 'bg-primary',
  delay = 0.25,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const mainControls = useAnimation()
  const slideControls = useAnimation()

  useEffect(() => {
    if (isInView) {
      mainControls.start('visible').catch(() => {})
      slideControls.start('visible').catch(() => {})
    }
  }, [isInView, mainControls, slideControls])

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 60 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate={mainControls}
        transition={{ duration: 0.5, delay }}
      >
        {children}
      </motion.div>

      {/* Wipe overlay */}
      <motion.div
        variants={{
          hidden: { left: 0 },
          visible: { left: '100%' },
        }}
        initial="hidden"
        animate={slideControls}
        transition={{ duration: 0.5, ease: 'easeIn' }}
        className={cn('absolute inset-y-1 right-0 left-0 z-20', wipeColor)}
      />
    </div>
  )
}
