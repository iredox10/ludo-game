import {
    MAIN_PATH,
    SAFE_POSITIONS,
    START_POSITIONS,
    TOKEN_STATE,
} from './constants';
import { getAbsoluteMainPathIndex, getMoveableTokens, moveToken } from './gameLogic';

/**
 * AI Player - chooses the best token to move given the current board state.
 *
 * Strategy priority (highest first):
 *  1. Move a token into HOME (finish it)
 *  2. Capture an opponent's token
 *  3. Move a token onto a safe/star position
 *  4. Bring a new token out from base (on a 6)
 *  5. Move the most advanced token (closest to home)
 *  6. Avoid landing on a position threatened by opponents
 *  7. As a fallback, move the first available token
 */
export function chooseBestToken(player, diceValue, allTokens) {
    const moveable = getMoveableTokens(player, diceValue, allTokens);

    if (moveable.length === 0) return null;
    if (moveable.length === 1) return moveable[0].id;

    // Score each moveable token
    const scored = moveable.map((token) => {
        let score = 0;
        const newPos = token.state === TOKEN_STATE.HOME ? 0 : token.pathPosition + diceValue;

        // 1. Can finish? Highest priority
        if (newPos === 56) {
            score += 1000;
        }

        // 2. Can capture? Simulate the move
        if (token.state === TOKEN_STATE.ACTIVE && newPos < 51) {
            const { captured } = moveToken(token, diceValue, allTokens);
            if (captured) {
                score += 800;
                // Extra bonus for capturing tokens that are far advanced
                if (captured.token && captured.token.pathPosition > 30) {
                    score += 200;
                }
            }
        }

        // 3. Bring out from base with a 6 — if we have few active tokens
        if (token.state === TOKEN_STATE.HOME && diceValue === 6) {
            const activeCount = allTokens[player].filter((t) => t.state === TOKEN_STATE.ACTIVE).length;
            const finishedCount = allTokens[player].filter((t) => t.state === TOKEN_STATE.FINISHED).length;

            if (activeCount === 0) {
                score += 700; // No tokens on board — must bring one out
            } else if (activeCount <= 1 && finishedCount < 3) {
                score += 400; // Only 1 token on board, bring another out
            } else {
                score += 200; // Good to have more tokens out
            }
        }

        // 4. Land on a safe position
        if (token.state === TOKEN_STATE.ACTIVE && newPos < 51) {
            const absNewPos = getAbsoluteMainPathIndex(player, newPos);
            if (SAFE_POSITIONS.includes(absNewPos)) {
                score += 300;
            }
        }

        // 5. Enter home stretch (positions 51-55) — safe from capture
        if (token.state === TOKEN_STATE.ACTIVE && newPos >= 51 && newPos < 56) {
            score += 350;
        }

        // 6. Progress bonus — prefer moving the most advanced token
        if (token.state === TOKEN_STATE.ACTIVE) {
            score += token.pathPosition * 3;
        }

        // 7. Danger avoidance — penalize landing near opponent tokens
        if (token.state === TOKEN_STATE.ACTIVE && newPos < 51) {
            const absNewPos = getAbsoluteMainPathIndex(player, newPos);
            if (!SAFE_POSITIONS.includes(absNewPos)) {
                const dangerScore = calculateDanger(player, absNewPos, allTokens);
                score -= dangerScore;
            }
        }

        // 8. Escape danger — bonus for moving away from a currently dangerous position
        if (token.state === TOKEN_STATE.ACTIVE && token.pathPosition < 51) {
            const currentAbsPos = getAbsoluteMainPathIndex(player, token.pathPosition);
            if (!SAFE_POSITIONS.includes(currentAbsPos)) {
                const currentDanger = calculateDanger(player, currentAbsPos, allTokens);
                if (currentDanger > 0) {
                    score += 150; // Bonus for escaping danger
                }
            }
        }

        // 9. When on a 6, slight bias against moving a token that's safely positioned
        if (diceValue === 6 && token.state === TOKEN_STATE.ACTIVE) {
            const currentAbsPos = getAbsoluteMainPathIndex(player, token.pathPosition);
            if (SAFE_POSITIONS.includes(currentAbsPos) && token.pathPosition < 46) {
                score -= 100; // Slight penalty for leaving a safe spot with a 6
            }
        }

        return { token, score };
    });

    // Sort by score descending, pick the top one
    scored.sort((a, b) => b.score - a.score);

    // Add a tiny bit of randomness so the AI isn't perfectly predictable
    // If top two scores are very close, sometimes pick the second
    if (scored.length >= 2 && Math.abs(scored[0].score - scored[1].score) < 50) {
        const pick = Math.random() < 0.3 ? 1 : 0;
        return scored[pick].token.id;
    }

    return scored[0].token.id;
}

/**
 * Calculate how dangerous a position is based on nearby opponent tokens
 * Returns a danger score (0 = safe, higher = more dangerous)
 */
function calculateDanger(player, absPosition, allTokens) {
    let danger = 0;

    for (const playerId in allTokens) {
        const pid = parseInt(playerId);
        if (pid === player) continue;

        for (const token of allTokens[pid]) {
            if (token.state !== TOKEN_STATE.ACTIVE) continue;

            // Check if opponent can reach this position in 1-6 steps
            for (let dice = 1; dice <= 6; dice++) {
                const opponentNewPos = token.pathPosition + dice;
                if (opponentNewPos >= 51) continue;

                const opponentAbsPos = getAbsoluteMainPathIndex(pid, opponentNewPos);
                if (opponentAbsPos === absPosition) {
                    // Closer threats are more dangerous
                    danger += (7 - dice) * 20;
                    break;
                }
            }
        }
    }

    return danger;
}
