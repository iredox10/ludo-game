import {
    MAIN_PATH,
    HOME_PATHS,
    HOME_BASE_POSITIONS,
    START_POSITIONS,
    HOME_ENTRY,
    SAFE_POSITIONS,
    TOKEN_STATE,
} from './constants';

/**
 * Create the initial state for all tokens
 */
export function createInitialTokens(playerCount) {
    const tokens = {};
    const playerIds = getPlayerIds(playerCount);

    playerIds.forEach((playerId) => {
        tokens[playerId] = Array.from({ length: 4 }, (_, i) => ({
            id: `${playerId}-${i}`,
            player: playerId,
            index: i,
            state: TOKEN_STATE.HOME,
            pathPosition: -1, // -1 = at home base, 0-51 = on main path relative to player start, 52-57 = home stretch
            mainPathIndex: -1, // Actual index on MAIN_PATH array
        }));
    });

    return tokens;
}

/**
 * Get active player IDs based on player count
 */
export function getPlayerIds(playerCount) {
    if (playerCount === 2) return [0, 2]; // Red vs Yellow (opposite corners)
    if (playerCount === 3) return [0, 1, 2]; // Red, Green, Yellow
    return [0, 1, 2, 3]; // All four
}

/**
 * Roll a dice (1-6)
 */
export function rollDice() {
    return Math.floor(Math.random() * 6) + 1;
}

/**
 * Get the absolute position on the main path given a player and their relative position
 */
export function getAbsoluteMainPathIndex(player, relativePos) {
    if (relativePos < 0 || relativePos >= 52) return -1;
    return (START_POSITIONS[player] + relativePos) % 52;
}

/**
 * Get the pixel coordinates of a token based on its current state and position
 */
export function getTokenCoordinates(token, cellSize) {
    const { player, state, pathPosition, index } = token;

    if (state === TOKEN_STATE.HOME) {
        const [col, row] = HOME_BASE_POSITIONS[player][index];
        return {
            x: col * cellSize + cellSize / 2,
            y: row * cellSize + cellSize / 2,
        };
    }

    if (state === TOKEN_STATE.FINISHED) {
        // Token is at the center
        return {
            x: 7 * cellSize + cellSize / 2,
            y: 7 * cellSize + cellSize / 2,
        };
    }

    // Active on main path
    if (pathPosition >= 0 && pathPosition < 52) {
        const absIndex = getAbsoluteMainPathIndex(player, pathPosition);
        const [col, row] = MAIN_PATH[absIndex];
        return {
            x: col * cellSize + cellSize / 2,
            y: row * cellSize + cellSize / 2,
        };
    }

    // In home stretch
    if (pathPosition >= 52 && pathPosition < 58) {
        const homeIndex = pathPosition - 52;
        if (homeIndex < 6) {
            const [col, row] = HOME_PATHS[player][homeIndex];
            return {
                x: col * cellSize + cellSize / 2,
                y: row * cellSize + cellSize / 2,
            };
        }
    }

    return { x: 0, y: 0 };
}

/**
 * Check if a move is valid for a token
 */
export function canMoveToken(token, diceValue, allTokens) {
    if (token.state === TOKEN_STATE.FINISHED) return false;

    // Token at home base - needs a 6 to come out
    if (token.state === TOKEN_STATE.HOME) {
        return diceValue === 6;
    }

    // Token is active
    const newPos = token.pathPosition + diceValue;

    // Can't overshoot home (position 57 = home, need exactly right number)
    if (newPos > 57) return false;

    return true;
}

/**
 * Check if any token of a player can move
 */
export function canAnyTokenMove(player, diceValue, allTokens) {
    const playerTokens = allTokens[player];
    return playerTokens.some((token) => canMoveToken(token, diceValue, allTokens));
}

/**
 * Move a token and return the new state
 */
