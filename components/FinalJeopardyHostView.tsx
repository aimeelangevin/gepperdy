'use client';

import type { GameState, Team } from '@/models/GameState';

interface FinalJeopardyHostViewProps {
  question: string;
  answer: string;
  gameState: GameState;
  onFinish: () => void;
}

export default function FinalJeopardyHostView({
  question,
  answer,
  gameState,
  onFinish,
}: FinalJeopardyHostViewProps) {
  // Convert finalJeopardyAnswers Map to array of entries
  const answers = gameState.finalJeopardyAnswers
    ? (gameState.finalJeopardyAnswers instanceof Map
        ? Array.from(gameState.finalJeopardyAnswers.entries())
        : Object.entries(gameState.finalJeopardyAnswers))
    : [];

  const allTeamsSubmitted = gameState.teams.length > 0 && 
    answers.length === gameState.teams.length &&
    gameState.teams.every(team => 
      answers.some(([teamId]) => teamId === team.id)
    );

  const getTeamName = (teamId: string) => {
    const team = gameState.teams.find(t => t.id === teamId);
    return team?.name || 'Unknown Team';
  };

  return (
    <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex flex-col items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-6 md:p-8">
          <h1 className="text-4xl md:text-5xl font-bold text-jeopardy-gold mb-6 tracking-wide font-sans uppercase text-center">
            Final Jeopardy
          </h1>

          {/* Question and Answer */}
          <div className="mb-8 space-y-4">
            <div className="p-6 bg-jeopardy-blue/10 dark:bg-jeopardy-blue/20 rounded-lg border-2 border-jeopardy-gold/30">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 uppercase">
                Category & Question
              </h2>
              <p className="text-lg text-slate-700 dark:text-slate-300">
                {question}
              </p>
            </div>
            <div className="p-6 bg-jeopardy-magenta/10 dark:bg-jeopardy-magenta/20 rounded-lg border-2 border-jeopardy-gold/30">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 uppercase">
                Answer
              </h2>
              <p className="text-lg text-slate-700 dark:text-slate-300">
                {answer}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className="mb-6 text-center">
            <p className="text-lg text-slate-600 dark:text-slate-400">
              {answers.length} of {gameState.teams.length} teams have submitted answers
            </p>
            {!allTeamsSubmitted && (
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                Waiting for all teams to submit...
              </p>
            )}
          </div>

          {/* Team Answers */}
          {answers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {answers.map(([teamId, imageUrl]) => (
                <div
                  key={teamId}
                  className="bg-jeopardy-blue/10 dark:bg-jeopardy-blue/20 rounded-lg border-2 border-jeopardy-gold/30 p-4"
                >
                  <h3 className="text-xl font-bold text-jeopardy-gold mb-3 uppercase text-center">
                    {getTeamName(teamId)}
                  </h3>
                  <div className="border-2 border-jeopardy-gold/50 rounded-lg bg-white overflow-hidden">
                    <img
                      src={imageUrl as string}
                      alt={`Answer from ${getTeamName(teamId)}`}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Finish Button */}
          {allTeamsSubmitted && (
            <div className="text-center">
              <button
                onClick={onFinish}
                className="bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-4 px-8 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold text-xl"
              >
                Finish Final Jeopardy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

