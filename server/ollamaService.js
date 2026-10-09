/**
 * Ollama Integration Service for Nature Bingo — Touch Grass
 * Interfaces with local Ollama service and gemma4:e4b model with JSON schema enforcement.
 */

const { validateTaskSet } = require('./schema');
const { FALLBACK_TASKS } = require('./fallbackTasks');

const DEFAULT_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS || '55000', 10);

const SYSTEM_PROMPT = `You are a certified master field naturalist creating a 5x5 Nature Bingo board for outdoor mindfulness ("Touch Grass").
Generate exactly 25 safe, environmentally responsible, distinct nature-observation challenges for people in public parks, backyards, or hiking trails.

Rules:
1. Strict Leave No Trace ethics: NEVER instruct players to eat/taste anything, touch unknown fungi/plants, disturb wildlife, or enter private property.
2. Balance across 5 categories: "flora", "fauna", "sensory", "earth", "sky" (approx 5 of each).
3. Assign verificationType from: "PHOTO", "TIME", "GPS", "AUDIO", "HONOR".
4. If verificationType is "TIME", provide durationSeconds as an integer between 30 and 180.
5. Provide a specific, actionable safetyTip for every challenge.
6. Return ONLY valid JSON with this exact schema:
{
  "tasks": [
    {
      "id": "task-1",
      "title": "Short Title (3-80 chars)",
      "description": "Clear observation challenge (10-300 chars)",
      "category": "flora|fauna|sensory|earth|sky",
      "difficulty": "easy|medium|hard",
      "verificationType": "PHOTO|TIME|GPS|AUDIO|HONOR",
      "durationSeconds": 60,
      "safetyTip": "Clear safety reminder (5-200 chars)"
    }
    ... exactly 25 items up to task-25
  ]
}`;

/**
 * Extracts and parses JSON from raw model string
 * @param {string} text
 * @returns {Array<Object>|null}
 */
function extractJsonTasks(text) {
  if (!text || typeof text !== 'string') return null;

  let cleaned = text.trim();
  // Strip markdown code fences if model enclosed JSON in ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && Array.isArray(parsed.tasks)) {
      return parsed.tasks;
    }
    if (parsed && Array.isArray(parsed.challenges)) {
      return parsed.challenges;
    }
  } catch (err) {
    // If strict parse fails, try to find matching [ ... ] or { "tasks": [ ... ] } substring
    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        const extracted = JSON.parse(arrayMatch[0]);
        if (Array.isArray(extracted)) return extracted;
      } catch (_) {}
    }
  }

  return null;
}

/**
 * Generates 25 challenges using local Ollama model or falls back gracefully
 * @param {Object} options
 * @param {string} [options.host]
 * @param {string} [options.model]
 * @param {number} [options.timeoutMs]
 * @param {boolean} [options.forceFallback]
 * @param {Function} [options.fetchImpl] - Optional dependency injection for testing
 * @returns {Promise<Object>}
 */
async function generateChallenges(options = {}) {
  const host = options.host || DEFAULT_HOST;
  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const forceFallback = Boolean(options.forceFallback);
  const fetchFn = options.fetchImpl || fetch;

  const timestamp = new Date().toISOString();

  // If fallback is explicitly requested, return curated tasks immediately
  if (forceFallback) {
    return {
      source: 'fallback',
      model: 'curated-field-guide',
      timestamp,
      count: FALLBACK_TASKS.length,
      fallbackReason: 'Direct fallback requested by user/client',
      tasks: FALLBACK_TASKS
    };
  }

  let rawResponseText = '';
  let fallbackReason = '';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const promptBody = {
      model,
      prompt: SYSTEM_PROMPT,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.7,
        top_p: 0.9
      }
    };

    const response = await fetchFn(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promptBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama service returned HTTP status ${response.status}`);
    }

    const json = await response.json();
    rawResponseText = json.response || '';

    // Extract and validate tasks
    const rawTasks = extractJsonTasks(rawResponseText);
    if (!rawTasks) {
      throw new Error('Model response did not contain a parseable JSON array of tasks');
    }

    const validation = validateTaskSet(rawTasks);
    if (!validation.isValid) {
      const summary = validation.errors.slice(0, 3).join('; ');
      throw new Error(`Schema validation failed: ${summary}`);
    }

    // Success with AI model
    return {
      source: 'ai',
      model,
      timestamp,
      count: validation.sanitizedTasks.length,
      tasks: validation.sanitizedTasks
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      fallbackReason = `Ollama generation timed out after ${Math.round(timeoutMs / 1000)} seconds`;
    } else {
      fallbackReason = err.message || 'Unknown generation failure';
    }

    console.warn(`[Ollama Service Fallback Triggered]: ${fallbackReason}`);

    // Return the curated fallback set with explicit, honest metadata
    return {
      source: 'fallback',
      model: 'curated-field-guide',
      timestamp,
      count: FALLBACK_TASKS.length,
      fallbackReason,
      tasks: FALLBACK_TASKS
    };
  }
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  SYSTEM_PROMPT,
  extractJsonTasks,
  generateChallenges
};
