'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Theme } from '@/types/theme';
import { gameApi } from '@/lib/api';
import { getUserId, clearUserId } from '@/lib/auth';
import ProtectedRoute from '@/components/ProtectedRoute';

type RoundType = 'single' | 'double';

const THEME_INFO = {
  [Theme.Classic]: {
    icon: '🎯',
    name: 'Classic',
    description: 'Classic Jeopardy style',
  },
  [Theme.Christmas]: {
    icon: '🎄',
    name: 'Christmas',
    description: 'Festive holiday theme',
  },
  [Theme.Fall]: {
    icon: '🍂',
    name: 'Fall',
    description: 'Autumn vibes',
  },
  [Theme.Birthday]: {
    icon: '🎂',
    name: 'Birthday',
    description: 'Celebration time!',
  },
};

function NewGamePageContent() {
  const router = useRouter();
  const [gameName, setGameName] = useState('');
  const [rounds, setRounds] = useState<RoundType>('single');
  const [theme, setTheme] = useState<Theme>(Theme.Classic);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    clearUserId();
    router.push('/login');
  };

  const handleCreate = async () => {
    if (!gameName.trim()) return;
    
    const userId = getUserId();
    if (!userId) {
      setError('Not authenticated');
      return;
    }
    
    setIsCreating(true);
    setError(null);

    try {
      // Create the game in the backend (with placeholder structure)
      const response = await gameApi.create({
        name: gameName.trim(),
        theme,
        type: rounds, // 'single' or 'double' - backend will create placeholder rounds/categories/questions
        userId,
      });

      if (response.success && response.data) {
        // Navigate to edit page with the new game ID
        router.push(`/games/${response.data._id}/edit`);
      } else {
        setError(response.error || 'Failed to create game');
        setIsCreating(false);
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-jeopardy-blue dark:bg-jeopardy-blue-dark">
      {/* Header */}
      <div className="bg-jeopardy-royal border-b-4 border-jeopardy-gold py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-jeopardy-gold mb-2 tracking-wide font-jeopardy" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                CREATE NEW GAME
              </h1>
              <p className="text-white/90">Set up your game preferences</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold/50 hover:border-jeopardy-gold"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-8">
          {/* Game Name */}
          <div className="mb-8">
            <label className="block text-lg font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wide font-jeopardy">
              Game Name
            </label>
            <input
              type="text"
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              placeholder="e.g., Family Game Night"
              className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-jeopardy-magenta dark:focus:border-jeopardy-gold focus:outline-none transition-colors text-lg"
              required
            />
          </div>

          {/* Number of Rounds */}
          <div className="mb-8">
            <label className="block text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide font-jeopardy">
              Number of Rounds
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRounds('single')}
                className={`p-6 rounded-xl border-4 transition-all ${
                  rounds === 'single'
                    ? 'border-jeopardy-magenta bg-jeopardy-magenta/10 ring-4 ring-jeopardy-gold'
                    : 'border-slate-300 dark:border-slate-600 hover:border-jeopardy-blue'
                }`}
              >
                <div className="text-4xl mb-2">1️⃣</div>
                  <div className="font-bold text-lg text-slate-900 dark:text-white mb-1 font-jeopardy">
                    Single Jeopardy
                  </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  One round only
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRounds('double')}
                className={`p-6 rounded-xl border-4 transition-all ${
                  rounds === 'double'
                    ? 'border-jeopardy-magenta bg-jeopardy-magenta/10 ring-4 ring-jeopardy-gold'
                    : 'border-slate-300 dark:border-slate-600 hover:border-jeopardy-blue'
                }`}
              >
                <div className="text-4xl mb-2">2️⃣</div>
                  <div className="font-bold text-lg text-slate-900 dark:text-white mb-1 font-jeopardy">
                    Double Jeopardy
                  </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Two rounds
                </div>
              </button>
            </div>
          </div>

          {/* Theme Selection */}
          <div className="mb-8">
            <label className="block text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide font-jeopardy">
              Theme
            </label>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(THEME_INFO).map(([key, info]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key as Theme)}
                  className={`p-6 rounded-xl border-4 transition-all ${
                    theme === key
                      ? 'border-jeopardy-magenta bg-jeopardy-magenta/10 ring-4 ring-jeopardy-gold'
                      : 'border-slate-300 dark:border-slate-600 hover:border-jeopardy-blue'
                  }`}
                >
                  <div className="text-4xl mb-2">{info.icon}</div>
                  <div className="font-bold text-lg text-slate-900 dark:text-white mb-1 font-jeopardy">
                    {info.name}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {info.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-100 border-2 border-red-500 rounded-lg">
              <p className="text-red-700 font-semibold">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t-2 border-slate-200 dark:border-slate-700">
            <Link
              href="/games"
              className="flex-1 bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors text-center uppercase tracking-wide"
            >
              Cancel
            </Link>
            <button
              onClick={handleCreate}
              disabled={!gameName.trim() || isCreating}
              className="flex-1 bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark disabled:bg-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold hover:border-jeopardy-gold-light disabled:border-slate-400"
            >
              {isCreating ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <div className="container mx-auto px-4 pb-8">
        <Link
          href="/games"
          className="text-jeopardy-gold hover:text-jeopardy-gold-light font-bold uppercase tracking-wide inline-block"
        >
          ← Back to Games
        </Link>
      </div>
    </div>
  );
}

export default function NewGamePage() {
  return (
    <ProtectedRoute>
      <NewGamePageContent />
    </ProtectedRoute>
  );
}

