"use client";

import React, { useState, useCallback } from 'react';
import Game from '@/components/Game';
import { getRandomTargetLevel, GET_LEVEL, TARGET_SCORES } from '@/game/constants';

export default function Home() {
  const [score, setScore] = useState(0);
  const [currentTargetLevel, setCurrentTargetLevel] = useState(getRandomTargetLevel());
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [maxLevel, setMaxLevel] = useState(0);
  const [gameKey, setGameKey] = useState(0); // Used to remount Game

  const handleTargetAchieved = useCallback((points: number) => {
    setScore(prev => prev + points);
    setCurrentTargetLevel(getRandomTargetLevel());
  }, []);

  const handleGameOver = useCallback((_score: number, achievedMax: number) => {
    setFinalScore(score); // need latest score, but JS closure might trap it, we can use an updater or ref in a real prod app, but score is bound in closure if we don't watch out. 
    // Wait, let's just pass achievedMax, and we'll read score from current state wrapper.
    setMaxLevel(achievedMax);
    setIsGameOver(true);
  }, [score]);

  const restartGame = () => {
    setScore(0);
    setCurrentTargetLevel(getRandomTargetLevel());
    setIsGameOver(false);
    setMaxLevel(0);
    setGameKey(prev => prev + 1);
  };

  const currentTargetProps = GET_LEVEL(currentTargetLevel);

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white flex flex-col items-center justify-center font-sans">
      {/* Header section */}
      <header className="w-[360px] flex justify-between items-center mb-4 px-2">
        <div className="flex flex-col">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Score</span>
          <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            {score}
          </span>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-1">Target</span>
          <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-full border border-gray-700 shadow-inner">
             <div 
                className="rounded-full shadow-md"
                style={{
                  width: 24, 
                  height: 24, 
                  backgroundColor: currentTargetProps.color,
                  boxShadow: `0 0 10px ${currentTargetProps.color}80, inset 0 2px 4px rgba(255,255,255,0.4)`
                }}
             />
             <span className="font-bold text-gray-200">Lv.{currentTargetLevel} <span className="text-xs font-normal text-gray-400">({TARGET_SCORES[currentTargetLevel]}pt)</span></span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="relative">
        <Game 
          key={gameKey}
          currentTargetLevel={currentTargetLevel} 
          onTargetAchieved={handleTargetAchieved}
          onGameOver={handleGameOver}
        />

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
             <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-orange-400 mb-2 drop-shadow-lg">
                GAME OVER
             </h2>
             <p className="text-gray-300 mb-6 text-sm">No valid space left for a new droplet</p>
             
             <div className="bg-gray-800/50 w-full rounded-2xl p-4 mb-8 border border-gray-700/50">
                <div className="flex justify-between items-center mb-2">
                   <span className="text-gray-400 uppercase text-xs font-bold tracking-widest">Final Score</span>
                   <span className="text-2xl font-bold text-white">{score}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-700/50 pt-2">
                   <span className="text-gray-400 uppercase text-xs font-bold tracking-widest">Best Level</span>
                   <span className="text-lg font-bold text-white">Lv. {maxLevel}</span>
                </div>
             </div>
             
             <button 
                onClick={restartGame}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
             >
               Play Again
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
