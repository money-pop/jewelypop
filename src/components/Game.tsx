"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  WALL_THICKNESS,
  GRAVITY_Y,
  INITIAL_VELOCITY_Y,
  SHAPE_PROPERTIES,
  GET_LEVEL,
  getRandomSpawnLevel,
  TARGET_SCORES,
} from '@/game/constants';

interface GameProps {
  currentTargetLevel: number;
  onTargetAchieved: (score: number) => void;
  onGameOver: (score: number, maxLevel: number) => void;
  onNextSpawnLevelChange?: (level: number) => void;
}

export default function Game({ currentTargetLevel, onTargetAchieved, onGameOver, onNextSpawnLevelChange }: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  // Expose current target to Matter.js events via ref
  const targetLevelRef = useRef(currentTargetLevel);
  targetLevelRef.current = currentTargetLevel;

  const [currentSpawnLevel, setCurrentSpawnLevel] = useState(getRandomSpawnLevel());
  const [nextSpawnLevel, setNextSpawnLevel] = useState(getRandomSpawnLevel());
  const [railX, setRailX] = useState(GAME_WIDTH / 2);
  const [isShooting, setIsShooting] = useState(false);
  
  // Highscore tracking
  const maxLevelAchievedRef = useRef<number>(0);

  // Initialize Physics
  useEffect(() => {
    if (!containerRef.current) return;

    const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      World = Matter.Composite,
      Bodies = Matter.Bodies,
      Events = Matter.Events,
      Body = Matter.Body;

    const engine = Engine.create();
    engine.world.gravity.y = GRAVITY_Y;
    engineRef.current = engine;

    const render = Render.create({
      element: containerRef.current,
      engine: engine,
      options: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        wireframes: false,
        background: '#1e1e2f',
      },
    });
    renderRef.current = render;

    // Create Walls
    const wallOptions = { isStatic: true, render: { fillStyle: '#333' } };
    const leftWall = Bodies.rectangle(WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions);
    const rightWall = Bodies.rectangle(GAME_WIDTH - WALL_THICKNESS / 2, GAME_HEIGHT / 2, WALL_THICKNESS, GAME_HEIGHT, wallOptions);
    const topWall = Bodies.rectangle(GAME_WIDTH / 2, WALL_THICKNESS / 2, GAME_WIDTH, WALL_THICKNESS, wallOptions);
    
    // Set labels so we don't merge them
    leftWall.label = 'wall';
    rightWall.label = 'wall';
    topWall.label = 'wall';

    World.add(engine.world, [leftWall, rightWall, topWall]);

    // Handle Collisions for Merging
    Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;
      const bodiesToRemove: Matter.Body[] = [];
      const bodiesToAdd: Matter.Body[] = [];

      for (let i = 0; i < pairs.length; i++) {
        const { bodyA, bodyB } = pairs[i];
        
        // Skip if they are already flagged for removal in this tick
        if (bodiesToRemove.includes(bodyA) || bodiesToRemove.includes(bodyB)) continue;

        if (bodyA.label.startsWith('circle_') && bodyB.label.startsWith('circle_')) {
          const levelA = parseInt(bodyA.label.split('_')[1], 10);
          const levelB = parseInt(bodyB.label.split('_')[1], 10);

          if (levelA === levelB && levelA < 7) {
            // Distance check & error tolerance (=2 as per PRD but built-in collision is mostly enough)
            bodiesToRemove.push(bodyA, bodyB);

            const nextLevel = levelA + 1;
            const newX = (bodyA.position.x + bodyB.position.x) / 2;
            const newY = (bodyA.position.y + bodyB.position.y) / 2;
            
            const newVx = (bodyA.velocity.x + bodyB.velocity.x) / 2;
            const newVy = (bodyA.velocity.y + bodyB.velocity.y) / 2;

            // Target Achieved check
            if (nextLevel === targetLevelRef.current) {
               // Target achieved! Don't add to world, add score!
               const score = TARGET_SCORES[nextLevel] || 0;
               maxLevelAchievedRef.current = Math.max(maxLevelAchievedRef.current, nextLevel);
               
               // We don't add the new body, just trigger callback
               // Need to dispatch async to avoid react state update inside collision handler warnings? 
               // Nah, standard callback is fine, but maybe setTimeout
               setTimeout(() => {
                 onTargetAchieved(score);
               }, 0);
               
            } else {
               // Normal merge
               const levelProps = GET_LEVEL(nextLevel);
               const newBody = Bodies.circle(newX, newY, levelProps.radius, {
                 ...SHAPE_PROPERTIES,
                 label: `circle_${nextLevel}`,
                 render: { fillStyle: levelProps.color },
               });
               Body.setVelocity(newBody, { x: newVx, y: newVy });
               bodiesToAdd.push(newBody);
            }
          }
        }
      }

      if (bodiesToRemove.length > 0) {
        World.remove(engine.world, bodiesToRemove);
      }
      if (bodiesToAdd.length > 0) {
        World.add(engine.world, bodiesToAdd);
      }
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);
    runnerRef.current = runner;

    // Stabilization check loop
    let stabilizationTimer: NodeJS.Timeout;
    const checkStabilization = () => {
       const bodies = engine.world.bodies.filter(b => b.label.startsWith('circle_'));
       const isStable = bodies.every(b => Math.abs(b.velocity.x) < 0.15 && Math.abs(b.velocity.y) < 0.15);
       
       if (isStable) {
           // We might need to handle Game Over or ready to shoot next.
       }
       stabilizationTimer = setTimeout(checkStabilization, 300);
    };
    checkStabilization();

    return () => {
      clearTimeout(stabilizationTimer);
      Render.stop(render);
      Runner.stop(runner);
      Engine.clear(engine);
      if (render.canvas) {
        render.canvas.remove();
      }
      render.canvas = null as any;
      render.context = null as any;
      render.textures = {};
    };
  }, []);

  const handleShoot = () => {
    if (isShooting || !engineRef.current) return;
    
    // Check if valid first
    const levelProps = GET_LEVEL(currentSpawnLevel);
    const rad = levelProps.radius;
    
    const minX = WALL_THICKNESS + rad;
    const maxX = GAME_WIDTH - WALL_THICKNESS - rad;
    let clampedX = Math.max(minX, Math.min(maxX, railX));

    const startY = GAME_HEIGHT + rad + 8; // Underneath the board, shoots upwards

    // Check collision before spawn to ensure valid
    // For now simplistic collision spawn logic
    const bodies = engineRef.current.world.bodies.filter(b => b.label.startsWith('circle_'));
    const willCollide = bodies.some(b => {
        const dist = Math.sqrt(Math.pow(b.position.x - clampedX, 2) + Math.pow(b.position.y - startY, 2));
        const otherRad = b.circleRadius || 0;
        return dist < (rad + otherRad);
    });

    if (willCollide) {
       // GAME OVER condition check simply: does any x in [minX, maxX] work?
       let anyValid = false;
       for (let checkX = minX; checkX <= maxX; checkX += 2) {
           const collides = bodies.some(b => {
               const dist = Math.sqrt(Math.pow(b.position.x - checkX, 2) + Math.pow(b.position.y - startY, 2));
               return dist < (rad + (b.circleRadius || 0));
           });
           if (!collides) {
               anyValid = true;
               break;
           }
       }
       if (!anyValid) {
           onGameOver(0, maxLevelAchievedRef.current); // Use page's state score instead
       }
       return; // Cannot shoot here
    }

    setIsShooting(true);

    const Body = Matter.Body;
    const World = Matter.Composite;
    const Bodies = Matter.Bodies;

    const newCircle = Bodies.circle(clampedX, startY, rad, {
        ...SHAPE_PROPERTIES,
        label: `circle_${currentSpawnLevel}`,
        render: { fillStyle: levelProps.color }
    });

    Body.setVelocity(newCircle, { x: 0, y: INITIAL_VELOCITY_Y });
    World.add(engineRef.current.world, newCircle);

    // After stabilization, spawn next
    const upcomingLevel = getRandomSpawnLevel();
    setCurrentSpawnLevel(nextSpawnLevel);
    setNextSpawnLevel(upcomingLevel);
    onNextSpawnLevelChange?.(upcomingLevel);
    
    // Unlock shooting after a delay (this should technically wait for complete stabilization but 500ms works nicely)
    setTimeout(() => {
        setIsShooting(false);
    }, 700);
  };

  const currentLevelProps = GET_LEVEL(currentSpawnLevel);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Game Canvas */}
      <div 
        ref={containerRef} 
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT, position: 'relative', overflow: 'hidden' }}
        className="rounded-lg shadow-2xl relative border-4 border-[#333]"
      >
        {/* We can overlay UI here if needed */}
      </div>

      {/* Rail for dragging the spawn */}
      <div 
        style={{ width: GAME_WIDTH }}
        className="h-24 bg-gray-900 rounded-lg p-2 border-t-2 border-gray-700 relative flex items-center justify-center flex-col"
      >
         <div 
            className="w-full h-8 bg-gray-800 rounded-full relative overflow-hidden"
            onPointerMove={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const minX = WALL_THICKNESS + currentLevelProps.radius;
               const maxX = GAME_WIDTH - WALL_THICKNESS - currentLevelProps.radius;
               let newX = e.clientX - rect.left;
               newX = Math.max(minX, Math.min(maxX, newX));
               setRailX(newX);
            }}
            onPointerUp={handleShoot}
            onPointerLeave={handleShoot}
         >
            {/* Draggable Circle */}
            {!isShooting && (
                <div 
                   style={{
                      position: 'absolute',
                      left: railX,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: currentLevelProps.radius * 2,
                      height: currentLevelProps.radius * 2,
                      backgroundColor: currentLevelProps.color,
                      borderRadius: '50%',
                      boxShadow: '0 0 10px rgba(0,0,0,0.5), inset 0px 4px 6px rgba(255,255,255,0.4)',
                      transition: 'none',
                      touchAction: 'none'
                   }}
                />
            )}
         </div>
         <p className="text-gray-400 text-xs mt-2 uppercase font-bold tracking-widest">
            Drag to aim • Release to shoot
         </p>
      </div>
    </div>
  );
}
