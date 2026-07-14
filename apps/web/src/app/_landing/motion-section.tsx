'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  delay?: number
  /** Move offset on enter (px). Default 32. */
  yOffset?: number
}

/**
 * Generic fade-up wrapper — animates once when scrolled into view.
 * Use as a thin layer around a server-rendered section so we don't have to
 * convert each section into a client component.
 */
export function MotionSection({
  children,
  className,
  delay = 0,
  yOffset = 32,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
