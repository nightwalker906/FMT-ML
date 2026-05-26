'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AnimatedButtonProps {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  showArrow?: boolean
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function AnimatedButton({
  children,
  onClick,
  href,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  showArrow = false,
  className,
  disabled = false,
  type = 'button',
}: AnimatedButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 })

  const baseStyles = 'relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden'

  const variantStyles = {
    primary: cn(
      'px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white',
      'shadow-md shadow-primary-500/20',
      'hover:shadow-lg hover:shadow-primary-500/30 hover:from-primary-700 hover:to-primary-600',
      'focus:outline-none focus:ring-2 focus:ring-primary-500/50'
    ),
    secondary: cn(
      'px-5 py-2.5 bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-400',
      'border border-primary-200 dark:border-primary-800',
      'hover:bg-primary-50 dark:hover:bg-primary-950 hover:border-primary-300 dark:hover:border-primary-700',
      'shadow-sm hover:shadow-md'
    ),
    ghost: cn(
      'px-4 py-2 text-slate-600 dark:text-slate-400',
      'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
    ),
    danger: cn(
      'px-5 py-2.5 bg-red-500 text-white',
      'shadow-md shadow-red-500/20',
      'hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30'
    ),
  }

  const sizeStyles = {
    sm: 'text-sm px-4 py-2',
    md: 'text-base',
    lg: 'text-lg px-6 py-3',
  }

  // Magnetic effect handler
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current || disabled) return
    const rect = buttonRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = (e.clientX - centerX) * 0.15
    const deltaY = (e.clientY - centerY) * 0.15
    setMagneticOffset({ x: deltaX, y: deltaY })
  }

  const handleMouseLeave = () => {
    setMagneticOffset({ x: 0, y: 0 })
  }

  const content = (
    <>
      {/* Icon with slide animation */}
      {Icon && iconPosition === 'left' && (
        <span className="relative inline-flex items-center justify-center w-5 h-5 overflow-hidden">
          <motion.span
            className="absolute inset-0 flex items-center justify-center"
            initial={false}
            animate={{ x: magneticOffset.x * 0.5 }}
          >
            <Icon className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-4 group-hover:opacity-0" />
          </motion.span>
          <motion.span
            className="absolute inset-0 flex items-center justify-center translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-200"
            initial={false}
            animate={{ x: magneticOffset.x * 0.5 }}
          >
            <Icon className="w-5 h-5" />
          </motion.span>
        </span>
      )}

      {/* Button text */}
      <span className="relative z-10">{children}</span>

      {/* Icon right position */}
      {Icon && iconPosition === 'right' && (
        <span className="relative inline-flex items-center justify-center w-5 h-5 overflow-hidden">
          <Icon className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      )}

      {/* Arrow icon */}
      {showArrow && (
        <motion.svg
          className="w-4 h-4 ml-1"
          viewBox="0 0 16 16"
          fill="none"
          initial={false}
          animate={{ x: magneticOffset.x * 0.3 }}
        >
          <path
            d="M3 8H13M13 8L9 4M13 8L9 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </motion.svg>
      )}

      {/* Ripple/ Glow effect on hover */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
    </>
  )

  const combinedClassName = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    'group', // For group-hover utilities
    className
  )

  // Render as link or button
  if (href) {
    return (
      <motion.a
        ref={buttonRef as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={combinedClassName}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{ x: magneticOffset.x, y: magneticOffset.y }}
        transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button
      ref={buttonRef as React.RefObject<HTMLButtonElement>}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClassName}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: magneticOffset.x, y: magneticOffset.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 15 }}
      whileTap={{ scale: 0.98 }}
    >
      {content}
    </motion.button>
  )
}
