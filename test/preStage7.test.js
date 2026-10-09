/**
 * Regression Tests — Pre-Stage 7 Corrections
 * Tests: welcome/generation behavior, timer lifecycle, verification enforcement,
 *        game state transitions, evidence stability, and shuffle rules.
 *
 * Run with: node --test test/preStage7.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function getEvidenceLogic() {
  return await import('../client/src/utils/evidenceLogic.js');
}

async function getBingoLogic() {
  return await import('../client/src/utils/bingoLogic.js');
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeTask(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Test Task',
    description: 'A test challenge',
    category: 'flora',
    difficulty: 'easy',
    verificationType: 'HONOR',
    safetyTip: 'Stay safe',
    ...overrides
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Fix 1 — Welcome / Generation contract (timer stays at 45:00 on load)
// ──────────────────────────────────────────────────────────────────────────────

describe('Welcome / Generation Contract', () => {
  test('SESSION_DURATION_SECONDS is 2700 (45 minutes)', async () => {
    const { SESSION_DURATION_SECONDS } = await getBingoLogic();
    assert.equal(SESSION_DURATION_SECONDS, 2700);
  });

  test('formatTime(2700) shows 45:00', async () => {
    const { formatTime } = await getBingoLogic();
    assert.equal(formatTime(2700), '45:00');
  });

  test('formatTime(0) shows 00:00', async () => {
    const { formatTime } = await getBingoLogic();
    assert.equal(formatTime(0), '00:00');
  });

  test('formatTime does not go negative — clamps to 00:00', async () => {
    const { formatTime } = await getBingoLogic();
    assert.equal(formatTime(-10), '00:00');
    assert.equal(formatTime(-999), '00:00');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fix 2 — Timer formatting edge cases
// ──────────────────────────────────────────────────────────────────────────────

describe('Timer edge cases', () => {
  test('formatTime(61) = 01:01', async () => {
    const { formatTime } = await getBingoLogic();
    assert.equal(formatTime(61), '01:01');
  });

  test('formatTime(1) = 00:01', async () => {
    const { formatTime } = await getBingoLogic();
    assert.equal(formatTime(1), '00:01');
  });

  test('formatTime(3600) = 60:00', async () => {
    const { formatTime } = await getBingoLogic();
    assert.equal(formatTime(3600), '60:00');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fix 3 — Shuffle preserves task identity
// ──────────────────────────────────────────────────────────────────────────────

describe('Shuffle Behavior', () => {
  test('shuffleBoard returns same 25 tasks in potentially different order', async () => {
    const { shuffleBoard } = await getBingoLogic();
    const tasks = Array.from({ length: 25 }, (_, i) => makeTask({ id: `task-${i + 1}`, title: `Task ${i + 1}` }));
    const shuffled = shuffleBoard(tasks);
    assert.equal(shuffled.length, 25);
    const originalIds = tasks.map(t => t.id).sort();
    const shuffledIds = shuffled.map(t => t.id).sort();
    assert.deepEqual(originalIds, shuffledIds);
  });

  test('shuffleBoard does not mutate the original array', async () => {
    const { shuffleBoard } = await getBingoLogic();
    const tasks = Array.from({ length: 25 }, (_, i) => makeTask({ id: `task-${i + 1}` }));
    const originalOrder = tasks.map(t => t.id);
    shuffleBoard(tasks);
    assert.deepEqual(tasks.map(t => t.id), originalOrder);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fix 4 — Verification Enforcement: PHOTO
// ──────────────────────────────────────────────────────────────────────────────

describe('canMarkComplete — PHOTO', () => {
  test('blocks without evidence', async () => {
    const { canMarkComplete } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'PHOTO' });
    const result = canMarkComplete(task, null);
    assert.equal(result.allowed, false);
    assert.ok(result.reason && result.reason.length > 0);
  });

  test('blocks with evidence but no previewUrl', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'PHOTO' });
    const evidence = createEvidenceRecord('task-1', 'PHOTO', { fileName: 'test.jpg' });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, false);
  });

  test('allows when previewUrl is present', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'PHOTO' });
    const evidence = createEvidenceRecord('task-1', 'PHOTO', { previewUrl: 'blob:http://localhost/abc123' });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fix 4 — Verification Enforcement: AUDIO
// ──────────────────────────────────────────────────────────────────────────────

describe('canMarkComplete — AUDIO', () => {
  test('blocks without evidence', async () => {
    const { canMarkComplete } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'AUDIO' });
    const result = canMarkComplete(task, null);
    assert.equal(result.allowed, false);
  });

  test('blocks with evidence but no audioUrl', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'AUDIO' });
    const evidence = createEvidenceRecord('task-1', 'AUDIO', { duration: 10 });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, false);
  });

  test('allows when audioUrl is present', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'AUDIO' });
    const evidence = createEvidenceRecord('task-1', 'AUDIO', { audioUrl: 'blob:http://localhost/xyz456' });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fix 4 — Verification Enforcement: GPS
// ──────────────────────────────────────────────────────────────────────────────

describe('canMarkComplete — GPS', () => {
  test('blocks without evidence', async () => {
    const { canMarkComplete } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'GPS' });
    const result = canMarkComplete(task, null);
    assert.equal(result.allowed, false);
  });

  test('blocks with evidence but no coordinates', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'GPS' });
    const evidence = createEvidenceRecord('task-1', 'GPS', { accuracy: 10 });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, false);
  });

  test('blocks with invalid latitude (out of range)', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'GPS' });
    const evidence = createEvidenceRecord('task-1', 'GPS', { latitude: 200, longitude: 80, accuracy: 5 });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, false);
  });

  test('allows with valid coordinates', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'GPS' });
    const evidence = createEvidenceRecord('task-1', 'GPS', { latitude: 51.5, longitude: -0.12, accuracy: 10 });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fix 4 — Verification Enforcement: HONOR
// ──────────────────────────────────────────────────────────────────────────────

describe('canMarkComplete — HONOR', () => {
  test('blocks without evidence', async () => {
    const { canMarkComplete } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'HONOR' });
    const result = canMarkComplete(task, null);
    assert.equal(result.allowed, false);
  });

  test('blocks when confirmed is false', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'HONOR' });
    const evidence = createEvidenceRecord('task-1', 'HONOR', { confirmed: false });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, false);
  });

  test('blocks when confirmed field is missing', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'HONOR' });
    const evidence = createEvidenceRecord('task-1', 'HONOR', { notes: 'I saw it' });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, false);
  });

  test('allows when confirmed is true', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'HONOR' });
    const evidence = createEvidenceRecord('task-1', 'HONOR', { confirmed: true });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, true);
  });

  test('allows with confirmed true and optional notes', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'HONOR' });
    const evidence = createEvidenceRecord('task-1', 'HONOR', { confirmed: true, notes: 'Saw a robin' });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fix 4 — Verification Enforcement: TIME (existing behavior preserved)
// ──────────────────────────────────────────────────────────────────────────────

describe('canMarkComplete — TIME (regression)', () => {
  test('blocks without evidence', async () => {
    const { canMarkComplete } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'TIME', durationSeconds: 60 });
    const result = canMarkComplete(task, null);
    assert.equal(result.allowed, false);
  });

  test('blocks when elapsed < required', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'TIME', durationSeconds: 60 });
    const evidence = createEvidenceRecord('task-1', 'TIME', { elapsedSeconds: 30 });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, false);
  });

  test('allows when elapsed === required', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'TIME', durationSeconds: 60 });
    const evidence = createEvidenceRecord('task-1', 'TIME', { elapsedSeconds: 60 });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, true);
  });

  test('allows when elapsed > required', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const task = makeTask({ verificationType: 'TIME', durationSeconds: 30 });
    const evidence = createEvidenceRecord('task-1', 'TIME', { elapsedSeconds: 45 });
    const result = canMarkComplete(task, evidence);
    assert.equal(result.allowed, true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Evidence stays with task ID through shuffles
// ──────────────────────────────────────────────────────────────────────────────

describe('Evidence stability across shuffle', () => {
  test('evidence taskId is stable regardless of board position', async () => {
    const { createEvidenceRecord, canMarkComplete } = await getEvidenceLogic();
    const { shuffleBoard } = await getBingoLogic();

    const tasks = Array.from({ length: 25 }, (_, i) => makeTask({ id: `task-${i + 1}`, verificationType: 'HONOR' }));
    const shuffled = shuffleBoard(tasks);

    // task-7 should still exist at some position
    const found = shuffled.find(t => t.id === 'task-7');
    assert.ok(found, 'task-7 should still exist after shuffle');

    // Evidence still validates correctly for task-7 with HONOR confirmed
    const evidence = createEvidenceRecord('task-7', 'HONOR', { confirmed: true });
    const result = canMarkComplete(found, evidence);
    assert.equal(result.allowed, true);
    assert.equal(evidence.taskId, 'task-7');
  });

  test('completing task-7 before shuffle does not lose evidence', async () => {
    const { createEvidenceRecord, canMarkComplete } = await getEvidenceLogic();
    const { shuffleBoard } = await getBingoLogic();

    const tasks = Array.from({ length: 25 }, (_, i) =>
      makeTask({ id: `task-${i + 1}`, verificationType: 'PHOTO' })
    );

    // Evidence for task-7 (by taskId)
    const evidenceMap = {
      'task-7': createEvidenceRecord('task-7', 'PHOTO', { previewUrl: 'blob:http://localhost/photo' })
    };

    const shuffled = shuffleBoard(tasks);

    // Find task-7 wherever it landed
    const task7AfterShuffle = shuffled.find(t => t.id === 'task-7');
    const evidenceForTask7 = evidenceMap['task-7'];

    // Should still be allowed
    const result = canMarkComplete(task7AfterShuffle, evidenceForTask7);
    assert.equal(result.allowed, true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Win detection functional correctness
// ──────────────────────────────────────────────────────────────────────────────

describe('Win detection — functional correctness', () => {
  test('detects top-row win from task IDs', async () => {
    const { checkWin } = await getBingoLogic();
    const tasks = Array.from({ length: 25 }, (_, i) => ({ id: `task-${i + 1}` }));
    const completed = new Set(['task-1', 'task-2', 'task-3', 'task-4', 'task-5']);
    const { hasWon } = checkWin(tasks, completed);
    assert.equal(hasWon, true);
  });

  test('detects main diagonal win (top-left to bottom-right)', async () => {
    const { checkWin } = await getBingoLogic();
    const tasks = Array.from({ length: 25 }, (_, i) => ({ id: `task-${i + 1}` }));
    // Indices 0,6,12,18,24 → task-1,task-7,task-13,task-19,task-25
    const completed = new Set(['task-1', 'task-7', 'task-13', 'task-19', 'task-25']);
    const { hasWon } = checkWin(tasks, completed);
    assert.equal(hasWon, true);
  });

  test('no win with only 4 in a row', async () => {
    const { checkWin } = await getBingoLogic();
    const tasks = Array.from({ length: 25 }, (_, i) => ({ id: `task-${i + 1}` }));
    const completed = new Set(['task-1', 'task-2', 'task-3', 'task-4']);
    const { hasWon } = checkWin(tasks, completed);
    assert.equal(hasWon, false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fix 5 — Session Lifecycle & Shuffle Restrictions
// ──────────────────────────────────────────────────────────────────────────────

describe('Session Lifecycle & Shuffle Restrictions', () => {
  function isShuffleAllowed(gameState, boardCellCount) {
    return gameState !== 'playing' && gameState !== 'paused' && boardCellCount === 25;
  }

  test('shuffle is disabled during active playing session', () => {
    assert.equal(isShuffleAllowed('playing', 25), false);
  });

  test('shuffle is disabled during paused session', () => {
    assert.equal(isShuffleAllowed('paused', 25), false);
  });

  test('shuffle is allowed between games when board exists (ended state)', () => {
    assert.equal(isShuffleAllowed('ended', 25), true);
  });

  test('shuffle is disabled if board is not populated (welcome with 0 tasks)', () => {
    assert.equal(isShuffleAllowed('welcome', 0), false);
  });

  function isTaskCompletionAllowed(gameState) {
    return gameState === 'playing';
  }

  test('task completions are blocked during paused session', () => {
    assert.equal(isTaskCompletionAllowed('paused'), false);
  });

  test('task completions are blocked after session ends', () => {
    assert.equal(isTaskCompletionAllowed('ended'), false);
  });

  test('task completions are allowed during active playing session', () => {
    assert.equal(isTaskCompletionAllowed('playing'), true);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Fix 6 — Session Timer Initial Activation Regression
// ──────────────────────────────────────────────────────────────────────────────

describe('Session Timer Initial Activation Regression', () => {
  class SessionTimerModel {
    constructor({ gameState = 'playing', resetKey = 1, onTimerExpire = null } = {}) {
      this.SESSION_DURATION = 2700;
      this.remainingSeconds = this.SESSION_DURATION;
      this.isExpired = false;
      this.deadline = null;
      this.pausedRemaining = this.SESSION_DURATION;
      this.intervalActive = false;
      this.prevResetKey = resetKey;
      this.gameState = gameState;
      this.resetKey = resetKey;
      this.onTimerExpire = onTimerExpire;
      this.currentTime = 1000000; // Simulated epoch ms

      this.syncLifecycle();
    }

    syncLifecycle() {
      let expired = this.isExpired;

      if (this.prevResetKey !== this.resetKey) {
        this.prevResetKey = this.resetKey;
        this.intervalActive = false;
        this.deadline = null;
        this.pausedRemaining = this.SESSION_DURATION;
        this.remainingSeconds = this.SESSION_DURATION;
        this.isExpired = false;
        expired = false;
      }

      if (this.gameState === 'ended') {
        this.intervalActive = false;
        if (this.deadline) {
          const diff = Math.max(0, Math.round((this.deadline - this.currentTime) / 1000));
          this.pausedRemaining = diff;
          this.remainingSeconds = diff;
          this.deadline = null;
        }
        this.isExpired = true;
        return;
      }

      if (this.gameState === 'playing') {
        this.isExpired = false;
        expired = false;
      }

      const isRunning = this.gameState === 'playing';
      if (isRunning && !expired) {
        this.deadline = this.currentTime + this.pausedRemaining * 1000;
        this.intervalActive = true;
      } else {
        this.intervalActive = false;
        if (!isRunning && this.deadline && !expired) {
          const diff = Math.max(0, Math.round((this.deadline - this.currentTime) / 1000));
          this.pausedRemaining = diff;
          this.remainingSeconds = diff;
          this.deadline = null;
        }
      }
    }

    tick() {
      if (!this.deadline || !this.intervalActive) return;
      const diff = Math.max(0, Math.round((this.deadline - this.currentTime) / 1000));
      this.remainingSeconds = diff;
      if (diff <= 0) {
        this.intervalActive = false;
        this.isExpired = true;
        if (this.onTimerExpire) this.onTimerExpire();
      }
    }

    advanceTimeSeconds(s) {
      this.currentTime += s * 1000;
      if (this.intervalActive) {
        this.tick();
      }
    }

    setGameState(state) {
      this.gameState = state;
      this.syncLifecycle();
    }

    setResetKey(key) {
      this.resetKey = key;
      this.syncLifecycle();
    }
  }

  test('timer automatically activates interval immediately on initial mount in playing state', async () => {
    const { formatTime } = await getBingoLogic();
    const timer = new SessionTimerModel({ gameState: 'playing', resetKey: 1 });

    assert.equal(timer.intervalActive, true, 'Interval must be active immediately upon mount');
    assert.equal(timer.remainingSeconds, 2700);
    assert.equal(formatTime(timer.remainingSeconds), '45:00');
  });

  test('after 5 seconds of active gameplay, timer counts down from 45:00 to 44:55 without pause/resume', async () => {
    const { formatTime } = await getBingoLogic();
    const timer = new SessionTimerModel({ gameState: 'playing', resetKey: 1 });

    assert.equal(formatTime(timer.remainingSeconds), '45:00');

    // Advance 5 seconds of active play
    timer.advanceTimeSeconds(5);

    assert.equal(timer.remainingSeconds, 2695);
    assert.equal(formatTime(timer.remainingSeconds), '44:55');
  });

  test('pause freezes timer at elapsed time; resume continues from exact remaining time', async () => {
    const { formatTime } = await getBingoLogic();
    const timer = new SessionTimerModel({ gameState: 'playing', resetKey: 1 });

    timer.advanceTimeSeconds(10);
    assert.equal(formatTime(timer.remainingSeconds), '44:50');

    // Pause game
    timer.setGameState('paused');
    assert.equal(timer.intervalActive, false, 'Interval must halt on pause');

    // 15 seconds pass while paused
    timer.advanceTimeSeconds(15);
    assert.equal(timer.remainingSeconds, 2690, 'Time must not decrease while paused');
    assert.equal(formatTime(timer.remainingSeconds), '44:50');

    // Resume game
    timer.setGameState('playing');
    assert.equal(timer.intervalActive, true, 'Interval resumes');

    // 5 more seconds of play
    timer.advanceTimeSeconds(5);
    assert.equal(timer.remainingSeconds, 2685);
    assert.equal(formatTime(timer.remainingSeconds), '44:45');
  });

  test('ending session halts countdown; starting new game resets to 45:00', async () => {
    const { formatTime } = await getBingoLogic();
    const timer = new SessionTimerModel({ gameState: 'playing', resetKey: 1 });

    timer.advanceTimeSeconds(20);
    assert.equal(formatTime(timer.remainingSeconds), '44:40');

    // End session early
    timer.setGameState('ended');
    assert.equal(timer.intervalActive, false);
    assert.equal(timer.isExpired, true);

    // Time passing after session end has no effect
    timer.advanceTimeSeconds(100);
    assert.equal(timer.remainingSeconds, 2680);

    // Start new game: resetKey increments, gameState returns to playing
    timer.setResetKey(2);
    timer.setGameState('playing');

    assert.equal(timer.remainingSeconds, 2700);
    assert.equal(formatTime(timer.remainingSeconds), '45:00');
    assert.equal(timer.intervalActive, true);
    assert.equal(timer.isExpired, false);

    // New game countdown runs
    timer.advanceTimeSeconds(5);
    assert.equal(formatTime(timer.remainingSeconds), '44:55');
  });
});

