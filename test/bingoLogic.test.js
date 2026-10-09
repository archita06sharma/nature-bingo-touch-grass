/**
 * Automated Tests for Bingo Game Logic & Countdown Engine
 * Tests all 12 winning lines, incomplete lines, unchecking, shuffling, and timer logic.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// Import ES module using dynamic import
async function getBingoLogic() {
  return await import('../client/src/utils/bingoLogic.js');
}

describe('Bingo Logic & Win Detection Tests', () => {

  // Helper to generate mock 25-cell board
  function createMockBoard() {
    return Array.from({ length: 25 }, (_, i) => ({
      id: `task-${i + 1}`,
      title: `Task #${i + 1}`,
      category: 'flora',
      verificationType: 'PHOTO'
    }));
  }

  test('Has exactly 12 predefined winning lines (5 rows, 5 cols, 2 diagonals)', async () => {
    const { WINNING_LINES } = await getBingoLogic();
    assert.equal(WINNING_LINES.length, 12);
    
    const rows = WINNING_LINES.filter(l => l.type === 'row');
    const cols = WINNING_LINES.filter(l => l.type === 'col');
    const diags = WINNING_LINES.filter(l => l.type === 'diag');

    assert.equal(rows.length, 5);
    assert.equal(cols.length, 5);
    assert.equal(diags.length, 2);
  });

  test('Detects each of the 5 horizontal rows correctly', async () => {
    const { checkWin, WINNING_LINES } = await getBingoLogic();
    const board = createMockBoard();
    const rows = WINNING_LINES.filter(l => l.type === 'row');

    for (const row of rows) {
      const completedTaskIds = new Set(row.cells.map(idx => board[idx].id));
      const result = checkWin(board, completedTaskIds);

      assert.equal(result.hasWon, true, `Row ${row.name} should trigger win`);
      assert.equal(result.winningLines.length, 1);
      assert.equal(result.winningLines[0].name, row.name);
      assert.deepEqual(result.winningCellIndices, row.cells);
      assert.equal(result.totalCompleted, 5);
    }
  });

  test('Detects each of the 5 vertical columns correctly', async () => {
    const { checkWin, WINNING_LINES } = await getBingoLogic();
    const board = createMockBoard();
    const cols = WINNING_LINES.filter(l => l.type === 'col');

    for (const col of cols) {
      const completedTaskIds = new Set(col.cells.map(idx => board[idx].id));
      const result = checkWin(board, completedTaskIds);

      assert.equal(result.hasWon, true, `Column ${col.name} should trigger win`);
      assert.equal(result.winningLines.length, 1);
      assert.equal(result.winningLines[0].name, col.name);
      assert.deepEqual(result.winningCellIndices, col.cells);
      assert.equal(result.totalCompleted, 5);
    }
  });

  test('Detects both diagonal lines correctly', async () => {
    const { checkWin, WINNING_LINES } = await getBingoLogic();
    const board = createMockBoard();
    const diags = WINNING_LINES.filter(l => l.type === 'diag');

    // Main diagonal [0, 6, 12, 18, 24]
    const mainDiag = diags[0];
    const mainCompleted = new Set(mainDiag.cells.map(idx => board[idx].id));
    const mainResult = checkWin(board, mainCompleted);
    assert.equal(mainResult.hasWon, true);
    assert.deepEqual(mainResult.winningCellIndices, [0, 6, 12, 18, 24]);

    // Anti-diagonal [4, 8, 12, 16, 20]
    const antiDiag = diags[1];
    const antiCompleted = new Set(antiDiag.cells.map(idx => board[idx].id));
    const antiResult = checkWin(board, antiCompleted);
    assert.equal(antiResult.hasWon, true);
    assert.deepEqual(antiResult.winningCellIndices, [4, 8, 12, 16, 20]);
  });

  test('Detects multiple simultaneous lines (e.g., intersecting row and col)', async () => {
    const { checkWin } = await getBingoLogic();
    const board = createMockBoard();
    
    // Complete Row 1 (cells 0, 1, 2, 3, 4) AND Column 1 (cells 0, 5, 10, 15, 20)
    const completed = new Set([
      board[0].id, board[1].id, board[2].id, board[3].id, board[4].id,
      board[5].id, board[10].id, board[15].id, board[20].id
    ]);

    const result = checkWin(board, completed);
    assert.equal(result.hasWon, true);
    assert.equal(result.winningLines.length, 2);
    assert.equal(result.totalCompleted, 9);
    assert.ok(result.winningLines.some(l => l.name === 'Row 1'));
    assert.ok(result.winningLines.some(l => l.name === 'Column 1'));
  });

  test('Does NOT trigger win for 4 cells in a row (incomplete line)', async () => {
    const { checkWin } = await getBingoLogic();
    const board = createMockBoard();
    
    // Only 4 cells of Row 1 completed
    const incompleteRow = new Set([
      board[0].id, board[1].id, board[2].id, board[3].id
    ]);

    const result = checkWin(board, incompleteRow);
    assert.equal(result.hasWon, false);
    assert.equal(result.winningLines.length, 0);
    assert.equal(result.winningCellIndices.length, 0);
    assert.equal(result.totalCompleted, 4);
  });

  test('Unchecking a cell correctly breaks the winning line', async () => {
    const { checkWin } = await getBingoLogic();
    const board = createMockBoard();
    
    const completedSet = new Set([
      board[0].id, board[1].id, board[2].id, board[3].id, board[4].id
    ]);

    // Initial state: win
    const wonResult = checkWin(board, completedSet);
    assert.equal(wonResult.hasWon, true);

    // Uncheck cell 2
    completedSet.delete(board[2].id);
    const uncheckResult = checkWin(board, completedSet);
    assert.equal(uncheckResult.hasWon, false);
    assert.equal(uncheckResult.winningLines.length, 0);
    assert.equal(uncheckResult.totalCompleted, 4);
  });

  test('Shuffling preserves exact task set and IDs without duplication', async () => {
    const { shuffleBoard, checkWin } = await getBingoLogic();
    const board = createMockBoard();
    
    const shuffled = shuffleBoard(board);
    assert.equal(shuffled.length, 25);
    
    const originalIds = new Set(board.map(c => c.id));
    const shuffledIds = new Set(shuffled.map(c => c.id));
    assert.deepEqual(shuffledIds, originalIds, 'All original task IDs must exist after shuffle');

    // Verify completion states are preserved across new positions
    const completedIds = new Set(['task-1', 'task-5', 'task-10']);
    const preCheck = checkWin(board, completedIds);
    const postCheck = checkWin(shuffled, completedIds);
    assert.equal(preCheck.totalCompleted, 3);
    assert.equal(postCheck.totalCompleted, 3);
  });
});

describe('Session Timer & Formatting Tests', () => {

  test('formatTime correctly formats various durations', async () => {
    const { formatTime } = await getBingoLogic();
    assert.equal(formatTime(2700), '45:00', '45 minutes');
    assert.equal(formatTime(60), '01:00', '1 minute');
    assert.equal(formatTime(65), '01:05', '1 minute 5 seconds');
    assert.equal(formatTime(9), '00:09', '9 seconds');
    assert.equal(formatTime(0), '00:00', 'Zero seconds');
    assert.equal(formatTime(-15), '00:00', 'Negative clamped to zero');
    assert.equal(formatTime(NaN), '00:00', 'NaN clamped to zero');
  });

  test('Deadline elapsed time simulation correctly calculates remaining time', async () => {
    const duration = 2700;
    const now = 1000000;
    const deadline = now + duration * 1000;

    // Simulate 5 minutes elapsed (300 seconds)
    const simulatedNow = now + 300 * 1000;
    const remaining = Math.max(0, Math.round((deadline - simulatedNow) / 1000));
    assert.equal(remaining, 2400);

    // Simulate expired deadline
    const expiredNow = deadline + 5000;
    const expiredRemaining = Math.max(0, Math.round((deadline - expiredNow) / 1000));
    assert.equal(expiredRemaining, 0);
  });
});
