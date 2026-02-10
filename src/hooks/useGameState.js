import { useReducer, useCallback, useRef, useEffect } from 'react';
import {
    PLAYER_NAMES,
    TOKEN_STATE,
} from '../utils/constants';
import {
    createInitialTokens,
    getPlayerIds,
    rollDice,
    canAnyTokenMove,
    moveToken,
    moveTokenOneStep,
    finalizeTokenMove,
    checkWinner,
    getNextPlayer,
    getMoveableTokens,
} from '../utils/gameLogic';
import { chooseBestToken } from '../utils/aiPlayer';
import {
    playDiceRoll,
    playDiceLand,
    playTokenMove,
    playTokenOut,
    playCapture,
    playTokenHome,
    playWin,
    playNoMoves,
    playSix,
    playTurnChange,
    playClick,
    toggleMute,
    isSoundMuted,
} from '../utils/sounds';

const GAME_PHASES = {
    SETUP: 'setup',
    ROLLING: 'rolling',
    SELECTING: 'selecting',
    MOVING: 'moving',
    GAME_OVER: 'game_over',
};

const AI_ROLL_DELAY = 1000;    // ms before AI rolls
const AI_SELECT_DELAY = 800;   // ms before AI picks a token
const STEP_DELAY = 120;        // ms between each hop in step animation

let soundEventCounter = 0;
function makeSoundEvent(type) {
    return { type, id: ++soundEventCounter };
}

const initialState = {
    phase: GAME_PHASES.SETUP,
    playerCount: 4,
    playerIds: [],
    cpuPlayers: {},   // { playerId: true/false }
    tokens: {},
    currentPlayer: 0,
    diceValue: null,
    diceRolling: false,
    moveableTokens: [],
    message: '',
    winner: null,
    consecutiveSixes: 0,
    moveHistory: [],
    // Animation state for step-by-step movement
    _animation: null, // { player, tokenIndex, stepsLeft, wasAtHome, tokenId }
    // Sound event flags (consumed by useEffect)
    _soundEvent: null,
};

