import { useState, useRef, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw, CheckCircle2, Info } from 'lucide-react';
import { getVerificationDisclaimer } from '../../utils/evidenceLogic';

export default function TimeVerification({
  task,
  initialEvidence,
  onSaveEvidence,
  onRemoveEvidence,
  isPaused = false,
  sessionEnded = false
}) {
  const targetSeconds = task.durationSeconds || 60;
  const [secondsRemaining, setSecondsRemaining] = useState(targetSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    Boolean(initialEvidence?.data?.elapsedSeconds && initialEvidence.data.elapsedSeconds >= targetSeconds)
  );

  const deadlineRef = useRef(null);
  const pausedRemainingRef = useRef(targetSeconds);
  const intervalRef = useRef(null);

  // Sync state if initial evidence changes
  useEffect(() => {
    if (initialEvidence?.data?.elapsedSeconds && initialEvidence.data.elapsedSeconds >= targetSeconds) {
      setIsCompleted(true);
      setSecondsRemaining(0);
    }
  }, [initialEvidence, targetSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handlePause = () => {
    if (!isRunning) return;
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (deadlineRef.current) {
      const now = Date.now();
      const currentRemaining = Math.max(0, Math.round((deadlineRef.current - now) / 1000));
      pausedRemainingRef.current = currentRemaining;
      setSecondsRemaining(currentRemaining);
    }
  };

  // Auto-pause observation timer if session is paused or ended
  useEffect(() => {
    if ((isPaused || sessionEnded) && isRunning) {
      handlePause();
    }
  }, [isPaused, sessionEnded, isRunning]);

  const tick = () => {
    if (!deadlineRef.current) return;
    const now = Date.now();
    const diff = Math.max(0, Math.round((deadlineRef.current - now) / 1000));
    setSecondsRemaining(diff);

    if (diff <= 0) {
      setIsRunning(false);
      setIsCompleted(true);
      if (intervalRef.current) clearInterval(intervalRef.current);

      // Record successful completion evidence
      onSaveEvidence({
        elapsedSeconds: targetSeconds,
        targetSeconds: targetSeconds,
        completedAt: new Date().toISOString()
      });
    }
  };

  const handleStart = () => {
    if (isCompleted || isPaused || sessionEnded) return;
    const now = Date.now();
    deadlineRef.current = now + pausedRemainingRef.current * 1000;
    setIsRunning(true);
    intervalRef.current = setInterval(tick, 500);
  };

  const handleReset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    deadlineRef.current = null;
    pausedRemainingRef.current = targetSeconds;
    setSecondsRemaining(targetSeconds);
    setIsRunning(false);
    setIsCompleted(false);
    onRemoveEvidence();
  };

  const progressPercent = Math.min(100, Math.round(((targetSeconds - secondsRemaining) / targetSeconds) * 100));

  return (
    <div className="evidence-module time-module">
      <div className="evidence-header">
        <div className="evidence-title-group">
          <Timer size={18} className="text-forest" />
          <h4 className="evidence-heading">Timed Observation Period</h4>
        </div>
        {isCompleted ? (
          <span className="evidence-status-pill success">
            <CheckCircle2 size={13} />
            <span>Time Elapsed ({targetSeconds}s)</span>
          </span>
        ) : (
          <span className="evidence-status-pill warning">
            <span>Required: {targetSeconds}s</span>
          </span>
        )}
      </div>

      <p className="evidence-instruction">
        Quietly focus and observe this natural element for {targetSeconds} seconds before completing the challenge.
      </p>

      {/* Timer Progress Display */}
      <div className="observation-timer-box">
        <div className="obs-timer-main">
          <span className="obs-timer-digits">
            {secondsRemaining}s
          </span>
          <span className="obs-timer-sub">
            {isCompleted ? 'Target duration completed' : `${targetSeconds - secondsRemaining}s elapsed of ${targetSeconds}s`}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="obs-progress-bar-bg" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
          <div className="obs-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Timer Action Controls */}
        <div className="obs-controls-row">
          {!isCompleted ? (
            isPaused ? (
              <div className="obs-paused-notice" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-bark-muted)' }}>
                <Pause size={14} />
                <span>Session paused — resume session to observe</span>
              </div>
            ) : sessionEnded ? (
              <div className="obs-paused-notice" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-bark-muted)' }}>
                <Info size={14} />
                <span>Session ended — observations closed</span>
              </div>
            ) : isRunning ? (
              <button type="button" className="btn-journal" onClick={handlePause}>
                <Pause size={14} />
                <span>Pause Observation</span>
              </button>
            ) : (
              <button type="button" className="btn-journal btn-timer-play" onClick={handleStart}>
                <Play size={14} />
                <span>{secondsRemaining < targetSeconds ? 'Resume Observation' : 'Start Observation'}</span>
              </button>
            )
          ) : (
            <div className="obs-completed-msg">
              <CheckCircle2 size={16} className="text-forest" />
              <span>Observation requirements fulfilled!</span>
            </div>
          )}

          <button
            type="button"
            className="btn-timer-reset"
            onClick={handleReset}
            title="Reset observation timer"
            aria-label="Reset observation timer"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Honest Naturalist Disclaimer */}
      <div className="evidence-disclaimer">
        <Info size={14} className="disclaimer-icon" />
        <p>{getVerificationDisclaimer('TIME')}</p>
      </div>
    </div>
  );
}
