/**
 * Regression Tests — Mobile Responsiveness (Task Detail Modal & Evidence Panels)
 *
 * Verifies that the CSS rules in client/src/App.css enforce responsive behavior,
 * safe text wrapping, non-overflowing flex layouts, and boundary constraints on
 * mobile viewports (320px, 360px, 390px, 480px).
 *
 * Run with: node --test test/mobileResponsiveness.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cssPath = path.resolve(__dirname, '../client/src/App.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

describe('Mobile Responsiveness — Task Detail Modal & Evidence Panels', () => {

  test('modal and evidence containers have box-sizing and max-width clipping', () => {
    assert.ok(
      cssContent.includes('.modal-backdrop') &&
      cssContent.includes('.modal-card') &&
      cssContent.includes('.modal-evidence-section') &&
      cssContent.includes('.photo-preview-container'),
      'modal and evidence containers must be defined'
    );

    const normalizedCss = cssContent.replace(/\r\n/g, '\n');
    const startIdx = normalizedCss.indexOf('.modal-backdrop,\n.modal-card,');
    assert.ok(startIdx !== -1, 'must find shared box rule start');
    const endIdx = normalizedCss.indexOf('.verification-info-card {', startIdx);
    const sharedBoxRule = normalizedCss.slice(startIdx, endIdx);

    assert.ok(sharedBoxRule.includes('box-sizing: border-box;'), 'containers must use border-box');
    assert.ok(sharedBoxRule.includes('max-width: 100%;'), 'containers must clip to max-width: 100%');
    assert.ok(sharedBoxRule.includes('min-width: 0;'), 'containers must set min-width: 0');
  });

  test('detail-modal-card does not have positive margin inflating outer width on mobile', () => {
    // Check that <=480px media query sets margin: 0 and max-width: 100%
    const media480Idx = cssContent.indexOf('@media (max-width: 480px)');
    assert.ok(media480Idx !== -1, 'must have @media (max-width: 480px)');
    const media480Block = cssContent.slice(media480Idx);

    assert.ok(
      media480Block.includes('.detail-modal-card') &&
      media480Block.includes('margin: 0;'),
      'detail-modal-card must have margin: 0 on mobile'
    );
  });

  test('photo preview card stacks vertically on mobile with image on top, filename wrapped, and Remove button below', () => {
    const media480Idx = cssContent.indexOf('@media (max-width: 480px)');
    const media480Block = cssContent.slice(media480Idx);

    // .photo-meta-bar must switch to column layout on mobile
    assert.ok(
      media480Block.includes('.photo-meta-bar') &&
      media480Block.includes('flex-direction: column;') &&
      media480Block.includes('align-items: flex-start;'),
      'photo-meta-bar must stack as flex-direction: column on mobile'
    );

    // .photo-meta-text must allow flex wrapping
    assert.ok(
      media480Block.includes('.photo-meta-text') &&
      media480Block.includes('flex-wrap: wrap;'),
      'photo-meta-text must wrap'
    );

    // .photo-filename must wrap long strings safely without fixed max-width
    assert.ok(
      media480Block.includes('.photo-filename') &&
      media480Block.includes('overflow-wrap: anywhere;') &&
      media480Block.includes('word-break: break-all;'),
      'photo-filename must wrap safely with overflow-wrap: anywhere and word-break: break-all'
    );

    // Remove button must align neatly below
    assert.ok(
      media480Block.includes('.photo-meta-bar .btn-evidence-danger') &&
      media480Block.includes('align-self: flex-start;'),
      'Remove button must align self flex-start under filename'
    );
  });

  test('photo preview image is constrained to parent container', () => {
    const photoImgRule = cssContent.slice(
      cssContent.indexOf('.photo-img-wrap {'),
      cssContent.indexOf('.photo-meta-bar {')
    );
    assert.ok(photoImgRule.includes('width: 100%;'), 'photo-img-wrap must be width 100%');
    assert.ok(photoImgRule.includes('overflow: hidden;'), 'photo-img-wrap must have overflow hidden');
  });

  test('audio element and controls do not cause horizontal overflow', () => {
    const media480Idx = cssContent.indexOf('@media (max-width: 480px)');
    const media480Block = cssContent.slice(media480Idx);

    assert.ok(
      media480Block.includes('.audio-element') &&
      media480Block.includes('max-width: 100%;'),
      'audio element must be constrained to max-width: 100%'
    );

    assert.ok(
      media480Block.includes('.audio-player-wrap') &&
      media480Block.includes('flex-wrap: wrap;'),
      'audio player wrap must allow flex wrap'
    );

    assert.ok(
      media480Block.includes('.audio-meta-bar') &&
      media480Block.includes('flex-direction: column;'),
      'audio-meta-bar must stack in column on mobile'
    );
  });

  test('GPS coordinates switch to single column on mobile to prevent overflow', () => {
    const media480Idx = cssContent.indexOf('@media (max-width: 480px)');
    const media480Block = cssContent.slice(media480Idx);

    assert.ok(
      media480Block.includes('.gps-coords-display') &&
      media480Block.includes('grid-template-columns: 1fr;'),
      'gps-coords-display must be 1fr on mobile'
    );
  });

  test('observation time controls wrap on mobile to avoid overflow', () => {
    const media480Idx = cssContent.indexOf('@media (max-width: 480px)');
    const media480Block = cssContent.slice(media480Idx);

    assert.ok(
      media480Block.includes('.obs-controls-row') &&
      media480Block.includes('flex-wrap: wrap;'),
      'obs-controls-row must have flex-wrap: wrap'
    );
  });

  test('modal titles, descriptions, and footer buttons wrap text cleanly', () => {
    assert.ok(
      cssContent.includes('.modal-title,') &&
      cssContent.includes('overflow-wrap: break-word;') &&
      cssContent.includes('word-break: break-word;'),
      'modal titles and descriptions must break words safely'
    );

    const media480Idx = cssContent.indexOf('@media (max-width: 480px)');
    const media480Block = cssContent.slice(media480Idx);

    assert.ok(
      media480Block.includes('.btn-modal-toggle') &&
      media480Block.includes('white-space: normal;'),
      'btn-modal-toggle must allow normal white-space wrapping'
    );
  });

  test('tightest viewports (<=360px) apply reduced padding for 320px screens', () => {
    const media360Idx = cssContent.indexOf('@media (max-width: 360px)');
    assert.ok(media360Idx !== -1, 'must have @media (max-width: 360px) breakpoint');
    const media360Block = cssContent.slice(media360Idx);

    assert.ok(media360Block.includes('.modal-backdrop'), 'modal backdrop must adjust padding at 360px');
    assert.ok(media360Block.includes('.modal-body'), 'modal body must adjust padding at 360px');
    assert.ok(media360Block.includes('.modal-footer'), 'modal footer must adjust padding at 360px');
    assert.ok(media360Block.includes('.modal-evidence-section'), 'evidence section must adjust padding at 360px');
  });

});
