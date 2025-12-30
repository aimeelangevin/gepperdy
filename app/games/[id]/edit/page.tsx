'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Category } from '@/models/Category';
import { Question } from '@/models/Question';
import { Round } from '@/models/Round';
import { gameApi, roundApi, categoryApi, questionApi } from '@/lib/api';
import { Game } from '@/models/Game';
import type { GetUploadUrlResponse } from '@/types/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import { clearUserId } from '@/lib/auth';

type ExtendedRound = Round & { categories: (Category & { questions: Question[] })[] };

function GameEditPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<ExtendedRound[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [editingCell, setEditingCell] = useState<{ catIndex: number; qIndex: number } | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  const handleLogout = () => {
    clearUserId();
    router.push('/login');
  };

  // Helper function to upload file to S3
  const uploadFileToS3 = async (
    file: File,
    onSuccess: (url: string) => void,
    onError: (error: string) => void,
    setUploading: (loading: boolean) => void
  ) => {
    setUploading(true);
    try {
      // Get presigned URL
      const uploadUrlResponse = await questionApi.getUploadUrl({
        fileName: file.name,
        fileType: file.type,
      });

      if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
        throw new Error(uploadUrlResponse.error || 'Failed to get upload URL');
      }

      const { presignedUrl, objectUrl } = uploadUrlResponse.data;

      // Upload file to S3 using presigned URL
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        credentials: 'omit',
        mode: 'cors',
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      // Save the object URL to the question
      onSuccess(objectUrl);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchGameData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await gameApi.getById(id);
        if (response.success && response.data) {
          setGame(response.data);
          
          // Fetch all rounds, categories, and questions
          if (response.data.roundIds && response.data.roundIds.length > 0) {
            const extendedRounds: ExtendedRound[] = [];
            
            for (const roundId of response.data.roundIds) {
              // Fetch round
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
              
              extendedRounds.push({
                ...round,
                categories,
              });
            }
            
            setRounds(extendedRounds);
          }
        } else {
          setError(response.error || 'Failed to load game');
        }
      } catch (err) {
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGameData();
  }, [id]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(saveTimeoutRef.current).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const currentRound = rounds[currentRoundIndex];
  const isDoubleJeopardy = currentRoundIndex === 1;
  
  // If no rounds are loaded yet, show loading
  if (!currentRound) {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-jeopardy-royal mx-auto mb-4"></div>
          <p className="text-jeopardy-royal text-xl font-bold font-jeopardy">Loading game...</p>
        </div>
      </div>
    );
  }

  const updateCategoryName = (catIndex: number, newName: string) => {
    const newRounds = [...rounds];
    newRounds[currentRoundIndex].categories[catIndex].name = newName;
    setRounds(newRounds);
    
    // Autosave with debounce
    const categoryId = newRounds[currentRoundIndex].categories[catIndex]._id.toString();
    const key = `category-${categoryId}`;
    
    // Clear existing timeout for this category
    if (saveTimeoutRef.current[key]) {
      clearTimeout(saveTimeoutRef.current[key]);
    }
    
    // Set new timeout to save after 500ms of no typing
    saveTimeoutRef.current[key] = setTimeout(async () => {
      setSaving(true);
      try {
        await categoryApi.update(categoryId, { name: newName });
      } catch (err) {
        console.error('Failed to save category name:', err);
      } finally {
        setSaving(false);
      }
    }, 500);
  };

  const updateQuestion = (catIndex: number, qIndex: number, updates: Partial<Question>) => {
    const newRounds = [...rounds];
    newRounds[currentRoundIndex].categories[catIndex].questions[qIndex] = {
      ...newRounds[currentRoundIndex].categories[catIndex].questions[qIndex],
      ...updates,
    };
    setRounds(newRounds);
    
    // Autosave with debounce
    const questionId = newRounds[currentRoundIndex].categories[catIndex].questions[qIndex]._id.toString();
    const key = `question-${questionId}`;
    
    // Clear existing timeout for this question
    if (saveTimeoutRef.current[key]) {
      clearTimeout(saveTimeoutRef.current[key]);
    }
    
    // Set new timeout to save after 500ms of no typing
    saveTimeoutRef.current[key] = setTimeout(async () => {
      setSaving(true);
      try {
        const question = newRounds[currentRoundIndex].categories[catIndex].questions[qIndex];
        await questionApi.update(questionId, {
          text: question.text,
          answer: question.answer,
          imageUrl: question.imageUrl,
          audioUrl: question.audioUrl,
          isDailyDouble: question.isDailyDouble,
        });
      } catch (err) {
        console.error('Failed to save question:', err);
      } finally {
        setSaving(false);
      }
    }, 500);
  };

  const openCellEditor = (catIndex: number, qIndex: number) => {
    setEditingCell({ catIndex, qIndex });
  };

  const closeCellEditor = () => {
    setEditingCell(null);
  };


  // Loading state
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

  // Error state
  if (error || !game) {
    return (
      <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 font-jeopardy">
            Error Loading Game
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error || 'Game not found'}</p>
          <Link
            href="/games"
            className="inline-block bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold"
          >
            ← Back to Games
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark">
      {/* Header */}
      <div className="bg-jeopardy-royal border-b-4 border-jeopardy-gold py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-jeopardy-gold mb-1 tracking-wide font-jeopardy" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                {game.name}
              </h1>
            </div>
            <div className="flex gap-3 items-center">
              {saving && (
                <div className="flex items-center gap-2 text-jeopardy-gold">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-jeopardy-gold"></div>
                  <span className="text-sm font-semibold">Saving...</span>
                </div>
              )}
              {!saving && (
                <div className="flex items-center gap-2 text-jeopardy-gold">
                  <span className="text-sm font-semibold">✓ All changes saved</span>
                </div>
              )}
              <Link
                href="/games"
                className="flex items-center bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold"
              >
                Back to all games
              </Link>
              <button
                onClick={handleLogout}
                className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg uppercase tracking-wide text-sm border-2 border-jeopardy-gold/50 hover:border-jeopardy-gold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Round Selector */}
      {rounds.length > 1 && (
        <div className="bg-white dark:bg-slate-900 border-b-2 border-jeopardy-gold/30 py-4">
          <div className="container mx-auto px-4">
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setCurrentRoundIndex(0)}
                className={`px-8 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${
                  currentRoundIndex === 0
                    ? 'bg-jeopardy-blue text-jeopardy-gold border-2 border-jeopardy-gold'
                    : 'bg-slate-200 dark:bg-slate-700 border-2 border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                Single Jeopardy
              </button>
              <button
                onClick={() => setCurrentRoundIndex(1)}
                className={`px-8 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${
                  currentRoundIndex === 1
                    ? 'bg-jeopardy-blue text-jeopardy-gold border-2 border-jeopardy-gold'
                    : 'bg-slate-200 dark:bg-slate-700 border-2 border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                Double Jeopardy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Board */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-6 overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                {currentRound.categories.map((category, catIndex) => (
                  <th
                    key={category._id.toString()}
                    className="bg-jeopardy-blue text-jeopardy-gold p-4 border-4 border-jeopardy-royal font-jeopardy cursor-pointer hover:bg-jeopardy-blue-light transition-colors w-[20%]"
                    onClick={() => setEditingCategory(catIndex)}
                  >
                    {editingCategory === catIndex ? (
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => updateCategoryName(catIndex, e.target.value)}
                        onBlur={() => setEditingCategory(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingCategory(null);
                        }}
                        autoFocus
                        className="w-auto max-w-[180px] bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2 py-1 rounded outline-2 outline-jeopardy-gold outline-offset-0 text-center uppercase font-bold text-sm"
                      />
                    ) : (
                      <div className="text-center uppercase text-lg">
                        {category.name}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map((qIndex) => (
                <tr key={qIndex}>
                  {currentRound.categories.map((category, catIndex) => {
                    const question = category.questions[qIndex];
                    const hasContent = question.text || question.answer;
                    
                    return (
                      <td
                        key={`${category._id}-${qIndex}`}
                        className={`bg-jeopardy-blue hover:bg-jeopardy-blue-light border-4 border-jeopardy-royal p-8 cursor-pointer transition-colors text-center ${
                          hasContent ? 'ring-2 ring-jeopardy-magenta ring-inset' : ''
                        }`}
                        onClick={() => openCellEditor(catIndex, qIndex)}
                      >
                        <div className="text-jeopardy-gold text-4xl font-bold font-jeopardy">
                          ${question.points}
                        </div>
                        {hasContent && (
                          <div className="mt-2 text-white text-xs">
                            ✓ Added
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

        <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Click on category names to edit them. Click on any cell to add/edit questions.
        </div>
      </div>

      {/* Question Editor Modal */}
      {editingCell && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeCellEditor}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-jeopardy-royal p-6 border-b-4 border-jeopardy-gold relative">
              <h2 className="text-2xl font-bold text-jeopardy-gold font-jeopardy pr-8">
                {currentRound.categories[editingCell.catIndex].name} - $
                {currentRound.categories[editingCell.catIndex].questions[editingCell.qIndex].points}
              </h2>
              <button
                onClick={closeCellEditor}
                className="absolute top-5 right-8 text-jeopardy-gold hover:text-jeopardy-gold-light text-4xl font-bold transition-colors leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Question Text (Optional) */}
              <div>
                <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide font-jeopardy">
                  Question Text <span className="text-sm normal-case text-slate-500">(optional)</span>
                </label>
                <textarea
                  value={currentRound.categories[editingCell.catIndex].questions[editingCell.qIndex].text || ''}
                  onChange={(e) =>
                    updateQuestion(editingCell.catIndex, editingCell.qIndex, { text: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-jeopardy-magenta dark:focus:border-jeopardy-gold focus:outline-none transition-colors text-lg min-h-24"
                  placeholder="Enter the question text (optional)..."
                />
              </div>

              {/* Image Upload (Optional) */}
              <div>
                <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide font-jeopardy">
                  Image <span className="text-sm normal-case text-slate-500">(optional)</span>
                </label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadFileToS3(
                          file,
                          (imageUrl) => {
                            updateQuestion(editingCell.catIndex, editingCell.qIndex, { imageUrl });
                          },
                          (error) => {
                            alert(`Failed to upload image: ${error}`);
                          },
                          setUploadingImage
                        );
                      }
                    }}
                    className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-jeopardy-blue file:text-jeopardy-gold hover:file:bg-jeopardy-blue-light cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {uploadingImage && (
                    <div className="text-sm text-jeopardy-blue dark:text-jeopardy-gold">
                      Uploading image...
                    </div>
                  )}
                  {(() => {
                    const imageUrl = currentRound.categories[editingCell.catIndex].questions[editingCell.qIndex].imageUrl;
                    return imageUrl ? (
                      <div className="mt-2 relative inline-block">
                        <img
                          src={imageUrl}
                          alt="Question preview"
                          className="max-w-full h-auto rounded-lg border-2 border-jeopardy-gold/30"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestion(editingCell.catIndex, editingCell.qIndex, { imageUrl: undefined })
                          }
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg leading-none shadow-lg transition-colors"
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Audio Upload (Optional) */}
              <div>
                <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide font-jeopardy">
                  Audio <span className="text-sm normal-case text-slate-500">(optional)</span>
                </label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="audio/*"
                    disabled={uploadingAudio}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        uploadFileToS3(
                          file,
                          (audioUrl) => {
                            updateQuestion(editingCell.catIndex, editingCell.qIndex, { audioUrl });
                          },
                          (error) => {
                            alert(`Failed to upload audio: ${error}`);
                          },
                          setUploadingAudio
                        );
                      }
                    }}
                    className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-jeopardy-blue file:text-jeopardy-gold hover:file:bg-jeopardy-blue-light cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {uploadingAudio && (
                    <div className="text-sm text-jeopardy-blue dark:text-jeopardy-gold">
                      Uploading audio...
                    </div>
                  )}
                  {(() => {
                    const audioUrl = currentRound.categories[editingCell.catIndex].questions[editingCell.qIndex].audioUrl;
                    return audioUrl ? (
                      <div className="mt-2 relative">
                        <audio
                          controls
                          src={audioUrl}
                          className="w-full"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateQuestion(editingCell.catIndex, editingCell.qIndex, { audioUrl: undefined })
                          }
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg leading-none shadow-lg transition-colors"
                          aria-label="Remove audio"
                        >
                          ×
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Answer */}
              <div>
                <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide font-jeopardy">
                  Answer
                </label>
                <input
                  type="text"
                  value={currentRound.categories[editingCell.catIndex].questions[editingCell.qIndex].answer || ''}
                  onChange={(e) =>
                    updateQuestion(editingCell.catIndex, editingCell.qIndex, { answer: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-jeopardy-magenta dark:focus:border-jeopardy-gold focus:outline-none transition-colors text-lg"
                  placeholder="What is...?"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
                <button
                  onClick={closeCellEditor}
                  className="flex-1 bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function GameEditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ProtectedRoute>
      <GameEditPageContent params={params} />
    </ProtectedRoute>
  );
}

