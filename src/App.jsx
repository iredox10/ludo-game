import { useState, useCallback, useEffect } from 'react';
import { PLAYER_COLORS, PLAYER_NAMES } from './utils/constants';
import { useGameState } from './hooks/useGameState';
import StartScreen from './components/StartScreen';
import Board from './components/Board';
import Tokens from './components/Tokens';
import Dice from './components/Dice';
import PlayerPanel from './components/PlayerPanel';
import WinnerModal from './components/WinnerModal';
import PWAPrompt from './components/PWAPrompt';
import './App.css';

function App() {
  const { state, isCurrentPlayerCPU, actions, GAME_PHASES } = useGameState();
  const {
    phase,
    playerCount,
    playerIds,
    cpuPlayers,
    tokens,
    currentPlayer,
    diceValue,
    diceRolling,
    moveableTokens,
    message,
    winner,
  } = state;

  // Responsive board size
  const [cellSize, setCellSize] = useState(40);

  useEffect(() => {
    function handleResize() {
      const maxWidth = Math.min(window.innerWidth - 40, 620);
      const maxHeight = window.innerHeight - 320;
      const maxBoard = Math.min(maxWidth, maxHeight);
      setCellSize(Math.max(24, Math.floor(maxBoard / 15)));
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTokenClick = useCallback(
    (tokenId) => {
      // Don't allow clicking tokens during CPU turn
      if (isCurrentPlayerCPU) return;
      actions.selectToken(tokenId);
    },
    [actions, isCurrentPlayerCPU]
  );

  // Keyboard shortcut - space to roll (only for human players)
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.code === 'Space' &&
        phase === GAME_PHASES.ROLLING &&
        !diceRolling &&
        !isCurrentPlayerCPU
      ) {
        e.preventDefault();
        actions.handleRollDice();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, diceRolling, isCurrentPlayerCPU, actions, GAME_PHASES]);

  const currentPlayerColor = PLAYER_COLORS[currentPlayer]?.main || '#E53935';

  // Setup screen
  if (phase === GAME_PHASES.SETUP) {
    return (
      <>
        <StartScreen
          playerCount={playerCount}
          cpuPlayers={cpuPlayers}
          onPlayerCountChange={actions.setPlayerCount}
          onToggleCpu={actions.toggleCpuPlayer}
          onStart={actions.startGame}
        />
        <PWAPrompt />
      </>
    );
  }

  // Determine if dice should be disabled
  const isDiceDisabled = phase !== GAME_PHASES.ROLLING || isCurrentPlayerCPU;

  return (
    <div className="game-screen">
      {/* Header */}
      <header className="game-header">
        <div className="header-left">
          <h1 className="header-logo">LUDO</h1>
        </div>
        <div
          className="turn-indicator"
          style={{ '--turn-color': currentPlayerColor }}
        >
          <span className="turn-dot" style={{ background: currentPlayerColor }} />
          <span className="turn-text">
            {PLAYER_NAMES[currentPlayer]}'s Turn
            {isCurrentPlayerCPU && ' 🤖'}
          </span>
        </div>
        <button
          className="reset-btn"
          onClick={actions.resetGame}
          id="reset-btn"
          title="New Game"
        >
          ✕
        </button>
      </header>

      {/* Player Info */}
      <PlayerPanel
        players={playerIds}
        tokens={tokens}
        currentPlayer={currentPlayer}
        cpuPlayers={cpuPlayers}
      />

      {/* Board + Tokens */}
      <div className="board-area">
        <div
          className="board-container"
          style={{ width: 15 * cellSize, height: 15 * cellSize }}
        >
          <Board cellSize={cellSize} activePlayers={playerIds} />
          <Tokens
            tokens={tokens}
            cellSize={cellSize}
            moveableTokens={isCurrentPlayerCPU ? [] : moveableTokens}
            currentPlayer={currentPlayer}
            onTokenClick={handleTokenClick}
          />
        </div>
      </div>

      {/* Dice + Message */}
      <div className="controls-area">
        <Dice
          value={diceValue}
          rolling={diceRolling}
          onRoll={actions.handleRollDice}
          disabled={isDiceDisabled}
          playerColor={currentPlayerColor}
        />
        <p className="game-message" style={{ color: currentPlayerColor }}>
          {message}
        </p>
      </div>

      {/* Winner Modal */}
      <WinnerModal winner={winner} onPlayAgain={actions.resetGame} />

      {/* PWA Install/Offline Prompt */}
      <PWAPrompt />
    </div>
  );
}

export default App;
