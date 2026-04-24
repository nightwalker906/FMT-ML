'use client'

import { motion } from 'framer-motion'
import TutorCard from '@/components/tutor-card'
import { TutorWithProfile } from '@/app/actions/get-tutors'

// Animation variants for staggered list animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

interface AnimatedTutorGridProps {
  tutors: TutorWithProfile[];
}

export default function AnimatedTutorGrid({ tutors }: AnimatedTutorGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {tutors.map((tutor) => (
        <motion.div key={tutor.profile_id} variants={itemVariants}>
          <TutorCard tutor={tutor} />
        </motion.div>
      ))}
    </motion.div>
  )
}
