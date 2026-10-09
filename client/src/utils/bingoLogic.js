/**
 * Bingo Logic Engine for Nature Bingo — Touch Grass
 * Defines winning combinations, win detection, shuffle algorithms, and timer helpers.
 */

// 12 winning lines across 5x5 grid (5 rows, 5 columns, 2 diagonals)
export const WINNING_LINES = Object.freeze([
  // 5 Horizontal Rows
  { name: 'Row 1', type: 'row', index: 0, cells: [0, 1, 2, 3, 4] },
  { name: 'Row 2', type: 'row', index: 1, cells: [5, 6, 7, 8, 9] },
  { name: 'Row 3', type: 'row', index: 2, cells: [10, 11, 12, 13, 14] },
  { name: 'Row 4', type: 'row', index: 3, cells: [15, 16, 17, 18, 19] },
  { name: 'Row 5', type: 'row', index: 4, cells: [20, 21, 22, 23, 24] },

  // 5 Vertical Columns
  { name: 'Column 1', type: 'col', index: 0, cells: [0, 5, 10, 15, 20] },
  { name: 'Column 2', type: 'col', index: 1, cells: [1, 6, 11, 16, 21] },
  { name: 'Column 3', type: 'col', index: 2, cells: [2, 7, 12, 17, 22] },
  { name: 'Column 4', type: 'col', index: 3, cells: [3, 8, 13, 18, 23] },
  { name: 'Column 5', type: 'col', index: 4, cells: [4, 9, 14, 19, 24] },

  // 2 Diagonals
  { name: 'Main Diagonal (Top-Left to Bottom-Right)', type: 'diag', index: 0, cells: [0, 6, 12, 18, 24] },
  { name: 'Anti-Diagonal (Top-Right to Bottom-Left)', type: 'diag', index: 1, cells: [4, 8, 12, 16, 20] }
]);

/**
 * Checks if the current board state contains any completed winning lines.
 * @param {Array<{ id: string }>} boardCells - Exactly 25 cells currently displayed on the board
 * @param {Set<string>|Array<string>} completedTaskIds - IDs of completed tasks
 * @returns {{
 *   hasWon: boolean,
 *   winningLines: Array<{ name: string, type: string, index: number, cells: number[] }>,
 *   winningCellIndices: number[],
 *   totalCompleted: number
 * }}
 */
export function checkWin(boardCells, completedTaskIds) {
  if (!Array.isArray(boardCells) || boardCells.length !== 25) {
    return {
      hasWon: false,
      winningLines: [],
      winningCellIndices: [],
      totalCompleted: 0
    };
  }

  const completedSet = completedTaskIds instanceof Set
    ? completedTaskIds
    : new Set(Array.isArray(completedTaskIds) ? completedTaskIds : []);

  // Determine which cell indices on the board are marked completed
  const completedIndices = new Set();
  boardCells.forEach((cell, idx) => {
    if (cell && cell.id && completedSet.has(cell.id)) {
      completedIndices.add(idx);
    }
  });

  const matchedLines = [];
  const winningIndices = new Set();

  for (const line of WINNING_LINES) {
    const isLineComplete = line.cells.every(cellIdx => completedIndices.has(cellIdx));
    if (isLineComplete) {
      matchedLines.push(line);
      line.cells.forEach(idx => winningIndices.add(idx));
    }
  }

  return {
    hasWon: matchedLines.length > 0,
    winningLines: matchedLines,
    winningCellIndices: Array.from(winningIndices).sort((a, b) => a - b),
    totalCompleted: completedIndices.size
  };
}

/**
 * Shuffles the arrangement of the given 25 tasks using Fisher-Yates algorithm.
 * Preserves the exact task objects without altering their IDs or properties.
 * @param {Array<T>} items
 * @param {Function} [randomFn] - Optional deterministic random generator for testing
 * @returns {Array<T>}
 */
export function shuffleBoard(items, randomFn = Math.random) {
  if (!Array.isArray(items)) return [];
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Formats seconds into MM:SS format. Clamps negative values to 00:00.
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatTime(totalSeconds) {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds <= 0) {
    return '00:00';
  }
  const clamped = Math.floor(totalSeconds);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(minutes)}:${pad(seconds)}`;
}

export const SESSION_DURATION_SECONDS = 45 * 60; // 45 minutes = 2700 seconds
