'use client';

import { use, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { gameApi, gameStateApi, roundApi, categoryApi, questionApi } from '@/lib/api';
import type { Game } from '@/models/Game';
import type { Round } from '@/models/Round';
import type { Category } from '@/models/Category';
import type { Question } from '@/models/Question';
import type { GameState, Team } from '@/models/GameState';
import { Theme } from '@/types/theme';
import Link from 'next/link';
import { getUserId } from '@/lib/auth';

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
  
  // Waiting screen state (for host to wait for teams to join)
  const [waitingForTeams, setWaitingForTeams] = useState(false);
  
  // SSE connection error state
  const [sseError, setSseError] = useState(false);
  
  // Buzz-in processing state (to prevent race conditions)
  const [isBuzzingIn, setIsBuzzingIn] = useState(false);
  
  // Question display state
  const [selectedQuestion, setSelectedQuestion] = useState<{
    catIndex: number;
    qIndex: number;
    question: any;
    pickerTeamIndex: number; // Team that picked this question
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isStealMode, setIsStealMode] = useState(false);
  const [originalTeamIndex, setOriginalTeamIndex] = useState<number | null>(null);
  const [stealTeamIndices, setStealTeamIndices] = useState<number[]>([]);
  
  // Daily Double state
  const [showDailyDouble, setShowDailyDouble] = useState(false);
  const [showWagerInput, setShowWagerInput] = useState(false);
  const [wagerAmount, setWagerAmount] = useState<string>('');
  const [dailyDoubleQuestion, setDailyDoubleQuestion] = useState<{
    catIndex: number;
    qIndex: number;
    question: any;
    pickerTeamIndex: number;
  } | null>(null);
  
  // Audio ref for Daily Double sound
  const dailyDoubleAudioRef = useRef<HTMLAudioElement>(null);
  // Round summary state
  const [showRoundSummary, setShowRoundSummary] = useState(false);

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

  // Play Daily Double sound when Daily Double is activated
  useEffect(() => {
    if (showDailyDouble && dailyDoubleAudioRef.current) {
      dailyDoubleAudioRef.current.play().catch((error) => {
        console.error('Error playing Daily Double sound:', error);
      });
    }
  }, [showDailyDouble]);

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
      
      // Log all Daily Double questions
      console.log('=== DAILY DOUBLE QUESTIONS ===');
      roundsData.forEach((round, roundIndex) => {
        round.categories.forEach((category, catIndex) => {
          category.questions.forEach((question, qIndex) => {
            if (question.isDailyDouble) {
              console.log(`Round ${roundIndex + 1}, Category: "${category.name}", Question ${qIndex + 1}:`, {
                questionText: question.text,
                points: question.points,
                questionId: question._id,
                catIndex,
                qIndex,
              });
            }
          });
        });
      });
      console.log('=============================');
      
      // Check for existing game state, create one if it doesn't exist
      const stateResponse = await gameStateApi.getByGameId(id);
      if (stateResponse.success && stateResponse.data) {
        setGameState(stateResponse.data);
        // If no teams have joined yet, show waiting screen
        if (stateResponse.data.teams.length === 0) {
          setWaitingForTeams(true);
        } else {
          setWaitingForTeams(false);
        }
      } else {
        // Create a new game state with empty teams (this will generate a join code)
        // The backend will check if one already exists and return it instead of creating a duplicate
          const createResponse = await gameStateApi.create({
            gameId: id,
            teams: [],
            currentTeamIndex: 0,
            questionPickerTeamIndex: 0,
            currentRoundIndex: 0,
            completedQuestionIds: [],
          });
        if (createResponse.success && createResponse.data) {
          console.log('Game state with joinCode:', createResponse.data.joinCode);
          setGameState(createResponse.data);
          setWaitingForTeams(true); // Show waiting screen
        } else {
          setError(createResponse.error || 'Failed to create game state');
        }
      }
    } catch (err) {
      setError('Failed to load game');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // SSE connection for real-time game state updates
  useEffect(() => {
    if (!id) return;

    setSseError(false); // Reset error state when reconnecting
    const eventSource = new EventSource(`/api/game-states/stream/${id}`);

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'update' && message.data) {
          // Only update state if we're not in the middle of a buzz-in operation
          // OR if the server confirms our buzz-in (buzzedTeamId matches our optimistic update)
          // This prevents race conditions where optimistic updates get overwritten by stale SSE updates
          if (!isBuzzingIn) {
            setGameState(message.data);
          } else if (message.data.buzzedTeamId) {
            // Server confirmed a buzz-in, update state and clear the flag
            setGameState(message.data);
            setIsBuzzingIn(false);
          }
          // Update waiting state for host
          if (message.data.state === 'setup' && message.data.teams.length === 0) {
            setWaitingForTeams(true);
          } else if (message.data.state === 'active' || message.data.state === 'question_active' || message.data.state === 'answering' || message.data.state === 'showing_answer') {
            setWaitingForTeams(false);
          }
        } else if (message.type === 'connected') {
          console.log('SSE connected');
          setSseError(false); // Clear error on successful connection
        } else if (message.type === 'error') {
          console.error('SSE error:', message.error);
          setSseError(true);
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setSseError(true);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id, isBuzzingIn]);

  const handleStartGame = async () => {
    if (!gameState || gameState.teams.length === 0) {
      setError('At least one team must join before starting');
      return;
    }
    
    // Update game state to 'active'
    try {
      const response = await gameStateApi.update(gameState._id.toString(), {
        state: 'active',
      });
      if (response.success && response.data) {
        setGameState(response.data);
        setWaitingForTeams(false);
      } else {
        setError(response.error || 'Failed to start game');
      }
    } catch (err) {
      setError('Failed to start game');
      console.error(err);
    }
  };

  const handleCellClick = async (catIndex: number, qIndex: number) => {
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
    
    // Check if this is a Daily Double
    if (question.isDailyDouble) {
      console.log('Daily Double detected!', {
        category: category.name,
        questionText: question.text,
        questionId: question._id,
        points: question.points,
        catIndex,
        qIndex,
      });
      const pickerTeamIndex = gameState.questionPickerTeamIndex ?? gameState.currentTeamIndex;
      setDailyDoubleQuestion({ catIndex, qIndex, question, pickerTeamIndex });
      setShowDailyDouble(true);
      setShowWagerInput(false);
      setWagerAmount('');
      setIsAnimating(true);
      
      // Don't set state to question_active yet - wait until wager is submitted
      // Keep state as 'active' so clients see "waiting for question" during wagering
    } else {
      const pickerTeamIndex = gameState.questionPickerTeamIndex ?? gameState.currentTeamIndex;
      setSelectedQuestion({ catIndex, qIndex, question, pickerTeamIndex });
      setShowAnswer(false);
      setIsStealMode(false);
      setOriginalTeamIndex(null);
      setStealTeamIndices([]);
      
      // Update game state to question_active when question is selected
      const updateResponse = await gameStateApi.update(gameState._id.toString(), {
        state: 'question_active',
        buzzedTeamId: null, // Clear any previous buzz-in
        questionPickerTeamIndex: pickerTeamIndex, // Track which team picked this question
      });
      console.log('[Host] Updated state to question_active:', updateResponse);
    }
  };

  const closeQuestion = async () => {
    // If we're closing without a correct answer (showAnswer is false and we're in steal mode),
    // the original picker team should still control the board
    if (gameState && selectedQuestion && !showAnswer && isStealMode) {
      await handleQuestionClosedNoCorrectAnswer();
    }
    
    setSelectedQuestion(null);
    setShowAnswer(false);
    setIsAnimating(false);
    setIsStealMode(false);
    setOriginalTeamIndex(null);
    setStealTeamIndices([]);
    setShowDailyDouble(false);
    setShowWagerInput(false);
    setWagerAmount('');
    setDailyDoubleQuestion(null);
    
    // Reset game state back to active (question closed, ready for next question)
    if (gameState) {
      await gameStateApi.update(gameState._id.toString(), {
        state: 'active',
        buzzedTeamId: null, // Clear buzz-in
      });
    }
  };

  const handleWagerSubmit = async () => {
    const wager = parseInt(wagerAmount);
    if (!dailyDoubleQuestion || !gameState || isNaN(wager) || wager < 0) return;
    
    // Get current team's score to validate max wager
    // In Jeopardy, you can wager up to your current score OR the maximum question value, whichever is higher
    const currentTeam = gameState.teams[gameState.currentTeamIndex];
    const maxWager = Math.max(currentTeam.score, dailyDoubleQuestion.question.points);
    
    // Clamp wager to valid range (0 to maxWager)
    const finalWager = Math.min(Math.max(wager, 0), maxWager);
    
    // Create a modified question with the wager amount overriding the original points
    // This wager amount will be used for both correct/incorrect answers and steal attempts
    const modifiedQuestion = {
      ...dailyDoubleQuestion.question,
      points: finalWager, // Wager replaces original question points
    };
    
    setSelectedQuestion({ 
      catIndex: dailyDoubleQuestion.catIndex,
      qIndex: dailyDoubleQuestion.qIndex,
      question: modifiedQuestion,
      pickerTeamIndex: dailyDoubleQuestion.pickerTeamIndex,
    });
    setShowDailyDouble(false);
    setShowWagerInput(false);
    setWagerAmount('');
    setDailyDoubleQuestion(null);
    setShowAnswer(false);
    setIsStealMode(false);
    setOriginalTeamIndex(null);
    setStealTeamIndices([]);
    // Trigger animation for question display
    setIsAnimating(true);
    // Reset animation after it completes
    setTimeout(() => setIsAnimating(false), 600);
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
    questionPickerTeamIndex?: number;
    state?: string;
    completedQuestionIds?: string[];
    currentRoundIndex?: number;
    buzzedTeamId?: string | null;
  }) => {
    if (!gameState) return;

    try {
      const response = await gameStateApi.update(gameState._id.toString(), {
        ...updates,
        teams: updates.teams ? (updates.teams as Team[]) : undefined,
      } as any);
      if (response.success && response.data) {
        const updatedState = response.data;
        setGameState(updatedState);
        
        // Check if current round is complete
        if (updatedState && rounds.length > 0) {
          const currentRound = rounds[updatedState.currentRoundIndex];
          if (currentRound) {
            const allQuestionIds = currentRound.categories.flatMap(cat => 
              cat.questions.map(q => q._id.toString())
            );
            const isRoundComplete = allQuestionIds.length > 0 && 
              allQuestionIds.every(id => updatedState.completedQuestionIds.includes(id));
            
            // Show summary if round is complete (whether it's the last round or not)
            if (isRoundComplete) {
              setShowRoundSummary(true);
            }
          }
        }
      } else {
        console.error('Failed to update game state:', response.error);
        setError(response.error || 'Failed to update game state');
      }
    } catch (err) {
      console.error('Failed to update game state:', err);
      setError('Failed to update game state');
    }
  };

  const handleNextRound = async () => {
    if (!gameState || !rounds.length) return;
    
    const nextRoundIndex = gameState.currentRoundIndex + 1;
    if (nextRoundIndex < rounds.length) {
      await updateGameState({
        currentRoundIndex: nextRoundIndex,
        currentTeamIndex: 0, // Reset to first team for new round
      });
      setShowRoundSummary(false);
    }
  };

  const handleAnswer = async (isCorrect: boolean) => {
    if (!gameState || !selectedQuestion) return;

    // Get the team that buzzed in (from buzzedTeamId)
    const buzzedTeamId = gameState.buzzedTeamId;
    if (!buzzedTeamId) return; // Should have a buzzed team at this point
    
    const buzzedTeamIndex = gameState.teams.findIndex(t => t.id === buzzedTeamId);
    if (buzzedTeamIndex === -1) return;

    const question = selectedQuestion.question;
    const questionId = question._id.toString();
    const points = question.points;

    if (isCorrect) {
      // Team got it right - they now control the board (get to pick next question)
      setShowAnswer(true);
      
      const updatedTeams = gameState.teams.map((team, idx) => 
        idx === buzzedTeamIndex
          ? { id: team.id, name: team.name, score: team.score + points }
          : { id: team.id, name: team.name, score: team.score }
      );

      const completedQuestionIds = [...gameState.completedQuestionIds, questionId];

      await updateGameState({
        teams: updatedTeams as any,
        questionPickerTeamIndex: buzzedTeamIndex, // The team that answered correctly now controls the board
        currentTeamIndex: buzzedTeamIndex, // Also update for backwards compatibility
        completedQuestionIds,
        state: 'showing_answer', // Set state to showing_answer so clients see "waiting for next question"
        buzzedTeamId: null, // Clear buzz-in when question is answered
      });

    } else {
      // Team got it wrong - deduct points and allow anyone to buzz in to steal
      const updatedTeams = gameState.teams.map((team, idx) =>
        idx === buzzedTeamIndex
          ? { id: team.id, name: team.name, score: team.score - points }
          : { id: team.id, name: team.name, score: team.score }
      );

      setIsStealMode(true);
      setShowAnswer(false); // Keep question visible for steal attempts
      
      // Update teams (points deducted) but keep question active for stealing
      // Anyone can now buzz in to steal (buzzedTeamId will be set when they buzz)
      // Keep state as 'question_active' so clients can buzz in again
      await updateGameState({
        teams: updatedTeams as any,
        state: 'question_active', // Ensure state is question_active so clients can buzz in
        buzzedTeamId: null, // Clear buzz-in so anyone can buzz in to steal
      });
    }
  };

  const handleStealAnswer = async (isCorrect: boolean) => {
    if (!gameState || !selectedQuestion || !isStealMode) return;

    // Get the team that buzzed in to steal (from buzzedTeamId)
    const buzzedTeamId = gameState.buzzedTeamId;
    if (!buzzedTeamId) return;
    
    const buzzedTeamIndex = gameState.teams.findIndex(t => t.id === buzzedTeamId);
    if (buzzedTeamIndex === -1) return;

    const question = selectedQuestion.question;
    const questionId = question._id.toString();
    const points = question.points;

    if (isCorrect) {
      // Stealing team got it right - they now control the board
      setShowAnswer(true);
      
      const updatedTeams = gameState.teams.map((team, idx) =>
        idx === buzzedTeamIndex
          ? { id: team.id, name: team.name, score: team.score + points }
          : { id: team.id, name: team.name, score: team.score }
      );

      const completedQuestionIds = [...gameState.completedQuestionIds, questionId];

      await updateGameState({
        teams: updatedTeams as any,
        questionPickerTeamIndex: buzzedTeamIndex, // The stealing team now controls the board
        currentTeamIndex: buzzedTeamIndex, // Also update for backwards compatibility
        completedQuestionIds,
        state: 'showing_answer', // Set state to showing_answer so clients see "waiting for next question"
        buzzedTeamId: null, // Clear buzz-in
      });

    } else {
      // Stealing team got it wrong - no points lost, allow anyone else to buzz in
      // Clear the buzz-in so another team can try
      setShowAnswer(false); // Keep question visible for next steal attempt
      await updateGameState({
        state: 'question_active', // Ensure state is question_active so clients can buzz in
        buzzedTeamId: null, // Clear so another team can buzz in
      });
    }
  };

  // Handle when question is closed without anyone answering correctly (all teams got it wrong)
  const handleQuestionClosedNoCorrectAnswer = async () => {
    if (!gameState || !selectedQuestion) return;
    
    const questionId = selectedQuestion.question._id.toString();
    const pickerTeamIndex = selectedQuestion.pickerTeamIndex;
    
    // Original picker team still controls the board (can pick another question)
    const completedQuestionIds = [...gameState.completedQuestionIds, questionId];
    
    await updateGameState({
      questionPickerTeamIndex: pickerTeamIndex, // Keep original picker
      currentTeamIndex: pickerTeamIndex, // Also update for backwards compatibility
      completedQuestionIds,
      buzzedTeamId: null,
    });
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
    if (game?.theme === Theme.Football) {
      // Dark green field with white text and white border
      return {
        bg: 'bg-green-800',
        hover: 'hover:bg-green-900',
        border: 'border-white',
        text: 'text-white',
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
        accent: 'bg-green-600',
      };
    }
    if (game?.theme === Theme.Fall) {
      return {
        bg: 'bg-amber-800',
        hover: 'hover:bg-amber-900',
        border: 'border-orange-700',
        text: 'text-white',
        accent: 'bg-orange-500',
      };
    }
    if (game?.theme === Theme.Birthday) {
      return {
        bg: 'bg-sky-400',
        hover: 'hover:bg-sky-500',
        border: 'border-sky-600',
        text: 'text-jeopardy-royal',
        accent: 'bg-sky-500',
      };
    }
    if (game?.theme === Theme.Football) {
      return {
        bg: 'bg-amber-900',
        hover: 'hover:bg-amber-950',
        border: 'border-white',
        text: 'text-white',
        accent: 'bg-amber-800',
      };
    }
    return {
      bg: 'bg-jeopardy-royal',
      hover: 'hover:bg-jeopardy-blue-light',
      border: 'border-jeopardy-gold',
      text: 'text-jeopardy-gold',
      accent: 'bg-jeopardy-gold',
    };
  };

  // Audio element for Daily Double sound (hidden)
  const dailyDoubleAudio = (
    <audio ref={dailyDoubleAudioRef} src="/daily_double.mp3" preload="auto" />
  );

  if (loading) {
    return (
      <>
        {dailyDoubleAudio}
        <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-jeopardy-royal mx-auto mb-4"></div>
            <p className="text-jeopardy-royal text-xl font-bold font-sans uppercase">LOADING GAME...</p>
          </div>
        </div>
      </>
    );
  }

  // Determine if current user is the host (owns the game)
  // Clients won't be logged in, so if there's no userId, they're definitely not the host
  const currentUserId = getUserId();
  const isHost = game ? (currentUserId !== null && currentUserId === game.userId) : false;

  if (error) {
    return (
      <>
        {dailyDoubleAudio}
        <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center">
          <div className="text-center">
            <p className="text-jeopardy-magenta text-xl font-bold font-sans mb-4 uppercase">{error?.toUpperCase()}</p>
            <Link
              href={isHost ? "/games" : "/"}
              className="inline-block bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-3 px-8 rounded-lg transition-colors uppercase tracking-wide"
            >
              {isHost ? "Back to Games" : "Go Home"}
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!game) {
    return null;
  }

  // If no game state, show error (clients need to join via join code first)
  if (!gameState) {
    return (
      <>
        {dailyDoubleAudio}
        <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center">
          <div className="text-center">
            <p className="text-jeopardy-magenta text-xl font-bold font-sans mb-4 uppercase">
              {isHost ? 'Game state not found' : 'Please join this game using a join code'}
            </p>
            <Link
              href={isHost ? "/games" : "/"}
              className="inline-block bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-3 px-8 rounded-lg transition-colors uppercase tracking-wide"
            >
              {isHost ? 'Back to Games' : 'Go Home'}
            </Link>
          </div>
        </div>
      </>
    );
  }

  // CLIENT VIEWS (user is not the host)
  if (!isHost) {
    // Show SSE connection error for clients
    if (sseError) {
      return (
        <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center p-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-red-500 p-8">
              <h1 className="text-3xl font-bold text-red-500 mb-4 tracking-wide font-sans uppercase">
                Connection Error
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg mb-6">
                Lost connection to the game. Please reload the page to reconnect.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-3 px-8 rounded-lg transition-colors uppercase tracking-wide"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Client waiting screen (when state is 'setup')
    if (gameState.state === 'setup') {
      return (
        <>
          {dailyDoubleAudio}
          <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center p-4">
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-8">
                <h1 className="text-4xl font-bold text-jeopardy-gold mb-4 tracking-wide font-sans uppercase">
                  Waiting for Host
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-6">
                  The host will start the game soon...
                </p>
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-jeopardy-royal mx-auto"></div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Client buzz-in view (when state is 'active' or 'question_active')
    if (gameState.state === 'active' || gameState.state === 'question_active') {
      // Find the client's team ID from URL params or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const teamId = urlParams.get('teamId') || localStorage.getItem(`game_${id}_teamId`);
      
      const canBuzzIn = gameState.state === 'question_active' && !gameState.buzzedTeamId;
      const hasBuzzedIn = gameState.buzzedTeamId === teamId;
      const someoneElseBuzzedIn = gameState.buzzedTeamId && gameState.buzzedTeamId !== teamId;

      console.log('Client view - state:', gameState.state, 'canBuzzIn:', canBuzzIn, 'buzzedTeamId:', gameState.buzzedTeamId, 'teamId:', teamId);

      return (
        <>
          {dailyDoubleAudio}
          {canBuzzIn ? (
            <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex flex-col items-center justify-center p-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-jeopardy-royal mb-8 tracking-wide font-sans uppercase">
                BUZZ IN!
              </h1>
              <button
                className="flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={async () => {
                  if (!teamId || !gameState || !canBuzzIn || isBuzzingIn) return;
                  
                  setIsBuzzingIn(true); // Prevent multiple simultaneous calls
                  
                  // Optimistic update: immediately update local state for instant feedback
                  setGameState({
                    ...gameState,
                    buzzedTeamId: teamId,
                    state: 'answering',
                  });
                  
                  try {
                    const response = await gameStateApi.buzzIn(gameState._id.toString(), teamId);
                    // Update with server response if successful
                    if (response.success && response.data) {
                      setGameState(response.data);
                    }
                    // Allow a brief delay before re-enabling to prevent rapid clicks
                    setTimeout(() => setIsBuzzingIn(false), 500);
                  } catch (err) {
                    console.error('Failed to buzz in:', err);
                    // Revert optimistic update on error
                    setGameState({
                      ...gameState,
                      buzzedTeamId: null,
                      state: 'question_active',
                    });
                    setIsBuzzingIn(false);
                  }
                }}
                disabled={!canBuzzIn || !teamId || isBuzzingIn}
              >
                  <img 
                    src="/buzzer.png" 
                    alt="Buzz In" 
                    className="w-[95vw] max-w-4xl h-auto object-contain hover:brightness-110 active:brightness-90 transition-all"
                  />
              </button>
            </div>
          ) : (
            <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center p-4">
              <div className="max-w-md mx-auto text-center">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-8">
                  {gameState.state === 'active' ? (
                    <>
                      <h1 className="text-3xl font-bold text-jeopardy-gold mb-8 tracking-wide font-sans uppercase">
                        Waiting for Question
                      </h1>
                      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-jeopardy-royal mx-auto"></div>
                    </>
                  ) : hasBuzzedIn ? (
                    <>
                      <h1 className="text-4xl font-bold text-jeopardy-gold mb-4 tracking-wide font-sans uppercase">
                        You Buzzed In!
                      </h1>
                      <p className="text-slate-600 dark:text-slate-400 text-lg">
                        Waiting for the host...
                      </p>
                    </>
                  ) : someoneElseBuzzedIn ? (
                    <>
                      <h1 className="text-3xl font-bold text-slate-600 dark:text-slate-400 mb-4 tracking-wide font-sans uppercase">
                        Someone Else Buzzed In
                      </h1>
                      <p className="text-slate-600 dark:text-slate-400 text-lg">
                        Wait for the next question...
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    // Client showing answer view (when state is 'showing_answer')
    if (gameState.state === 'showing_answer') {
      return (
        <>
          {dailyDoubleAudio}
          <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center p-4">
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-8">
                <h1 className="text-3xl font-bold text-jeopardy-gold mb-4 tracking-wide font-sans uppercase">
                  Waiting for Next Question
                </h1>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Client answering view (when state is 'answering' and they buzzed in)
    if (gameState.state === 'answering') {
      const urlParams = new URLSearchParams(window.location.search);
      const teamId = urlParams.get('teamId') || localStorage.getItem(`game_${id}_teamId`);
      const isMyTurn = gameState.buzzedTeamId === teamId;

      return (
        <>
          {dailyDoubleAudio}
          <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center p-4">
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-8">
                {isMyTurn ? (
                  <>
                    <h1 className="text-4xl font-bold text-jeopardy-gold mb-4 tracking-wide font-sans uppercase">
                      It's Your Turn!
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                      The host is waiting for your answer...
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold text-slate-600 dark:text-slate-400 mb-4 tracking-wide font-sans uppercase">
                      Waiting for Answer
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg">
                      Another team is answering...
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      );
    }

    // Client finished view (when state is 'finished')
    if (gameState.state === 'finished') {
      return (
        <>
          {dailyDoubleAudio}
          <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center p-4">
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-8">
                <h1 className="text-4xl font-bold text-jeopardy-gold mb-4 tracking-wide font-sans uppercase">
                  Game Finished
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-6">
                  Thanks for playing!
                </p>
                <Link
                  href="/"
                  className="inline-block bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-3 px-8 rounded-lg transition-colors uppercase tracking-wide"
                >
                  Go Home
                </Link>
              </div>
            </div>
          </div>
        </>
      );
    }
  }

  // HOST VIEWS (user is the host)
  // Waiting screen (for host to wait for teams to join)
  if (gameState && gameState.state === 'setup') {
    return (
      <>
        {dailyDoubleAudio}
        <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-8">
              <h1 className="text-4xl font-bold text-jeopardy-gold mb-2 tracking-wide font-sans text-center uppercase">
                WAITING FOR TEAMS
              </h1>
              
              {/* Join Code */}
              <div className="mb-8 text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4 uppercase text-lg">
                  Share this code with teams:
                </p>
                <div className="bg-jeopardy-blue border-4 border-jeopardy-royal rounded-xl p-6 inline-block">
                  <div className="text-6xl font-bold text-jeopardy-gold tracking-widest font-mono">
                    {gameState.joinCode || 'Loading...'}
                  </div>
                </div>
              </div>

              {/* Teams List */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 text-center uppercase">
                  Teams Joined ({gameState.teams.length})
                </h2>
                {gameState.teams.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p className="text-lg">No teams have joined yet...</p>
                    <p className="text-sm mt-2">Teams will appear here as they join</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gameState.teams.map((team, index) => (
                      <div
                        key={team.id}
                        className="bg-jeopardy-blue/10 dark:bg-jeopardy-blue/20 border-2 border-jeopardy-blue rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xl font-bold text-jeopardy-royal dark:text-jeopardy-gold">
                            {team.name}
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Team #{index + 1}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Start Game button */}
              <div className="flex gap-4">
                <Link
                  href="/games"
                  className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors text-center uppercase tracking-wide"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleStartGame}
                  disabled={gameState.teams.length === 0}
                  className="flex-1 bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Game
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!gameState || !rounds.length) {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-jeopardy-magenta text-xl font-bold font-sans mb-4 uppercase">GAME STATE NOT FOUND</p>
          <Link
            href={isHost ? "/games" : "/"}
            className="inline-block bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-3 px-8 rounded-lg transition-colors uppercase tracking-wide"
          >
            {isHost ? "Back to Games" : "Go Home"}
          </Link>
        </div>
      </div>
    );
  }

  const currentRound = rounds[gameState.currentRoundIndex];
  const pickerTeamIndex = gameState.questionPickerTeamIndex ?? gameState.currentTeamIndex;
  const controllingTeam = gameState.teams[pickerTeamIndex];

  return (
    <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark relative">
      {/* Christmas Theme Decorations */}
      {game?.theme === Theme.Christmas && (
        <>
          {/* Snow at bottom - multiple smaller images */}
          <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none flex items-end">
            {Array.from({ length: 20 }).map((_, i) => (
              <img 
                key={i}
                src="/snow.png" 
                alt="snow" 
                className="h-12 md:h-16 lg:h-20 object-contain flex-1" 
              />
            ))}
          </div>
          
          {/* Snowman in bottom left */}
          <div className="fixed bottom-0 left-4 md:left-8 z-30 pointer-events-none">
            <img src="/snowman.png" alt="snowman" className="w-20 h-20 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 object-contain drop-shadow-lg" />
          </div>
          
          {/* Christmas tree in bottom right */}
          <div className="fixed bottom-0 right-2 md:right-0 z-30 pointer-events-none">
            <img src="/tree.png" alt="christmas tree" className="w-28 h-28 md:w-40 md:h-40 lg:w-56 lg:h-56 xl:w-72 xl:h-72 object-contain drop-shadow-lg" />
          </div>
        </>
      )}

      {/* Birthday Theme Decorations */}
      {game?.theme === Theme.Birthday && (
        <>
          {/* Banner in top left */}
          <div className="fixed top-24 left-2 z-30 pointer-events-none" style={{ transform: 'rotate(-30deg)' }}>
            <img src="/banner.png" alt="banner" className="w-56 h-28 md:w-64 md:h-32 object-contain drop-shadow-lg" />
          </div>

          {/* Banner in top right (mirrored) */}
          <div className="fixed top-24 right-2 z-30 pointer-events-none" style={{ transform: 'rotate(30deg) scaleX(-1)' }}>
            <img src="/banner.png" alt="banner" className="w-56 h-28 md:w-64 md:h-32 object-contain drop-shadow-lg" />
          </div>

          {/* Present piles at bottom */}
          <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
            {/* Left side present pile */}
            <div className="absolute bottom-0 left-8 flex items-end gap-2">
              <img src="/present1.png" alt="present" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-md" />
              <img src="/present2.png" alt="present" className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md" />
              <img src="/present1.png" alt="present" className="w-14 h-14 md:w-18 md:h-18 object-contain drop-shadow-md" />
              <img src="/present2.png" alt="present" className="w-18 h-18 md:w-22 md:h-22 object-contain drop-shadow-md" />
            </div>

            {/* Center present pile */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-2">
              <img src="/present2.png" alt="present" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-md" />
              <img src="/present1.png" alt="present" className="w-14 h-14 md:w-18 md:h-18 object-contain drop-shadow-md" />
            </div>

            {/* Right side present pile */}
            <div className="absolute bottom-0 right-8 flex items-end gap-2">
              <img src="/present1.png" alt="present" className="w-18 h-18 md:w-22 md:h-22 object-contain drop-shadow-md" />
              <img src="/present2.png" alt="present" className="w-14 h-14 md:w-18 md:h-18 object-contain drop-shadow-md" />
              <img src="/present1.png" alt="present" className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md" />
              <img src="/present2.png" alt="present" className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-md" />
            </div>
          </div>
        </>
      )}

      {/* Fall Theme Decorations */}
      {game?.theme === Theme.Fall && (
        <>
          {/* Top Left Leaf */}
          <div className="fixed top-12 left-2 z-30 w-24 h-24 opacity-80 pointer-events-none">
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          {/* Top Right Leaf */}
          <div className="fixed top-12 right-2 z-30 w-24 h-24 opacity-80 pointer-events-none" style={{ transform: 'rotate(45deg)' }}>
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          {/* Bottom Left Leaf */}
          <div className="fixed bottom-24 left-2 z-30 w-24 h-24 opacity-80 pointer-events-none" style={{ transform: 'rotate(180deg)' }}>
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          {/* Bottom Right Leaf */}
          <div className="fixed bottom-24 right-2 z-30 w-24 h-24 opacity-80 pointer-events-none" style={{ transform: 'rotate(-45deg)' }}>
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          {/* Left Side Leaves */}
          <div className="fixed left-2 top-1/2 -translate-y-1/2 z-30 w-20 h-20 opacity-70 pointer-events-none" style={{ transform: 'translateY(-50%) rotate(-90deg)' }}>
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          <div className="fixed left-2 top-1/4 z-30 w-16 h-16 opacity-60 pointer-events-none" style={{ transform: 'rotate(12deg)' }}>
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          <div className="fixed left-2 top-3/4 z-30 w-16 h-16 opacity-60 pointer-events-none" style={{ transform: 'rotate(-12deg)' }}>
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          {/* Right Side Leaves */}
          <div className="fixed right-2 top-1/2 -translate-y-1/2 z-30 w-20 h-20 opacity-70 pointer-events-none" style={{ transform: 'translateY(-50%) rotate(90deg)' }}>
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          <div className="fixed right-2 top-1/4 z-30 w-16 h-16 opacity-60 pointer-events-none" style={{ transform: 'rotate(-12deg)' }}>
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          <div className="fixed right-2 top-3/4 z-30 w-16 h-16 opacity-60 pointer-events-none" style={{ transform: 'rotate(12deg)' }}>
            <img src="/leaf.png" alt="leaf" className="w-full h-full object-contain" />
          </div>
          
          {/* Big Pumpkin */}
          <div className="fixed bottom-8 right-4 z-30 pointer-events-none">
            <img src="/pumpkin.png" alt="pumpkin" className="w-32 h-32 md:w-48 md:h-48 object-contain drop-shadow-lg" />
          </div>
        </>
      )}

      {/* Football Theme Decorations */}
      {game?.theme === Theme.Football && (
        <>
          {/* Player in bottom left */}
          <div className="fixed bottom-0 left-0 md:left-0 z-30 pointer-events-none">
            <img src="/player.png" alt="football player" className="w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 object-contain drop-shadow-lg" />
          </div>
          
          {/* Field goal in bottom right */}
          <div className="fixed bottom-0 right-0 md:right-0 z-30 pointer-events-none">
            <img src="/field_goal.png" alt="field goal" className="w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 object-contain drop-shadow-lg" />
          </div>
        </>
      )}
      
      {/* Header */}
      <div className={`${getHeaderColors().bg} border-b-4 ${getHeaderColors().border} py-4 relative z-20`}>
        <div className="container mx-auto px-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className={`text-2xl font-bold ${getHeaderColors().text} tracking-wide font-sans uppercase`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                {game.name.toUpperCase()}
              </h1>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 text-center">
              <p className={`${getHeaderColors().text} text-3xl md:text-4xl lg:text-5xl font-bold font-sans uppercase tracking-wide`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                {controllingTeam?.name.toUpperCase()}&apos;S TURN
              </p>
            </div>
            <div className="flex-1 flex justify-end">
              <div className="flex items-center gap-4">
                {/* Team scores */}
                <div className="flex gap-2">
                {gameState.teams.map((team, index) => {
                  const headerColors = getHeaderColors();
                  const isControllingTeam = index === pickerTeamIndex;
                  
                  // Determine text colors - blue if background is gold
                  let teamNameColor = '';
                  let scoreColor = '';
                  
                  if (isControllingTeam) {
                    // Current team uses accent background
                    if (headerColors.accent === 'bg-jeopardy-gold') {
                      teamNameColor = 'text-jeopardy-blue';
                      scoreColor = team.score < 0 ? 'text-red-600' : 'text-jeopardy-blue';
                    } else if (headerColors.text === 'text-jeopardy-royal') {
                      teamNameColor = 'text-white';
                      scoreColor = team.score < 0 ? 'text-red-500' : 'text-white';
                    } else {
                      teamNameColor = 'text-white';
                      scoreColor = team.score < 0 ? 'text-red-500' : 'text-white';
                    }
                  } else {
                    // Other teams use header background
                    if (headerColors.text === 'text-jeopardy-royal') {
                      teamNameColor = 'text-jeopardy-royal';
                      scoreColor = team.score < 0 ? 'text-red-600' : 'text-jeopardy-royal';
                    } else {
                      teamNameColor = 'text-white';
                      scoreColor = team.score < 0 ? 'text-red-300' : 'text-white';
                    }
                  }
                  
                  return (
                    <div
                      key={team.id}
                      className={`px-4 py-2 rounded-lg font-bold text-center ${
                        isControllingTeam
                          ? `${headerColors.accent} border-2 ${headerColors.border}`
                          : `${headerColors.bg}`
                      }`}
                    >
                      <div className={`text-xs uppercase tracking-wide text-center ${teamNameColor}`}>{team.name.toUpperCase()}</div>
                      <div className={`text-xl text-center ${scoreColor}`}>
                        {team.score < 0 ? '-' : ''}${Math.abs(team.score)}
                      </div>
                    </div>
                  );
                })}
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
                  className={`${getHeaderColors().hover} text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 ${getHeaderColors().border} text-sm`}
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="container mx-auto px-2 md:px-4 py-1 md:py-2 h-[calc(100vh-120px)] flex flex-col relative z-20">
        <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 ${
          game?.theme === Theme.Christmas ? 'border-red-600' : 
          game?.theme === Theme.Fall ? 'border-amber-800' : 
          game?.theme === Theme.Birthday ? 'border-sky-500' :
          game?.theme === Theme.Football ? 'border-white' :
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

      {/* Round Summary Modal */}
      {showRoundSummary && gameState && rounds.length > 0 && (
        <div className="fixed inset-0 bg-jeopardy-blue flex items-center justify-center z-50">
          <div className="w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden relative">
            <div className="max-w-4xl w-full">
              {gameState.currentRoundIndex < rounds.length - 1 ? (
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-jeopardy-gold mb-8 font-sans uppercase tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  ROUND {gameState.currentRoundIndex + 1} COMPLETE
                </h1>
              ) : (
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-jeopardy-gold mb-8 font-sans uppercase tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  GAME OVER
                </h1>
              )}
              
              <div className="bg-white/10 rounded-2xl p-8 mb-8 backdrop-blur-sm">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 font-sans uppercase tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  {gameState.currentRoundIndex < rounds.length - 1 ? 'CURRENT STANDINGS' : 'FINAL RESULTS'}
                </h2>
                
                <div className="space-y-4">
                  {gameState.teams
                    .sort((a, b) => b.score - a.score)
                    .map((team, index) => (
                      <div
                        key={team.id}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          index === 0
                            ? 'bg-jeopardy-gold text-jeopardy-blue'
                            : 'bg-white/20 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`text-2xl md:text-3xl font-bold ${
                            index === 0 ? 'text-jeopardy-blue' : 'text-jeopardy-gold'
                          }`}>
                            #{index + 1}
                          </div>
                          <div className="text-xl md:text-2xl font-bold font-sans uppercase">
                            {team.name}
                            {index === 0 && gameState.currentRoundIndex === rounds.length - 1 && (
                              <span className="ml-3 text-jeopardy-blue">🏆</span>
                            )}
                          </div>
                        </div>
                        <div className={`text-3xl md:text-4xl font-bold font-sans ${
                          index === 0 ? 'text-jeopardy-blue' : 'text-jeopardy-gold'
                        }`}>
                          ${team.score}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
              
              {gameState.currentRoundIndex < rounds.length - 1 ? (
                <button
                  onClick={handleNextRound}
                  className="bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-4 px-8 rounded-lg text-xl md:text-2xl uppercase tracking-wide transition-colors shadow-lg border-2 border-jeopardy-gold"
                >
                  NEXT ROUND
                </button>
              ) : (
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
                  className="bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-4 px-8 rounded-lg text-xl md:text-2xl uppercase tracking-wide transition-colors shadow-lg border-2 border-jeopardy-gold"
                >
                  BACK TO GAMES
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Double Modal */}
      {showDailyDouble && dailyDoubleQuestion && gameState && (
        <div 
          className="fixed inset-0 z-50 spin-in"
          style={{
            background: 'linear-gradient(to bottom, #1e3a8a 0%, #7c3aed 30%, #d946ef 60%, #ea580c 100%)',
          }}
        >
          <div 
            className="w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden relative"
            onClick={() => !showWagerInput && setShowWagerInput(true)}
          >
            {/* Light rays */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
              <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12" />
              <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-transparent via-white to-transparent transform skew-x-12" />
            </div>

            {!showWagerInput ? (
              /* Daily Double Title */
              <div className="relative z-10 cursor-pointer">
                <h1 
                  className="text-6xl md:text-8xl lg:text-9xl xl:text-[12rem] font-black uppercase tracking-wider"
                  style={{
                    color: '#FFFFFF',
                    textShadow: `
                      0 0 20px rgba(255, 255, 255, 0.5),
                      0 0 40px rgba(255, 255, 255, 0.3),
                      2px 2px 0px rgba(0, 0, 0, 0.8),
                      4px 4px 0px rgba(0, 0, 0, 0.6),
                      6px 6px 0px rgba(0, 0, 0, 0.4),
                      8px 8px 0px rgba(0, 0, 0, 0.3),
                      10px 10px 20px rgba(0, 0, 0, 0.5),
                      -2px -2px 0px rgba(255, 255, 255, 0.2)
                    `,
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    letterSpacing: '0.1em',
                  }}
                >
                  <div className="mb-4">DAILY</div>
                  <div>DOUBLE</div>
                </h1>
              </div>
            ) : (
              /* Wager Input */
              <div className="relative z-10 flex flex-col items-center gap-8">
                <h2 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                  {gameState.teams[gameState.currentTeamIndex].name.toUpperCase()} WAGER
              </h2>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute left-0 text-white text-3xl md:text-4xl font-bold -translate-x-full pr-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>$</span>
                    <input
                      type="number"
                      value={wagerAmount}
                      onChange={(e) => setWagerAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleWagerSubmit();
                        }
                      }}
                      autoFocus
                      className="text-4xl md:text-5xl lg:text-6xl font-bold text-center w-48 md:w-64 lg:w-80 px-4 py-2 rounded-lg border-4 border-white/50 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:border-white focus:bg-white/20 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      placeholder="0"
                      min="0"
                      max={Math.max(gameState.teams[gameState.currentTeamIndex]?.score || 0, dailyDoubleQuestion.question.points)}
                    />
                  </div>
                  <p className="text-white/70 text-sm md:text-base" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                    Maximum: ${Math.max(gameState.teams[gameState.currentTeamIndex]?.score || 0, dailyDoubleQuestion.question.points)}
                  </p>
              <button
                    onClick={handleWagerSubmit}
                    className="mt-4 px-8 py-4 bg-white/30 hover:bg-white/40 text-white text-xl md:text-2xl font-bold uppercase tracking-wide rounded-lg transition-colors shadow-lg"
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}
              >
                    SUBMIT
              </button>
            </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Question Modal */}
      {selectedQuestion && gameState && (
        <div 
          key={`question-${selectedQuestion.question._id}-${selectedQuestion.catIndex}-${selectedQuestion.qIndex}`}
          className="fixed inset-0 bg-jeopardy-blue flex items-center justify-center z-50 zoom-in"
        >
          <div className="w-full h-full flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden relative">
            {!showAnswer ? (
              /* Question Display */
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 md:gap-6 relative">
                {/* Show buzz-in status prominently at the top */}
                <div className="absolute top-8 text-center w-full px-4">
                  {gameState.buzzedTeamId ? (
                    <div className="text-yellow-300 text-3xl md:text-4xl font-bold font-sans uppercase tracking-wide" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                      {gameState.teams.find(t => t.id === gameState.buzzedTeamId)?.name.toUpperCase()} BUZZED IN!
                    </div>
                  ) : isStealMode ? (
                    <div className="text-jeopardy-gold text-4xl md:text-5xl font-bold font-sans uppercase tracking-wide animate-pulse" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                      BUZZ IN TO STEAL!
                    </div>
                  ) : (
                    <div className="text-jeopardy-gold text-4xl md:text-5xl font-bold font-sans uppercase tracking-wide animate-pulse" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                      BUZZ IN!
                    </div>
                  )}
                </div>
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
      {dailyDoubleAudio}
    </div>
  );
}

export default function GamePlayPage({ params }: { params: Promise<{ id: string }> }) {
  // Game play page doesn't require authentication - clients can join without logging in
  return <GamePlayPageContent params={params} />;
}

