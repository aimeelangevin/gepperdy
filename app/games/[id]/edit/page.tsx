'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { Category } from '@/models/Category';
import { Question } from '@/models/Question';
import { Round } from '@/models/Round';
import { gameApi } from '@/lib/api';

// Dummy initial data for a 5x5 grid
const createEmptyRound = (isDouble: boolean): Round & { categories: (Category & { questions: Question[] })[] } => {
  const pointMultiplier = isDouble ? 2 : 1;
  const categories: (Category & { questions: Question[] })[] = [];
  
  for (let catIndex = 0; catIndex < 5; catIndex++) {
    const questions: Question[] = [];
    for (let qIndex = 0; qIndex < 5; qIndex++) {
      questions.push({
        _id: `q-${catIndex}-${qIndex}`,
        text: '',
        answer: '',
        isDailyDouble: false,
        points: (qIndex + 1) * 100 * pointMultiplier,
      });
    }
    
    categories.push({
      _id: `cat-${catIndex}`,
      name: `Category ${catIndex + 1}`,
      questionIds: questions.map(q => q._id),
      questions,
    });
  }
  
  return {
    _id: 'round-1',
    categoryIds: categories.map(c => c._id),
    categories,
  };
};

type ExtendedRound = Round & { categories: (Category & { questions: Question[] })[] };

export default function GameEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [gameName, setGameName] = useState<string>('Loading...');
  const [rounds, setRounds] = useState<ExtendedRound[]>([
    createEmptyRound(false),
    createEmptyRound(true),
  ]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [editingCell, setEditingCell] = useState<{ catIndex: number; qIndex: number } | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);

  useEffect(() => {
    const fetchGame = async () => {
      const response = await gameApi.getById(id);
      if (response.success && response.data) {
        setGameName(response.data.name);
      }
    };
    fetchGame();
  }, [id]);

  const currentRound = rounds[currentRoundIndex];
  const isDoubleJeopardy = currentRoundIndex === 1;

  const updateCategoryName = (catIndex: number, newName: string) => {
    const newRounds = [...rounds];
    newRounds[currentRoundIndex].categories[catIndex].name = newName;
    setRounds(newRounds);
  };

  const updateQuestion = (catIndex: number, qIndex: number, updates: Partial<Question>) => {
    const newRounds = [...rounds];
    newRounds[currentRoundIndex].categories[catIndex].questions[qIndex] = {
      ...newRounds[currentRoundIndex].categories[catIndex].questions[qIndex],
      ...updates,
    };
    setRounds(newRounds);
  };

  const openCellEditor = (catIndex: number, qIndex: number) => {
    setEditingCell({ catIndex, qIndex });
  };

  const closeCellEditor = () => {
    setEditingCell(null);
  };

  return (
    <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark">
      {/* Header */}
      <div className="bg-jeopardy-royal border-b-4 border-jeopardy-gold py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-jeopardy-gold mb-1 tracking-wide font-jeopardy" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                {gameName}
              </h1>
            </div>
            <div className="flex gap-3">
              <Link
                href="/games"
                className="bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-2 px-6 rounded-lg transition-colors uppercase tracking-wide"
              >
                Cancel
              </Link>
              <button
                className="bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-2 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold"
              >
                Save Game
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Round Selector */}
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
                  : 'bg-slate-200 dark:bg-slate-700 border-2 border-slate-700text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              Double Jeopardy
            </button>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-6 overflow-x-auto">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr>
                {currentRound.categories.map((category, catIndex) => (
                  <th
                    key={category._id}
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
                        {question.isDailyDouble && (
                          <div className="mt-1 text-jeopardy-gold text-xs font-bold">
                            DAILY DOUBLE
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
              {/* Question */}
              <div>
                <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide font-jeopardy">
                  Question
                </label>
                <textarea
                  value={currentRound.categories[editingCell.catIndex].questions[editingCell.qIndex].text || ''}
                  onChange={(e) =>
                    updateQuestion(editingCell.catIndex, editingCell.qIndex, { text: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-jeopardy-magenta dark:focus:border-jeopardy-gold focus:outline-none transition-colors text-lg min-h-24"
                  placeholder="Enter the question..."
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-lg font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide font-jeopardy">
                  Answer
                </label>
                <input
                  type="text"
                  value={currentRound.categories[editingCell.catIndex].questions[editingCell.qIndex].answer}
                  onChange={(e) =>
                    updateQuestion(editingCell.catIndex, editingCell.qIndex, { answer: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-jeopardy-blue/20 dark:border-jeopardy-gold/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-jeopardy-magenta dark:focus:border-jeopardy-gold focus:outline-none transition-colors text-lg"
                  placeholder="What is...?"
                />
              </div>

              {/* Daily Double Checkbox */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentRound.categories[editingCell.catIndex].questions[editingCell.qIndex].isDailyDouble}
                    onChange={(e) =>
                      updateQuestion(editingCell.catIndex, editingCell.qIndex, { isDailyDouble: e.target.checked })
                    }
                    className="w-5 h-5 text-jeopardy-magenta border-slate-300 rounded focus:ring-jeopardy-gold"
                  />
                  <span className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide font-jeopardy">
                    Daily Double
                  </span>
                </label>
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

      {/* Back Link */}
      <div className="container mx-auto px-4 pb-8">
        <Link
          href="/games"
          className="text-jeopardy-blue hover:text-jeopardy-magenta font-bold uppercase tracking-wide inline-block"
        >
          ← Back to Games
        </Link>
      </div>
    </div>
  );
}

