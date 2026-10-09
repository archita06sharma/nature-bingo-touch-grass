/**
 * Task Schema Definition & Validation for Nature Bingo — Touch Grass
 */

const CATEGORIES = Object.freeze(['flora', 'fauna', 'sensory', 'earth', 'sky']);
const DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);
const VERIFICATION_TYPES = Object.freeze(['PHOTO', 'TIME', 'GPS', 'AUDIO', 'HONOR']);

// Heuristic safety checks (Note: Automated keyword checks flag obvious hazards, but cannot guarantee absolute safety)
const UNSAFE_PATTERNS = [
  /\b(eat|consume|ingest|taste|digest)\b/i,
  /\b(trespass|private property|restricted area)\b/i,
  /\b(touch (poison ivy|poison oak|sumac|deadly|snake|venomous|unknown mushroom))\b/i,
  /\b(climb (tall tree|cliff|power pole|steep cliff))\b/i,
  /\b(feed|harass|capture|trap|touch) (wild|animal|mammal|bird|snake|raccoon)\b/i
];

/**
 * Validates a single challenge task
 * @param {Object} task
 * @param {number} index
 * @returns {{ isValid: boolean, errors: string[], task: Object }}
 */
function validateTask(task, index = 0) {
  const errors = [];
  if (!task || typeof task !== 'object') {
    return { isValid: false, errors: [`Task at index ${index} must be an object`], task: null };
  }

  // ID validation & normalization
  const expectedId = `task-${index + 1}`;
  let id = typeof task.id === 'string' && task.id.trim() ? task.id.trim() : expectedId;

  // Title validation
  const title = typeof task.title === 'string' ? task.title.trim() : '';
  if (!title || title.length < 3 || title.length > 80) {
    errors.push(`Task #${index + 1}: Title must be a string between 3 and 80 characters`);
  }

  // Description validation
  const description = typeof task.description === 'string' ? task.description.trim() : '';
  if (!description || description.length < 10 || description.length > 300) {
    errors.push(`Task #${index + 1}: Description must be between 10 and 300 characters`);
  }

  // Category validation
  const category = typeof task.category === 'string' ? task.category.toLowerCase().trim() : '';
  if (!CATEGORIES.includes(category)) {
    errors.push(`Task #${index + 1}: Category '${task.category}' is invalid. Allowed: ${CATEGORIES.join(', ')}`);
  }

  // Difficulty validation
  const difficulty = typeof task.difficulty === 'string' ? task.difficulty.toLowerCase().trim() : '';
  if (!DIFFICULTIES.includes(difficulty)) {
    errors.push(`Task #${index + 1}: Difficulty '${task.difficulty}' is invalid. Allowed: ${DIFFICULTIES.join(', ')}`);
  }

  // Verification type validation
  const verificationType = typeof task.verificationType === 'string' ? task.verificationType.toUpperCase().trim() : '';
  if (!VERIFICATION_TYPES.includes(verificationType)) {
    errors.push(`Task #${index + 1}: VerificationType '${task.verificationType}' is invalid. Allowed: ${VERIFICATION_TYPES.join(', ')}`);
  }

  // Duration validation for TIME tasks
  let durationSeconds = undefined;
  if (verificationType === 'TIME') {
    const dur = Number(task.durationSeconds);
    if (!Number.isInteger(dur) || dur < 15 || dur > 600) {
      errors.push(`Task #${index + 1}: TIME verification requires 'durationSeconds' as an integer between 15 and 600 seconds`);
    } else {
      durationSeconds = dur;
    }
  }

  // Safety tip validation
  const safetyTip = typeof task.safetyTip === 'string' ? task.safetyTip.trim() : '';
  if (!safetyTip || safetyTip.length < 5 || safetyTip.length > 200) {
    errors.push(`Task #${index + 1}: SafetyTip must be between 5 and 200 characters`);
  }

  // Unsafe wording heuristics check
  const combinedText = `${title} ${description} ${safetyTip}`;
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(combinedText)) {
      errors.push(`Task #${index + 1} contains potentially unsafe instructions matching rule: ${pattern}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    task: {
      id,
      title,
      description,
      category,
      difficulty,
      verificationType,
      ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      safetyTip
    }
  };
}

/**
 * Validates a full set of 25 tasks
 * @param {Array<Object>} tasks
 * @returns {{ isValid: boolean, errors: string[], sanitizedTasks: Array<Object> }}
 */
function validateTaskSet(tasks) {
  const errors = [];

  if (!Array.isArray(tasks)) {
    return {
      isValid: false,
      errors: ['Output must be a JSON array of tasks or contain a "tasks" array property'],
      sanitizedTasks: []
    };
  }

  if (tasks.length !== 25) {
    errors.push(`Challenge set must contain exactly 25 tasks (received ${tasks.length})`);
  }

  const seenIds = new Set();
  const seenTitles = new Set();
  const seenDescriptions = new Set();
  const sanitizedTasks = [];

  tasks.forEach((rawTask, idx) => {
    const result = validateTask(rawTask, idx);
    if (!result.isValid) {
      errors.push(...result.errors);
    } else {
      const task = result.task;

      // Duplicate ID check
      if (seenIds.has(task.id)) {
        errors.push(`Duplicate task ID '${task.id}' detected at index ${idx}`);
      }
      seenIds.add(task.id);

      // Duplicate Title check (case-insensitive)
      const normalizedTitle = task.title.toLowerCase();
      if (seenTitles.has(normalizedTitle)) {
        errors.push(`Duplicate task title '${task.title}' detected at index ${idx}`);
      }
      seenTitles.add(normalizedTitle);

      // Substantially duplicate description check
      const normalizedDesc = task.description.toLowerCase();
      if (seenDescriptions.has(normalizedDesc)) {
        errors.push(`Duplicate task description detected at index ${idx}`);
      }
      seenDescriptions.add(normalizedDesc);

      sanitizedTasks.push(task);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedTasks: errors.length === 0 ? sanitizedTasks : []
  };
}

module.exports = {
  CATEGORIES,
  DIFFICULTIES,
  VERIFICATION_TYPES,
  validateTask,
  validateTaskSet
};