function gameReducer(state, action) {
    switch (action.type) {
        case 'SET_PLAYER_COUNT':
            return { ...state, playerCount: action.payload };

        case 'SET_CPU_PLAYERS':
            return { ...state, cpuPlayers: action.payload };

        case 'TOGGLE_CPU_PLAYER': {
            const playerId = action.payload;
            return {
                ...state,
                cpuPlayers: {
                    ...state.cpuPlayers,
                    [playerId]: !state.cpuPlayers[playerId],
                },
            };
        }

        case 'START_GAME': {
            const playerIds = getPlayerIds(state.playerCount);
            const tokens = createInitialTokens(state.playerCount);
            const firstPlayer = playerIds[0];
            const isCpu = !!state.cpuPlayers[firstPlayer];

            return {
                ...state,
                phase: GAME_PHASES.ROLLING,
                playerIds,
                tokens,
                currentPlayer: firstPlayer,
                diceValue: null,
                diceRolling: false,
                moveableTokens: [],
                message: isCpu
                    ? `${PLAYER_NAMES[firstPlayer]} (CPU) is thinking...`
                    : `${PLAYER_NAMES[firstPlayer]}'s turn — Roll the dice!`,
                winner: null,
                consecutiveSixes: 0,
                moveHistory: [],
            };
        }

        case 'DICE_ROLLING':
            return {
                ...state,
                diceRolling: true,
                message: state.cpuPlayers[state.currentPlayer]
                    ? `${PLAYER_NAMES[state.currentPlayer]} (CPU) is rolling...`
                    : 'Rolling...',
            };

        case 'DICE_ROLLED': {
            const { value } = action.payload;
            const { currentPlayer, tokens, consecutiveSixes, playerIds, cpuPlayers } = state;
            const isCpu = !!cpuPlayers[currentPlayer];
            const playerLabel = isCpu ? `${PLAYER_NAMES[currentPlayer]} (CPU)` : PLAYER_NAMES[currentPlayer];

            // Check for three consecutive sixes — lose turn
            if (value === 6 && consecutiveSixes >= 2) {
                const nextPlayerIdx = (playerIds.indexOf(currentPlayer) + 1) % playerIds.length;
                const nextPlayer = playerIds[nextPlayerIdx];
                const nextIsCpu = !!cpuPlayers[nextPlayer];
                const nextLabel = nextIsCpu ? `${PLAYER_NAMES[nextPlayer]} (CPU)` : PLAYER_NAMES[nextPlayer];
                return {
                    ...state,
                    diceValue: value,
                    diceRolling: false,
                    phase: GAME_PHASES.ROLLING,
                    currentPlayer: nextPlayer,
                    consecutiveSixes: 0,
                    moveableTokens: [],
                    message: `Three 6s in a row! Turn lost. ${nextLabel}'s turn.`,
                    _soundEvent: makeSoundEvent('noMoves'),
                };
            }

            const moveable = getMoveableTokens(currentPlayer, value, tokens);

            // No moveable tokens
            if (moveable.length === 0) {
                const nextIdx = (playerIds.indexOf(currentPlayer) + 1) % playerIds.length;
                const actualNext = playerIds[nextIdx];
                const nextIsCpu = !!cpuPlayers[actualNext];
                const nextLabel = nextIsCpu ? `${PLAYER_NAMES[actualNext]} (CPU)` : PLAYER_NAMES[actualNext];
                return {
                    ...state,
                    diceValue: value,
                    diceRolling: false,
                    phase: GAME_PHASES.ROLLING,
                    currentPlayer: actualNext,
                    consecutiveSixes: 0,
                    moveableTokens: [],
                    message: `${playerLabel} rolled ${value} — no moves. ${nextLabel}'s turn.`,
                    _soundEvent: makeSoundEvent('noMoves'),
                };
            }

            return {
                ...state,
                diceValue: value,
                diceRolling: false,
                phase: GAME_PHASES.SELECTING,
                moveableTokens: moveable.map((t) => t.id),
                consecutiveSixes: value === 6 ? consecutiveSixes + 1 : 0,
                message: isCpu
                    ? `${playerLabel} rolled ${value}! Thinking...`
                    : moveable.length === 1
                        ? `Rolled ${value}! Click your token to move.`
                        : `Rolled ${value}! Choose a token to move.`,
                _soundEvent: value === 6 ? makeSoundEvent('six') : makeSoundEvent('diceLand'),
            };
        }

        case 'SELECT_TOKEN': {
            const { tokenId } = action.payload;
            const { currentPlayer, diceValue, tokens } = state;

            // Find the token
            const playerTokens = tokens[currentPlayer];
            const token = playerTokens.find((t) => t.id === tokenId);
            if (!token) return state;

            const wasAtHome = token.state === TOKEN_STATE.HOME;

            // If token is leaving home, move instantly (just 1 step to start pos)
            if (wasAtHome && diceValue === 6) {
                const { tokens: newTokens, captured } = moveToken(token, diceValue, tokens);
                // Go straight to FINISH_MOVE logic via a new dispatch
                return {
                    ...state,
                    tokens: newTokens,
                    phase: GAME_PHASES.MOVING,
                    moveableTokens: [],
                    _animation: {
                        player: currentPlayer,
                        tokenIndex: token.index,
                        tokenId,
                        stepsLeft: 0, // 0 steps left = immediately finalize
                        wasAtHome: true,
                    },
                    _soundEvent: makeSoundEvent('tokenOut'),
                };
            }

            // Active token: animate step-by-step
            return {
                ...state,
                phase: GAME_PHASES.MOVING,
                moveableTokens: [],
                _animation: {
                    player: currentPlayer,
                    tokenIndex: token.index,
                    tokenId,
                    stepsLeft: diceValue,
                    wasAtHome: false,
                },
                message: 'Moving...',
            };
        }

        // Step token forward by 1 cell (called by animation useEffect)
        case 'ANIMATE_STEP': {
            const anim = state._animation;
            if (!anim || anim.stepsLeft <= 0) return state;

            const { tokens: newTokens } = moveTokenOneStep(
                anim.player, anim.tokenIndex, state.tokens
            );

            return {
                ...state,
                tokens: newTokens,
                _animation: {
                    ...anim,
                    stepsLeft: anim.stepsLeft - 1,
                },
                _soundEvent: makeSoundEvent('tokenStep'),
            };
        }

        // Called after step animation finishes — handle captures, win, turn
        case 'FINISH_MOVE': {
            const anim = state._animation;
            if (!anim) return state;

            const { currentPlayer, diceValue, playerIds, consecutiveSixes, cpuPlayers, tokens } = state;

            // Check captures at final position
            const { tokens: newTokens, captured } = finalizeTokenMove(
                anim.player, anim.tokenIndex, tokens
            );

            // Check if this token just finished
            const movedToken = newTokens[currentPlayer].find((t) => t.id === anim.tokenId);
            const justFinished = movedToken && movedToken.state === TOKEN_STATE.FINISHED;

            // Determine sound
            let soundEvent = 'tokenMove';
            if (captured) soundEvent = 'capture';
            else if (justFinished) soundEvent = 'tokenHome';
            else if (anim.wasAtHome) soundEvent = 'tokenOut';

            // Check for winner
            if (checkWinner(currentPlayer, newTokens)) {
                const isCpu = !!cpuPlayers[currentPlayer];
                return {
                    ...state,
                    tokens: newTokens,
                    phase: GAME_PHASES.GAME_OVER,
                    winner: currentPlayer,
                    moveableTokens: [],
                    _animation: null,
                    message: `${PLAYER_NAMES[currentPlayer]}${isCpu ? ' (CPU)' : ''} wins! 🎉`,
                    _soundEvent: makeSoundEvent('win'),
                };
            }

            // Determine next player
            const nextPlayer = getNextPlayer(currentPlayer, diceValue, captured, playerIds);
            const isExtraTurn = nextPlayer === currentPlayer;
            const nextIsCpu = !!cpuPlayers[nextPlayer];
            const nextLabel = nextIsCpu ? `${PLAYER_NAMES[nextPlayer]} (CPU)` : PLAYER_NAMES[nextPlayer];

            return {
                ...state,
                tokens: newTokens,
                phase: GAME_PHASES.ROLLING,
                currentPlayer: nextPlayer,
                diceValue: isExtraTurn ? diceValue : null,
                moveableTokens: [],
                _animation: null,
                consecutiveSixes: isExtraTurn ? consecutiveSixes : 0,
                message: isExtraTurn
                    ? `${captured ? 'Capture! ' : ''}Bonus turn for ${nextLabel}! ${nextIsCpu ? 'Thinking...' : 'Roll again.'}`
                    : `${captured ? 'Capture! ' : ''}${nextLabel}'s turn.${nextIsCpu ? '' : ''}`,
                _soundEvent: makeSoundEvent(soundEvent),
            };
        }

        case 'RESET_GAME':
            return { ...initialState };

        default:
            return state;
    }
}

