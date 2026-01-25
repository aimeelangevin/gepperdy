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
import { Theme } from '@/types/theme';
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
  const [finalCategory, setFinalCategory] = useState<Category & { questions: Question[] } | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [editingCell, setEditingCell] = useState<{ catIndex: number; qIndex: number } | null>(null);
  const [editingFinalQuestion, setEditingFinalQuestion] = useState(false);
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
        // Fetch game
        const response = await gameApi.getById(id);
        if (response.success && response.data) {
          setGame(response.data);

          // Fetch all rounds, categories, and questions in parallel
          if (response.data.roundIds && response.data.roundIds.length > 0) {
            // Fetch all rounds in parallel
            const roundPromises = response.data.roundIds.map((roundId) =>
              roundApi.getById(roundId.toString())
            );
            const roundResponses = await Promise.all(roundPromises);
            const rounds = roundResponses
              .filter((r) => r.success && r.data)
              .map((r) => r.data!);

            // Collect all category IDs from all rounds
            const allCategoryIds = rounds.flatMap((round) => round.categoryIds);

            // Fetch all categories in parallel
            const categoryPromises = allCategoryIds.map((categoryId) =>
              categoryApi.getById(categoryId.toString())
            );
            const categoryResponses = await Promise.all(categoryPromises);
            const categories = categoryResponses
              .filter((r) => r.success && r.data)
              .map((r) => r.data!);

            // Create a map of category ID to category for quick lookup
            const categoryMap = new Map(
              categories.map((cat) => [cat._id.toString(), cat])
            );

            // Collect all question IDs from all categories
            const allQuestionIds = categories.flatMap((category) => category.questionIds);

            // Fetch all questions in parallel
            const questionPromises = allQuestionIds.map((questionId) =>
              questionApi.getById(questionId.toString())
            );
            const questionResponses = await Promise.all(questionPromises);
            const questions = questionResponses
              .filter((r) => r.success && r.data)
              .map((r) => r.data!);

            // Create a map of question ID to question for quick lookup
            const questionMap = new Map(
              questions.map((q) => [q._id.toString(), q])
            );

            // Build the extended rounds structure
            const extendedRounds: ExtendedRound[] = rounds.map((round) => {
              const roundCategories = round.categoryIds
                .map((categoryId) => categoryMap.get(categoryId.toString()))
                .filter((cat): cat is Category => cat !== undefined)
                .map((category) => ({
                  ...category,
                  questions: category.questionIds
                    .map((questionId) => questionMap.get(questionId.toString()))
                    .filter((q): q is Question => q !== undefined),
                }));

              return {
                ...round,
                categories: roundCategories,
              };
            });

            setRounds(extendedRounds);
          }

          // Fetch Final Jeopardy category if it exists
          if (response.data.finalCategoryId) {
            const finalCatResponse = await categoryApi.getById(response.data.finalCategoryId.toString());
            if (finalCatResponse.success && finalCatResponse.data) {
              const finalCat = finalCatResponse.data;
              // Fetch the question for final jeopardy
              if (finalCat.questionIds && finalCat.questionIds.length > 0) {
                const finalQuestionResponse = await questionApi.getById(finalCat.questionIds[0].toString());
                if (finalQuestionResponse.success && finalQuestionResponse.data) {
                  setFinalCategory({
                    ...finalCat,
                    questions: [finalQuestionResponse.data],
                  });
                }
              }
            }
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

  // Helper function to get theme-specific cell colors
  const getCellColors = (catIndex: number, qIndex: number) => {
    if (game?.theme === Theme.Christmas) {
      // Alternating red and green pattern
      const isRed = (catIndex + qIndex) % 2 === 0;
      return {
        bg: isRed ? 'bg-red-600' : 'bg-green-600',
        hover: isRed ? 'hover:bg-red-700' : 'hover:bg-green-700',
        border: isRed ? 'border-red-800' : 'border-green-800',
        text: 'text-white',
      };
    }
    if (game?.theme === Theme.Fall) {
      // Alternating brown and orange pattern
      const isBrown = (catIndex + qIndex) % 2 === 0;
      return {
        bg: isBrown ? 'bg-amber-800' : 'bg-orange-500',
        hover: isBrown ? 'hover:bg-amber-900' : 'hover:bg-orange-600',
        border: isBrown ? 'border-amber-900' : 'border-orange-700',
        text: 'text-white',
      };
    }
    if (game?.theme === Theme.Birthday) {
      // Light blue squares
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
    // Classic theme (default)
    return {
      bg: 'bg-jeopardy-blue',
      hover: 'hover:bg-jeopardy-blue-light',
      border: 'border-jeopardy-royal',
      text: 'text-jeopardy-gold',
    };
  };

  // Helper function to get theme-specific header colors
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
    if (game?.theme === Theme.Football) {
      return {
        bg: 'bg-amber-900',
        hover: 'hover:bg-amber-950',
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

  const updateFinalCategoryName = (newName: string) => {
    if (!finalCategory) return;
    setFinalCategory({ ...finalCategory, name: newName });

    const categoryId = finalCategory._id.toString();
    const key = `final-category-${categoryId}`;

    if (saveTimeoutRef.current[key]) {
      clearTimeout(saveTimeoutRef.current[key]);
    }

    saveTimeoutRef.current[key] = setTimeout(async () => {
      setSaving(true);
      try {
        await categoryApi.update(categoryId, { name: newName });
      } catch (err) {
        console.error('Failed to save final category name:', err);
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

    const questionId = newRounds[currentRoundIndex].categories[catIndex].questions[qIndex]._id.toString();
    const key = `question-${questionId}`;

    if (saveTimeoutRef.current[key]) {
      clearTimeout(saveTimeoutRef.current[key]);
    }

    saveTimeoutRef.current[key] = setTimeout(async () => {
      setSaving(true);
      try {
        await questionApi.update(questionId, updates);
      } catch (err) {
        console.error('Failed to save question:', err);
      } finally {
        setSaving(false);
      }
    }, 500);
  };

  const updateFinalQuestion = (updates: Partial<Question>) => {
    if (!finalCategory || !finalCategory.questions[0]) return;
    const updatedQuestion = { ...finalCategory.questions[0], ...updates };
    setFinalCategory({ ...finalCategory, questions: [updatedQuestion] });

    const questionId = updatedQuestion._id.toString();
    const key = `final-question-${questionId}`;

    if (saveTimeoutRef.current[key]) {
      clearTimeout(saveTimeoutRef.current[key]);
    }

    saveTimeoutRef.current[key] = setTimeout(async () => {
      setSaving(true);
      try {
        await questionApi.update(questionId, updates);
      } catch (err) {
        console.error('Failed to save final question:', err);
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
            Back to all games
          </Link>
        </div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  const headerColors = getHeaderColors();

  return (
    <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark relative">
      {/* Header */}
      <div className={`${headerColors.bg} border-b-4 ${headerColors.border} py-6 relative z-20`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold ${headerColors.text} mb-1 tracking-wide font-jeopardy`} style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                {game.name}
              </h1>
            </div>
            <div className="flex gap-3 items-center">
              {saving && (
                <div className={`flex items-center gap-2 ${headerColors.text}`}>
                  <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${headerColors.border.replace('border-', 'border-')}`}></div>
                  <span className="text-sm font-semibold">Saving...</span>
                </div>
              )}
              {!saving && (
                <div className={`flex items-center gap-2 ${headerColors.text}`}>
                  <span className="text-sm font-semibold">✓ All changes saved</span>
                </div>
              )}
              <Link
                href="/games"
                className={`flex items-center bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 ${headerColors.border}`}
              >
                Back to all games
              </Link>
              <button
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;

                  const currentRound = rounds[currentRoundIndex];
                  if (!currentRound) return;

                  const html = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <title>${game?.name || 'Game'} - Answers</title>
                        <style>
                          @page {
                            size: letter landscape;
                            margin: 0.25in;
                          }
                          body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                          }
                          .print-header {
                            text-align: center;
                            margin-bottom: 15px;
                            border-bottom: 3px solid #000;
                            padding-bottom: 8px;
                          }
                          .print-header h1 {
                            margin: 0;
                            font-size: 28px;
                            font-weight: bold;
                            text-transform: uppercase;
                          }
                          .print-header h2 {
                            margin: 5px 0 0 0;
                            font-size: 20px;
                            font-weight: normal;
                          }
                          .answers-grid {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 12px;
                            height: calc(100vh - 120px);
                          }
                          .answers-grid th {
                            font-weight: bold;
                            padding: 12px 6px;
                            text-align: center;
                            border: 2px solid #000;
                            font-size: 14px;
                            text-transform: uppercase;
                          }
                          .answers-grid td {
                            border: 1px solid #000;
                            padding: 10px 6px;
                            text-align: center;
                            vertical-align: top;
                            height: 15%;
                          }
                          .points-header {
                            font-weight: bold;
                            padding: 12px 6px;
                            text-align: center;
                            border: 2px solid #000;
                            font-size: 14px;
                          }
                          .answer-cell {
                            font-size: 12px;
                            line-height: 1.3;
                            word-wrap: break-word;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="print-header">
                          <h1>${game?.name || 'Game'} - Answer Key</h1>
                        </div>
                        <table class="answers-grid">
                          <thead>
                            <tr>
                              <th class="points-header"></th>
                              ${currentRound.categories.map((cat: any) =>
                    `<th>${cat.name || 'Category'}</th>`
                  ).join('')}
                            </tr>
                          </thead>
                          <tbody>
                            ${[0, 1, 2, 3, 4].map((qIndex) => `
                              <tr>
                                <td class="points-header">$${currentRound.categories[0]?.questions[qIndex]?.points || (qIndex + 1) * (currentRoundIndex === 0 ? 200 : 400)}</td>
                                ${currentRound.categories.map((category: any) => {
                    const question = category.questions[qIndex];
                    const answer = question?.answer || '';
                    return `<td class="answer-cell">${answer}</td>`;
                  }).join('')}
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </body>
                    </html>
                  `;

                  printWindow.document.write(html);
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => {
                    printWindow.print();
                  }, 250);
                }}
                className={`bg-jeopardy-blue hover:bg-jeopardy-blue-light text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 ${headerColors.border}`}
              >
                Print Answers
              </button>
              <button
                onClick={handleLogout}
                className={`bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-lg uppercase tracking-wide text-sm border-2 ${headerColors.border} opacity-50 hover:opacity-100`}
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
          <div className="container mx-auto px-4 relative z-20">
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setCurrentRoundIndex(0)}
                className={`px-8 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${currentRoundIndex === 0
                  ? 'bg-jeopardy-blue text-jeopardy-gold border-2 border-jeopardy-gold'
                  : 'bg-slate-200 dark:bg-slate-700 border-2 border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
              >
                Single Jeopardy
              </button>
              <button
                onClick={() => setCurrentRoundIndex(1)}
                className={`px-8 py-3 rounded-lg font-bold uppercase tracking-wide transition-all ${currentRoundIndex === 1
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
      <div className="container mx-auto px-4 py-8 relative">

        <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 ${game?.theme === Theme.Christmas ? 'border-red-600' :
          game?.theme === Theme.Fall ? 'border-amber-800' :
            game?.theme === Theme.Birthday ? 'border-sky-500' :
              game?.theme === Theme.Football ? 'border-white' :
                'border-jeopardy-gold'
          } p-6 overflow-x-auto relative`}>

          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                {currentRound.categories.map((category, catIndex) => {
                  const headerColors = getHeaderColors();
                  return (
                    <th
                      key={category._id.toString()}
                      className={`${headerColors.bg} ${headerColors.text} p-4 border-4 ${headerColors.border} font-jeopardy cursor-pointer ${headerColors.hover} transition-colors w-[20%]`}
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
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4].map((qIndex) => (
                <tr key={qIndex}>
                  {currentRound.categories.map((category, catIndex) => {
                    const question = category.questions[qIndex];
                    const hasContent = question.text || question.answer;
                    const cellColors = getCellColors(catIndex, qIndex);

                    return (
                      <td
                        key={`${category._id}-${qIndex}`}
                        className={`${cellColors.bg} ${cellColors.hover} border-4 ${cellColors.border} p-8 cursor-pointer transition-colors text-center ${hasContent ? 'ring-2 ring-jeopardy-magenta ring-inset' : ''
                          }`}
                        onClick={() => openCellEditor(catIndex, qIndex)}
                      >
                        <div className={`${cellColors.text} text-4xl font-bold font-jeopardy`}>
                          ${question.points}
                        </div>
                        {hasContent && (
                          <div className={`mt-2 ${cellColors.text} text-xs`}>
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

      {/* Final Jeopardy Section */}
      {finalCategory && (
        <div className="container mx-auto px-4 py-8">
          <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 ${game?.theme === Theme.Christmas ? 'border-red-600' :
            game?.theme === Theme.Fall ? 'border-amber-800' :
              game?.theme === Theme.Birthday ? 'border-sky-500' :
                'border-jeopardy-gold'
            } p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-jeopardy-royal dark:text-jeopardy-gold uppercase tracking-wide">
                Final Jeopardy
              </h2>
              {finalCategory.questions[0] && (
                <button
                  onClick={() => setEditingFinalQuestion(true)}
                  className="bg-jeopardy-blue hover:bg-jeopardy-blue-light text-jeopardy-gold font-bold py-2 px-6 rounded-lg transition-colors uppercase tracking-wide border-2 border-jeopardy-gold"
                >
                  Edit Question
                </button>
              )}
            </div>

            {finalCategory.questions[0] && (
              <div className="mt-4">
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={finalCategory.name}
                    onChange={(e) => updateFinalCategoryName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    placeholder="Final Jeopardy Category"
                  />
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <p><strong>Question:</strong> {finalCategory.questions[0].text || '(Not set)'}</p>
                  <p className="mt-2"><strong>Answer:</strong> {finalCategory.questions[0].answer || '(Not set)'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
                  className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors uppercase tracking-wide"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Final Jeopardy Question Editor Modal */}
      {editingFinalQuestion && finalCategory && finalCategory.questions[0] && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setEditingFinalQuestion(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-jeopardy-royal p-6 border-b-4 border-jeopardy-gold relative">
              <h2 className="text-2xl font-bold text-jeopardy-gold font-jeopardy pr-8">
                Final Jeopardy - {finalCategory.name}
              </h2>
              <button
                onClick={() => setEditingFinalQuestion(false)}
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
                  value={finalCategory.questions[0].text || ''}
                  onChange={(e) => updateFinalQuestion({ text: e.target.value })}
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
                            updateFinalQuestion({ imageUrl });
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
                  {finalCategory.questions[0].imageUrl && (
                    <div className="mt-2 relative inline-block">
                      <img
                        src={finalCategory.questions[0].imageUrl}
                        alt="Question preview"
                        className="max-w-full h-auto rounded-lg border-2 border-jeopardy-gold/30"
                      />
                      <button
                        type="button"
                        onClick={() => updateFinalQuestion({ imageUrl: undefined })}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg leading-none shadow-lg transition-colors"
                        aria-label="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  )}
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
                            updateFinalQuestion({ audioUrl });
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
                  {finalCategory.questions[0].audioUrl && (
                    <div className="mt-2 relative">
                      <audio
                        controls
                        src={finalCategory.questions[0].audioUrl}
                        className="w-full"
                      />
                      <button
                        type="button"
                        onClick={() => updateFinalQuestion({ audioUrl: undefined })}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg leading-none shadow-lg transition-colors"
                        aria-label="Remove audio"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Answer */}
              <div>
                <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide font-jeopardy">
                  Answer
                </label>
                <input
                  type="text"
                  value={finalCategory.questions[0].answer || ''}
                  onChange={(e) => updateFinalQuestion({ answer: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-jeopardy-magenta dark:focus:border-jeopardy-gold focus:outline-none transition-colors text-lg"
                  placeholder="What is...?"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t-2 border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setEditingFinalQuestion(false)}
                  className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors uppercase tracking-wide"
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
// recommit
export default function GameEditPage({ params }: { params: Promise<{ id: string }> }) {
  return <GameEditPageContent params={params} />;
}
