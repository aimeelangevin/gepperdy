'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to edit page
    router.push(`/games/${id}/edit`);
  }, [id, router]);
  
  return null;
}

