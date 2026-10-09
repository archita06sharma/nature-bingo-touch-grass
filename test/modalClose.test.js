/**
 * Regression Tests — Modal Auto-Close on Successful Completion
 *
 * Run with: node --test test/modalClose.test.js
 *
 * These tests model the handleToggleComplete and handleSaveEvidence logic
 * from App.jsx using a lightweight state class — no DOM or React needed.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

// ──────────────────────────────────────────────────────────────────────────────
// Minimal App state model
// ──────────────────────────────────────────────────────────────────────────────

class AppStateModel {
  constructor() {
    this.gameState     = 'playing';
    this.completedTaskIds = new Set();
    this.evidenceMap   = {};
    this.selectedTask  = null;
    this.announcements = [];
  }

  setSelectedTask(updater) {
    this.selectedTask = typeof updater === 'function'
      ? updater(this.selectedTask)
      : updater;
  }

  announce(msg) { this.announcements.push(msg); }

  /**
   * Mirrors App.jsx handleToggleComplete.
   * Returns: 'completed' | 'unchecked' | 'blocked-paused' | 'blocked-state' | 'blocked-evidence'
   */
  handleToggleComplete(taskId, board) {
    if (this.gameState === 'paused') {
      this.announce('Session is paused.');
      return 'blocked-paused';
    }
    if (this.gameState !== 'playing') return 'blocked-state';

    const task = board.find(t => t.id === taskId);

    if (this.completedTaskIds.has(taskId)) {
      // Uncheck — modal stays open
      this.completedTaskIds.delete(taskId);
      this.announce(`Unchecked ${task?.title || 'challenge'}.`);
      return 'unchecked';
    }

    // Evidence gate (simplified HONOR check; real code delegates to canMarkComplete)
    const evidence = this.evidenceMap[taskId];
    if (task?.verificationType === 'HONOR' && !evidence?.data?.confirmed) {
      if (task) this.setSelectedTask(task);
      return 'blocked-evidence';
    }

    // --- THE FIX (App.jsx lines 220-226) ---
    this.completedTaskIds.add(taskId);
    this.setSelectedTask(prev => (prev?.id === taskId ? null : prev));
    this.announce(`Marked ${task?.title || 'challenge'} as completed.`);
    return 'completed';
  }

  /**
   * Mirrors App.jsx handleSaveEvidence (TIME auto-complete path).
   * Returns: 'auto-completed' | 'evidence-saved'
   */
  handleSaveEvidence(taskId, type, data, board) {
    this.evidenceMap[taskId] = { type, data };
    const task = board.find(t => t.id === taskId);

    if (task?.verificationType === 'TIME') {
      const required = task.durationSeconds || 30;
      if (data.elapsedSeconds >= required && this.gameState === 'playing') {
        // --- THE FIX (App.jsx lines 238-244) ---
        this.completedTaskIds.add(taskId);
        this.setSelectedTask(prev => (prev?.id === taskId ? null : prev));
        this.announce(`Observation period finished. Challenge "${task.title}" completed!`);
        return 'auto-completed';
      }
    }
    return 'evidence-saved';
  }
}

