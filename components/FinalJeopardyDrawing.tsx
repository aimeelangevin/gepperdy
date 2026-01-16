'use client';

import { useRef, useEffect, useState } from 'react';
import { questionApi } from '@/lib/api';
import type { GetUploadUrlResponse } from '@/types/api';

interface FinalJeopardyDrawingProps {
  question: string;
  teamId: string;
  gameStateId: string;
  onAnswerSubmitted: (imageUrl: string) => void;
}

export default function FinalJeopardyDrawing({
  question,
  teamId,
  gameStateId,
  onAnswerSubmitted,
}: FinalJeopardyDrawingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      setIsDrawing(true);
      const rect = canvas.getBoundingClientRect();
      const x = (e as MouseEvent).clientX 
        ? (e as MouseEvent).clientX - rect.left
        : (e as TouchEvent).touches[0].clientX - rect.left;
      const y = (e as MouseEvent).clientY
        ? (e as MouseEvent).clientY - rect.top
        : (e as TouchEvent).touches[0].clientY - rect.top;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = (e as MouseEvent).clientX
        ? (e as MouseEvent).clientX - rect.left
        : (e as TouchEvent).touches[0].clientX - rect.left;
      const y = (e as MouseEvent).clientY
        ? (e as MouseEvent).clientY - rect.top
        : (e as TouchEvent).touches[0].clientY - rect.top;
      
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      draw(e);
    });
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [isDrawing]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitAnswer = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setUploading(true);
    try {
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setUploading(false);
          return;
        }

        try {
          // Get presigned URL
          const uploadUrlResponse = await questionApi.getUploadUrl({
            fileName: `final-answer-${teamId}.png`,
            fileType: 'image/png',
          });

          if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
            throw new Error(uploadUrlResponse.error || 'Failed to get upload URL');
          }

          const { presignedUrl, objectUrl } = uploadUrlResponse.data;

          // Upload to S3
          const uploadResponse = await fetch(presignedUrl, {
            method: 'PUT',
            body: blob,
            credentials: 'omit',
            mode: 'cors',
            headers: {
              'Content-Type': 'image/png',
            },
          });

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload image to S3');
          }

          // Call the callback with the image URL
          onAnswerSubmitted(objectUrl);
        } catch (error) {
          console.error('Failed to upload answer:', error);
          alert('Failed to upload answer. Please try again.');
          setUploading(false);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to create image:', error);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-jeopardy-royal/10 dark:bg-jeopardy-blue-dark flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-4 border-jeopardy-gold p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-jeopardy-gold mb-4 tracking-wide font-sans uppercase text-center">
            Final Jeopardy
          </h1>
          
          <div className="mb-6 p-4 bg-jeopardy-blue/10 dark:bg-jeopardy-blue/20 rounded-lg border-2 border-jeopardy-gold/30">
            <p className="text-lg md:text-xl text-slate-900 dark:text-white font-semibold text-center">
              {question}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase">
              Write your answer below:
            </label>
            <div className="border-4 border-jeopardy-gold rounded-lg bg-white relative" style={{ aspectRatio: '16/9' }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full cursor-crosshair touch-none"
                style={{ display: 'block' }}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={clearCanvas}
              disabled={uploading}
              className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
            <button
              onClick={submitAnswer}
              disabled={uploading}
              className="flex-1 bg-jeopardy-magenta hover:bg-jeopardy-magenta-dark text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg uppercase tracking-wide border-2 border-jeopardy-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Submit Answer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

