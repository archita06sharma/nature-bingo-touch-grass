import { useEffect, useRef } from 'react';
import { Award, Sparkles, X, ArrowRight, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function WinModal({
  winningLines,
  totalCompleted,
  onKeepExploring,
  onNewGame
}) {
  const modalRef = useRef(null);
  const primaryBtnRef = useRef(null);

  useEffect(() => {
    if (primaryBtnRef.current) {
      primaryBtnRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onKeepExploring();
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
  }, [onKeepExploring]);

  return (
    <div className="modal-backdrop" onClick={onKeepExploring} role="presentation">
      <div 
        ref={modalRef}
        className="modal-card win-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="win-dialog-title"
      >
        <button 
          type="button" 
          className="btn-modal-close" 
          onClick={onKeepExploring}
          aria-label="Dismiss win dialog and continue exploring"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="win-header">
          <div className="win-badge-icon" aria-hidden="true">
            <Award size={40} className="trophy-icon" />
          </div>
          <span className="win-subtitle">Field Naturalist Achievement</span>
          <h2 id="win-dialog-title" className="win-title">BINGO! Line Completed!</h2>
          <p className="win-lead">
            Outstanding observation work! You have connected 5 challenges in a straight line across your field journal.
          </p>
        </div>

        <div className="win-body">
          {/* Completed Lines List */}
          <div className="completed-lines-box">
            <h4>
              <Sparkles size={16} aria-hidden="true" />
              <span>Completed Winning Line{winningLines.length > 1 ? 's' : ''}:</span>
            </h4>
            <ul className="lines-list">
              {winningLines.map((line, idx) => (
                <li key={idx} className="line-item">
                  <CheckCircle2 size={16} className="text-forest" aria-hidden="true" />
                  <span>{line.name}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="win-stats-row">
            <div className="stat-pill">
              <span className="stat-num">{totalCompleted} / 25</span>
              <span className="stat-text">Challenges Completed</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">{winningLines.length}</span>
              <span className="stat-text">Bingo Line{winningLines.length > 1 ? 's' : ''} Achieved</span>
            </div>
          </div>
        </div>

        <div className="win-actions">
          <button 
            ref={primaryBtnRef}
            type="button" 
            className="btn-journal"
            onClick={onKeepExploring}
          >
            <span>Keep Exploring (Seek More Lines)</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>

          <button 
            type="button" 
            className="btn-journal-secondary"
            onClick={onNewGame}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Start Fresh Game</span>
          </button>
        </div>
      </div>
    </div>
  );
}
