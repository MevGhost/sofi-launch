'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EscrowDashboard() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to portfolio page with escrows tab
    router.replace('/portfolio?tab=escrows');
  }, [router]);
  
  return null;
}