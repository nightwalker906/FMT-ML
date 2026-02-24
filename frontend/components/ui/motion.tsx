'use client'

import { motion, AnimatePresence, Variants } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
//  REUSABLE ANIMATION VARIANTS — Netflix/Stripe Quality
// ═══════════════════════════════════════════════════════════════════════════
// hey
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ═══════════════════════════════════════════════════════════════════════════
//  PAGE TRANSITION WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeInUp}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  STAGGER CONTAINER — Animate children one by one
// ═══════════════════════════════════════════════════════════════════════════

interface StaggerContainerProps {
  children: ReactNode
  className?: string
  delay?: number
  staggerDelay?: number
}

export function StaggerContainer({
  children,
  className,
  delay = 0.1,
  staggerDelay = 0.08,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: staggerDelay, delayChildren: delay },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  STAGGER ITEM — Use inside StaggerContainer
// ═══════════════════════════════════════════════════════════════════════════

interface StaggerItemProps {
  children: ReactNode
  className?: string
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED CARD — Hover lift + scale micro-interaction
// ═══════════════════════════════════════════════════════════════════════════

interface AnimatedCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  hoverScale?: number
  hoverY?: number
}

export function AnimatedCard({
  children,
  className,
  onClick,
  hoverScale = 1.01,
  hoverY = -4,
}: AnimatedCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{
        scale: hoverScale,
        y: hoverY,
        transition: { duration: 0.25, ease: 'easeOut' },
      }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-shadow duration-300',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  ANIMATED COUNTER — Count up number animation
// ═══════════════════════════════════════════════════════════════════════════

interface AnimatedCounterProps {
  value: number
  className?: string
  duration?: number
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({
  value,
  className,
  duration = 1.2,
  prefix = '',
  suffix = '',
}: AnimatedCounterProps) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <motion.span
        key={value}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {prefix}{value}{suffix}
      </motion.span>
    </motion.span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOVER GLOW — Teal glow on hover
// ═══════════════════════════════════════════════════════════════════════════

interface HoverGlowProps {
  children: ReactNode
  className?: string
}

export function HoverGlow({ children, className }: HoverGlowProps) {
  return (
    <motion.div
      whileHover={{
        boxShadow: '0 0 30px rgba(13, 148, 136, 0.2)',
        transition: { duration: 0.3 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  REVEAL ON SCROLL — Animate when element enters viewport
// ═══════════════════════════════════════════════════════════════════════════

interface RevealOnScrollProps {
  children: ReactNode
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right'
}

export function RevealOnScroll({ children, className, direction = 'up' }: RevealOnScrollProps) {
  const directionMap = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: -40, y: 0 },
    right: { x: 40, y: 0 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directionMap[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PULSE DOT — For live/active status indicators
// ═══════════════════════════════════════════════════════════════════════════

interface PulseDotProps {
  color?: 'green' | 'red' | 'yellow' | 'teal'
  size?: 'sm' | 'md'
}

const dotColors = {
  green: 'bg-green-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  teal: 'bg-teal-500',
}

export function PulseDot({ color = 'green', size = 'sm' }: PulseDotProps) {
  return (
    <span className="relative flex">
      <span
        className={cn(
          'animate-ping absolute inline-flex rounded-full opacity-75',
          dotColors[color],
          size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
        )}
      />
      <span
        className={cn(
          'relative inline-flex rounded-full',
          dotColors[color],
          size === 'sm' ? 'h-2 w-2' : 'h-3 w-3'
        )}
      />
    </span>
  )
}
