'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Game } from '@/models/Game';
import { Theme } from '@/types/theme';
import { gameApi } from '@/lib/api';

const THEME_ICONS: Record<Theme, string> = {
  [Theme.Classic]: '🎯',
  [Theme.Christmas]: '🎄',
  [Theme.Fall]: '🍂',
  [Theme.Birthday]: '🎂',
};


export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await gameApi.getAllGamesForUser("hardcoded-user-id");
        if (response.success && response.data) {
          setGames(response.data);
        } else {
          setError(response.error || 'Failed to load games');
        }
      } catch (err) {
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGames();
  }, []);

  return (
    <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark">
      {/* Header */}
      <div className="bg-jeopardy-royal border-b-4 border-jeopardy-gold py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
            <h1 className="text-4xl font-bold text-jeopardy-gold mb-2 tracking-wide font-jeopardy" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              MY GAMES
            </h1>
              <p className="text-white/90">Select a game or create a new one</p>
            </div>
            <Link
              href="/games/new"
              className="bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold hover:border-jeopardy-gold-light"
            >
              + New Game
            </Link>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-jeopardy-royal mx-auto mb-4"></div>
            <p className="text-jeopardy-royal text-xl font-bold font-jeopardy">Loading games...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-white/70 text-xl mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block bg-jeopardy-gold hover:bg-jeopardy-gold-light text-jeopardy-blue font-bold py-3 px-8 rounded-lg transition-colors shadow-lg uppercase tracking-wide"
            >
              Retry
            </button>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-jeopardy-blue/70 text-xl mb-6">No games yet</p>
            <Link
              href="/games/new"
              className="inline-block bg-jeopardy-gold hover:bg-jeopardy-gold-light text-jeopardy-blue font-bold py-3 px-8 rounded-lg transition-colors shadow-lg uppercase tracking-wide"
            >
              Create Your First Game
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => (
              <div
                key={game._id.toString()}
                className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xl border-4 border-jeopardy-gold hover:scale-105 transition-transform relative"
              >
                {/* Edit Button - Top Right */}
                <Link
                  href={`/games/${game._id.toString()}/edit`}
                  className="absolute top-3 right-3 bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-1.5 px-3 rounded-lg transition-colors uppercase tracking-wide text-sm shadow-md z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  Edit
                </Link>

                <Link href={`/games/${game._id.toString()}`}>
                  <div className="p-6">
                    {/* Theme Icon */}
                    <div className="text-5xl mb-4 text-center">
                      {THEME_ICONS[game.theme]}
                    </div>

                    {/* Game Name */}
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center font-jeopardy">
                      {game.name}
                    </h3>

                    {/* Theme Badge */}
                    <div className="flex justify-center mb-3">
                      <span className="inline-block px-3 py-1 bg-jeopardy-blue text-white text-xs font-semibold rounded-full uppercase tracking-wide">
                        {game.theme}
                      </span>
                    </div>

                    {/* Rounds Info */}
                    <div className="text-center text-sm text-slate-600 dark:text-slate-400">
                      {game.roundIds.length === 1 ? (
                        <span>Single Jeopardy</span>
                      ) : (
                        <span>Single + Double Jeopardy</span>
                      )}
                    </div>
                  </div>

                  {/* Play Button */}
                  <div className="bg-jeopardy-royal hover:bg-jeopardy-royal-light transition-colors p-4 text-center">
                    <span className="text-jeopardy-gold font-bold uppercase tracking-wide">
                      Play Game →
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

