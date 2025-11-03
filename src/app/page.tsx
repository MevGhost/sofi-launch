'use client';

import dynamic from 'next/dynamic';

// Dynamically import the entire homepage to avoid hydration issues
const HomePage = dynamic(
  () => import('@/components/HomePage'),
  { 
    ssr: false,
    loading: () => <div className="min-h-screen bg-canvas" />
  }
);

export default function Page() {
  return <HomePage />;
}