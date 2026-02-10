import { useMemo } from 'react';
import {
    MAIN_PATH,
    HOME_PATHS,
    HOME_BASE_POSITIONS,
    START_POSITIONS,
    TOKEN_STATE,
    PLAYER_COLORS,
} from '../utils/constants';
import { getAbsoluteMainPathIndex } from '../utils/gameLogic';
import './Token.css';

function getTokenPosition(token, cellSize) {
    const { player, state, pathPosition, index } = token;

    if (state === TOKEN_STATE.HOME) {
        const [col, row] = HOME_BASE_POSITIONS[player][index];
        return {
            x: col * cellSize + cellSize / 2,
            y: row * cellSize + cellSize / 2,
        };
    }

    if (state === TOKEN_STATE.FINISHED) {
        // Offset finished tokens around center so they don't overlap
        const offsets = [
            [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3],
        ];
        return {
            x: (7 + offsets[index][0]) * cellSize + cellSize / 2,
            y: (7 + offsets[index][1]) * cellSize + cellSize / 2,
        };
    }

    // Active on main path
    if (pathPosition >= 0 && pathPosition < 51) {
        const absIndex = getAbsoluteMainPathIndex(player, pathPosition);
        const [col, row] = MAIN_PATH[absIndex];
        return {
            x: col * cellSize + cellSize / 2,
            y: row * cellSize + cellSize / 2,
        };
    }

    // In home stretch
    if (pathPosition >= 51 && pathPosition < 57) {
        const homeIndex = pathPosition - 51;
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

// Check for stacked tokens and return offset
function getStackOffset(token, allTokens, cellSize) {
    if (token.state === TOKEN_STATE.HOME || token.state === TOKEN_STATE.FINISHED) return { dx: 0, dy: 0 };

    // Find all tokens on same position
    const stackedTokens = [];
    for (const playerId in allTokens) {
        for (const t of allTokens[playerId]) {
            if (t.id === token.id) continue;
            if (t.state !== TOKEN_STATE.ACTIVE) continue;

            const myPos = getTokenPosition(token, cellSize);
            const otherPos = getTokenPosition(t, cellSize);

            if (Math.abs(myPos.x - otherPos.x) < 2 && Math.abs(myPos.y - otherPos.y) < 2) {
                stackedTokens.push(t);
            }
        }
    }

    if (stackedTokens.length === 0) return { dx: 0, dy: 0 };

    // Find this token's index among stacked ones
    const allStacked = [token, ...stackedTokens].sort((a, b) => a.id.localeCompare(b.id));
    const myIdx = allStacked.findIndex((t) => t.id === token.id);

    const offsets = [
        [-5, -5], [5, -5], [-5, 5], [5, 5],
    ];

    return { dx: offsets[myIdx % 4][0], dy: offsets[myIdx % 4][1] };
}

export default function Tokens({
    tokens,
    cellSize = 40,
    moveableTokens = [],
    currentPlayer,
    onTokenClick,
}) {
    // Flatten all tokens
    const allTokensList = useMemo(() => {
        const list = [];
        for (const playerId in tokens) {
            for (const token of tokens[playerId]) {
                list.push(token);
            }
        }
        return list;
    }, [tokens]);

    // Pawn is taller than wide — sized big and bold
    const pawnWidth = cellSize * 0.78;
    const pawnHeight = cellSize * 1.0;

    return (
        <div className="tokens-layer" style={{ width: 15 * cellSize, height: 15 * cellSize }}>
            {allTokensList.map((token) => {
                const pos = getTokenPosition(token, cellSize);
                const offset = getStackOffset(token, tokens, cellSize);
                const isMoveable = moveableTokens.includes(token.id);
                const colors = PLAYER_COLORS[token.player];

                return (
                    <div
                        key={token.id}
                        className={`token player-${token.player} ${isMoveable ? 'moveable' : ''} ${token.state === TOKEN_STATE.FINISHED ? 'finished' : ''}`}
                        style={{
                            left: pos.x + offset.dx - pawnWidth / 2,
                            // Shift up slightly so the base sits on the cell center
                            top: pos.y + offset.dy - pawnHeight * 0.6,
                            width: pawnWidth,
                            height: pawnHeight,
                            '--token-color': colors.main,
                            '--token-light': colors.light,
                            '--token-dark': colors.dark,
                            '--token-glow': colors.glow,
                            cursor: isMoveable ? 'pointer' : 'default',
                            zIndex: isMoveable ? 10 : token.state === TOKEN_STATE.ACTIVE ? 5 : 2,
                        }}
                        onClick={() => isMoveable && onTokenClick(token.id)}
                        title={isMoveable ? 'Click to move this token' : ''}
                    >
                        {/* 3D Pawn: head → body → base */}
                        <div className="pawn">
                            <div className="pawn-head">
                                <div className="pawn-shine" />
                            </div>
                            <div className="pawn-body" />
                            <div className="pawn-base" />
                        </div>
                        <div className="pawn-shadow" />
                    </div>
                );
            })}
        </div>
    );
}
