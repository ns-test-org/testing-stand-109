'use client';

import { useEffect, useRef, useState } from 'react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREASE_PER_LEVEL = 15;
const POWER_PELLET_DURATION = 6000;
const GHOST_SCARED_POINTS = 200;

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GhostPersonality = 'chaser' | 'ambusher' | 'random' | 'patrol';

interface Ghost extends Position {
  personality: GhostPersonality;
  color: string;
  scared: boolean;
}

const GHOST_COLORS = ['#FF0000', '#FFB8FF', '#00FFFF', '#FFB852'];

export default function PacManGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);

  const pacManRef = useRef<Position>({ x: 10, y: 10 });
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const dotsRef = useRef<boolean[][]>([]);
  const powerPelletsRef = useRef<Position[]>([]);
  const ghostsRef = useRef<Ghost[]>([]);
  const mouthOpenRef = useRef(true);
  const powerModeRef = useRef(false);
  const powerModeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentSpeedRef = useRef(INITIAL_SPEED);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    // Initialize dots grid
    const dots: boolean[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      dots[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        dots[y][x] = true;
      }
    }
    dotsRef.current = dots;

    // Initialize power pellets at corners
    powerPelletsRef.current = [
      { x: 1, y: 1 },
      { x: GRID_SIZE - 2, y: 1 },
      { x: 1, y: GRID_SIZE - 2 },
      { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
    ];

    // Initialize ghosts with unique personalities
    ghostsRef.current = [
      { x: 5, y: 5, personality: 'chaser', color: GHOST_COLORS[0], scared: false },
      { x: 14, y: 5, personality: 'ambusher', color: GHOST_COLORS[1], scared: false },
      { x: 5, y: 14, personality: 'random', color: GHOST_COLORS[2], scared: false },
      { x: 14, y: 14, personality: 'patrol', color: GHOST_COLORS[3], scared: false },
    ];

    // Reset Pac-Man
    pacManRef.current = { x: 10, y: 10 };
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    setScore(0);
    setGameOver(false);
    setLevel(1);
    setLives(3);
    setCombo(0);
    powerModeRef.current = false;
    currentSpeedRef.current = INITIAL_SPEED;
    
    if (powerModeTimerRef.current) {
      clearTimeout(powerModeTimerRef.current);
      powerModeTimerRef.current = null;
    }
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
      comboTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = setInterval(() => {
      updateGame();
      drawGame(ctx);
    }, currentSpeedRef.current);

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted && !gameOver) {
        setGameStarted(true);
      }

      if (gameOver && e.key === ' ') {
        initializeGame();
        setGameStarted(true);
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          nextDirectionRef.current = 'UP';
          break;
        case 'ArrowDown':
        case 's':
          nextDirectionRef.current = 'DOWN';
          break;
        case 'ArrowLeft':
        case 'a':
          nextDirectionRef.current = 'LEFT';
          break;
        case 'ArrowRight':
        case 'd':
          nextDirectionRef.current = 'RIGHT';
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameStarted, gameOver]);

  const getDistance = (pos1: Position, pos2: Position): number => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  };

  const moveGhostTowards = (ghost: Ghost, target: Position): Position => {
    const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    let bestDir: Direction = directions[0];
    let bestDist = Infinity;

    for (const dir of directions) {
      const testPos = { ...ghost };
      switch (dir) {
        case 'UP':
          testPos.y = (testPos.y - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'DOWN':
          testPos.y = (testPos.y + 1) % GRID_SIZE;
          break;
        case 'LEFT':
          testPos.x = (testPos.x - 1 + GRID_SIZE) % GRID_SIZE;
          break;
        case 'RIGHT':
          testPos.x = (testPos.x + 1) % GRID_SIZE;
          break;
      }
      
      const dist = getDistance(testPos, target);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }

    const newPos = { ...ghost };
    switch (bestDir) {
      case 'UP':
        newPos.y = (newPos.y - 1 + GRID_SIZE) % GRID_SIZE;
        break;
      case 'DOWN':
        newPos.y = (newPos.y + 1) % GRID_SIZE;
        break;
      case 'LEFT':
        newPos.x = (newPos.x - 1 + GRID_SIZE) % GRID_SIZE;
        break;
      case 'RIGHT':
        newPos.x = (newPos.x + 1) % GRID_SIZE;
        break;
    }
    return newPos;
  };

  const updateGame = () => {
    // Update direction
    directionRef.current = nextDirectionRef.current;

    // Move Pac-Man
    const newPos = { ...pacManRef.current };
    switch (directionRef.current) {
      case 'UP':
        newPos.y = (newPos.y - 1 + GRID_SIZE) % GRID_SIZE;
        break;
      case 'DOWN':
        newPos.y = (newPos.y + 1) % GRID_SIZE;
        break;
      case 'LEFT':
        newPos.x = (newPos.x - 1 + GRID_SIZE) % GRID_SIZE;
        break;
      case 'RIGHT':
        newPos.x = (newPos.x + 1) % GRID_SIZE;
        break;
    }
    pacManRef.current = newPos;

    // Check dot collision
    if (dotsRef.current[newPos.y]?.[newPos.x]) {
      dotsRef.current[newPos.y][newPos.x] = false;
      setScore((prev) => prev + 10);
    }

    // Check power pellet collision
    const pelletIndex = powerPelletsRef.current.findIndex(
      (p) => p.x === newPos.x && p.y === newPos.y
    );
    if (pelletIndex !== -1) {
      powerPelletsRef.current.splice(pelletIndex, 1);
      powerModeRef.current = true;
      setScore((prev) => prev + 50);
      
      // Make all ghosts scared
      ghostsRef.current = ghostsRef.current.map((g) => ({ ...g, scared: true }));
      
      // Clear existing timer
      if (powerModeTimerRef.current) {
        clearTimeout(powerModeTimerRef.current);
      }
      
      // Set new timer
      powerModeTimerRef.current = setTimeout(() => {
        powerModeRef.current = false;
        ghostsRef.current = ghostsRef.current.map((g) => ({ ...g, scared: false }));
        setCombo(0);
      }, POWER_PELLET_DURATION);
    }

    // Move ghosts with AI
    ghostsRef.current = ghostsRef.current.map((ghost) => {
      let newGhost: Position;
      
      if (ghost.scared) {
        // Run away from Pac-Man
        const awayTarget = {
          x: ghost.x + (ghost.x - newPos.x),
          y: ghost.y + (ghost.y - newPos.y),
        };
        newGhost = moveGhostTowards(ghost, awayTarget);
      } else {
        switch (ghost.personality) {
          case 'chaser':
            // Directly chase Pac-Man
            newGhost = moveGhostTowards(ghost, newPos);
            break;
          
          case 'ambusher':
            // Try to get ahead of Pac-Man
            const aheadPos = { ...newPos };
            switch (directionRef.current) {
              case 'UP':
                aheadPos.y = (aheadPos.y - 4 + GRID_SIZE) % GRID_SIZE;
                break;
              case 'DOWN':
                aheadPos.y = (aheadPos.y + 4) % GRID_SIZE;
                break;
              case 'LEFT':
                aheadPos.x = (aheadPos.x - 4 + GRID_SIZE) % GRID_SIZE;
                break;
              case 'RIGHT':
                aheadPos.x = (aheadPos.x + 4) % GRID_SIZE;
                break;
            }
            newGhost = moveGhostTowards(ghost, aheadPos);
            break;
          
          case 'random':
            // Random movement with slight bias towards Pac-Man
            if (Math.random() < 0.3) {
              newGhost = moveGhostTowards(ghost, newPos);
            } else {
              const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
              const randomDir = directions[Math.floor(Math.random() * directions.length)];
              newGhost = { ...ghost };
              switch (randomDir) {
                case 'UP':
                  newGhost.y = (newGhost.y - 1 + GRID_SIZE) % GRID_SIZE;
                  break;
                case 'DOWN':
                  newGhost.y = (newGhost.y + 1) % GRID_SIZE;
                  break;
                case 'LEFT':
                  newGhost.x = (newGhost.x - 1 + GRID_SIZE) % GRID_SIZE;
                  break;
                case 'RIGHT':
                  newGhost.x = (newGhost.x + 1) % GRID_SIZE;
                  break;
              }
            }
            break;
          
          case 'patrol':
            // Patrol in a pattern
            const patrolTarget = {
              x: Math.floor(GRID_SIZE / 2) + Math.floor(Math.sin(Date.now() / 1000) * 5),
              y: Math.floor(GRID_SIZE / 2) + Math.floor(Math.cos(Date.now() / 1000) * 5),
            };
            newGhost = moveGhostTowards(ghost, patrolTarget);
            break;
          
          default:
            newGhost = { ...ghost };
        }
      }
      
      return { ...ghost, x: newGhost.x, y: newGhost.y };
    });

    // Check ghost collision
    for (let i = 0; i < ghostsRef.current.length; i++) {
      const ghost = ghostsRef.current[i];
      if (ghost.x === newPos.x && ghost.y === newPos.y) {
        if (powerModeRef.current && ghost.scared) {
          // Eat ghost - combo scoring
          const currentCombo = combo + 1;
          setCombo(currentCombo);
          const points = GHOST_SCARED_POINTS * currentCombo;
          setScore((prev) => prev + points);
          
          // Reset ghost to starting position
          ghostsRef.current[i] = {
            ...ghost,
            x: 10,
            y: 10,
            scared: false,
          };
          
          // Reset combo timer
          if (comboTimerRef.current) {
            clearTimeout(comboTimerRef.current);
          }
          comboTimerRef.current = setTimeout(() => {
            setCombo(0);
          }, 3000);
        } else if (!ghost.scared) {
          // Lose a life
          setLives((prev) => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
              setGameStarted(false);
            } else {
              // Reset position
              pacManRef.current = { x: 10, y: 10 };
              directionRef.current = 'RIGHT';
              nextDirectionRef.current = 'RIGHT';
            }
            return newLives;
          });
          return;
        }
      }
    }

    // Toggle mouth animation
    mouthOpenRef.current = !mouthOpenRef.current;

    // Check win condition
    const allDotsEaten = dotsRef.current.every((row) => row.every((dot) => !dot)) && 
                         powerPelletsRef.current.length === 0;
    if (allDotsEaten) {
      // Level up!
      setLevel((prev) => {
        const newLevel = prev + 1;
        currentSpeedRef.current = Math.max(50, INITIAL_SPEED - (newLevel - 1) * SPEED_INCREASE_PER_LEVEL);
        return newLevel;
      });
      
      // Reset level
      const dots: boolean[][] = [];
      for (let y = 0; y < GRID_SIZE; y++) {
        dots[y] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
          dots[y][x] = true;
        }
      }
      dotsRef.current = dots;
      
      powerPelletsRef.current = [
        { x: 1, y: 1 },
        { x: GRID_SIZE - 2, y: 1 },
        { x: 1, y: GRID_SIZE - 2 },
        { x: GRID_SIZE - 2, y: GRID_SIZE - 2 },
      ];
      
      pacManRef.current = { x: 10, y: 10 };
      directionRef.current = 'RIGHT';
      nextDirectionRef.current = 'RIGHT';
    }
  };

  const drawGame = (ctx: CanvasRenderingContext2D) => {
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

    // Draw dots
    ctx.fillStyle = '#FFB852';
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (dotsRef.current[y]?.[x]) {
          ctx.beginPath();
          ctx.arc(
            x * CELL_SIZE + CELL_SIZE / 2,
            y * CELL_SIZE + CELL_SIZE / 2,
            2,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    // Draw power pellets
    powerPelletsRef.current.forEach((pellet) => {
      ctx.fillStyle = powerModeRef.current ? '#00FF00' : '#FFFFFF';
      ctx.beginPath();
      ctx.arc(
        pellet.x * CELL_SIZE + CELL_SIZE / 2,
        pellet.y * CELL_SIZE + CELL_SIZE / 2,
        5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Draw Pac-Man
    const pacMan = pacManRef.current;
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    
    let startAngle = 0;
    let endAngle = Math.PI * 2;
    
    if (mouthOpenRef.current) {
      switch (directionRef.current) {
        case 'RIGHT':
          startAngle = 0.2 * Math.PI;
          endAngle = 1.8 * Math.PI;
          break;
        case 'LEFT':
          startAngle = 1.2 * Math.PI;
          endAngle = 0.8 * Math.PI;
          break;
        case 'UP':
          startAngle = 1.7 * Math.PI;
          endAngle = 1.3 * Math.PI;
          break;
        case 'DOWN':
          startAngle = 0.7 * Math.PI;
          endAngle = 0.3 * Math.PI;
          break;
      }
    }
    
    ctx.arc(
      pacMan.x * CELL_SIZE + CELL_SIZE / 2,
      pacMan.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      startAngle,
      endAngle
    );
    ctx.lineTo(
      pacMan.x * CELL_SIZE + CELL_SIZE / 2,
      pacMan.y * CELL_SIZE + CELL_SIZE / 2
    );
    ctx.fill();

    // Draw ghosts
    ghostsRef.current.forEach((ghost) => {
      ctx.fillStyle = ghost.scared ? '#0000FF' : ghost.color;
      
      // Ghost body
      ctx.beginPath();
      ctx.arc(
        ghost.x * CELL_SIZE + CELL_SIZE / 2,
        ghost.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        Math.PI,
        0
      );
      ctx.lineTo(
        ghost.x * CELL_SIZE + CELL_SIZE - 2,
        ghost.y * CELL_SIZE + CELL_SIZE - 2
      );
      ctx.lineTo(
        ghost.x * CELL_SIZE + CELL_SIZE - 5,
        ghost.y * CELL_SIZE + CELL_SIZE / 2 + 3
      );
      ctx.lineTo(
        ghost.x * CELL_SIZE + CELL_SIZE / 2,
        ghost.y * CELL_SIZE + CELL_SIZE - 2
      );
      ctx.lineTo(
        ghost.x * CELL_SIZE + 5,
        ghost.y * CELL_SIZE + CELL_SIZE / 2 + 3
      );
      ctx.lineTo(ghost.x * CELL_SIZE + 2, ghost.y * CELL_SIZE + CELL_SIZE - 2);
      ctx.closePath();
      ctx.fill();

      // Ghost eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(
        ghost.x * CELL_SIZE + CELL_SIZE / 2 - 4,
        ghost.y * CELL_SIZE + CELL_SIZE / 2 - 2,
        3,
        0,
        Math.PI * 2
      );
      ctx.arc(
        ghost.x * CELL_SIZE + CELL_SIZE / 2 + 4,
        ghost.y * CELL_SIZE + CELL_SIZE / 2 - 2,
        3,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = '#0000FF';
      ctx.beginPath();
      ctx.arc(
        ghost.x * CELL_SIZE + CELL_SIZE / 2 - 4,
        ghost.y * CELL_SIZE + CELL_SIZE / 2 - 2,
        1.5,
        0,
        Math.PI * 2
      );
      ctx.arc(
        ghost.x * CELL_SIZE + CELL_SIZE / 2 + 4,
        ghost.y * CELL_SIZE + CELL_SIZE / 2 - 2,
        1.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold text-yellow-400 mb-2">PAC-MAN v6</h1>
        <div className="flex gap-6 justify-center text-xl text-white mb-2">
          <div>Score: {score}</div>
          <div>Level: {level}</div>
          <div>Lives: {'❤️'.repeat(lives)}</div>
        </div>
        {combo > 0 && (
          <div className="text-2xl font-bold text-green-400 animate-pulse">
            {combo}x COMBO! +{GHOST_SCARED_POINTS * combo}
          </div>
        )}
        {powerModeRef.current && (
          <div className="text-lg text-blue-400 font-bold">
            ⚡ POWER MODE ⚡
          </div>
        )}
        {!gameStarted && !gameOver && (
          <div className="text-white text-lg mt-2">
            Press any arrow key to start
            <br />
            <span className="text-sm text-gray-400">Use arrow keys or WASD to move</span>
            <br />
            <span className="text-xs text-gray-500 mt-2 block">
              🔴 Chaser • 💗 Ambusher • 🔵 Random • 🟠 Patrol
            </span>
          </div>
        )}
        {gameOver && (
          <div className="text-white text-xl mt-2">
            Game Over!
            <br />
            <span className="text-sm">Press SPACE to restart</span>
          </div>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={GRID_SIZE * CELL_SIZE}
        height={GRID_SIZE * CELL_SIZE}
        className="border-4 border-blue-600 rounded-lg"
      />
      <div className="text-center mt-4 text-gray-400 text-sm max-w-md">
        <p>💊 Collect power pellets to turn ghosts blue and eat them!</p>
        <p>🎯 Chain ghost captures for combo multipliers!</p>
        <p>⚡ Speed increases each level - survive as long as you can!</p>
      </div>
    </div>
  );
}











