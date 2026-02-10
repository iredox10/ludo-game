import { useMemo } from 'react';
import {
    BOARD_SIZE,
    MAIN_PATH,
    HOME_PATHS,
    HOME_BASE_POSITIONS,
    SAFE_POSITIONS,
    START_POSITIONS,
    PLAYER_COLORS,
} from '../utils/constants';
import './Board.css';

// Map a cell to its color role
function getCellInfo(col, row) {
    // Center home (7,7) — triangle meeting point
    if (col === 7 && row === 7) return { type: 'center' };

    // Quadrant yards (home bases)
    // Red: top-left (0-5, 0-5)
    if (col >= 0 && col <= 5 && row >= 0 && row <= 5) {
        if (col >= 1 && col <= 4 && row >= 1 && row <= 4) return { type: 'yard', player: 0 };
        return { type: 'yard-border', player: 0 };
    }
    // Green: top-right (9-14, 0-5)
    if (col >= 9 && col <= 14 && row >= 0 && row <= 5) {
        if (col >= 10 && col <= 13 && row >= 1 && row <= 4) return { type: 'yard', player: 1 };
        return { type: 'yard-border', player: 1 };
    }
    // Yellow: bottom-right (9-14, 9-14)
    if (col >= 9 && col <= 14 && row >= 9 && row <= 14) {
        if (col >= 10 && col <= 13 && row >= 10 && row <= 13) return { type: 'yard', player: 2 };
        return { type: 'yard-border', player: 2 };
    }
    // Blue: bottom-left (0-5, 9-14)
    if (col >= 0 && col <= 5 && row >= 9 && row <= 14) {
        if (col >= 1 && col <= 4 && row >= 10 && row <= 13) return { type: 'yard', player: 3 };
        return { type: 'yard-border', player: 3 };
    }

    // Home stretch cells
    for (let p = 0; p < 4; p++) {
        const homePath = HOME_PATHS[p];
        for (const [hc, hr] of homePath) {
            if (col === hc && row === hr) return { type: 'home-stretch', player: p };
        }
    }

    // Home triangles (the colored triangles pointing to center)
    // Red triangle: col 6, row 7 area -> the triangle cells around center
    if (row === 7 && col >= 1 && col <= 5) return { type: 'home-stretch', player: 0 };
    if (col === 7 && row >= 1 && row <= 5) return { type: 'home-stretch', player: 1 };
    if (row === 7 && col >= 9 && col <= 13) return { type: 'home-stretch', player: 2 };
    if (col === 7 && row >= 9 && row <= 13) return { type: 'home-stretch', player: 3 };

    // Main path cells
    const mainIdx = MAIN_PATH.findIndex(([mc, mr]) => mc === col && mr === row);
    if (mainIdx >= 0) {
        // Check if it's a safe/star position
        if (SAFE_POSITIONS.includes(mainIdx)) {
            // Find which player's start this is
            for (let p = 0; p < 4; p++) {
                if (START_POSITIONS[p] === mainIdx) return { type: 'start', player: p, pathIndex: mainIdx };
            }
            return { type: 'safe', pathIndex: mainIdx };
        }
        return { type: 'path', pathIndex: mainIdx };
    }

    return { type: 'empty' };
}

// Center triangles component
function CenterTriangles({ cellSize }) {
    const center = 7 * cellSize;
    const halfCell = cellSize / 2;
    const triSize = cellSize;

    return (
        <svg
            className="center-triangles"
            style={{
                position: 'absolute',
                left: 6 * cellSize,
                top: 6 * cellSize,
                width: 3 * cellSize,
                height: 3 * cellSize,
                pointerEvents: 'none',
            }}
        >
            {/* Red triangle - left */}
            <polygon
                points={`0,0 ${1.5 * cellSize},${1.5 * cellSize} 0,${3 * cellSize}`}
                fill={PLAYER_COLORS[0].main}
                stroke="white"
                strokeWidth="1"
            />
            {/* Green triangle - top */}
            <polygon
                points={`0,0 ${3 * cellSize},0 ${1.5 * cellSize},${1.5 * cellSize}`}
                fill={PLAYER_COLORS[1].main}
                stroke="white"
                strokeWidth="1"
            />
            {/* Yellow triangle - right */}
            <polygon
                points={`${3 * cellSize},0 ${3 * cellSize},${3 * cellSize} ${1.5 * cellSize},${1.5 * cellSize}`}
                fill={PLAYER_COLORS[2].main}
                stroke="white"
                strokeWidth="1"
            />
            {/* Blue triangle - bottom */}
            <polygon
                points={`0,${3 * cellSize} ${3 * cellSize},${3 * cellSize} ${1.5 * cellSize},${1.5 * cellSize}`}
                fill={PLAYER_COLORS[3].main}
                stroke="white"
                strokeWidth="1"
            />
        </svg>
    );
}

export default function Board({ cellSize = 40, activePlayers = [0, 1, 2, 3] }) {
    const boardPx = BOARD_SIZE * cellSize;

    const cells = useMemo(() => {
        const result = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                const info = getCellInfo(col, row);
                result.push({ col, row, ...info });
            }
        }
        return result;
    }, []);

    return (
        <div
            className="ludo-board"
            style={{ width: boardPx, height: boardPx }}
        >
            {/* Grid cells */}
            {cells.map(({ col, row, type, player, pathIndex }) => {
                let className = 'board-cell';
                let style = {
                    left: col * cellSize,
                    top: row * cellSize,
                    width: cellSize,
                    height: cellSize,
                };

                if (type === 'yard' || type === 'yard-border') {
                    className += ` yard player-${player}`;
                    if (type === 'yard') className += ' yard-inner';
                } else if (type === 'home-stretch') {
                    className += ` home-stretch player-${player}`;
                } else if (type === 'path') {
                    className += ' path-cell';
                } else if (type === 'safe') {
                    className += ' path-cell safe-cell';
                } else if (type === 'start') {
                    className += ` path-cell start-cell player-${player}`;
                } else if (type === 'center') {
                    className += ' center-cell';
                } else {
                    return null;
                }

                const isInactive = (type === 'yard' || type === 'yard-border') &&
                    player !== undefined && !activePlayers.includes(player);

                return (
                    <div
                        key={`${col}-${row}`}
                        className={`${className}${isInactive ? ' inactive' : ''}`}
                        style={style}
                    >
                        {type === 'safe' && <span className="star">★</span>}
                        {type === 'start' && <span className="star start-star">★</span>}
                    </div>
                );
            })}

            {/* Home base circles */}
            {Object.entries(HOME_BASE_POSITIONS).map(([player, positions]) => {
                const p = parseInt(player);
                if (!activePlayers.includes(p)) return null;

                return positions.map(([col, row], i) => (
                    <div
                        key={`base-${player}-${i}`}
                        className={`home-base-circle player-${player}`}
                        style={{
                            left: col * cellSize + cellSize * 0.15,
                            top: row * cellSize + cellSize * 0.15,
                            width: cellSize * 0.7,
                            height: cellSize * 0.7,
                        }}
                    />
                ));
            })}

            {/* Center triangles */}
            <CenterTriangles cellSize={cellSize} />
        </div>
    );
}
