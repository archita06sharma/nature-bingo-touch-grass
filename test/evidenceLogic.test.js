/**
 * Automated Tests for Evidence Management & Verification Rules
 * Zero hardware or browser dependency.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function getEvidenceLogic() {
  return await import('../client/src/utils/evidenceLogic.js');
}

async function getBingoLogic() {
  return await import('../client/src/utils/bingoLogic.js');
}

describe('Evidence Rules & Verification Tests', () => {

  const mockTimeTask = {
    id: 'task-7',
    title: 'Insect at Work',
    category: 'fauna',
    verificationType: 'TIME',
    durationSeconds: 45
  };

  const mockPhotoTask = {
    id: 'task-1',
    title: 'Serrated Leaf Edge',
    category: 'flora',
    verificationType: 'PHOTO'
  };

  test('TIME tasks cannot be marked complete without evidence', async () => {
    const { canMarkComplete } = await getEvidenceLogic();
    const result = canMarkComplete(mockTimeTask, null);
    assert.equal(result.allowed, false);
    assert.match(result.reason, /Timed observation requires spending 45 seconds/);
  });

  test('TIME tasks reject premature completion attempts before required duration', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const prematureEvidence = createEvidenceRecord('task-7', 'TIME', {
      elapsedSeconds: 20,
      targetSeconds: 45
    });

    const result = canMarkComplete(mockTimeTask, prematureEvidence);
    assert.equal(result.allowed, false);
    assert.match(result.reason, /Observation incomplete: 20s elapsed of required 45s/);
  });

  test('TIME tasks allow completion once elapsed duration meets requirement', async () => {
    const { canMarkComplete, createEvidenceRecord } = await getEvidenceLogic();
    const completedEvidence = createEvidenceRecord('task-7', 'TIME', {
      elapsedSeconds: 45,
      targetSeconds: 45
    });

    const result = canMarkComplete(mockTimeTask, completedEvidence);
    assert.equal(result.allowed, true);
    assert.equal(result.reason, undefined);
  });

  test('Evidence remains associated with task ID across board shuffles', async () => {
    const { createEvidenceRecord } = await getEvidenceLogic();
    const { shuffleBoard } = await getBingoLogic();

    const initialBoard = [
      mockPhotoTask,
      mockTimeTask,
      { id: 'task-11', title: 'Silence', verificationType: 'TIME', durationSeconds: 60 }
    ];

    const evidenceMap = {
      'task-1': createEvidenceRecord('task-1', 'PHOTO', { fileName: 'leaf.jpg' }),
      'task-7': createEvidenceRecord('task-7', 'TIME', { elapsedSeconds: 45 })
    };

    // Shuffle board
    const shuffledBoard = shuffleBoard(initialBoard);

    // Verify evidence lookup remains exact regardless of new position
    shuffledBoard.forEach(cell => {
      if (evidenceMap[cell.id]) {
        assert.equal(evidenceMap[cell.id].taskId, cell.id);
      }
    });

    assert.equal(evidenceMap['task-1'].data.fileName, 'leaf.jpg');
    assert.equal(evidenceMap['task-7'].data.elapsedSeconds, 45);
  });

  test('Removing evidence and retrying resets verification state', async () => {
    const { createEvidenceRecord, canMarkComplete } = await getEvidenceLogic();
    
    let evidenceMap = {
      'task-7': createEvidenceRecord('task-7', 'TIME', { elapsedSeconds: 45 })
    };

    assert.equal(canMarkComplete(mockTimeTask, evidenceMap['task-7']).allowed, true);

    // Remove evidence
    delete evidenceMap['task-7'];

    // Now verification is rejected again
    assert.equal(canMarkComplete(mockTimeTask, evidenceMap['task-7']).allowed, false);
  });

  test('GPS validation correctly checks coordinate ranges', async () => {
    const { isValidGpsData } = await getEvidenceLogic();
    assert.equal(isValidGpsData(37.7749, -122.4194, 10), true);
    assert.equal(isValidGpsData(0, 0, 5), true);
    assert.equal(isValidGpsData(95, -122, 10), false, 'Latitude out of bounds');
    assert.equal(isValidGpsData(37, -195, 10), false, 'Longitude out of bounds');
    assert.equal(isValidGpsData(37, -122, -5), false, 'Negative accuracy is invalid');
    assert.equal(isValidGpsData(NaN, -122, 10), false);
  });

  test('Honest disclaimers do not claim automatic species proof', async () => {
    const { getVerificationDisclaimer } = await getEvidenceLogic();
    const photoDisclaimer = getVerificationDisclaimer('PHOTO');
    const audioDisclaimer = getVerificationDisclaimer('AUDIO');
    const gpsDisclaimer = getVerificationDisclaimer('GPS');

    assert.ok(photoDisclaimer.includes('does not automatically verify biological species'));
    assert.ok(audioDisclaimer.includes('does not perform automated acoustic species classification'));
    assert.ok(gpsDisclaimer.includes('documents your observation habitat, not what was observed'));
  });
});
