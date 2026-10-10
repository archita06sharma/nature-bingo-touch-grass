import { useEffect, useRef } from 'react';
import { AlertCircle, Shuffle, RotateCcw, X } from 'lucide-react';

export default function NewGameModal({
  completedCount,
  onCancel,
  onConfirmNewGame,
  onShuffle,
  canShuffle = false
}) {
  const modalRef = useRef(null);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (cancelBtnRef.current) {
      cancelBtnRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="modal-backdrop" onClick={onCancel} role="presentation">
      <div 
        ref={modalRef}
        className="modal-card new-game-card" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="new-game-title"
      >
        <div className="modal-header">
          <div className="modal-header-meta">
            <AlertCircle size={20} className="text-warning" aria-hidden="true" />
            <h3 id="new-game-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-forest-dark)' }}>
              Start a New Exploration Session?
            </h3>
          </div>
          <button 
            ref={cancelBtnRef}
            type="button" 
            className="btn-modal-close" 
            onClick={onCancel}
            aria-label="Cancel new game confirmation and keep current session"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          {completedCount > 0 ? (
            <p style={{ fontSize: '0.95rem', color: 'var(--color-bark-dark)', lineHeight: 1.5 }}>
              You currently have <strong>{completedCount} completed challenge{completedCount > 1 ? 's' : ''}</strong> on your board. 
              Starting a new game will reset your board and completion progress.
            </p>
          ) : (
            <p style={{ fontSize: '0.95rem', color: 'var(--color-bark-dark)', lineHeight: 1.5 }}>
              Ready to generate a fresh set of 25 outdoor challenges?
            </p>
          )}

          {canShuffle && (
            <div style={{ background: 'var(--color-parchment-deep)', padding: '0.85rem 1rem', borderRadius: 8, marginTop: '0.5rem', fontSize: '0.88rem' }}>
              <strong>Looking for a different layout?</strong>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-bark-muted)' }}>
                You can shuffle the current board without losing any of your completed checks or journal evidence.
              </p>
            </div>
          )}
        </div>

        <div className="new-game-actions">
          {canShuffle && (
            <button
              type="button"
              className="btn-journal-secondary btn-new-game-shuffle"
              onClick={onShuffle}
              title="Rearrange cell positions while keeping completed challenges"
            >
              <Shuffle size={15} aria-hidden="true" />
              <span>Shuffle Current Board</span>
            </button>
          )}

          <button
            type="button"
            className="btn-journal btn-new-game-confirm"
            onClick={onConfirmNewGame}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Start Fresh Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}
