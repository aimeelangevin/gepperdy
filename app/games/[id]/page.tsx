'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { gameApi, gameStateApi, roundApi, categoryApi, questionApi } from '@/lib/api';
import type { Game } from '@/models/Game';
import type { Round } from '@/models/Round';
import type { Category } from '@/models/Category';
import type { Question } from '@/models/Question';
import type { GameState, Team } from '@/models/GameState';
import { Theme } from '@/types/theme';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { randomUUID } from 'crypto';

type ExtendedRound = Round & {
  categories: (Category & { questions: Question[] })[];
};

function GamePlayPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [game, setGame] = useState<Game | null>(null);
  const [rounds, setRounds] = useState<ExtendedRound[]>([]);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Team setup state
  const [numTeams, setNumTeams] = useState(2);
  const [teamNames, setTeamNames] = useState<string[]>(['Team 1', 'Team 2']);
  const [settingUpTeams, setSettingUpTeams] = useState(false);
  
  // Question display state
  const [selectedQuestion, setSelectedQuestion] = useState<{
    catIndex: number;
    qIndex: number;
    question: any;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    loadGame();
  }, [id]);

  // Reset animation when question changes
  useEffect(() => {
    if (selectedQuestion) {
      setIsAnimating(true);
      // Keep animation state true for the duration of the animation
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [selectedQuestion]);

  const loadGame = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load game
      const gameResponse = await gameApi.getById(id);
      if (!gameResponse.success || !gameResponse.data) {
        setError('Game not found');
        return;
      }
      setGame(gameResponse.data);
      
      // Load rounds with categories and questions
      const roundsData: ExtendedRound[] = [];
      for (const roundId of gameResponse.data.roundIds) {
        const roundResponse = await roundApi.getById(roundId.toString());
        if (!roundResponse.success || !roundResponse.data) continue;
        
        const round = roundResponse.data;
        const categories: (Category & { questions: Question[] })[] = [];
        
        // Fetch categories for this round
        for (const categoryId of round.categoryIds) {
          const categoryResponse = await categoryApi.getById(categoryId.toString());
          if (!categoryResponse.success || !categoryResponse.data) continue;
          
          const category = categoryResponse.data;
          const questions: Question[] = [];
          
          // Fetch questions for this category
          for (const questionId of category.questionIds) {
            const questionResponse = await questionApi.getById(questionId.toString());
            if (questionResponse.success && questionResponse.data) {
              questions.push(questionResponse.data);
            }
          }
          
          categories.push({
            ...category,
            questions,
          });
        }
        
        roundsData.push({
          ...round,
          categories,
        });
      }
      setRounds(roundsData);
      
      // Check for existing game state
      const stateResponse = await gameStateApi.getByGameId(id);
      if (stateResponse.success && stateResponse.data) {
        setGameState(stateResponse.data);
        setSettingUpTeams(false);
      } else {
        setSettingUpTeams(true);
      }
    } catch (err) {
      setError('Failed to load game');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSetup = async () => {
    try {
      const teams: Team[] = teamNames.slice(0, numTeams).map((name, index) => ({
        id: randomUUID(),
        name: name.trim() || `Team ${index + 1}`,
        score: 0,
      }));

      const response = await gameStateApi.create({
        gameId: id,
        teams: teams,
        currentTeamIndex: 0,
        currentRoundIndex: 0,
        completedQuestionIds: [],
      });

      if (response.success && response.data) {
        setGameState(response.data);
        setSettingUpTeams(false);
      } else {
        setError(response.error || 'Failed to create game state');
      }
    } catch (err) {
      setError('Failed to set up teams');
      console.error(err);
    }
  };

  const handleNumTeamsChange = (newNum: number) => {
    if (newNum < 2 || newNum > 6) return;
    setNumTeams(newNum);
    const newNames = [...teamNames];
    while (newNames.length < newNum) {
      newNames.push(`Team ${newNames.length + 1}`);
    }
    setTeamNames(newNames.slice(0, newNum));
  };

  const handleTeamNameChange = (index: number, name: string) => {
    const newNames = [...teamNames];
    newNames[index] = name;
    setTeamNames(newNames);
  };

  const handleCellClick = (catIndex: number, qIndex: number) => {
    if (!rounds.length || !gameState) return;
    
    const currentRound = rounds[gameState.currentRoundIndex];
    if (!currentRound || !currentRound.categories[catIndex]) return;
    
    const category = currentRound.categories[catIndex];
    const question = category.questions[qIndex];
    
    if (!question) return;
    
    // Check if question is already completed
    if (gameState.completedQuestionIds.includes(question._id.toString())) {
      return;
    }
    
    setSelectedQuestion({ catIndex, qIndex, question });
    setShowAnswer(false);
  };

  const closeQuestion = () => {
    setSelectedQuestion(null);
    setShowAnswer(false);
    setIsAnimating(false);
  };

  const revealAnswer = () => {
    setShowAnswer(true);
  };

  // Helper function to get theme-specific cell colors
  const getCellColors = (catIndex: number, qIndex: number) => {
    if (game?.theme === Theme.Christmas) {
      const isRed = (catIndex + qIndex) % 2 === 0;
      return {
        bg: isRed ? 'bg-red-600' : 'bg-green-600',
        hover: isRed ? 'hover:bg-red-700' : 'hover:bg-green-700',
        border: isRed ? 'border-red-800' : 'border-green-800',
        text: 'text-white',
      };
    }
    if (game?.theme === Theme.Fall) {
      const isBrown = (catIndex + qIndex) % 2 === 0;
      return {
        bg: isBrown ? 'bg-amber-800' : 'bg-orange-500',
        hover: isBrown ? 'hover:bg-amber-900' : 'hover:bg-orange-600',
        border: isBrown ? 'border-amber-900' : 'border-orange-700',
        text: 'text-white',
      };
    }
    if (game?.theme === Theme.Birthday) {
      return {
        bg: 'bg-sky-300',
        hover: 'hover:bg-sky-400',
        border: 'border-sky-500',
        text: 'text-jeopardy-royal',
      };
    }
    return {
      bg: 'bg-jeopardy-blue',
      hover: 'hover:bg-jeopardy-blue-light',
      border: 'border-jeopardy-royal',
      text: 'text-jeopardy-gold',
    };
  };

  const getHeaderColors = () => {
    if (game?.theme === Theme.Christmas) {
      return {
        bg: 'bg-red-700',
        hover: 'hover:bg-red-800',
        border: 'border-green-800',
        text: 'text-white',
      };
    }
    if (game?.theme === Theme.Fall) {
      return {
        bg: 'bg-amber-800',
        hover: 'hover:bg-amber-900',
        border: 'border-orange-700',
        text: 'text-white',
      };
    }
    if (game?.theme === Theme.Birthday) {
      return {
        bg: 'bg-sky-400',
        hover: 'hover:bg-sky-500',
        border: 'border-sky-600',
        text: 'text-jeopardy-royal',
      };
    }
    return {
      bg: 'bg-jeopardy-blue',
      hover: 'hover:bg-jeopardy-blue-light',
      border: 'border-jeopardy-royal',
      text: 'text-jeopardy-gold',
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-jeopardy-royal mx-auto mb-4"></div>
          <p className="text-jeopardy-royal text-xl font-bold font-jeopardy">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-jeopardy-magenta text-xl font-bold font-jeopardy mb-4">{error}</p>
          <Link
            href="/games"
            className="inline-block bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-3 px-8 rounded-lg transition-colors uppercase tracking-wide"
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  // Team setup screen
  if (settingUpTeams) {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-8">
            <h1 className="text-4xl font-bold text-jeopardy-gold mb-2 tracking-wide font-jeopardy text-center">
              Set Up Teams
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-center mb-8">
              How many teams are playing?
            </p>

            {/* Number of teams selector */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-slate-900 dark:text-white mb-4">
                Number of Teams
              </label>
              <div className="flex gap-4 justify-center">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumTeamsChange(num)}
                    className={`w-16 h-16 rounded-lg font-bold text-xl transition-all ${
                      numTeams === num
                        ? 'bg-jeopardy-blue text-jeopardy-gold border-4 border-jeopardy-gold'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Team names */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-slate-900 dark:text-white mb-4">
                Team Names
              </label>
              <div className="space-y-3">
                {teamNames.slice(0, numTeams).map((name, index) => (
                  <input
                    key={index}
                    type="text"
                    value={name}
                    onChange={(e) => handleTeamNameChange(index, e.target.value)}
                    placeholder={`Team ${index + 1}`}
                    className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-jeopardy-magenta dark:focus:border-jeopardy-gold focus:outline-none transition-colors"
                  />
                ))}
              </div>
            </div>

            {/* Start game button */}
            <div className="flex gap-4">
              <Link
                href="/games"
                className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors text-center uppercase tracking-wide"
              >
                Cancel
              </Link>
              <button
                onClick={handleTeamSetup}
                className="flex-1 bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold"
              >
                Start Game
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState || !rounds.length) {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-jeopardy-magenta text-xl font-bold font-jeopardy mb-4">Game state not found</p>
          <Link
            href="/games"
            className="inline-block bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-3 px-8 rounded-lg transition-colors uppercase tracking-wide"
          >
            Back to Games
          </Link>
        </div>
      </div>
    );
  }

  const currentRound = rounds[gameState.currentRoundIndex];
  const currentTeam = gameState.teams[gameState.currentTeamIndex];

  return (
    <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark">
      {/* Header */}
      <div className="bg-jeopardy-royal border-b-4 border-jeopardy-gold py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-jeopardy-gold mb-1 tracking-wide font-jeopardy" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                {game.name}
              </h1>
              <p className="text-jeopardy-gold text-sm">
                {currentTeam.name}&apos;s Turn
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Team scores */}
              <div className="flex gap-2">
                {gameState.teams.map((team, index) => (
                  <div
                    key={team.id}
                    className={`px-4 py-2 rounded-lg font-bold ${
                      index === gameState.currentTeamIndex
                        ? 'bg-jeopardy-gold text-jeopardy-blue border-2 border-jeopardy-blue'
                        : 'bg-jeopardy-blue text-jeopardy-gold'
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wide">{team.name}</div>
                    <div className="text-xl">${team.score}</div>
                  </div>
                ))}
              </div>
              <Link
                href="/games"
                className="bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold text-sm"
              >
                Exit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="container mx-auto px-4 py-8">
        <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 ${
          game?.theme === Theme.Christmas ? 'border-red-600' : 
          game?.theme === Theme.Fall ? 'border-amber-800' : 
          game?.theme === Theme.Birthday ? 'border-sky-500' :
          'border-jeopardy-gold'
        } p-6 overflow-x-auto`}>
          
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                {currentRound.categories.map((category: any) => {
                  const headerColors = getHeaderColors();
                  return (
                    <th
                      key={category._id.toString()}
                      className={`${headerColors.bg} text-white p-6 border-4 ${headerColors.border} font-jeopardy w-[20%] text-2xl md:text-2xl lg:text-2xl font-bold`}
                    >
                      {category.name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map((qIndex) => (
                <tr key={qIndex}>
                  {currentRound.categories.map((category: any, catIndex: number) => {
                    const question = category.questions[qIndex];
                    const isCompleted = question && gameState.completedQuestionIds.includes(question._id.toString());
                    const cellColors = getCellColors(catIndex, qIndex);
                    
                    return (
                      <td
                        key={`${category._id}-${qIndex}`}
                        className={`${cellColors.bg} ${!isCompleted ? cellColors.hover : ''} border-4 ${cellColors.border} p-8 cursor-pointer transition-colors text-center ${
                          isCompleted ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => !isCompleted && handleCellClick(catIndex, qIndex)}
                      >
                        {isCompleted ? (
                          <div className={`${cellColors.text} text-4xl font-bold font-jeopardy`}>
                            —
                          </div>
                        ) : question ? (
                          <div className={`${cellColors.text} text-4xl font-bold font-jeopardy`}>
                            ${question.points}
                          </div>
                        ) : (
                          <div className={`${cellColors.text} text-4xl font-bold font-jeopardy`}>
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Question Modal */}
      {selectedQuestion && (
        <div 
          key={`question-${selectedQuestion.question._id}-${selectedQuestion.catIndex}-${selectedQuestion.qIndex}`}
          className="fixed inset-0 bg-jeopardy-blue flex items-center justify-center z-50 cursor-pointer spin-in"
          onClick={showAnswer ? closeQuestion : revealAnswer}
        >
          <div className="w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden">
            {!showAnswer ? (
              /* Question Display */
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 md:gap-6">
                {selectedQuestion.question.text && (
                  <p className="text-white text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-jeopardy font-bold leading-tight px-4" style={{ textShadow: '4px 4px 8px rgba(0,0,0,0.5)' }}>
                    {selectedQuestion.question.text}
                  </p>
                )}
                {selectedQuestion.question.imageUrl && (
                  <div className="flex-1 flex items-center justify-center w-full px-4 min-h-0">
                    <img
                      src={selectedQuestion.question.imageUrl}
                      alt="Question"
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg"
                      style={{ maxHeight: '60vh' }}
                    />
                  </div>
                )}
                {selectedQuestion.question.audioUrl && (
                  <audio controls autoPlay className="w-full max-w-2xl">
                    <source src={selectedQuestion.question.audioUrl} />
                  </audio>
                )}
                <p className="text-white/70 text-lg md:text-xl font-jeopardy uppercase tracking-wide mt-auto pb-4">
                  Click to reveal answer
                </p>
              </div>
            ) : (
              /* Answer Display */
              <>
                <p className="text-white text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-jeopardy font-bold leading-tight mb-8 px-4" style={{ textShadow: '4px 4px 8px rgba(0,0,0,0.5)' }}>
                  {selectedQuestion.question.answer}
                </p>
                <p className="text-white/70 text-lg md:text-xl font-jeopardy uppercase tracking-wide">
                  Click to close
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamePlayPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute>
      <GamePlayPageContent params={params} />
    </ProtectedRoute>
  );
}

