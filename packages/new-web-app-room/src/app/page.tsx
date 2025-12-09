'use client';

import { useEffect, useRef, useState } from 'react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const GHOST_COLORS = ['#FF0000', '#FFB8FF', '#00FFFF', '#FFB852'];

export default function PacManGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const pacManRef = useRef<Position>({ x: 10, y: 10 });
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const dotsRef = useRef<boolean[][]>([]);
  const ghostsRef = useRef<Position[]>([]);
  const mouthOpenRef = useRef(true);

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

    // Initialize ghosts
    ghostsRef.current = [
      { x: 5, y: 5 },
      { x: 14, y: 5 },
      { x: 5, y: 14 },
      { x: 14, y: 14 },
    ];

    // Reset Pac-Man
    pacManRef.current = { x: 10, y: 10 };
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    setScore(0);
    setGameOver(false);
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
    }, INITIAL_SPEED);

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

    // Move ghosts
    ghostsRef.current = ghostsRef.current.map((ghost) => {
      const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      
      const newGhost = { ...ghost };
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
      return newGhost;
    });

    // Check ghost collision
    for (const ghost of ghostsRef.current) {
      if (ghost.x === newPos.x && ghost.y === newPos.y) {
        setGameOver(true);
        setGameStarted(false);
        return;
      }
    }

    // Toggle mouth animation
    mouthOpenRef.current = !mouthOpenRef.current;

    // Check win condition
    const allDotsEaten = dotsRef.current.every((row) => row.every((dot) => !dot));
    if (allDotsEaten) {
      setGameOver(true);
      setGameStarted(false);
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
    ghostsRef.current.forEach((ghost, index) => {
      ctx.fillStyle = GHOST_COLORS[index];
      
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
        <h1 className="text-4xl font-bold text-yellow-400 mb-2">PAC-MAN</h1>
        <div className="text-2xl text-white mb-2">Score: {score}</div>
        {!gameStarted && !gameOver && (
          <div className="text-white text-lg">
            Press any arrow key to start
            <br />
            <span className="text-sm text-gray-400">Use arrow keys or WASD to move</span>
          </div>
        )}
        {gameOver && (
          <div className="text-white text-xl">
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
    </div>
  );
}