export function useGameState() {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const rollTimeoutRef = useRef(null);
    const aiTimeoutRef = useRef(null);

    const isCurrentPlayerCPU = !!state.cpuPlayers[state.currentPlayer];

    const setPlayerCount = useCallback((count) => {
        dispatch({ type: 'SET_PLAYER_COUNT', payload: count });
    }, []);

    const setCpuPlayers = useCallback((cpuMap) => {
        dispatch({ type: 'SET_CPU_PLAYERS', payload: cpuMap });
    }, []);

    const toggleCpuPlayer = useCallback((playerId) => {
        dispatch({ type: 'TOGGLE_CPU_PLAYER', payload: playerId });
    }, []);

    const startGame = useCallback(() => {
        dispatch({ type: 'START_GAME' });
    }, []);

    const handleRollDice = useCallback(() => {
        if (state.phase !== GAME_PHASES.ROLLING || state.diceRolling) return;

        dispatch({ type: 'DICE_ROLLING' });
        playDiceRoll();

        rollTimeoutRef.current = setTimeout(() => {
            const value = rollDice();
            dispatch({ type: 'DICE_ROLLED', payload: { value } });
        }, 800);
    }, [state.phase, state.diceRolling]);

    const selectToken = useCallback((tokenId) => {
        if (state.phase !== GAME_PHASES.SELECTING) return;
        if (!state.moveableTokens.includes(tokenId)) return;

        dispatch({ type: 'SELECT_TOKEN', payload: { tokenId } });
    }, [state.phase, state.moveableTokens]);

    const resetGame = useCallback(() => {
        if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
        if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
        dispatch({ type: 'RESET_GAME' });
    }, []);

    // === AI Auto-Play Logic ===
    useEffect(() => {
        if (state.phase === GAME_PHASES.GAME_OVER) return;
        if (!isCurrentPlayerCPU) return;

        // CPU needs to roll
        if (state.phase === GAME_PHASES.ROLLING && !state.diceRolling) {
            aiTimeoutRef.current = setTimeout(() => {
                handleRollDice();
            }, AI_ROLL_DELAY);

            return () => {
                if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
            };
        }

        // CPU needs to select a token
        if (state.phase === GAME_PHASES.SELECTING) {
            aiTimeoutRef.current = setTimeout(() => {
                const bestTokenId = chooseBestToken(
                    state.currentPlayer,
                    state.diceValue,
                    state.tokens
                );
                if (bestTokenId) {
                    dispatch({ type: 'SELECT_TOKEN', payload: { tokenId: bestTokenId } });
                }
            }, AI_SELECT_DELAY);

            return () => {
                if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
            };
        }
    }, [
        state.phase,
        state.diceRolling,
        state.currentPlayer,
        state.diceValue,
        state.tokens,
        isCurrentPlayerCPU,
        handleRollDice,
    ]);

    // === Auto-move when only 1 token can move (human players) ===
    const autoMoveRef = useRef(null);
    useEffect(() => {
        if (state.phase !== GAME_PHASES.SELECTING) return;
        if (isCurrentPlayerCPU) return; // CPU has its own logic
        if (state.moveableTokens.length !== 1) return;

        // Auto-select the only moveable token after a brief delay
        autoMoveRef.current = setTimeout(() => {
            dispatch({ type: 'SELECT_TOKEN', payload: { tokenId: state.moveableTokens[0] } });
        }, 400);

        return () => {
            if (autoMoveRef.current) clearTimeout(autoMoveRef.current);
        };
    }, [state.phase, state.moveableTokens, isCurrentPlayerCPU]);

    // === Step-by-step animation driver ===
    const animTimerRef = useRef(null);
    useEffect(() => {
        const anim = state._animation;
        if (!anim) return;

        if (anim.stepsLeft > 0) {
            // More steps to go — dispatch next step after delay
            animTimerRef.current = setTimeout(() => {
                dispatch({ type: 'ANIMATE_STEP' });
            }, STEP_DELAY);
        } else {
            // Animation done — finalize the move after a tiny pause
            animTimerRef.current = setTimeout(() => {
                dispatch({ type: 'FINISH_MOVE' });
            }, STEP_DELAY);
        }

        return () => {
            if (animTimerRef.current) clearTimeout(animTimerRef.current);
        };
    }, [state._animation]);

    // === Sound Effect Handler ===
    const lastSoundIdRef = useRef(0);
    useEffect(() => {
        const ev = state._soundEvent;
        if (!ev || ev.id === lastSoundIdRef.current) return;
        lastSoundIdRef.current = ev.id;

        switch (ev.type) {
            case 'diceLand':
                playDiceLand(state.diceValue);
                break;
            case 'six':
                playDiceLand(6);
                setTimeout(playSix, 150);
                break;
            case 'noMoves':
                playDiceLand(state.diceValue);
                setTimeout(playNoMoves, 200);
                break;
            case 'tokenMove':
                playTokenMove();
                break;
            case 'tokenStep':
                playTokenMove();
                break;
            case 'tokenOut':
                playTokenOut();
                break;
            case 'capture':
                playCapture();
                break;
            case 'tokenHome':
                playTokenHome();
                break;
            case 'win':
                playTokenHome();
                setTimeout(playWin, 500);
                break;
            default:
                break;
        }
    }, [state._soundEvent, state.diceValue]);

    // Play turn change sound when player changes
    const prevPlayerRef = useRef(state.currentPlayer);
    useEffect(() => {
        if (state.phase !== GAME_PHASES.SETUP && state.currentPlayer !== prevPlayerRef.current) {
            prevPlayerRef.current = state.currentPlayer;
            playTurnChange();
        }
    }, [state.currentPlayer, state.phase]);

    const handleToggleMute = useCallback(() => {
        return toggleMute();
    }, []);

    return {
        state,
        isCurrentPlayerCPU,
        isMuted: isSoundMuted(),
        actions: {
            setPlayerCount,
            setCpuPlayers,
            toggleCpuPlayer,
            startGame,
            handleRollDice,
            selectToken,
            resetGame,
            toggleMute: handleToggleMute,
        },
        GAME_PHASES,
    };
}
