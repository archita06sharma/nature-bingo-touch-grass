import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Sprout,
  Sparkles,
  BookOpen,
  Shuffle,
  RotateCcw,
  Award,
  AlertCircle,
  Info,
  Server,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Leaf,
  MapPin,
  Clock,
  ListChecks,
  Play
} from 'lucide-react';
import BingoGrid from './components/BingoGrid';
import SessionTimer from './components/SessionTimer';
import TaskDetailModal from './components/TaskDetailModal';
import WinModal from './components/WinModal';
import NewGameModal from './components/NewGameModal';
import { checkWin, shuffleBoard, SESSION_DURATION_SECONDS, formatTime } from './utils/bingoLogic';
import { createEvidenceRecord, canMarkComplete } from './utils/evidenceLogic';
import './App.css';

/**
 * Game State Machine:
 *  'welcome'  — App just opened. Welcome screen shown. No generation yet.
 *  'loading'  — Player clicked Start Exploring. Fetching challenges. Timer not started.
 *  'playing'  — Board ready, session timer counting down.
 *  'paused'   — Player paused the session. Board visible but actions blocked.
 *  'ended'    — Timer expired OR player ended session early. Results screen shown.
 */

export default function App() {
  // ─── Game State ──────────────────────────────────────────────────────────
  const [gameState, setGameState] = useState('welcome'); // 'welcome'|'loading'|'playing'|'paused'|'ended'

  // ─── Board & Tasks ───────────────────────────────────────────────────────
  const [boardCells, setBoardCells] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());
  const [evidenceMap, setEvidenceMap] = useState({}); // { [taskId]: EvidenceRecord }
  const [sourceMeta, setSourceMeta] = useState(null);

  // ─── Generation Error ────────────────────────────────────────────────────
  const [generationError, setGenerationError] = useState(null);

  // ─── Modals ───────────────────────────────────────────────────────────────
  const [selectedTask, setSelectedTask] = useState(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [acknowledgedLineNames, setAcknowledgedLineNames] = useState(new Set());

  // ─── Timer Control ───────────────────────────────────────────────────────
  // Incrementing this key resets the SessionTimer to 45:00
  const [timerResetKey, setTimerResetKey] = useState(0);

  // ─── Accessibility Announcer ─────────────────────────────────────────────
  const [announcement, setAnnouncement] = useState('');

  // ─── Diagnostics ─────────────────────────────────────────────────────────
  const [healthData, setHealthData] = useState(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // ─── Duplicate-request guard ─────────────────────────────────────────────
  const generatingRef = useRef(false);

  const announce = (msg) => setAnnouncement(msg);

  // ─── Evidence URL cleanup ────────────────────────────────────────────────
  const cleanupEvidenceUrls = (map) => {
    Object.values(map).forEach(record => {
      if (record?.data?.previewUrl) {
        try { URL.revokeObjectURL(record.data.previewUrl); } catch (_) {}
      }
      if (record?.data?.audioUrl) {
        try { URL.revokeObjectURL(record.data.audioUrl); } catch (_) {}
      }
    });
  };

  // ─── Challenge Generation ────────────────────────────────────────────────
  const loadChallenges = useCallback(async (forceFallback = false) => {
    if (generatingRef.current) return; // prevent duplicate requests
    generatingRef.current = true;

    setGameState('loading');
    setGenerationError(null);
    announce('Preparing your 25 nature challenges…');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('/api/challenges/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceFallback, timeoutMs: 20000 }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.tasks || data.tasks.length !== 25) {
        throw new Error('API response did not contain exactly 25 challenges');
      }

      cleanupEvidenceUrls(evidenceMap);

      setBoardCells(data.tasks);
      setCompletedTaskIds(new Set());
      setEvidenceMap({});
      setAcknowledgedLineNames(new Set());
      setShowWinModal(false);
      setSourceMeta({
        source: data.source,
        model: data.model,
        timestamp: data.timestamp,
        fallbackReason: data.fallbackReason
      });

      // Board is ready — transition to playing (timer auto-starts)
      setGameState('playing');
      setTimerResetKey(k => k + 1);

      const sourceLabel = data.source === 'ai' ? 'local Gemma AI' : 'curated field guide';
      announce(`Loaded 25 challenges from ${sourceLabel}. Your session has begun!`);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Challenge load error:', err);
      const msg = err.name === 'AbortError'
        ? 'Challenge request timed out after 25 seconds. You can load the curated fallback directly.'
        : (err.message || 'Unable to connect to Nature Bingo service');
      setGenerationError(msg);
      setGameState('welcome'); // return to welcome on error so user can retry
      announce('Failed to load challenges. Retry options available.');
    } finally {
      generatingRef.current = false;
    }
  }, [evidenceMap]);

  // Fetch health data once on mount (does NOT trigger challenge generation)
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealthData(data))
      .catch(() => {});

    return () => cleanupEvidenceUrls(evidenceMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Win Detection ───────────────────────────────────────────────────────
  const winState = useMemo(() => checkWin(boardCells, completedTaskIds), [boardCells, completedTaskIds]);

  const winningCellIndicesSet = useMemo(
    () => new Set(winState.winningCellIndices),
    [winState.winningCellIndices]
  );

  // Detect new winning lines (only while session is active)
  useEffect(() => {
    if ((gameState !== 'playing' && gameState !== 'paused') || !winState.hasWon) {
      if (acknowledgedLineNames.size > 0) setAcknowledgedLineNames(new Set());
      return;
    }
    const currentLineNames = winState.winningLines.map(l => l.name);
    const newLineDetected = currentLineNames.some(name => !acknowledgedLineNames.has(name));
    if (newLineDetected) {
      setShowWinModal(true);
      setAcknowledgedLineNames(new Set(currentLineNames));
      announce(`Bingo achieved! Completed line: ${currentLineNames.join(', ')}.`);
    }
  }, [winState, gameState, acknowledgedLineNames]);

  // ─── Cell Toggle ─────────────────────────────────────────────────────────
  const handleToggleComplete = useCallback((taskId) => {
    // Completions only allowed during active play
    if (gameState === 'paused') {
      announce('Session is paused. Press Resume to mark challenges.');
      return;
    }
    if (gameState !== 'playing') return;

    const task = boardCells.find(t => t.id === taskId);
    const isCurrentlyCompleted = completedTaskIds.has(taskId);

    if (isCurrentlyCompleted) {
      // Unchecking — allowed, retains evidence
      setCompletedTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
      announce(`Unchecked ${task?.title || 'challenge'}.`);
      return;
    }

    // Checking — enforce verification
    const evidence = evidenceMap[taskId];
    const rule = canMarkComplete(task, evidence);
    if (!rule.allowed) {
      // Open modal so user can satisfy verification
      if (task) {
        setSelectedTask(task);
        announce(`Verification required: ${rule.reason}`);
      }
      return;
    }

    setCompletedTaskIds(prev => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    // Auto-close the modal when it's open for this specific task
    setSelectedTask(prev => (prev?.id === taskId ? null : prev));
    announce(`Marked ${task?.title || 'challenge'} as completed.`);
  }, [boardCells, completedTaskIds, evidenceMap, gameState]);

  // ─── Evidence ────────────────────────────────────────────────────────────
  const handleSaveEvidence = useCallback((taskId, type, data) => {
    const record = createEvidenceRecord(taskId, type, data);
    setEvidenceMap(prev => ({ ...prev, [taskId]: record }));

    // TIME tasks: auto-complete when duration satisfied during active play
    const task = boardCells.find(t => t.id === taskId);
    if (task && task.verificationType === 'TIME') {
      const required = task.durationSeconds || 30;
      if (data.elapsedSeconds >= required && gameState === 'playing') {
        setCompletedTaskIds(prev => {
          const next = new Set(prev);
          next.add(taskId);
          return next;
        });
        // Auto-close the modal when it's open for this TIME task
        setSelectedTask(prev => (prev?.id === taskId ? null : prev));
        announce(`Observation period finished. Challenge "${task.title}" completed!`);
      }
    } else {
      announce(`Evidence saved for ${task?.title || 'task'}.`);
    }
  }, [boardCells, gameState]);

  const handleRemoveEvidence = useCallback((taskId) => {
    const existing = evidenceMap[taskId];
    if (existing?.data?.previewUrl) {
      try { URL.revokeObjectURL(existing.data.previewUrl); } catch (_) {}
    }
    if (existing?.data?.audioUrl) {
      try { URL.revokeObjectURL(existing.data.audioUrl); } catch (_) {}
    }

    setEvidenceMap(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });

    // Removing evidence from a completed task unchecks it
    const task = boardCells.find(t => t.id === taskId);
    if (task) {
      setCompletedTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }

    announce(`Removed evidence for ${task?.title || 'task'}. Task unchecked.`);
  }, [boardCells, evidenceMap]);

  // ─── Shuffle (allowed between games or before start, disabled during playing/paused) ───
  const canShuffle = gameState !== 'playing' && gameState !== 'paused' && boardCells.length === 25;

  const handleShuffleBoard = useCallback(() => {
    if (!canShuffle || boardCells.length !== 25) return;
    cleanupEvidenceUrls(evidenceMap);
    setBoardCells(prev => shuffleBoard(prev));
    setCompletedTaskIds(new Set());
    setEvidenceMap({});
    setAcknowledgedLineNames(new Set());
    setShowWinModal(false);
    setShowNewGameModal(false);
    setGameState('playing');
    setTimerResetKey(k => k + 1);
    announce('Board layout shuffled. New exploration session begun!');
  }, [canShuffle, boardCells, evidenceMap]);

  // ─── Session Timer Callbacks ─────────────────────────────────────────────
  const handlePause = useCallback(() => {
    if (gameState === 'playing') setGameState('paused');
  }, [gameState]);

  const handleResume = useCallback(() => {
    if (gameState === 'paused') setGameState('playing');
  }, [gameState]);

  const handleEndSession = useCallback(() => {
    setGameState('ended');
    announce('Session ended. Reviewing your results.');
  }, []);

  const handleTimerExpire = useCallback(() => {
    setGameState('ended');
    announce("Forty-five-minute outdoor exploration session has ended. Time's up!");
  }, []);

  // ─── New Game ────────────────────────────────────────────────────────────
  const handleRequestNewGame = () => {
    if (gameState === 'playing' || gameState === 'paused') {
      // Has in-progress session — confirm first
      setShowNewGameModal(true);
    } else if (gameState === 'ended' || gameState === 'welcome') {
      // No active session or results screen — just start fresh
      if (completedTaskIds.size > 0 || Object.keys(evidenceMap).length > 0) {
        setShowNewGameModal(true);
      } else {
        loadChallenges(false);
      }
    }
  };

  const handleConfirmNewGame = () => {
    setShowNewGameModal(false);
    cleanupEvidenceUrls(evidenceMap);
    setCompletedTaskIds(new Set());
    setEvidenceMap({});
    setAcknowledgedLineNames(new Set());
    setShowWinModal(false);
    loadChallenges(false);
  };

  const evidenceCount = Object.keys(evidenceMap).length;

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="nature-bingo-app">
      {/* Screen Reader Announcer */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* ── Header (always visible) ── */}
      <header className="game-header">
        <div className="header-top-row">
          <div className="game-badge">
            <Sprout size={16} aria-hidden="true" />
            <span>Outdoor Exploration Journal</span>
          </div>

          {sourceMeta && (
            <div className={`source-pill ${sourceMeta.source}`}>
              {sourceMeta.source === 'ai' ? (
                <>
                  <Sparkles size={14} aria-hidden="true" />
                  <span>Local AI (Gemma 4)</span>
                </>
              ) : (
                <>
                  <BookOpen size={14} aria-hidden="true" />
                  <span>Curated Field Guide (Fallback)</span>
                </>
              )}
            </div>
          )}
        </div>

        <h1 className="game-title">Nature Bingo — Touch Grass</h1>
        <p className="game-tagline">
          Step outside, observe mindfully, record local journal evidence, and connect five observations in a row.
        </p>

        {sourceMeta?.fallbackReason && (
          <div className="source-notice" role="status">
            <Info size={14} aria-hidden="true" />
            <span>Field Guide loaded ({sourceMeta.fallbackReason}). Full challenge set is verified and ready.</span>
          </div>
        )}
      </header>

      {/* ── Main Content ── */}
      <main className="game-layout">

        {/* ── WELCOME SCREEN ── */}
        {gameState === 'welcome' && (
          <div className="welcome-screen">
            <div className="welcome-hero">
              <div className="welcome-icon" aria-hidden="true">🌿</div>
              <h2 className="welcome-heading">Ready to Touch Grass?</h2>
              <p className="welcome-description">
                Nature Bingo is a 45-minute outdoor exploration game. Explore your surroundings,
                complete nature-observation challenges, and mark off a line of five to win.
              </p>
            </div>

            <div className="welcome-rules">
              <h3 className="welcome-rules-title">
                <ListChecks size={16} aria-hidden="true" />
                How to Play
              </h3>
              <ol className="rules-list">
                <li>
                  <Clock size={14} aria-hidden="true" />
                  <span>Go outside and start a <strong>45-minute session</strong>.</span>
                </li>
                <li>
                  <MapPin size={14} aria-hidden="true" />
                  <span>Tap any cell to open it, record evidence, and mark it complete.</span>
                </li>
                <li>
                  <Award size={14} aria-hidden="true" />
                  <span>Complete <strong>5 in a row</strong> — horizontal, vertical, or diagonal — to win.</span>
                </li>
                <li>
                  <Leaf size={14} aria-hidden="true" />
                  <span>Leave No Trace. Observe only; never touch unknown plants or wildlife.</span>
                </li>
              </ol>
            </div>

            <div className="welcome-verification-guide">
              <p className="welcome-ver-note">
                Each challenge has a verification requirement before it can be marked complete:
                <strong> PHOTO</strong> (take a photo), <strong>AUDIO</strong> (record ambient sound),
                <strong> GPS</strong> (capture your location), <strong>TIME</strong> (observe for a set duration),
                or <strong>HONOR</strong> (confirm by pledge).
              </p>
            </div>

            {generationError && (
              <div className="error-panel" role="alert">
                <AlertCircle size={28} className="text-warning" aria-hidden="true" />
                <p>{generationError}</p>
                <button
                  type="button"
                  className="btn-journal-secondary"
                  onClick={() => loadChallenges(true)}
                >
                  Load Curated Field Guide Instead
                </button>
              </div>
            )}

            <div className="welcome-actions">
              <button
                type="button"
                className="btn-start-exploring"
                onClick={() => loadChallenges(false)}
                aria-label="Start exploring — generate challenges and begin session"
              >
                <Play size={20} aria-hidden="true" />
                <span>Start Exploring</span>
              </button>
            </div>
          </div>
        )}

        {/* ── LOADING SCREEN ── */}
        {gameState === 'loading' && (
          <div className="loading-panel" role="status" aria-live="polite">
            <Sprout size={42} className="spin text-forest" aria-hidden="true" />
            <h2>Preparing Your 5×5 Nature Journal…</h2>
            <p>Gathering 25 balanced challenges across flora, fauna, earth, sky, and sensory mindfulness.</p>
            <p className="loading-note">Session timer will start automatically once your board is ready.</p>
          </div>
        )}

        {/* ── PLAYING / PAUSED BOARD ── */}
        {(gameState === 'playing' || gameState === 'paused') && (
          <>
            {/* Controls Bar */}
            <div className="game-controls-bar">
              <div className="progress-summary">
                <div className="progress-pill" aria-label={`Challenges completed: ${completedTaskIds.size} of 25`}>
                  <span className="progress-val">{completedTaskIds.size} / 25</span>
                  <span className="progress-label">Observed</span>
                </div>
                {evidenceCount > 0 && (
                  <div className="evidence-summary-pill" title="Challenges with recorded local evidence">
                    <FileCheck2 size={14} aria-hidden="true" />
                    <span>{evidenceCount} Evidence Recorded</span>
                  </div>
                )}
                {winState.hasWon && (
                  <div className="bingo-win-pill" role="status">
                    <Award size={15} aria-hidden="true" />
                    <span>Bingo! ({winState.winningLines.length} Line{winState.winningLines.length > 1 ? 's' : ''})</span>
                  </div>
                )}
              </div>

              <div className="controls-button-group">
                {gameState === 'paused' && (
                  <button
                    type="button"
                    className="btn-action-leaf btn-resume"
                    onClick={handleResume}
                    aria-label="Resume session"
                  >
                    <Play size={15} aria-hidden="true" />
                    <span>Resume</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn-action-leaf btn-new-game"
                  onClick={handleRequestNewGame}
                  title="Abandon this session and start a new game"
                  aria-label="Start new game"
                >
                  <RotateCcw size={15} aria-hidden="true" />
                  <span>New Game</span>
                </button>
              </div>
            </div>

            {/* Session Timer (controlled) */}
            <SessionTimer
              gameState={gameState}
              onPause={handlePause}
              onResume={handleResume}
              onEndSession={handleEndSession}
              onTimerExpire={handleTimerExpire}
              resetKey={timerResetKey}
            />

            {/* Paused overlay notice */}
            {gameState === 'paused' && (
              <div className="session-paused-banner" role="status">
                <span>⏸ Session paused — no completions while paused. Press Resume to continue.</span>
              </div>
            )}

            {/* 5×5 Bingo Board */}
            <BingoGrid
              boardCells={boardCells}
              completedTaskIds={completedTaskIds}
              evidenceMap={evidenceMap}
              winningCellIndices={winningCellIndicesSet}
              onToggleComplete={handleToggleComplete}
              onInspectTask={setSelectedTask}
            />

            {/* Legend */}
            <div className="board-legend" aria-label="Category and interaction legend">
              <div className="legend-item">
                <span className="cell-cat-dot flora" aria-hidden="true" />
                <span>Flora</span>
              </div>
              <div className="legend-item">
                <span className="cell-cat-dot fauna" aria-hidden="true" />
                <span>Fauna</span>
              </div>
              <div className="legend-item">
                <span className="cell-cat-dot sensory" aria-hidden="true" />
                <span>Sensory</span>
              </div>
              <div className="legend-item">
                <span className="cell-cat-dot earth" aria-hidden="true" />
                <span>Earth</span>
              </div>
              <div className="legend-item">
                <span className="cell-cat-dot sky" aria-hidden="true" />
                <span>Sky</span>
              </div>
              <div className="legend-hint">
                <span>Tip: Tap a cell to toggle • Tap <Info size={11} style={{ verticalAlign: 'middle' }} aria-hidden="true" /> to record evidence • Zero external uploads</span>
              </div>
            </div>
          </>
        )}

        {/* ── RESULTS SCREEN ── */}
        {gameState === 'ended' && (
          <div className="results-screen">
            <div className="results-header">
              <div className="results-icon" aria-hidden="true">
                {winState.hasWon ? '🏆' : '🌿'}
              </div>
              <h2 className="results-heading">
                {winState.hasWon ? 'Session Complete — You Got Bingo!' : 'Session Complete'}
              </h2>
              <p className="results-subheading">
                {winState.hasWon
                  ? `You completed ${winState.winningLines.length} bingo line${winState.winningLines.length > 1 ? 's' : ''} and observed ${completedTaskIds.size} of 25 challenges.`
                  : `You observed ${completedTaskIds.size} of 25 nature challenges. Keep exploring next time!`}
              </p>
            </div>

            {winState.hasWon && winState.winningLines.length > 0 && (
              <div className="results-lines">
                <h3 className="results-section-title">
                  <Award size={16} aria-hidden="true" />
                  Completed Lines
                </h3>
                <ul className="results-lines-list">
                  {winState.winningLines.map(line => (
                    <li key={line.name}>{line.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {completedTaskIds.size > 0 && (
              <div className="results-completed">
                <h3 className="results-section-title">
                  <FileCheck2 size={16} aria-hidden="true" />
                  Challenges Observed ({completedTaskIds.size})
                </h3>
                <ul className="results-tasks-list">
                  {boardCells
                    .filter(t => completedTaskIds.has(t.id))
                    .map(t => (
                      <li key={t.id}>
                        <span className={`cell-cat-dot ${t.category}`} aria-hidden="true" />
                        <span>{t.title}</span>
                        {evidenceMap[t.id] && (
                          <span className="results-evidence-tag">{evidenceMap[t.id].type}</span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {completedTaskIds.size === 0 && (
              <p className="results-empty">No challenges were completed this session.</p>
            )}

            <div className="results-actions">
              <button
                type="button"
                className="btn-start-exploring"
                onClick={handleRequestNewGame}
                aria-label="Play again with a new set of challenges"
              >
                <RotateCcw size={18} aria-hidden="true" />
                <span>Play Again</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ── Task Evidence Modal (available any time a board exists) ── */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isCompleted={completedTaskIds.has(selectedTask.id)}
          evidence={evidenceMap[selectedTask.id]}
          onToggleComplete={handleToggleComplete}
          onSaveEvidence={handleSaveEvidence}
          onRemoveEvidence={handleRemoveEvidence}
          onClose={() => setSelectedTask(null)}
          isPaused={gameState === 'paused'}
          sessionEnded={gameState === 'ended'}
        />
      )}

      {/* ── Win Modal ── */}
      {showWinModal && (
        <WinModal
          winningLines={winState.winningLines}
          totalCompleted={completedTaskIds.size}
          onKeepExploring={() => setShowWinModal(false)}
          onNewGame={() => {
            setShowWinModal(false);
            handleRequestNewGame();
          }}
        />
      )}

      {/* ── New Game Confirmation Modal ── */}
      {showNewGameModal && (
        <NewGameModal
          completedCount={completedTaskIds.size}
          onCancel={() => setShowNewGameModal(false)}
          onConfirmNewGame={handleConfirmNewGame}
          onShuffle={handleShuffleBoard}
          canShuffle={canShuffle}
        />
      )}

      {/* ── Footer Diagnostics ── */}
      <footer className="game-footer">
        <div className="footer-bar">
          <p className="footer-copyright">
            Nature Bingo — Touch Grass • Hacktoberfest 2026 • Leave No Trace
          </p>
          <button
            type="button"
            className="btn-toggle-diagnostics"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            aria-expanded={showDiagnostics}
          >
            <Server size={14} aria-hidden="true" />
            <span>System Diagnostics</span>
            {showDiagnostics ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
          </button>
        </div>

        {showDiagnostics && (
          <div className="diagnostics-drawer">
            <div className="diag-grid">
              <div className="diag-item">
                <span className="diag-key">Backend:</span>
                <span className="diag-val">{healthData?.service || 'Express API'} (v{healthData?.version || '1.0'})</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Evidence Privacy:</span>
                <span className="diag-val">100% Client-Side In-Memory (No Uploads)</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Active Evidence:</span>
                <span className="diag-val">{evidenceCount} Records Logged</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Fallback System:</span>
                <span className="diag-val">Active &amp; Verified (25 Curated Tasks)</span>
              </div>
              <div className="diag-item">
                <span className="diag-key">Game State:</span>
                <span className="diag-val">{gameState}</span>
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
