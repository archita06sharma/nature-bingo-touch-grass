/**
 * Evidence and Verification Logic for Nature Bingo — Touch Grass
 * Manages evidence records, verification constraints, and completion rules.
 */

/**
 * Checks whether a task is eligible to be marked complete based on verification rules.
 * Enforces that TIME tasks cannot be marked complete without fulfilling the required duration.
 *
 * @param {Object} task - The challenge task object
 * @param {Object|null} evidence - Evidence object associated with the task
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function canMarkComplete(task, evidence) {
  if (!task) {
    return { allowed: false, reason: 'Task definition is missing' };
  }

  switch (task.verificationType) {
    case 'TIME': {
      const requiredSeconds = task.durationSeconds || 30;
      if (!evidence || !evidence.data) {
        return {
          allowed: false,
          reason: `Timed observation requires spending ${requiredSeconds} seconds observing before completing.`
        };
      }
      const elapsed = evidence.data.elapsedSeconds || 0;
      if (elapsed < requiredSeconds) {
        return {
          allowed: false,
          reason: `Observation incomplete: ${elapsed}s elapsed of required ${requiredSeconds}s.`
        };
      }
      return { allowed: true };
    }

    case 'PHOTO': {
      if (!evidence || !evidence.data || !evidence.data.previewUrl) {
        return {
          allowed: false,
          reason: 'A photo is required before marking this challenge complete. Use the camera or choose an image from your device.'
        };
      }
      return { allowed: true };
    }

    case 'AUDIO': {
      if (!evidence || !evidence.data || !evidence.data.audioUrl) {
        return {
          allowed: false,
          reason: 'An audio recording is required before marking this challenge complete. Record the ambient soundscape first.'
        };
      }
      return { allowed: true };
    }

    case 'GPS': {
      const lat = evidence?.data?.latitude;
      const lng = evidence?.data?.longitude;
      if (!evidence || !evidence.data || !isValidGpsData(lat, lng, evidence.data.accuracy)) {
        return {
          allowed: false,
          reason: 'A valid GPS location is required before marking this challenge complete. Capture your location first.'
        };
      }
      return { allowed: true };
    }

    case 'HONOR': {
      if (!evidence || !evidence.data || evidence.data.confirmed !== true) {
        return {
          allowed: false,
          reason: 'Please check the honor pledge to confirm you completed this observation before marking it done.'
        };
      }
      return { allowed: true };
    }

    default:
      return { allowed: true };
  }
}

/**
 * Creates a structured, standardized evidence record
 * @param {string} taskId
 * @param {'PHOTO'|'TIME'|'GPS'|'AUDIO'|'HONOR'} type
 * @param {Object} data
 * @returns {Object}
 */
export function createEvidenceRecord(taskId, type, data = {}) {
  return {
    taskId,
    type,
    timestamp: new Date().toISOString(),
    data,
    verified: true
  };
}

/**
 * Validates GPS coordinate values
 * @param {number} lat
 * @param {number} lng
 * @param {number} accuracy
 * @returns {boolean}
 */
export function isValidGpsData(lat, lng, accuracy) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  if (typeof accuracy === 'number' && accuracy < 0) return false;
  return true;
}

/**
 * Provides an honest explanation of what a verification method actually records
 * @param {'PHOTO'|'TIME'|'GPS'|'AUDIO'|'HONOR'} type
 * @returns {string}
 */
export function getVerificationDisclaimer(type) {
  switch (type) {
    case 'PHOTO':
      return 'Attaching a photo stores an image snapshot in your local field journal. It does not automatically verify biological species.';
    case 'AUDIO':
      return 'Recording audio captures an ambient soundscape clip locally on your device. It does not perform automated acoustic species classification.';
    case 'TIME':
      return 'The timer tracks your focused observation interval. It requires you to observe attentively for the full duration.';
    case 'GPS':
      return 'GPS records your device waypoint and accuracy radius. It documents your observation habitat, not what was observed.';
    case 'HONOR':
    default:
      return 'Honor verification relies on mindful self-reporting following the field naturalist code of ethics.';
  }
}
