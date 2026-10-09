import { useState, useEffect, useRef, useCallback } from 'react';
import { Pause, Play, RotateCcw, Clock, AlertTriangle, LogOut } from 'lucide-react';
import { formatTime, SESSION_DURATION_SECONDS } from '../utils/bingoLogic';

/**
 * SessionTimer — fully controlled by parent via props.
 *
 * Props:
 *  - gameState: 'playing' | 'paused' | 'ended' | other
 *  - onPause()       — called when user clicks Pause
 *  - onResume()      — called when user clicks Resume
 *  - onEndSession()  — called when user clicks End Session early
 *  - onTimerExpire() — called when countdown reaches 0
 *  - resetKey        — increment to force timer back to 45:00 (new game)
 *
 * The timer auto-starts when gameState transitions to 'playing'.
 * The timer auto-pauses when gameState transitions to 'paused'.
 * No manual Start button — start is driven by game state.
 */
export default function SessionTimer({ gameState, onPause, onResume, onEndSession, onTimerExpire, resetKey }) {
  const [remainingSeconds, setRemainingSeconds] = useState(SESSION_DURATION_SECONDS);
  const [isExpired, setIsExpired] = useState(false);

  const deadlineRef = useRef(null);
  const pausedRemainingRef = useRef(SESSION_DURATION_SECONDS);
  const timerIntervalRef = useRef(null);
  const expiredCalledRef = useRef(false);
  const prevResetKeyRef = useRef(resetKey);

  const isRunning = gameState === 'playing';

  const stopInterval = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const tick = useCallback(() => {
    if (!deadlineRef.current) return;
    const now = Date.now();
    const diff = Math.max(0, Math.round((deadlineRef.current - now) / 1000));
    setRemainingSeconds(diff);

    if (diff <= 0 && !expiredCalledRef.current) {
      expiredCalledRef.current = true;
      stopInterval();
      setIsExpired(true);
      if (onTimerExpire) onTimerExpire();
    }
  }, [onTimerExpire]);

  // Unified timer lifecycle: handles start, pause, resume, resetKey, and ended states
  useEffect(() => {
    let expired = isExpired;

    // 1. Reset timer values when resetKey changes (new game)
    if (prevResetKeyRef.current !== resetKey) {
      prevResetKeyRef.current = resetKey;
      stopInterval();
      deadlineRef.current = null;
      pausedRemainingRef.current = SESSION_DURATION_SECONDS;
      expiredCalledRef.current = false;
      setRemainingSeconds(SESSION_DURATION_SECONDS);
      setIsExpired(false);
      expired = false;
    }

    // 2. Early session termination (e.g. End Session clicked)
    if (gameState === 'ended') {
      stopInterval();
      if (deadlineRef.current) {
        const now = Date.now();
        const currentRemaining = Math.max(0, Math.round((deadlineRef.current - now) / 1000));
        pausedRemainingRef.current = currentRemaining;
        setRemainingSeconds(currentRemaining);
        deadlineRef.current = null;
      }
      setIsExpired(true);
      return stopInterval;
    }

    // 3. Clear leftover expired flag when entering playing state
    if (gameState === 'playing' && !expiredCalledRef.current) {
      if (expired) {
        setIsExpired(false);
        expired = false;
      }
    }

    // 4. Active countdown when playing and not expired
    if (isRunning && !expired) {
      const now = Date.now();
      deadlineRef.current = now + pausedRemainingRef.current * 1000;
      timerIntervalRef.current = setInterval(tick, 500);
    } else {
      // 4. Paused state: freeze remaining time
      stopInterval();
      if (!isRunning && deadlineRef.current && !expired) {
        const now = Date.now();
        const currentRemaining = Math.max(0, Math.round((deadlineRef.current - now) / 1000));
        pausedRemainingRef.current = currentRemaining;
        setRemainingSeconds(currentRemaining);
        deadlineRef.current = null;
      }
    }

    return stopInterval;
  }, [isRunning, isExpired, gameState, resetKey, tick]);

  const isLowTime = remainingSeconds <= 300 && remainingSeconds > 0 && !isExpired;

  return (
    <div className={`session-timer-card ${isExpired ? 'expired' : isLowTime ? 'warning' : ''}`}>
      <div className="timer-left">
        <div className="timer-icon-box">
          {isExpired ? (
            <AlertTriangle size={18} className="text-warning" />
          ) : (
            <Clock size={18} className={isRunning ? 'pulse' : ''} />
          )}
        </div>
        <div className="timer-labels">
          <span className="timer-title">Outdoor Exploration Session</span>
          <div className="timer-display-wrap">
            <span
              className="timer-digits"
              role="timer"
              aria-live="polite"
              aria-label={`Time remaining: ${formatTime(remainingSeconds)}`}
            >
              {formatTime(remainingSeconds)}
            </span>
            <span className={`timer-status-badge ${isRunning ? 'running' : isExpired ? 'ended' : 'paused'}`}>
              {isExpired ? "Time's Up" : isRunning ? 'Counting Down' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      <div className="timer-controls">
        {!isExpired && (
          <>
            {isRunning ? (
              <button
                type="button"
                className="btn-timer-action"
                onClick={onPause}
                title="Pause session timer"
                aria-label="Pause timer"
              >
                <Pause size={15} />
                <span>Pause</span>
              </button>
            ) : gameState === 'paused' ? (
              <button
                type="button"
                className="btn-timer-action btn-timer-resume"
                onClick={onResume}
                title="Resume session timer"
                aria-label="Resume timer"
              >
                <Play size={15} />
                <span>Resume</span>
              </button>
            ) : null}

            <button
              type="button"
              className="btn-timer-end"
              onClick={onEndSession}
              title="End session early and see your results"
              aria-label="End session"
            >
              <LogOut size={14} />
              <span>End Session</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
