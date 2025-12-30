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
// Simple UUID v4 generator for browser
const generateUUID = (): string => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
  const [isStealMode, setIsStealMode] = useState(false);
  const [originalTeamIndex, setOriginalTeamIndex] = useState<number | null>(null);
  const [stealTeamIndices, setStealTeamIndices] = useState<number[]>([]);

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
        id: generateUUID(),
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
    setIsStealMode(false);
    setOriginalTeamIndex(null);
    setStealTeamIndices([]);
  };

  const closeQuestion = () => {
    setSelectedQuestion(null);
    setShowAnswer(false);
    setIsAnimating(false);
    setIsStealMode(false);
    setOriginalTeamIndex(null);
    setStealTeamIndices([]);
  };

  const revealAnswer = () => {
    setShowAnswer(true);
  };

  const getNextTeamIndex = (currentIndex: number) => {
    if (!gameState) return 0;
    return (currentIndex + 1) % gameState.teams.length;
  };

  const updateGameState = async (updates: {
    teams?: Team[];
    currentTeamIndex?: number;
    completedQuestionIds?: string[];
  }) => {
    if (!gameState) return;

    try {
      const response = await gameStateApi.update(gameState._id.toString(), {
        ...updates,
        teams: updates.teams ? (updates.teams as any) : undefined,
      });
      if (response.success && response.data) {
        setGameState(response.data);
      } else {
        console.error('Failed to update game state:', response.error);
        setError(response.error || 'Failed to update game state');
      }
    } catch (err) {
      console.error('Failed to update game state:', err);
      setError('Failed to update game state');
    }
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!gameState || !selectedQuestion) return;

    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    const question = selectedQuestion.question;
    const questionId = question._id.toString();
    const points = question.points;

    if (isCorrect) {
      // Team got it right - reveal answer before closing
      setShowAnswer(true);
      
      const updatedTeams = gameState.teams.map((team, idx) => 
        idx === gameState.currentTeamIndex
          ? { id: team.id, name: team.name, score: team.score + points }
          : { id: team.id, name: team.name, score: team.score }
      );

      const nextTeamIndex = getNextTeamIndex(gameState.currentTeamIndex);
      const completedQuestionIds = [...gameState.completedQuestionIds, questionId];

      await updateGameState({
        teams: updatedTeams as any,
        currentTeamIndex: nextTeamIndex,
        completedQuestionIds,
      });

    } else {
      // Team got it wrong
      if (!isStealMode) {
        // First wrong answer - deduct points and enter steal mode
        const updatedTeams = gameState.teams.map((team, idx) =>
          idx === gameState.currentTeamIndex
            ? { id: team.id, name: team.name, score: team.score - points }
            : { id: team.id, name: team.name, score: team.score }
        );

        setOriginalTeamIndex(gameState.currentTeamIndex);
        setIsStealMode(true);
        setShowAnswer(false); // Keep question visible for steal attempts

        // Calculate which teams can steal (all except the original team)
        const stealIndices = gameState.teams
          .map((_, idx) => idx)
          .filter((idx) => idx !== gameState.currentTeamIndex);
        setStealTeamIndices(stealIndices);

        // Switch to first stealing team if available
        const nextStealTeamIndex = stealIndices.length > 0 ? stealIndices[0] : gameState.currentTeamIndex;

        // Update game state with new team index first, then update state
        const updatedGameState = {
          ...gameState,
          teams: updatedTeams as any,
          currentTeamIndex: nextStealTeamIndex,
        };
        setGameState(updatedGameState as any);

        await updateGameState({
          teams: updatedTeams as any,
          currentTeamIndex: nextStealTeamIndex,
        });
      } else {
        // Wrong answer during steal mode
        if (stealTeamIndices.length > 0) {
          // Move to next stealing team
          const remainingStealIndices = stealTeamIndices.slice(1);
          setStealTeamIndices(remainingStealIndices);

          if (remainingStealIndices.length > 0) {
            // Update current team to next stealing team
            setShowAnswer(false); // Keep question visible for next steal attempt
            await updateGameState({
              currentTeamIndex: remainingStealIndices[0],
            });
          } else {
            // Last steal attempt failed - reveal answer
            setShowAnswer(true);
            const nextTeamIndex = getNextTeamIndex(originalTeamIndex!);
            const completedQuestionIds = [...gameState.completedQuestionIds, questionId];

            await updateGameState({
              currentTeamIndex: nextTeamIndex,
              completedQuestionIds,
            });
          }
        }
      }
    }
  };

  const handleStealAnswer = async (isCorrect: boolean) => {
    if (!gameState || !selectedQuestion || !isStealMode || stealTeamIndices.length === 0) return;

    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    const question = selectedQuestion.question;
    const questionId = question._id.toString();
    const points = question.points;

    if (isCorrect) {
      // Stealing team got it right - reveal answer before closing
      setShowAnswer(true);
      
      const updatedTeams = gameState.teams.map((team, idx) =>
        idx === gameState.currentTeamIndex
          ? { id: team.id, name: team.name, score: team.score + points }
          : { id: team.id, name: team.name, score: team.score }
      );

      const nextTeamIndex = getNextTeamIndex(gameState.currentTeamIndex);
      const completedQuestionIds = [...gameState.completedQuestionIds, questionId];

      await updateGameState({
        teams: updatedTeams as any,
        currentTeamIndex: nextTeamIndex,
        completedQuestionIds,
      });

    } else {
      // Stealing team got it wrong - no points lost, move to next stealing team
      const remainingStealIndices = stealTeamIndices.slice(1);
      setStealTeamIndices(remainingStealIndices);

      if (remainingStealIndices.length > 0) {
        // More steal attempts available - keep question visible
        setShowAnswer(false);
        await updateGameState({
          currentTeamIndex: remainingStealIndices[0],
        });
      } else {
        // Last steal attempt failed - reveal answer
        setShowAnswer(true);
        const nextTeamIndex = getNextTeamIndex(originalTeamIndex!);
        const completedQuestionIds = [...gameState.completedQuestionIds, questionId];

        await updateGameState({
          currentTeamIndex: nextTeamIndex,
          completedQuestionIds,
        });
      }
    }
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
          <p className="text-jeopardy-royal text-xl font-bold font-sans uppercase">LOADING GAME...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-jeopardy-magenta text-xl font-bold font-sans mb-4 uppercase">{error?.toUpperCase()}</p>
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
            <h1 className="text-4xl font-bold text-jeopardy-gold mb-2 tracking-wide font-sans text-center uppercase">
              SET UP TEAMS
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-center mb-8 uppercase">
              HOW MANY TEAMS ARE PLAYING?
            </p>

            {/* Number of teams selector */}
            <div className="mb-8">
              <label className="block text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase">
                NUMBER OF TEAMS
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
              <label className="block text-lg font-bold text-slate-900 dark:text-white mb-4 uppercase">
                TEAM NAMES
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
          <p className="text-jeopardy-magenta text-xl font-bold font-sans mb-4 uppercase">GAME STATE NOT FOUND</p>
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
              <h1 className="text-2xl font-bold text-jeopardy-gold tracking-wide font-sans uppercase" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                {game.name.toUpperCase()}
              </h1>
            </div>
            <div className="flex-1 text-center">
              <p className="text-jeopardy-gold text-3xl md:text-4xl lg:text-5xl font-bold font-sans uppercase tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                {currentTeam.name.toUpperCase()}&apos;S TURN
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Team scores */}
              <div className="flex gap-2">
                {gameState.teams.map((team, index) => (
                  <div
                    key={team.id}
                    className={`px-4 py-2 rounded-lg font-bold text-center ${
                      index === gameState.currentTeamIndex
                        ? 'bg-jeopardy-gold text-jeopardy-blue border-2 border-jeopardy-blue'
                        : 'bg-jeopardy-blue text-jeopardy-gold'
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wide text-center">{team.name.toUpperCase()}</div>
                    <div className="text-xl text-center">{team.score < 0 ? '-' : ''}${Math.abs(team.score)}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  if (gameState) {
                    try {
                      await gameStateApi.delete(gameState._id.toString());
                    } catch (err) {
                      console.error('Failed to delete game state:', err);
                    }
                  }
                  router.push('/games');
                }}
                className="bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold text-sm"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="container mx-auto px-2 md:px-4 py-1 md:py-2 h-[calc(100vh-120px)] flex flex-col">
        <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 ${
          game?.theme === Theme.Christmas ? 'border-red-600' : 
          game?.theme === Theme.Fall ? 'border-amber-800' : 
          game?.theme === Theme.Birthday ? 'border-sky-500' :
          'border-jeopardy-gold'
        } p-2 md:p-4 flex-1 flex flex-col overflow-hidden`}>
          
          <table className="w-full h-full border-collapse table-fixed">
            <thead>
              <tr className="h-[15%]">
                {currentRound.categories.map((category: any) => {
                  const headerColors = getHeaderColors();
                  return (
                    <th
                      key={category._id.toString()}
                      className={`${headerColors.bg} text-white p-1 md:p-2 border-2 md:border-4 ${headerColors.border} font-sans w-[20%] text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl font-bold uppercase`}
                    >
                      {category.name.toUpperCase()}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map((qIndex) => (
                <tr key={qIndex} className="h-[17%]">
                  {currentRound.categories.map((category: any, catIndex: number) => {
                    const question = category.questions[qIndex];
                    const isCompleted = question && gameState.completedQuestionIds.includes(question._id.toString());
                    const cellColors = getCellColors(catIndex, qIndex);
                    
                    return (
                      <td
                        key={`${category._id}-${qIndex}`}
                        className={`${cellColors.bg} ${!isCompleted ? cellColors.hover : ''} border-2 md:border-4 ${cellColors.border} p-0.5 md:p-1 transition-colors text-center ${
                          isCompleted ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                        onClick={() => !isCompleted && handleCellClick(catIndex, qIndex)}
                      >
                        {isCompleted ? (
                          <div></div>
                        ) : question ? (
                          <div className={`${cellColors.text} text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black font-sans`}>
                            ${question.points}
                          </div>
                        ) : (
                          <div className={`${cellColors.text} text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-black font-sans`}>
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
      {selectedQuestion && gameState && (
        <div 
          key={`question-${selectedQuestion.question._id}-${selectedQuestion.catIndex}-${selectedQuestion.qIndex}`}
          className="fixed inset-0 bg-jeopardy-blue flex items-center justify-center z-50 spin-in"
        >
          <div className="w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden relative">
            {!showAnswer ? (
              /* Question Display */
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 md:gap-6 relative">
                {!isStealMode && (
                  <p className="text-white/60 text-xl md:text-xl font-sans uppercase tracking-wide absolute top-8">
                    {gameState.teams[gameState.currentTeamIndex].name.toUpperCase()}
                  </p>
                )}
                {isStealMode && (
                  <p className="text-white/60 text-xl md:text-xl font-sans uppercase tracking-wide absolute top-8">
                    STEAL ATTEMPT: {gameState.teams[gameState.currentTeamIndex].name.toUpperCase()}
                  </p>
                )}
                <div className="flex-1 flex flex-col items-center justify-center gap-4 md:gap-6">
                  {selectedQuestion.question.text && (
                    <p className="text-white text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-sans font-bold leading-tight px-4 uppercase" style={{ textShadow: '4px 4px 8px rgba(0,0,0,0.5)' }}>
                      {selectedQuestion.question.text.toUpperCase()}
                    </p>
                  )}
                  {selectedQuestion.question.imageUrl && (
                    <div className="flex items-center justify-center w-full px-4">
                      <img
                        src={selectedQuestion.question.imageUrl}
                        alt="Question"
                        className="max-w-full max-h-[50vh] w-auto h-auto object-contain rounded-lg"
                      />
                    </div>
                  )}
                  {selectedQuestion.question.audioUrl && (
                    <audio controls autoPlay className="w-full max-w-2xl">
                      <source src={selectedQuestion.question.audioUrl} />
                    </audio>
                  )}
                </div>
                <div className="absolute bottom-8 flex flex-col items-center gap-4">
                  <div className="flex gap-6">
                    <button
                      onClick={() => isStealMode ? handleStealAnswer(true) : handleAnswer(true)}
                      className="bg-white/30 hover:bg-white/40 text-white font-bold w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full transition-colors shadow-lg flex items-center justify-center text-3xl md:text-4xl lg:text-5xl"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => isStealMode ? handleStealAnswer(false) : handleAnswer(false)}
                      className="bg-white/30 hover:bg-white/40 text-white font-bold w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full transition-colors shadow-lg flex items-center justify-center text-3xl md:text-4xl lg:text-5xl"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Answer Display - Only shown when all teams have finished (not during steal mode) */
              <div 
                className="w-full h-full flex flex-col items-center justify-center gap-6 cursor-pointer relative"
                onClick={closeQuestion}
              >
                <p className="text-white text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-sans font-bold leading-tight px-4 uppercase" style={{ textShadow: '4px 4px 8px rgba(0,0,0,0.5)' }}>
                  {selectedQuestion.question.answer.toUpperCase()}
                </p>
                <p className="text-white/70 text-lg md:text-xl font-sans uppercase tracking-wide absolute bottom-8">
                  CLICK TO CLOSE
                </p>
              </div>
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

