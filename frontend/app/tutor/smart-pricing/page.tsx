'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SmartPricingRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Navigate to dashboard with a flag to open the pricing modal
    router.replace('/tutor/dashboard?openPricing=1');
  }, [router]);

  return null;
}
