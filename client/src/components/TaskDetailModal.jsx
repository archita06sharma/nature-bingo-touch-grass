import { useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  ShieldAlert, 
  Compass, 
  AlertCircle
} from 'lucide-react';
import EvidencePanel from './evidence/EvidencePanel';
import { canMarkComplete } from '../utils/evidenceLogic';

export default function TaskDetailModal({
  task,
  isCompleted,
  evidence,
  onToggleComplete,
  onSaveEvidence,
  onRemoveEvidence,
  onClose,
  isPaused = false,
  sessionEnded = false
}) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    // Focus the close button on mount
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Accessible Focus Trap within modal
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
  }, [onClose]);

  if (!task) return null;

  const completionRule = canMarkComplete(task, evidence);
  const isTimeTask = task.verificationType === 'TIME';

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div 
        ref={modalRef}
        className="modal-card detail-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="modal-task-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-meta">
            <span className="task-id-tag">{task.id}</span>
            <span className={`tag ${task.category}`}>{task.category}</span>
            <span className="tag difficulty">{task.difficulty}</span>
          </div>
          <button 
            ref={closeButtonRef}
            type="button" 
            className="btn-modal-close" 
            onClick={onClose}
            aria-label="Close task details modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Title & Body */}
        <div className="modal-body">
          <h2 id="modal-task-title" className="modal-title">{task.title}</h2>
          
          <div className="modal-desc-box">
            <h3 className="section-label">
              <Compass size={15} aria-hidden="true" />
              <span>Observation Challenge</span>
            </h3>
            <p className="modal-description">{task.description}</p>
          </div>

          {/* Interactive Evidence Module */}
          <div className="modal-evidence-section">
            <EvidencePanel
              task={task}
              evidence={evidence}
              onSaveEvidence={(data) => onSaveEvidence(task.id, task.verificationType, data)}
              onRemoveEvidence={() => onRemoveEvidence(task.id)}
              isPaused={isPaused}
              sessionEnded={sessionEnded}
            />
          </div>

          {/* Leave No Trace Safety Reminder */}
          <div className="modal-safety-card">
            <ShieldAlert size={18} className="safety-icon" aria-hidden="true" />
            <div>
              <strong>Leave No Trace & Field Safety:</strong>
              <p>{task.safetyTip}</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          {sessionEnded ? (
            <div className="completion-blocked-hint" role="status">
              <AlertCircle size={14} aria-hidden="true" />
              <span>Session has ended — no further completions can be recorded.</span>
            </div>
          ) : isPaused ? (
            <div className="completion-blocked-hint" role="status">
              <AlertCircle size={14} aria-hidden="true" />
              <span>Session is paused — resume session to complete challenges.</span>
            </div>
          ) : (
            <>
              {/* If completion is disallowed, show clear hint */}
              {!completionRule.allowed && !isCompleted && (
                <div className="completion-blocked-hint" role="status">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{completionRule.reason}</span>
                </div>
              )}

              <button
                type="button"
                className={`btn-modal-toggle ${isCompleted ? 'completed' : ''} ${!completionRule.allowed && !isCompleted ? 'disabled' : ''}`}
                disabled={!completionRule.allowed && !isCompleted}
                onClick={() => {
                  if (isCompleted || completionRule.allowed) {
                    onToggleComplete(task.id);
                  }
                }}
              >
                <Check size={16} aria-hidden="true" />
                <span>
                  {isCompleted
                    ? 'Marked as Observed (Tap to Undo)'
                    : !completionRule.allowed
                    ? 'Complete Verification to Mark Done'
                    : 'Confirm & Mark Challenge as Completed'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
