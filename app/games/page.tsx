'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Game } from '@/models/Game';
import { Theme } from '@/types/theme';

// Dummy data
const DUMMY_GAMES: Game[] = [
  {
    _id: '1',
    name: 'Holiday Trivia Spectacular',
    theme: Theme.Christmas,
    roundIds: ['r1', 'r2'],
  },
  {
    _id: '2',
    name: 'Classic Jeopardy',
    theme: Theme.Classic,
    roundIds: ['r1'],
  },
  {
    _id: '3',
    name: 'Autumn Knowledge Challenge',
    theme: Theme.Fall,
    roundIds: ['r1', 'r2'],
  },
  {
    _id: '4',
    name: 'Birthday Bash Quiz',
    theme: Theme.Birthday,
    roundIds: ['r1'],
  },
];

const THEME_ICONS: Record<Theme, string> = {
  [Theme.Classic]: '🎯',
  [Theme.Christmas]: '🎄',
  [Theme.Fall]: '🍂',
  [Theme.Birthday]: '🎂',
};


export default function GamesPage() {
  const [games] = useState<Game[]>(DUMMY_GAMES);

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
        {games.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎮</div>
            <p className="text-white/70 text-xl mb-6">No games yet</p>
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
                key={game._id}
                className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-xl border-4 border-jeopardy-gold hover:scale-105 transition-transform cursor-pointer"
              >
                <Link href={`/games/${game._id}`}>
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

      {/* Back to Home */}
      <div className="container mx-auto px-4 pb-8">
        <Link
          href="/"
          className="text-jeopardy-blue hover:text-jeopardy-magenta font-bold uppercase tracking-wide inline-block"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