function makeBoard(...overrides) {
  return overrides.map((o, i) => ({
    id: `t${i + 1}`,
    title: `Task ${i + 1}`,
    verificationType: 'HONOR',
    durationSeconds: 30,
    ...o,
  }));
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('Modal Auto-Close on Successful Completion', () => {
  test('successful check closes modal when open for that task', () => {
    const app = new AppStateModel();
    const board = makeBoard({ id: 't1', verificationType: 'HONOR' });
    app.evidenceMap['t1'] = { data: { confirmed: true } };
    app.selectedTask = board[0]; // modal is open for t1

    assert.equal(app.handleToggleComplete('t1', board), 'completed');
    assert.equal(app.selectedTask, null, 'modal must close after successful completion');
    assert.ok(app.completedTaskIds.has('t1'), 'task must be in completedTaskIds');
  });

  test('successful check does NOT close modal open for a different task', () => {
    const app = new AppStateModel();
    const board = makeBoard({ id: 't1' }, { id: 't2' });
    app.evidenceMap['t1'] = { data: { confirmed: true } };
    app.selectedTask = board[1]; // t2's modal is open; t1 is completed from the grid

    app.handleToggleComplete('t1', board);

    assert.equal(app.selectedTask?.id, 't2', 'unrelated open modal must stay open');
    assert.ok(app.completedTaskIds.has('t1'), 't1 must still be completed');
  });

  test('uncheck from modal keeps modal open', () => {
    const app = new AppStateModel();
    const board = makeBoard({ id: 't1' });
    app.completedTaskIds.add('t1'); // task already complete
    app.selectedTask = board[0];   // modal is open

    assert.equal(app.handleToggleComplete('t1', board), 'unchecked');
    assert.equal(app.selectedTask?.id, 't1', 'modal must stay open after uncheck');
    assert.ok(!app.completedTaskIds.has('t1'), 'task must be unchecked');
  });

  test('failed verification keeps modal open and leaves task incomplete', () => {
    const app = new AppStateModel();
    const board = makeBoard({ id: 't1', verificationType: 'HONOR' });
    // No evidence — verification fails

    assert.equal(app.handleToggleComplete('t1', board), 'blocked-evidence');
    assert.equal(app.selectedTask?.id, 't1', 'modal opened so user can satisfy verification');
    assert.ok(!app.completedTaskIds.has('t1'), 'task must NOT be marked complete');
  });

  test('manual X-close does not complete the task', () => {
    // X button calls setSelectedTask(null) directly — never calls handleToggleComplete
    const app = new AppStateModel();
    const board = makeBoard({ id: 't1' });
    app.selectedTask = board[0];

    app.setSelectedTask(null); // simulate X button

    assert.equal(app.selectedTask, null, 'modal closed');
    assert.ok(!app.completedTaskIds.has('t1'), 'task must NOT be complete after manual close');
  });

  test('TIME task auto-complete closes modal', () => {
    const app = new AppStateModel();
    const board = makeBoard({ id: 't1', verificationType: 'TIME', durationSeconds: 60 });
    app.selectedTask = board[0]; // modal is open

    assert.equal(
      app.handleSaveEvidence('t1', 'TIME', { elapsedSeconds: 60 }, board),
      'auto-completed'
    );
    assert.equal(app.selectedTask, null, 'modal must close after TIME auto-complete');
    assert.ok(app.completedTaskIds.has('t1'), 'task must be in completedTaskIds');
  });

  test('partial TIME observation does not close modal or complete task', () => {
    const app = new AppStateModel();
    const board = makeBoard({ id: 't1', verificationType: 'TIME', durationSeconds: 60 });
    app.selectedTask = board[0];

    assert.equal(
      app.handleSaveEvidence('t1', 'TIME', { elapsedSeconds: 30 }, board),
      'evidence-saved'
    );
    assert.equal(app.selectedTask?.id, 't1', 'modal must stay open — observation not complete');
    assert.ok(!app.completedTaskIds.has('t1'), 'task must NOT be auto-completed yet');
  });

  test('paused session blocks completion and keeps modal open', () => {
    const app = new AppStateModel();
    const board = makeBoard({ id: 't1', verificationType: 'HONOR' });
    app.gameState = 'paused';
    app.evidenceMap['t1'] = { data: { confirmed: true } };
    app.selectedTask = board[0];

    assert.equal(app.handleToggleComplete('t1', board), 'blocked-paused');
    assert.equal(app.selectedTask?.id, 't1', 'modal must stay open when session is paused');
    assert.ok(!app.completedTaskIds.has('t1'), 'task must NOT be completed while paused');
  });

  test('completion after session ended is blocked', () => {
    const app = new AppStateModel();
    const board = makeBoard({ id: 't1', verificationType: 'HONOR' });
    app.gameState = 'ended';
    app.evidenceMap['t1'] = { data: { confirmed: true } };
    app.selectedTask = board[0];

    assert.equal(app.handleToggleComplete('t1', board), 'blocked-state');
    assert.equal(app.selectedTask?.id, 't1', 'modal stays open — session has ended');
    assert.ok(!app.completedTaskIds.has('t1'));
  });
});
