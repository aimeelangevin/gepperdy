'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { gameStateApi } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'select' | 'join' | 'host'>('select');
  const [joinCode, setJoinCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !teamName.trim()) {
      setError('Please enter both join code and team name');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await gameStateApi.join(joinCode.trim(), teamName.trim());
      if (response.success && response.data) {
        // Find the team ID that was just created (it's in the teams array)
        const teamId = response.data.teams.find(t => t.name === teamName.trim())?.id;
        if (teamId) {
          // Store teamId in localStorage for this game
          localStorage.setItem(`game_${response.data.gameId}_teamId`, teamId);
        }
        // Redirect to the game play page with teamId as query param
        router.push(`/games/${response.data.gameId}?teamId=${teamId || ''}`);
      } else {
        setError(response.error || 'Failed to join game');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsJoining(false);
    }
  };

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold overflow-hidden">
            {/* Header */}
            <div className="bg-jeopardy-royal border-b-4 border-jeopardy-gold py-8">
              <div className="container mx-auto px-4 text-center">
                <h1 className="text-5xl font-bold text-jeopardy-gold mb-2 tracking-wide font-jeopardy" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                  GEPPERDY
                </h1>
                <p className="text-white/90 text-lg">Choose your role</p>
              </div>
            </div>

            {/* Options */}
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Join Game */}
                <button
                  onClick={() => setMode('join')}
                  className="bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-8 px-6 rounded-xl transition-all shadow-lg border-4 border-jeopardy-royal hover:border-jeopardy-gold hover:scale-105"
                >
                  <div className="text-2xl mb-2 uppercase tracking-wide">Join Game</div>
                  <div className="text-sm opacity-90">Enter a code to join as a team</div>
                </button>

                {/* Host Game */}
                <Link
                  href="/games"
                  className="bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-8 px-6 rounded-xl transition-all shadow-lg border-4 border-jeopardy-gold hover:border-jeopardy-gold-light hover:scale-105 text-center"
                >
                  <div className="text-2xl mb-2 uppercase tracking-wide">Host/Edit Game</div>
                  <div className="text-sm opacity-90">Create or select a game to edit/host</div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold overflow-hidden">
            {/* Header */}
            <div className="bg-jeopardy-blue border-b-4 border-jeopardy-royal py-6">
              <div className="container mx-auto px-4 text-center">
                <h1 className="text-3xl font-bold text-jeopardy-gold mb-2 tracking-wide font-jeopardy">
                  JOIN GAME
                </h1>
              </div>
            </div>

            {/* Form */}
            <div className="p-8">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {error}</span>
                </div>
              )}

              <form onSubmit={handleJoin} className="space-y-6">
                <div>
                  <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">
                    Join Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter 5-character code"
                    maxLength={5}
                    className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-jeopardy-magenta dark:focus:border-jeopardy-gold focus:outline-none transition-colors text-center text-2xl font-bold tracking-widest uppercase"
                    disabled={isJoining}
                  />
                </div>

                <div>
                  <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Enter your team name"
                    className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-jeopardy-magenta dark:focus:border-jeopardy-gold focus:outline-none transition-colors"
                    disabled={isJoining}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('select');
                      setJoinCode('');
                      setTeamName('');
                      setError(null);
                    }}
                    className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors uppercase tracking-wide"
                    disabled={isJoining}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold hover:border-jeopardy-gold-light disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isJoining}
                  >
                    {isJoining ? 'Joining...' : 'Join Game'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
