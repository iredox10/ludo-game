import { useState, useCallback, useEffect, useMemo } from 'react';
import { PLAYER_COLORS, PLAYER_NAMES } from './utils/constants';
import { useGameState } from './hooks/useGameState';
import StartScreen from './components/StartScreen';
import Board from './components/Board';
import Tokens from './components/Tokens';
import Dice from './components/Dice';
import PlayerPanel from './components/PlayerPanel';
import WinnerModal from './components/WinnerModal';
import './App.css';

function App() {
  const { state, actions, GAME_PHASES } = useGameState();
  const {
    phase,
    playerCount,
    playerIds,
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
      actions.selectToken(tokenId);
    },
    [actions]
  );

  // Keyboard shortcut - space to roll
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code === 'Space' && phase === GAME_PHASES.ROLLING && !diceRolling) {
        e.preventDefault();
        actions.handleRollDice();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, diceRolling, actions, GAME_PHASES]);

  const currentPlayerColor = PLAYER_COLORS[currentPlayer]?.main || '#E53935';

  // Setup screen
  if (phase === GAME_PHASES.SETUP) {
    return (
      <StartScreen
        playerCount={playerCount}
        onPlayerCountChange={actions.setPlayerCount}
        onStart={actions.startGame}
      />
    );
  }

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
          <span className="turn-text">{PLAYER_NAMES[currentPlayer]}'s Turn</span>
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
            moveableTokens={moveableTokens}
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
          disabled={phase !== GAME_PHASES.ROLLING}
          playerColor={currentPlayerColor}
        />
        <p className="game-message" style={{ color: currentPlayerColor }}>
          {message}
        </p>
      </div>

      {/* Winner Modal */}
      <WinnerModal winner={winner} onPlayAgain={actions.resetGame} />
    </div>
  );
}

export default App;
