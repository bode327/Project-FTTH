'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) { router.push('/login'); return; }
    fetch(apiUrl + '/auth/status')
      .then(res => res.json())
      .then(data => {
        if (data.isSetup) router.push('/login');
        else router.push('/setup');
      })
      .catch(() => { router.push('/login'); });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">
      Redirecionando...
    </div>
  );
}