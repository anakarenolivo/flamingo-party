"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Flamingo } from './Flamingo';
import { Obstacle, generateObstacle, OBSTACLE_INTERVAL } from './Obstacle';
import { initAudio, playSound, stopSound, toggleMute, getIsMuted } from '../utils/audioManager';

// Base Canvas dimensions for internal game logic and drawing resolution
const BASE_CANVAS_WIDTH = 960;
const BASE_CANVAS_HEIGHT = 540;

const FLAMINGO_X = BASE_CANVAS_WIDTH / 4;
const GROUND_Y_OFFSET = 80;

// Tropical Theme Colors (from tailwind.config.ts)
const THEME_COLORS = {
  sky: '#87CEEB',
  sun: '#FFD54D',
  water: '#4DB6AC',
  sand: '#FFEEAD',
  textDark: '#4A3B31',
  textLight: '#FFFFFF',
  accentCoral: '#FF6F69',
  accentYellow: '#FFCC5C',
  accentGreen: '#88D8B0',
  flamingoPink: '#F96574',
  leafGreen: '#72B043',
  trunkBrown: '#A98467',
};

enum GameState {
  Start,
  Playing,
  Paused,
  GameOver,
}

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [score, setScore] = useState(0);
  const [flamingo, setFlamingo] = useState<Flamingo | null>(null);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const lastObstacleXRef = useRef<number>(BASE_CANVAS_WIDTH);
  const animationFrameIdRef = useRef<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMutedState, setIsMutedState] = useState(false);

  const obstaclePoolRef = useRef<Obstacle[]>([]);
  const groundY = BASE_CANVAS_HEIGHT - GROUND_Y_OFFSET;

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      initAudio().then(() => {
        console.log("Audio manager initialized from GameCanvas");
        setIsMutedState(getIsMuted());
      });
    }

    // Initialize offscreen background canvas
    if (typeof window !== 'undefined') {
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = BASE_CANVAS_WIDTH;
      offscreenCanvas.height = BASE_CANVAS_HEIGHT;
      backgroundCanvasRef.current = offscreenCanvas;
      const ctx = offscreenCanvas.getContext('2d');
      if (ctx) {
        // Draw static background elements to offscreen canvas
        const skyGradient = ctx.createLinearGradient(0, 0, 0, BASE_CANVAS_HEIGHT * 0.75);
        skyGradient.addColorStop(0, THEME_COLORS.sky);
        skyGradient.addColorStop(1, '#FFDAB9');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, BASE_CANVAS_WIDTH, groundY);

        ctx.fillStyle = THEME_COLORS.sun;
        ctx.beginPath();
        ctx.arc(BASE_CANVAS_WIDTH * 0.8, BASE_CANVAS_HEIGHT * 0.15, 40, 0, Math.PI * 2);
        ctx.fill();

        const drawPalmSilhouette = (x: number, h: number, scale: number) => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.fillRect(x - 2 * scale, BASE_CANVAS_HEIGHT - GROUND_Y_OFFSET - h * scale, 4 * scale, h * scale);
          ctx.beginPath();
          ctx.arc(x, BASE_CANVAS_HEIGHT - GROUND_Y_OFFSET - h * scale, 15 * scale, Math.PI, Math.PI * 2, false);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x - 10 * scale, BASE_CANVAS_HEIGHT - GROUND_Y_OFFSET - h * scale + 5 * scale, 12 * scale, Math.PI * 1.2, Math.PI * 0.2, true);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + 10 * scale, BASE_CANVAS_HEIGHT - GROUND_Y_OFFSET - h * scale + 5 * scale, 12 * scale, Math.PI * 0.8, Math.PI * -0.2, false);
          ctx.fill();
        };
        drawPalmSilhouette(BASE_CANVAS_WIDTH * 0.2, 60, 0.8);
        drawPalmSilhouette(BASE_CANVAS_WIDTH * 0.5, 80, 0.7);
        drawPalmSilhouette(BASE_CANVAS_WIDTH * 0.9, 70, 0.75);

        ctx.fillStyle = THEME_COLORS.sand;
        ctx.fillRect(0, groundY, BASE_CANVAS_WIDTH, GROUND_Y_OFFSET);

        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        for (let i = 0; i < 200; i++) {
          ctx.beginPath();
          ctx.arc(Math.random() * BASE_CANVAS_WIDTH, groundY + Math.random() * GROUND_Y_OFFSET, Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Handle window resize for CSS scaling of the canvas
    const handleResize = () => {
      if (!canvasRef.current) return;
      const canvasElement = canvasRef.current;
      const parentElement = canvasElement.parentElement;
      if (!parentElement) return; // Ensure parent exists

      const aspectRatio = BASE_CANVAS_WIDTH / BASE_CANVAS_HEIGHT;
      const availableWidth = parentElement.clientWidth;
      const availableHeight = parentElement.clientHeight;

      let newDisplayWidth;
      let newDisplayHeight;

      if (availableWidth / availableHeight > aspectRatio) {
        // Parent is wider than game aspect ratio, so height is the constraint
        newDisplayHeight = availableHeight;
        newDisplayWidth = availableHeight * aspectRatio;
      } else {
        // Parent is taller or same aspect ratio, so width is the constraint
        newDisplayWidth = availableWidth;
        newDisplayHeight = availableWidth / aspectRatio;
      }
      canvasElement.style.width = `${newDisplayWidth}px`;
      canvasElement.style.height = `${newDisplayHeight}px`;
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call to set size based on parent

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isClient, groundY]); // groundY is effectively constant after init but included for completeness

  // Initialize or reset game elements
  const initializeGame = useCallback(() => {
    console.log("Initializing game...");
    const newFlamingo = new Flamingo(FLAMINGO_X, BASE_CANVAS_HEIGHT / 2, groundY);
    setFlamingo(newFlamingo);
    obstaclePoolRef.current.forEach(obs => obs.deactivate());
    setObstacles([]);
    lastObstacleXRef.current = BASE_CANVAS_WIDTH + OBSTACLE_INTERVAL / 2;
    setScore(0);
    stopSound('backgroundMusic'); // Stop music on new game/restart
  }, [groundY]);

  // Game state and music management
  useEffect(() => {
    if (gameState === GameState.Start) {
      initializeGame();
    }
    // Manage background music
    if (gameState === GameState.Playing && !isMutedState) {
      playSound('backgroundMusic');
    } else if (gameState === GameState.Paused || gameState === GameState.GameOver) {
      stopSound('backgroundMusic');
    }
  }, [gameState, initializeGame, isMutedState]);

  // Collision detection utility
  const checkCollision = useCallback((
    item1: { x: number; y: number; width: number; height: number },
    item2: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return (
      item1.x < item2.x + item2.width &&
      item1.x + item1.width > item2.x &&
      item1.y < item2.y + item2.height &&
      item1.y + item1.height > item2.y
    );
  }, []);

  // Main game loop
  useEffect(() => {
    if (gameState !== GameState.Playing || !flamingo) {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return; // Don't run loop if not playing or no flamingo
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    let gameLoopAbort = false;

    const loop = () => {
      if (gameLoopAbort || !flamingo || gameState !== GameState.Playing) {
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
        return;
      }

      flamingo.update();

      // Obstacle Management
      let currentActiveObstacles = [...obstacles]; // Work with a copy

      // Check if it's time to generate a new obstacle
      // Condition: Either no obstacles exist, or the rightmost obstacle is far enough to the left
      let shouldGenerateNewObstacle = currentActiveObstacles.length === 0;
      if (!shouldGenerateNewObstacle) {
        const rightmostObstacleX = Math.max(...currentActiveObstacles.map(obs => obs.x));
        if (rightmostObstacleX < BASE_CANVAS_WIDTH - OBSTACLE_INTERVAL) {
          shouldGenerateNewObstacle = true;
        }
      }

      if (shouldGenerateNewObstacle) {
        const newObstacle = generateObstacle(BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT, obstaclePoolRef.current);
        // The generateObstacle function handles activation and potentially adding to the pool if it's truly new
        // We just need to ensure it's in our active list for this frame if it was successfully activated/retrieved
        if (newObstacle.isActive && !currentActiveObstacles.find(obs => obs === newObstacle)) {
            currentActiveObstacles.push(newObstacle);
        }
        // lastObstacleXRef.current = newObstacle.x; // This ref might not be strictly necessary anymore with the new logic
      }

      const nextActiveObstacles: Obstacle[] = [];
      for (const obstacle of currentActiveObstacles) {
        if (!obstacle.isActive) continue;
        obstacle.update();
        // Scoring
        if (!obstacle.passed && flamingo.x > obstacle.x + obstacle.width) {
          obstacle.passed = true;
          setScore(prevScore => prevScore + 1);
          playSound('score');
        }
        // Off-screen check
        if (obstacle.isOffScreen()) {
          obstacle.deactivate();
        } else {
          nextActiveObstacles.push(obstacle);
        }
      }
      setObstacles(nextActiveObstacles);

      // Collision Detection
      if (flamingo.y + flamingo.height > groundY || flamingo.y < 0) { // Ground or Sky collision
        setGameState(GameState.GameOver);
        playSound('gameOver');
        gameLoopAbort = true;
      }
      if (!gameLoopAbort) { // Obstacle collision
        for (const obstacle of obstacles) {
          if (!obstacle.isActive) continue;
          const flamingoBounds = flamingo.getBounds();
          const topObstacleBounds = obstacle.getBoundsTop();
          const bottomObstacleBounds = obstacle.getBoundsBottom();
          if (checkCollision(flamingoBounds, topObstacleBounds) || checkCollision(flamingoBounds, bottomObstacleBounds)) {
            setGameState(GameState.GameOver);
            playSound('gameOver');
            gameLoopAbort = true;
            break;
          }
        }
      }

      // Continue loop if not aborted
      if (!gameLoopAbort) {
        animationFrameIdRef.current = requestAnimationFrame(loop);
      } else {
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
        // Final draw for game over is handled by the drawing useEffect
      }
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => { // Cleanup function for the game loop
      gameLoopAbort = true;
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [gameState, flamingo, obstacles, score, groundY, checkCollision, initializeGame]); // Dependencies for the game loop

  // Drawing Effect (runs when game state, score, or other visual elements change)
  useEffect(() => {
    if (!canvasRef.current || !isClient) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas drawing buffer size (fixed at base dimensions)
    canvas.width = BASE_CANVAS_WIDTH;
    canvas.height = BASE_CANVAS_HEIGHT;

    // Clear main canvas
    ctx.clearRect(0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);

    // Draw pre-rendered background
    if (backgroundCanvasRef.current) {
      ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    } else {
      // Fallback dynamic background draw (should ideally not be hit if offscreen canvas works)
        const skyGradient = ctx.createLinearGradient(0, 0, 0, BASE_CANVAS_HEIGHT * 0.75);
        skyGradient.addColorStop(0, THEME_COLORS.sky);
        skyGradient.addColorStop(1, '#FFDAB9');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, BASE_CANVAS_WIDTH, groundY);
        
        ctx.fillStyle = THEME_COLORS.sun;
        ctx.beginPath();
        ctx.arc(BASE_CANVAS_WIDTH * 0.8, BASE_CANVAS_HEIGHT * 0.15, 40, 0, Math.PI * 2);
        ctx.fill();

        const drawPalmSilhouette = (x: number, h: number, scale: number) => {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.fillRect(x - 2 * scale, BASE_CANVAS_HEIGHT - GROUND_Y_OFFSET - h * scale, 4 * scale, h * scale);
          ctx.beginPath();
          ctx.arc(x, BASE_CANVAS_HEIGHT - GROUND_Y_OFFSET - h * scale, 15 * scale, Math.PI, Math.PI * 2, false);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x - 10 * scale, BASE_CANVAS_HEIGHT - GROUND_Y_OFFSET - h * scale + 5 * scale, 12 * scale, Math.PI * 1.2, Math.PI * 0.2, true);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + 10 * scale, BASE_CANVAS_HEIGHT - GROUND_Y_OFFSET - h * scale + 5 * scale, 12 * scale, Math.PI * 0.8, Math.PI * -0.2, false);
          ctx.fill();
        };
        drawPalmSilhouette(BASE_CANVAS_WIDTH * 0.2, 60, 0.8);
        drawPalmSilhouette(BASE_CANVAS_WIDTH * 0.5, 80, 0.7);
        drawPalmSilhouette(BASE_CANVAS_WIDTH * 0.9, 70, 0.75);

        ctx.fillStyle = THEME_COLORS.sand;
        ctx.fillRect(0, groundY, BASE_CANVAS_WIDTH, GROUND_Y_OFFSET);

        ctx.fillStyle = 'rgba(0,0,0,0.03)';
        for (let i = 0; i < 200; i++) {
          ctx.beginPath();
          ctx.arc(Math.random() * BASE_CANVAS_WIDTH, groundY + Math.random() * GROUND_Y_OFFSET, Math.random() * 2, 0, Math.PI * 2);
          ctx.fill();
        }
    }

    // Draw game elements (flamingo, obstacles)
    if (gameState === GameState.Playing || gameState === GameState.Paused) {
      if (flamingo) flamingo.draw(ctx, false); // Draw flamingo normally
      obstacles.forEach(obstacle => { if (obstacle.isActive) obstacle.draw(ctx); });
    } else if (gameState === GameState.GameOver && flamingo) { // Ensure flamingo is drawn in its "game over" state
      flamingo.draw(ctx, true); // Pass gameOver flag
      obstacles.forEach(obstacle => { if (obstacle.isActive) obstacle.draw(ctx); }); // Also draw active obstacles
    } else if (gameState === GameState.Start && flamingo) { // Draw flamingo on start screen
      flamingo.draw(ctx, false);
    }

    // UI Text Styling and Drawing
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const setTropicalTextStyle = (size: number = 30, color: string = THEME_COLORS.textDark, usePacifico: boolean = true) => {
      ctx.font = `bold ${size}px ${usePacifico ? "\'Pacifico\', " : ""}\'var(--font-geist-sans)\'`; // Use template literal for font family
      ctx.fillStyle = color;
      ctx.strokeStyle = THEME_COLORS.textLight; // White outline for better contrast
      ctx.lineWidth = size > 30 ? 4 : 3; // Thicker outline for larger text
    };

    if (gameState === GameState.Start) {
      setTropicalTextStyle(60);
      ctx.strokeText('Flamingo Dash', BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2 - 100);
      ctx.fillText('Flamingo Dash', BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2 - 100);
      setTropicalTextStyle(30, THEME_COLORS.textDark, false); // Use sans-serif for instructions
      ctx.strokeText('Click, Space, or Tap to Flap!', BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2 - 30); // Updated instruction
      ctx.fillText('Click, Space, or Tap to Flap!', BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2 - 30);
    } else if (gameState === GameState.Playing || gameState === GameState.Paused) {
      setTropicalTextStyle(48, THEME_COLORS.textDark, false); // Score in a clear, bold font
      ctx.textAlign = 'left';
      const scoreText = `Score: ${score}`;
      // Measure text for background
      const textMetrics = ctx.measureText(scoreText);
      const textWidth = textMetrics.width;
      const textHeight = 48; // approx height based on font size
      const padding = 10;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Semi-transparent white background for score
      ctx.fillRect(10, 15, textWidth + padding * 2, textHeight + padding / 2);

      ctx.strokeText(scoreText, 20, 40);
      ctx.fillText(scoreText, 20, 40);
      ctx.textAlign = 'center'; // Reset alignment

      if (gameState === GameState.Paused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Dark overlay for pause
        ctx.fillRect(0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
        setTropicalTextStyle(70, THEME_COLORS.textLight);
        ctx.strokeText('Paused', BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2);
        ctx.fillText('Paused', BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2);
      }
    } else if (gameState === GameState.GameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; // Darker overlay for game over
      ctx.fillRect(0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
      setTropicalTextStyle(70, THEME_COLORS.accentCoral); // Use accent color for Game Over
      ctx.strokeText('Game Over!', BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2 - 90);
      ctx.fillText('Game Over!', BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2 - 90);
      setTropicalTextStyle(42, THEME_COLORS.textLight);
      ctx.strokeText(`Final Score: ${score}`, BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2 - 20);
      ctx.fillText(`Final Score: ${score}`, BASE_CANVAS_WIDTH / 2, BASE_CANVAS_HEIGHT / 2 - 20);
    }
  }, [gameState, score, isClient, flamingo, obstacles, groundY]); // Dependencies for drawing UI

  // UI Button Click Handlers
  const handleStartClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent event bubbling
    if (gameState === GameState.Start || gameState === GameState.GameOver) { // Allow restart from game over
      initializeGame();
      setGameState(GameState.Playing);
    }
  };

  const handlePauseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (gameState === GameState.Playing) setGameState(GameState.Paused);
  };

  const handleResumeClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (gameState === GameState.Paused) setGameState(GameState.Playing);
  };

  // Unified handler for game interaction (flap or start)
  const handleCanvasGameInteraction = useCallback(() => {
    if (gameState === GameState.Playing && flamingo) {
      flamingo.flap();
      playSound('flap');
    } else if (gameState === GameState.Start) { // Start game on first interaction
      initializeGame(); 
      setGameState(GameState.Playing);
      playSound('flap'); 
    }
  }, [gameState, flamingo, initializeGame]);

  // Input Handling (Keyboard, Click, Touch)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault(); // Prevent page scroll
        handleCanvasGameInteraction();
      } else if ((event.key === 'p' || event.key === 'P') && isClient) { // Pause toggle
        if (gameState === GameState.Playing) setGameState(GameState.Paused);
        else if (gameState === GameState.Paused) setGameState(GameState.Playing);
      }
    };

    const canvasElement = canvasRef.current;
    // Define a stable event handler for canvas click/touch interactions
    const stableCanvasInteractionHandler = (event: Event) => {
        if (event.type === 'touchstart') {
            event.preventDefault(); // Important for touch to prevent scrolling/zooming
        }
        handleCanvasGameInteraction();
    };

    document.addEventListener('keydown', handleKeyDown);
    if (isClient && canvasElement) {
      canvasElement.addEventListener('click', stableCanvasInteractionHandler);
      // passive: false allows preventDefault inside the handler for touchstart
      canvasElement.addEventListener('touchstart', stableCanvasInteractionHandler, { passive: false });
    }

    return () => { // Cleanup listeners
      document.removeEventListener('keydown', handleKeyDown);
      if (isClient && canvasElement) {
        canvasElement.removeEventListener('click', stableCanvasInteractionHandler);
        canvasElement.removeEventListener('touchstart', stableCanvasInteractionHandler);
      }
    };
  }, [gameState, handleCanvasGameInteraction, isClient]); // Dependencies for input handling

  // Button Styles
  const buttonBaseStyle = "px-8 py-4 rounded-xl shadow-xl font-bold text-lg transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-70";
  const primaryButtonStyle = `${buttonBaseStyle} bg-accentCoral hover:bg-opacity-80 active:bg-opacity-90 focus:ring-accentCoral text-textLight font-pacifico`;
  const secondaryButtonStyle = `${buttonBaseStyle} bg-accentYellow hover:bg-opacity-80 active:bg-opacity-90 focus:ring-accentYellow text-textDark font-pacifico`;
  // const tertiaryButtonStyle = `${buttonBaseStyle} bg-accentGreen hover:bg-opacity-80 active:bg-opacity-90 focus:ring-accentGreen text-textLight font-pacifico`; // Not currently used

  // Mute Toggle Handler
  const handleMuteToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const newMuteState = toggleMute();
    setIsMutedState(newMuteState);
    // If unmuting and in playing state, (re)start background music
    if (!newMuteState && gameState === GameState.Playing) {
      playSound('backgroundMusic');
    }
  };

  // Render UI Buttons
  const renderButtons = () => {
    if (!isClient) return null; // Don't render buttons on server or before client hydration

    const commonButtonContainerStyle = "absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center space-y-4 z-10"; // Ensure buttons are above canvas visuals if any overlap

    if (gameState === GameState.Start) {
      return (
        <div className={`${commonButtonContainerStyle}`} style={{ top: '70%' }}>
          <button onClick={handleStartClick} className={`${primaryButtonStyle} text-3xl animate-pulse`}>Start Game</button>
        </div>
      );
    } else if (gameState === GameState.Paused) {
      return (
        // Position pause UI elements
        <div className={`${commonButtonContainerStyle}`} style={{ top: 'calc(50% + 80px)' }}> {/* Adjust position as needed */}
          <button onClick={handleResumeClick} className={`${secondaryButtonStyle}`}>Resume</button>
        </div>
      );
    } else if (gameState === GameState.GameOver) {
      return (
        <div className={`${commonButtonContainerStyle}`} style={{ top: 'calc(50% + 40px)' }}> {/* Adjust position as needed */}
          <button onClick={handleStartClick} className={`${primaryButtonStyle}`}>Restart Game</button>
        </div>
      );
    }
    return null; // No buttons for Playing state (or handled by canvas interaction)
  };

  // Main Component JSX
  return (
    // Outer wrapper for centering and full screen, touch actions
    <div
      className="w-full h-screen flex justify-center items-center bg-gray-900 touch-none overflow-hidden" // Use h-screen for full viewport height
      style={{ WebkitTapHighlightColor: 'transparent' }} // Disable tap highlight on iOS for cleaner UX
    >
      {/* Inner wrapper for aspect ratio constraint and relative positioning of canvas and UI buttons */}
      <div className="relative w-full h-full flex justify-center items-center"> {/* This div's size is used by handleResize */}
        <canvas
          ref={canvasRef}
          // Actual width/height attributes are set to BASE_CANVAS_WIDTH/HEIGHT in drawing useEffect.
          // CSS style width/height are set by handleResize for responsive display.
          className="border-2 border-gray-700 shadow-2xl rounded-lg bg-black block" // `block` to prevent potential extra space below canvas
          // Do not set width/height or w-full/h-full here directly if relying on parent for aspect ratio scaling
        />
        {renderButtons()} {/* Render UI buttons over the canvas */}
        {/* Mute button, positioned absolutely */}
        {isClient && (
          <button
            onClick={handleMuteToggle}
            className={`${secondaryButtonStyle} absolute top-4 right-4 z-20 text-sm px-3 py-1.5`} // Ensure mute is on top
            aria-label={isMutedState ? "Unmute" : "Mute"}
          >
            {isMutedState ? "Unmute" : "Mute"}
          </button>
        )}
      </div>
    </div>
  );
};

export default GameCanvas; 