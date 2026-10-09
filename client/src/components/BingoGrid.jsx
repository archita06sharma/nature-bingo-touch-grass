import { useState, useRef } from 'react';
import { 
  Check, 
  Info, 
  Camera, 
  Timer, 
  MapPin, 
  Mic, 
  ShieldCheck, 
  Leaf,
  FileCheck2
} from 'lucide-react';

export default function BingoGrid({
  boardCells,
  completedTaskIds,
  evidenceMap = {},
  winningCellIndices,
  onToggleComplete,
  onInspectTask
}) {
  const gridRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Handle cell click with TIME task protection
  const handleCellClick = (cell, index) => {
    setFocusedIndex(index);
    const isCompleted = completedTaskIds.has(cell.id);
    const evidence = evidenceMap[cell.id];

    // If it's a TIME task and hasn't been verified yet and is not completed, open modal for timer
    if (cell.verificationType === 'TIME' && !isCompleted) {
      const required = cell.durationSeconds || 30;
      const elapsed = evidence?.data?.elapsedSeconds || 0;
      if (elapsed < required) {
        onInspectTask(cell);
        return;
      }
    }

    onToggleComplete(cell.id);
  };

  // Handle 2D keyboard navigation (Arrow keys, Space/Enter, I for info)
  const handleKeyDown = (e, index) => {
    let targetIndex = null;
    const row = Math.floor(index / 5);
    const col = index % 5;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        targetIndex = col < 4 ? index + 1 : index - 4;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        targetIndex = col > 0 ? index - 1 : index + 4;
        break;
      case 'ArrowDown':
        e.preventDefault();
        targetIndex = row < 4 ? index + 5 : col;
        break;
      case 'ArrowUp':
        e.preventDefault();
        targetIndex = row > 0 ? index - 5 : 20 + col;
        break;
      case ' ':
      case 'Enter':
        e.preventDefault();
        handleCellClick(boardCells[index], index);
        break;
      case 'i':
      case 'I':
        e.preventDefault();
        onInspectTask(boardCells[index]);
        break;
      default:
        break;
    }

    if (targetIndex !== null && gridRef.current) {
      setFocusedIndex(targetIndex);
      const cells = gridRef.current.querySelectorAll('.bingo-cell');
      if (cells[targetIndex]) {
        cells[targetIndex].focus();
      }
    }
  };

  const getCoord = (idx) => {
    const colLetter = ['A', 'B', 'C', 'D', 'E'][idx % 5];
    const rowNumber = Math.floor(idx / 5) + 1;
    return `${colLetter}${rowNumber}`;
  };

  return (
    <div className="bingo-board-wrapper" role="region" aria-label="Nature Bingo 5x5 Game Board">
      {/* Column Indicators */}
      <div className="board-column-headers" aria-hidden="true">
        <span>B • Flora</span>
        <span>I • Fauna</span>
        <span>N • Senses</span>
        <span>G • Earth</span>
        <span>O • Sky</span>
      </div>

      {/* 5x5 Grid */}
      <div 
        ref={gridRef}
        className="bingo-grid" 
        role="grid" 
        aria-label="5 by 5 Nature Bingo Grid"
        aria-rowcount={5}
        aria-colcount={5}
      >
        {boardCells.map((cell, idx) => {
          const isCompleted = completedTaskIds.has(cell.id);
          const isWinning = winningCellIndices.has(idx);
          const hasEvidence = Boolean(evidenceMap[cell.id]);
          const coord = getCoord(idx);
          const rowNum = Math.floor(idx / 5) + 1;
          const colNum = (idx % 5) + 1;

          return (
            <div
              key={`${cell.id}-${idx}`}
              className={`bingo-cell ${isCompleted ? 'completed' : ''} ${isWinning ? 'winning-cell' : ''} ${hasEvidence ? 'has-evidence' : ''}`}
              role="gridcell"
              aria-rowindex={rowNum}
              aria-colindex={colNum}
              tabIndex={idx === focusedIndex ? 0 : -1}
              onClick={() => handleCellClick(cell, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              aria-selected={isCompleted}
              aria-checked={isCompleted}
              aria-label={`Cell ${coord}: ${cell.title}, Category ${cell.category}, Verification ${cell.verificationType}${cell.durationSeconds ? ` ${cell.durationSeconds}s` : ''}, Status: ${isCompleted ? 'Completed' : 'Not completed'}${hasEvidence ? ', Evidence attached' : ''}. Press Space or Enter to toggle, or press I for full description.`}
            >
              {/* Coordinate & Category Tag */}
              <div className="cell-top-bar">
                <span className="cell-coord">{coord}</span>
                <div className="cell-indicators-wrap">
                  {hasEvidence && (
                    <span className="evidence-badge-icon" title="Journal evidence recorded">
                      <FileCheck2 size={12} className="text-forest" aria-hidden="true" />
                    </span>
                  )}
                  <span 
                    className={`cell-cat-dot ${cell.category}`} 
                    title={`Category: ${cell.category}`}
                    aria-label={`Category: ${cell.category}`}
                  />
                </div>
              </div>

              {/* Cell Main Title */}
              <div className="cell-body">
                <p className="cell-title">{cell.title}</p>
              </div>

              {/* Verification & Inspect Controls */}
              <div className="cell-footer">
                <span className="cell-type-badge" title={`Verification method: ${cell.verificationType}`}>
                  <VerificationIcon type={cell.verificationType} />
                  <span>
                    {cell.verificationType}
                    {cell.verificationType === 'TIME' && cell.durationSeconds ? ` (${cell.durationSeconds}s)` : ''}
                  </span>
                </span>

                <button
                  type="button"
                  className="btn-cell-info"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectTask(cell);
                  }}
                  title="View full challenge description, record evidence, and safety notes"
                  aria-label={`View details and record evidence for ${cell.title}`}
                >
                  <Info size={13} aria-hidden="true" />
                </button>
              </div>

              {/* Completed Stamp Overlay */}
              {isCompleted && (
                <div className="completed-stamp" aria-hidden="true">
                  <div className="stamp-circle">
                    <Check size={18} strokeWidth={3} />
                  </div>
                </div>
              )}

              {/* Winning Sparkle Accent */}
              {isWinning && (
                <div className="winning-accent" aria-hidden="true">
                  <Leaf size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerificationIcon({ type }) {
  switch (type) {
    case 'PHOTO': return <Camera size={11} aria-hidden="true" />;
    case 'TIME': return <Timer size={11} aria-hidden="true" />;
    case 'GPS': return <MapPin size={11} aria-hidden="true" />;
    case 'AUDIO': return <Mic size={11} aria-hidden="true" />;
    default: return <ShieldCheck size={11} aria-hidden="true" />;
  }
}
