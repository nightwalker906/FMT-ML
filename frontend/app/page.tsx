'use client'

import { motion } from 'framer-motion'
import { GraduationCap, ArrowRight, Sparkles, BookOpen, Users, Star } from 'lucide-react'
import Link from 'next/link'

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
}

const features = [
  { icon: BookOpen, title: 'Smart Matching', desc: 'AI-powered tutor recommendations tailored to your learning style' },
  { icon: Users, title: 'Expert Tutors', desc: 'Verified educators with proven track records and real reviews' },
  { icon: Star, title: 'Track Progress', desc: 'Personalized study plans and progress analytics at your fingertips' },
]

export default function Page() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-radial from-primary-100/40 via-transparent to-transparent dark:from-primary-900/20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-radial from-secondary-100/30 via-transparent to-transparent dark:from-secondary-900/10 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/25">
            <GraduationCap size={22} />
          </div>
          <span className="font-bold text-xl text-slate-900 dark:text-white">Find My Tutor</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link
            href="/login"
            className="btn-secondary text-sm"
          >
            Sign In
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-16 sm:pt-24 lg:pt-32 pb-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-950/50 border border-primary-200/50 dark:border-primary-800/50 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
              AI-Powered Learning Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6"
          >
            Find the Perfect Tutor{' '}
            <span className="text-gradient dark:text-gradient-dark">
              for Your Journey
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Connect with expert tutors, build personalized study plans, and accelerate your learning with AI-driven recommendations.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/login"
              className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 group"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/tutors"
              className="btn-ghost text-base px-8 py-3.5"
            >
              Browse Tutors
            </Link>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.6 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20"
        >
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
              }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="group card-stat text-center p-8"
            >
              <div className="mx-auto w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  )
}
