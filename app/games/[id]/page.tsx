'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  // Redirect to edit page
  router.push(`/games/${id}/edit`);
  
  return null;
}

