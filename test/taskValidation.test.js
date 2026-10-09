/**
 * Automated Tests for Task Schema Validation & Ollama Fallback Engine
 * Uses Node.js native test runner (node:test).
 * Zero dependency on live Ollama service.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { validateTask, validateTaskSet, CATEGORIES, VERIFICATION_TYPES } = require('../server/schema');
const { FALLBACK_TASKS } = require('../server/fallbackTasks');
const { generateChallenges, extractJsonTasks } = require('../server/ollamaService');

describe('Nature Challenge Schema & Validation Tests', () => {

  test('Curated fallback set passes schema validation with exactly 25 tasks', () => {
    assert.equal(FALLBACK_TASKS.length, 25, 'Fallback set must have exactly 25 tasks');
    const result = validateTaskSet(FALLBACK_TASKS);
    assert.equal(result.isValid, true, `Validation failed: ${result.errors.join(', ')}`);
    assert.equal(result.sanitizedTasks.length, 25);
    assert.equal(result.errors.length, 0);
  });

  test('Rejects task sets with count !== 25', () => {
    const underCount = FALLBACK_TASKS.slice(0, 24);
    const resultUnder = validateTaskSet(underCount);
    assert.equal(resultUnder.isValid, false);
    assert.match(resultUnder.errors[0], /exactly 25 tasks/);

    const overCount = [...FALLBACK_TASKS, { ...FALLBACK_TASKS[0], id: 'task-26', title: 'Extra' }];
    const resultOver = validateTaskSet(overCount);
    assert.equal(resultOver.isValid, false);
    assert.match(resultOver.errors[0], /exactly 25 tasks/);
  });

  test('Rejects task sets with duplicate titles or IDs', () => {
    const duplicateIds = FALLBACK_TASKS.map((t, i) => i === 1 ? { ...t, id: 'task-1' } : t);
    const resId = validateTaskSet(duplicateIds);
    assert.equal(resId.isValid, false);
    assert.ok(resId.errors.some(e => e.includes("Duplicate task ID 'task-1'")));

    const duplicateTitles = FALLBACK_TASKS.map((t, i) => i === 1 ? { ...t, title: FALLBACK_TASKS[0].title } : t);
    const resTitle = validateTaskSet(duplicateTitles);
    assert.equal(resTitle.isValid, false);
    assert.ok(resTitle.errors.some(e => e.toLowerCase().includes('duplicate task title')));
  });

  test('Validates individual field rules and required enum values', () => {
    // Invalid Category
    const invalidCat = validateTask({
      ...FALLBACK_TASKS[0],
      category: 'cyberpunk'
    });
    assert.equal(invalidCat.isValid, false);
    assert.ok(invalidCat.errors.some(e => e.includes("Category 'cyberpunk' is invalid")));

    // Invalid Verification Type
    const invalidVer = validateTask({
      ...FALLBACK_TASKS[0],
      verificationType: 'LASER_SCAN'
    });
    assert.equal(invalidVer.isValid, false);
    assert.ok(invalidVer.errors.some(e => e.includes("VerificationType 'LASER_SCAN' is invalid")));

    // Missing Safety Tip
    const missingSafety = validateTask({
      ...FALLBACK_TASKS[0],
      safetyTip: ''
    });
    assert.equal(missingSafety.isValid, false);
    assert.ok(missingSafety.errors.some(e => e.includes('SafetyTip must be between')));
  });

  test('Enforces duration constraints for TIME verification tasks', () => {
    // Missing duration
    const missingDur = validateTask({
      ...FALLBACK_TASKS[0],
      verificationType: 'TIME',
      durationSeconds: undefined
    });
    assert.equal(missingDur.isValid, false);
    assert.ok(missingDur.errors.some(e => e.includes('TIME verification requires \'durationSeconds\'')));

    // Negative / below minimum duration
    const lowDur = validateTask({
      ...FALLBACK_TASKS[0],
      verificationType: 'TIME',
      durationSeconds: 5
    });
    assert.equal(lowDur.isValid, false);

    // Valid duration passes
    const validDur = validateTask({
      ...FALLBACK_TASKS[0],
      verificationType: 'TIME',
      durationSeconds: 60
    });
    assert.equal(validDur.isValid, true);
    assert.equal(validDur.task.durationSeconds, 60);
  });

  test('Heuristic safety filter catches hazardous instructions', () => {
    const hazardousTask = validateTask({
      ...FALLBACK_TASKS[0],
      description: 'Taste and eat the unknown wild berries you discover near the creek.'
    });
    assert.equal(hazardousTask.isValid, false);
    assert.ok(hazardousTask.errors.some(e => e.includes('potentially unsafe instructions')));

    const trespassingTask = validateTask({
      ...FALLBACK_TASKS[0],
      description: 'Climb the fence onto private property to get a closer view of the heron.'
    });
    assert.equal(trespassingTask.isValid, false);
    assert.ok(trespassingTask.errors.some(e => e.includes('potentially unsafe instructions')));
  });

  test('JSON extraction handles markdown wrapped JSON blocks', () => {
    const mockJson = JSON.stringify({ tasks: [{ id: 'task-1', title: 'Test' }] });
    const markdownWrapped = `Here are your challenges:\n\`\`\`json\n${mockJson}\n\`\`\`\nHope you enjoy!`;
    const extracted = extractJsonTasks(markdownWrapped);
    assert.ok(Array.isArray(extracted));
    assert.equal(extracted.length, 1);
    assert.equal(extracted[0].id, 'task-1');
  });
});

describe('Ollama Service & Fallback Mechanism (Mocked & Offline)', () => {

  test('generateChallenges falls back gracefully when Ollama returns HTTP 500', async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Model memory failure' })
    });

    const result = await generateChallenges({ fetchImpl: mockFetch });
    assert.equal(result.source, 'fallback');
    assert.equal(result.model, 'curated-field-guide');
    assert.equal(result.count, 25);
    assert.ok(result.fallbackReason.includes('500'));
    assert.equal(result.tasks.length, 25);
  });

  test('generateChallenges falls back gracefully on connection timeout / AbortError', async () => {
    const mockFetch = async () => {
      const err = new Error('The operation was aborted');
      err.name = 'AbortError';
      throw err;
    };

    const result = await generateChallenges({ fetchImpl: mockFetch, timeoutMs: 1000 });
    assert.equal(result.source, 'fallback');
    assert.equal(result.model, 'curated-field-guide');
    assert.ok(result.fallbackReason.includes('timed out'));
    assert.equal(result.tasks.length, 25);
  });

  test('generateChallenges returns AI source when mocked Ollama outputs valid 25 tasks', async () => {
    const validAiTasks = FALLBACK_TASKS.map((t, idx) => ({
      ...t,
      title: `AI Observation #${idx + 1}`
    }));

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        response: JSON.stringify({ tasks: validAiTasks })
      })
    });

    const result = await generateChallenges({
      model: 'gemma4:e4b',
      fetchImpl: mockFetch
    });

    assert.equal(result.source, 'ai');
    assert.equal(result.model, 'gemma4:e4b');
    assert.equal(result.count, 25);
    assert.equal(result.tasks.length, 25);
    assert.equal(result.tasks[0].title, 'AI Observation #1');
    assert.equal(result.fallbackReason, undefined);
  });

  test('Direct fallback can be requested explicitly', async () => {
    const result = await generateChallenges({ forceFallback: true });
    assert.equal(result.source, 'fallback');
    assert.equal(result.model, 'curated-field-guide');
    assert.equal(result.count, 25);
    assert.match(result.fallbackReason, /Direct fallback requested/);
  });
});