export function moveToken(token, diceValue, allTokens) {
    const newTokens = JSON.parse(JSON.stringify(allTokens));
    const playerTokens = newTokens[token.player];
    const tokenToMove = playerTokens[token.index];

    let captured = null;

    // Coming out of home base
    if (tokenToMove.state === TOKEN_STATE.HOME && diceValue === 6) {
        tokenToMove.state = TOKEN_STATE.ACTIVE;
        tokenToMove.pathPosition = 0;
        tokenToMove.mainPathIndex = START_POSITIONS[token.player];

        // Check for capture at starting position
        captured = checkCapture(tokenToMove, newTokens);
    }
    // Moving on the board
    else if (tokenToMove.state === TOKEN_STATE.ACTIVE) {
        const newPos = tokenToMove.pathPosition + diceValue;

        if (newPos === 57) {
            // Reached home!
            tokenToMove.state = TOKEN_STATE.FINISHED;
            tokenToMove.pathPosition = 57;
            tokenToMove.mainPathIndex = -1;
        } else if (newPos >= 52) {
            // In home stretch
            tokenToMove.pathPosition = newPos;
            tokenToMove.mainPathIndex = -1;
        } else {
            // On main path
            tokenToMove.pathPosition = newPos;
            tokenToMove.mainPathIndex = getAbsoluteMainPathIndex(token.player, newPos);

            // Check for capture
            captured = checkCapture(tokenToMove, newTokens);
        }
    }

    return { tokens: newTokens, captured };
}

/**
 * Move a token forward by exactly 1 step (for animation).
 * Does NOT check captures — that's done on the final step.
 */
export function moveTokenOneStep(player, tokenIndex, allTokens) {
    const newTokens = JSON.parse(JSON.stringify(allTokens));
    const tokenToMove = newTokens[player][tokenIndex];

    if (tokenToMove.state !== TOKEN_STATE.ACTIVE) return { tokens: newTokens };

    const newPos = tokenToMove.pathPosition + 1;

    if (newPos === 57) {
        tokenToMove.state = TOKEN_STATE.FINISHED;
        tokenToMove.pathPosition = 57;
        tokenToMove.mainPathIndex = -1;
    } else if (newPos >= 52) {
        tokenToMove.pathPosition = newPos;
        tokenToMove.mainPathIndex = -1;
    } else {
        tokenToMove.pathPosition = newPos;
        tokenToMove.mainPathIndex = getAbsoluteMainPathIndex(player, newPos);
    }

    return { tokens: newTokens };
}

/**
 * Check for capture at the token's current position (called after animation ends).
 */
export function finalizeTokenMove(player, tokenIndex, allTokens) {
    const newTokens = JSON.parse(JSON.stringify(allTokens));
    const tokenToMove = newTokens[player][tokenIndex];

    let captured = null;

    if (tokenToMove.state === TOKEN_STATE.ACTIVE && tokenToMove.pathPosition < 52) {
        captured = checkCapture(tokenToMove, newTokens);
    }

    return { tokens: newTokens, captured };
}

/**
 * Check if the moved token captures an opponent's token
 */
function checkCapture(movedToken, allTokens) {
    const absIndex = movedToken.mainPathIndex;

    // Can't capture on safe positions
    if (SAFE_POSITIONS.includes(absIndex)) return null;

    // Check all other players' tokens
    for (const playerId in allTokens) {
        const pid = parseInt(playerId);
        if (pid === movedToken.player) continue;

        const playerTokens = allTokens[pid];
        for (const otherToken of playerTokens) {
            if (otherToken.state === TOKEN_STATE.ACTIVE && otherToken.mainPathIndex === absIndex) {
                // Capture! Send them back home
                otherToken.state = TOKEN_STATE.HOME;
                otherToken.pathPosition = -1;
                otherToken.mainPathIndex = -1;
                return { player: pid, token: otherToken };
            }
        }
    }

    return null;
}

/**
 * Check if a player has won (all 4 tokens finished)
 */
export function checkWinner(player, allTokens) {
    return allTokens[player].every((token) => token.state === TOKEN_STATE.FINISHED);
}

/**
 * Get the next player's turn
 */
export function getNextPlayer(currentPlayer, diceValue, captured, playerIds) {
    // Extra turn if rolled a 6 or captured a token
    if (diceValue === 6 || captured) {
        return currentPlayer;
    }

    const currentIndex = playerIds.indexOf(currentPlayer);
    return playerIds[(currentIndex + 1) % playerIds.length];
}

/**
 * Get moveable tokens for current player
 */
export function getMoveableTokens(player, diceValue, allTokens) {
    return allTokens[player].filter((token) => canMoveToken(token, diceValue, allTokens));
}
