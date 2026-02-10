import { useReducer, useCallback, useRef } from 'react';
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

const GAME_PHASES = {
    SETUP: 'setup',
    ROLLING: 'rolling',
    SELECTING: 'selecting',
    MOVING: 'moving',
    GAME_OVER: 'game_over',
};

const initialState = {
    phase: GAME_PHASES.SETUP,
    playerCount: 4,
    playerIds: [],
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

        case 'START_GAME': {
            const playerIds = getPlayerIds(state.playerCount);
            const tokens = createInitialTokens(state.playerCount);
            return {
                ...state,
                phase: GAME_PHASES.ROLLING,
                playerIds,
                tokens,
                currentPlayer: playerIds[0],
                diceValue: null,
                diceRolling: false,
                moveableTokens: [],
                message: `${PLAYER_NAMES[playerIds[0]]}'s turn — Roll the dice!`,
                winner: null,
                consecutiveSixes: 0,
                moveHistory: [],
            };
        }

        case 'DICE_ROLLING':
            return {
                ...state,
                diceRolling: true,
                message: 'Rolling...',
            };

        case 'DICE_ROLLED': {
            const { value } = action.payload;
            const { currentPlayer, tokens, consecutiveSixes, playerIds } = state;

            // Check for three consecutive sixes — lose turn
            if (value === 6 && consecutiveSixes >= 2) {
                const nextPlayerIdx = (playerIds.indexOf(currentPlayer) + 1) % playerIds.length;
                const nextPlayer = playerIds[nextPlayerIdx];
                return {
                    ...state,
                    diceValue: value,
                    diceRolling: false,
                    phase: GAME_PHASES.ROLLING,
                    currentPlayer: nextPlayer,
                    consecutiveSixes: 0,
                    moveableTokens: [],
                    message: `Three 6s in a row! Turn lost. ${PLAYER_NAMES[nextPlayer]}'s turn.`,
                };
            }

            const moveable = getMoveableTokens(currentPlayer, value, tokens);

            // No moveable tokens
            if (moveable.length === 0) {
                const nextPlayer = getNextPlayer(currentPlayer, 0, null, playerIds); // force next, no bonus
                const nextIdx = (playerIds.indexOf(currentPlayer) + 1) % playerIds.length;
                const actualNext = playerIds[nextIdx];
                return {
                    ...state,
                    diceValue: value,
                    diceRolling: false,
                    phase: GAME_PHASES.ROLLING,
                    currentPlayer: actualNext,
                    consecutiveSixes: 0,
                    moveableTokens: [],
                    message: `No moves available. ${PLAYER_NAMES[actualNext]}'s turn.`,
                };
            }

            // Only one moveable token — auto select
            if (moveable.length === 1) {
                return {
                    ...state,
                    diceValue: value,
                    diceRolling: false,
                    phase: GAME_PHASES.SELECTING,
                    moveableTokens: moveable.map((t) => t.id),
                    consecutiveSixes: value === 6 ? consecutiveSixes + 1 : 0,
                    message: `Rolled ${value}! Click your token to move.`,
                };
            }

            // Multiple moveable tokens — player must choose
            return {
                ...state,
                diceValue: value,
                diceRolling: false,
                phase: GAME_PHASES.SELECTING,
                moveableTokens: moveable.map((t) => t.id),
                consecutiveSixes: value === 6 ? consecutiveSixes + 1 : 0,
                message: `Rolled ${value}! Choose a token to move.`,
            };
        }

        case 'SELECT_TOKEN': {
            const { tokenId } = action.payload;
            const { currentPlayer, diceValue, tokens, playerIds, consecutiveSixes } = state;

            // Find the token
            const playerTokens = tokens[currentPlayer];
            const token = playerTokens.find((t) => t.id === tokenId);
            if (!token) return state;

            // Move the token
            const { tokens: newTokens, captured } = moveToken(token, diceValue, tokens);

            // Check for winner
            if (checkWinner(currentPlayer, newTokens)) {
                return {
                    ...state,
                    tokens: newTokens,
                    phase: GAME_PHASES.GAME_OVER,
                    winner: currentPlayer,
                    moveableTokens: [],
                    message: `${PLAYER_NAMES[currentPlayer]} wins! 🎉`,
                };
            }

            // Determine next player
            const nextPlayer = getNextPlayer(currentPlayer, diceValue, captured, playerIds);
            const isExtraTurn = nextPlayer === currentPlayer;

            return {
                ...state,
                tokens: newTokens,
                phase: GAME_PHASES.ROLLING,
                currentPlayer: nextPlayer,
                diceValue: isExtraTurn ? diceValue : null,
                moveableTokens: [],
                consecutiveSixes: isExtraTurn ? consecutiveSixes : 0,
                message: isExtraTurn
                    ? `${captured ? 'Capture! ' : ''}Bonus turn for ${PLAYER_NAMES[currentPlayer]}! Roll again.`
                    : `${captured ? 'Capture! ' : ''}${PLAYER_NAMES[nextPlayer]}'s turn.`,
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

    const setPlayerCount = useCallback((count) => {
        dispatch({ type: 'SET_PLAYER_COUNT', payload: count });
    }, []);

    const startGame = useCallback(() => {
        dispatch({ type: 'START_GAME' });
    }, []);

    const handleRollDice = useCallback(() => {
        if (state.phase !== GAME_PHASES.ROLLING || state.diceRolling) return;

        dispatch({ type: 'DICE_ROLLING' });

        // Simulate dice rolling animation delay
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
        dispatch({ type: 'RESET_GAME' });
    }, []);

    return {
        state,
        actions: {
            setPlayerCount,
            startGame,
            handleRollDice,
            selectToken,
            resetGame,
        },
        GAME_PHASES,
    };
}
