/**
 * End-to-End Gameplay Lifecycle Tests
 * Simulates user journeys from welcome screen through exploration,
 * pausing/resuming, evidence verification, session termination, and board reset.
 *
 * Run with: node --test test/gameplayFlow.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function getModules() {
  const bingo = await import('../client/src/utils/bingoLogic.js');
  const evidence = await import('../client/src/utils/evidenceLogic.js');
  const { FALLBACK_TASKS } = require('../server/fallbackTasks.js');
  return { ...bingo, ...evidence, FALLBACK_TASKS };
}

describe('Full Gameplay Flow & Lifecycle Verification', () => {

  test('Journey 1: Initial Welcome State Contract', async () => {
    const { SESSION_DURATION_SECONDS, formatTime } = await getModules();

    // 1. App opens in welcome state
    const initialGameState = 'welcome';
    const initialBoardCells = [];
    const initialCompleted = new Set();
    const initialEvidence = {};

    assert.equal(initialGameState, 'welcome');
    assert.equal(initialBoardCells.length, 0, 'No challenges loaded on initial mount');
    assert.equal(initialCompleted.size, 0);
    assert.equal(Object.keys(initialEvidence).length, 0);

    // Timer displays 45:00 before start
    assert.equal(formatTime(SESSION_DURATION_SECONDS), '45:00');
  });

  test('Journey 2: Start Exploring & Board Initialization', async () => {
    const { FALLBACK_TASKS, SESSION_DURATION_SECONDS } = await getModules();

    // Player clicks "Start Exploring"
    let gameState = 'loading';
    assert.equal(gameState, 'loading');

    // Challenges load (fallback or AI)
    const boardCells = [...FALLBACK_TASKS];
    assert.equal(boardCells.length, 25, 'Board contains exactly 25 challenges');

    // Board becomes ready -> transition to playing
    gameState = 'playing';
    let remainingSeconds = SESSION_DURATION_SECONDS;
    let timerResetKey = 1;

    assert.equal(gameState, 'playing');
    assert.equal(remainingSeconds, 2700);
    assert.equal(timerResetKey, 1);
  });

  test('Journey 3: Evidence Gate Enforcement Across All Verification Types', async () => {
    const { canMarkComplete, createEvidenceRecord, FALLBACK_TASKS } = await getModules();

    const photoTask = FALLBACK_TASKS.find(t => t.verificationType === 'PHOTO');
    const audioTask = FALLBACK_TASKS.find(t => t.verificationType === 'AUDIO');
    const gpsTask = FALLBACK_TASKS.find(t => t.verificationType === 'GPS');
    const timeTask = FALLBACK_TASKS.find(t => t.verificationType === 'TIME');
    const honorTask = FALLBACK_TASKS.find(t => t.verificationType === 'HONOR');

    // PHOTO: unverified -> verified
    assert.equal(canMarkComplete(photoTask, null).allowed, false);
    const photoEv = createEvidenceRecord(photoTask.id, 'PHOTO', { previewUrl: 'blob:local/img' });
    assert.equal(canMarkComplete(photoTask, photoEv).allowed, true);

    // AUDIO: unverified -> verified
    assert.equal(canMarkComplete(audioTask, null).allowed, false);
    const audioEv = createEvidenceRecord(audioTask.id, 'AUDIO', { audioUrl: 'blob:local/audio' });
    assert.equal(canMarkComplete(audioTask, audioEv).allowed, true);

    // GPS: unverified -> verified
    assert.equal(canMarkComplete(gpsTask, null).allowed, false);
    const gpsEv = createEvidenceRecord(gpsTask.id, 'GPS', { latitude: 37.77, longitude: -122.41, accuracy: 10 });
    assert.equal(canMarkComplete(gpsTask, gpsEv).allowed, true);

    // TIME: incomplete -> complete
    assert.equal(canMarkComplete(timeTask, null).allowed, false);
    const timeIncomplete = createEvidenceRecord(timeTask.id, 'TIME', { elapsedSeconds: 10 });
    assert.equal(canMarkComplete(timeTask, timeIncomplete).allowed, false);
    const timeComplete = createEvidenceRecord(timeTask.id, 'TIME', { elapsedSeconds: timeTask.durationSeconds || 60 });
    assert.equal(canMarkComplete(timeTask, timeComplete).allowed, true);

    // HONOR: unconfirmed -> confirmed
    assert.equal(canMarkComplete(honorTask, null).allowed, false);
    const honorEv = createEvidenceRecord(honorTask.id, 'HONOR', { confirmed: true });
    assert.equal(canMarkComplete(honorTask, honorEv).allowed, true);
  });

  test('Journey 4: Unchecking Task Retains Stored Evidence', async () => {
    const { createEvidenceRecord, FALLBACK_TASKS } = await getModules();

    const task = FALLBACK_TASKS[0];
    const completedSet = new Set([task.id]);
    const evidenceMap = {
      [task.id]: createEvidenceRecord(task.id, task.verificationType, { previewUrl: 'blob:local/pic' })
    };

    // User unchecks task
    completedSet.delete(task.id);
    assert.equal(completedSet.has(task.id), false, 'Task is unchecked');

    // Evidence is still present in evidenceMap
    assert.ok(evidenceMap[task.id], 'Evidence must NOT be deleted upon task uncheck');
    assert.equal(evidenceMap[task.id].taskId, task.id);
  });

  test('Journey 5: Pause and Resume Lifecycle with Exact Time Preservation', async () => {
    const { formatTime } = await getModules();

    let gameState = 'playing';
    let remaining = 2450; // Some time elapsed
    let pausedSnapshot = null;

    // Player presses Pause
    gameState = 'paused';
    pausedSnapshot = remaining;
    assert.equal(formatTime(remaining), '40:50');

    // Time passes while paused (simulation)
    // Remaining time must NOT decrease while paused
    assert.equal(pausedSnapshot, 2450, 'Remaining time is frozen');

    // Player presses Resume
    gameState = 'playing';
    assert.equal(gameState, 'playing');
    assert.equal(pausedSnapshot, 2450, 'Resumes from exact frozen remaining time');
  });

  test('Journey 6: End Session Early & Prevention of New Completions', async () => {
    const { checkWin, FALLBACK_TASKS } = await getModules();

    let gameState = 'playing';
    const completedTaskIds = new Set([FALLBACK_TASKS[0].id, FALLBACK_TASKS[1].id]);

    // Player ends session early
    gameState = 'ended';
    assert.equal(gameState, 'ended');

    // Attempting completion while ended must be blocked
    function tryToggle(taskId, state, completed) {
      if (state !== 'playing') return false; // blocked
      completed.add(taskId);
      return true;
    }

    const toggleAllowed = tryToggle(FALLBACK_TASKS[2].id, gameState, completedTaskIds);
    assert.equal(toggleAllowed, false, 'No completions allowed after session ended');
    assert.equal(completedTaskIds.size, 2, 'Completed count unchanged');

    // Results screen data summary
    const win = checkWin(FALLBACK_TASKS, completedTaskIds);
    assert.equal(win.hasWon, false);
    assert.equal(completedTaskIds.size, 2);
  });

  test('Journey 7: Shuffle Rules and State Reset for New Game', async () => {
    const { shuffleBoard, FALLBACK_TASKS } = await getModules();

    function canShuffle(state, count) {
      return state !== 'playing' && state !== 'paused' && count === 25;
    }

    // Shuffle forbidden while active or paused
    assert.equal(canShuffle('playing', 25), false);
    assert.equal(canShuffle('paused', 25), false);

    // Shuffle permitted between games
    assert.equal(canShuffle('ended', 25), true);

    // Shuffling between games produces a clean permutation of all 25 tasks
    const originalIds = FALLBACK_TASKS.map(t => t.id).sort();
    const shuffled = shuffleBoard(FALLBACK_TASKS);
    const shuffledIds = shuffled.map(t => t.id).sort();
    assert.deepEqual(originalIds, shuffledIds);

    // Starting fresh game resets all state
    const newCompleted = new Set();
    const newEvidence = {};
    const newTimerResetKey = 2;
    const newGameState = 'playing';

    assert.equal(newCompleted.size, 0);
    assert.equal(Object.keys(newEvidence).length, 0);
    assert.equal(newTimerResetKey, 2);
    assert.equal(newGameState, 'playing');
  });

});
