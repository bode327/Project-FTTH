"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api';
    fetch(`${apiUrl}/auth/status`)
      .then(res => res.json())
      .then(data => {
        if (data.isSetup) {
          router.push('/login');
        } else {
          router.push('/setup');
        }
      })
      .catch(() => {
        router.push('/login'); // Fallback in case of server offline error handling
      });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
      Redirecionando...
    </div>
  );
}