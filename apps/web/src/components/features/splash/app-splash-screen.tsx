'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { MovuxMark } from '~/components/ui/logo'

const STORAGE_KEY = 'movux:splash-seen'
const SAFETY_TIMEOUT_MS = 2000
const HOLD_MS = 400

export function AppSplashScreen() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    let seen = true
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      seen = false
    }
    if (seen) return

    setShow(true)

    const hide = () => {
      setShow(false)
      try {
        sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        // sessionStorage indisponível (modo privado restrito) — segue sem persistir
      }
    }

    const holdTimer = setTimeout(hide, HOLD_MS)
    const safetyTimer = setTimeout(hide, SAFETY_TIMEOUT_MS)

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(safetyTimer)
    }
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="bg-brand-base fixed inset-0 z-[999] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <MovuxMark className="size-16" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
