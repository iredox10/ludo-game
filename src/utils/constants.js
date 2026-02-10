// Player colors
export const PLAYERS = {
    RED: 0,
    GREEN: 1,
    YELLOW: 2,
    BLUE: 3,
};

export const PLAYER_NAMES = ['Red', 'Green', 'Yellow', 'Blue'];

export const PLAYER_COLORS = {
    0: { main: '#E53935', light: '#FF6F60', dark: '#AB000D', bg: '#FFCDD2', glow: 'rgba(229,57,53,0.5)' },
    1: { main: '#43A047', light: '#76D275', dark: '#00701A', bg: '#C8E6C9', glow: 'rgba(67,160,71,0.5)' },
    2: { main: '#FDD835', light: '#FFFF6B', dark: '#C6A700', bg: '#FFF9C4', glow: 'rgba(253,216,53,0.5)' },
    3: { main: '#1E88E5', light: '#6AB7FF', dark: '#005CB2', bg: '#BBDEFB', glow: 'rgba(30,136,229,0.5)' },
};

// Board dimensions
export const BOARD_SIZE = 15;
export const CELL_SIZE = 40;
export const BOARD_PX = BOARD_SIZE * CELL_SIZE;

// The main path around the board (51 cells, 0-indexed)
// Each entry is [col, row] on the 15x15 grid
export const MAIN_PATH = [
    // Bottom-left going up (Red's start column)
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    // Turn up
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
    // Turn right across top
    [7, 0], [8, 0],
    // Go down (Green column)
    [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    // Turn right
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
    // Turn down
    [14, 7], [14, 8],
    // Go left (Yellow row)
    [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
    // Turn down
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
    // Turn left
    [7, 14], [6, 14],
    // Go up (Blue column)
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
    // Turn left
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    // Turn up
    [0, 7],
];

// Home stretch paths (the colored columns leading to center)
export const HOME_PATHS = {
    0: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]], // Red: left to center
    1: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]], // Green: top to center
    2: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]], // Yellow: right to center
    3: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]], // Blue: bottom to center
};

// Where each player enters the main path (index in MAIN_PATH)
export const START_POSITIONS = {
    0: 0,   // Red starts at index 0
    1: 13,  // Green starts at index 13
    2: 26,  // Yellow starts at index 26
    3: 39,  // Blue starts at index 39
};

// Where each player turns into home stretch (index in MAIN_PATH)
// The cell BEFORE the home entry
export const HOME_ENTRY = {
    0: 50,  // Red enters home after index 50
    1: 11,  // Green enters home after index 11
    2: 24,  // Yellow enters home after index 24
    3: 37,  // Blue enters home after index 37
};

// Safe positions on the main path (cannot be captured here)
// Stars positions (indices in MAIN_PATH)
export const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];

// Home base token positions (where tokens sit before entering the board)
export const HOME_BASE_POSITIONS = {
    0: [[2, 2], [3, 2], [2, 3], [3, 3]],       // Red: top-left
    1: [[11, 2], [12, 2], [11, 3], [12, 3]],     // Green: top-right
    2: [[11, 11], [12, 11], [11, 12], [12, 12]], // Yellow: bottom-right
    3: [[2, 11], [3, 11], [2, 12], [3, 12]],     // Blue: bottom-left
};

// Token states
export const TOKEN_STATE = {
    HOME: 'home',
    ACTIVE: 'active',
    FINISHED: 'finished',
};

// Number of steps to complete the circuit + home path
export const TOTAL_STEPS = 56; // 51 around + 5 in home stretch + final home cell
