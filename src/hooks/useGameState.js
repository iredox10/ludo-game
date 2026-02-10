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
    checkWinner,
    getNextPlayer,
    getMoveableTokens,
} from '../utils/gameLogic';
import { chooseBestToken } from '../utils/aiPlayer';

const GAME_PHASES = {
    SETUP: 'setup',
    ROLLING: 'rolling',
    SELECTING: 'selecting',
    MOVING: 'moving',
    GAME_OVER: 'game_over',
};

const AI_ROLL_DELAY = 1000;    // ms before AI rolls
const AI_SELECT_DELAY = 800;   // ms before AI picks a token

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
            };
        }

        case 'SELECT_TOKEN': {
            const { tokenId } = action.payload;
            const { currentPlayer, diceValue, tokens, playerIds, consecutiveSixes, cpuPlayers } = state;

            // Find the token
            const playerTokens = tokens[currentPlayer];
            const token = playerTokens.find((t) => t.id === tokenId);
            if (!token) return state;

            // Move the token
            const { tokens: newTokens, captured } = moveToken(token, diceValue, tokens);

            // Check for winner
            if (checkWinner(currentPlayer, newTokens)) {
                const isCpu = !!cpuPlayers[currentPlayer];
                return {
                    ...state,
                    tokens: newTokens,
                    phase: GAME_PHASES.GAME_OVER,
                    winner: currentPlayer,
                    moveableTokens: [],
                    message: `${PLAYER_NAMES[currentPlayer]}${isCpu ? ' (CPU)' : ''} wins! 🎉`,
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
                consecutiveSixes: isExtraTurn ? consecutiveSixes : 0,
                message: isExtraTurn
                    ? `${captured ? 'Capture! ' : ''}Bonus turn for ${nextLabel}! ${nextIsCpu ? 'Thinking...' : 'Roll again.'}`
                    : `${captured ? 'Capture! ' : ''}${nextLabel}'s turn.${nextIsCpu ? '' : ''}`,
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

    return {
        state,
        isCurrentPlayerCPU,
        actions: {
            setPlayerCount,
            setCpuPlayers,
            toggleCpuPlayer,
            startGame,
            handleRollDice,
            selectToken,
            resetGame,
        },
        GAME_PHASES,
    };
}
