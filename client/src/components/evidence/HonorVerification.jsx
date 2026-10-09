import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Edit3, Info } from 'lucide-react';
import { getVerificationDisclaimer } from '../../utils/evidenceLogic';

export default function HonorVerification({
  taskId,
  initialEvidence,
  onSaveEvidence,
  onRemoveEvidence
}) {
  const [notes, setNotes] = useState(initialEvidence?.data?.notes || '');
  const [confirmed, setConfirmed] = useState(Boolean(initialEvidence?.data?.confirmed));

  useEffect(() => {
    setNotes(initialEvidence?.data?.notes || '');
    setConfirmed(Boolean(initialEvidence?.data?.confirmed));
  }, [initialEvidence]);

  const handleToggleConfirm = (e) => {
    const isChecked = e.target.checked;
    setConfirmed(isChecked);
    if (isChecked) {
      onSaveEvidence({ confirmed: true, notes });
    } else {
      if (!notes.trim()) {
        onRemoveEvidence();
      } else {
        onSaveEvidence({ confirmed: false, notes });
      }
    }
  };

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    onSaveEvidence({ confirmed, notes: val });
  };

  return (
    <div className="evidence-module honor-module">
      <div className="evidence-header">
        <div className="evidence-title-group">
          <ShieldCheck size={18} className="text-forest" />
          <h4 className="evidence-heading">Field Naturalist Honor Pledge</h4>
        </div>
        {confirmed && (
          <span className="evidence-status-pill success">
            <CheckCircle2 size={13} />
            <span>Observation Confirmed</span>
          </span>
        )}
      </div>

      <p className="evidence-instruction">
        Observe directly with your senses without disturbing plants or wildlife.
      </p>

      {/* Confirmation Checkbox */}
      <label className="honor-checkbox-label">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={handleToggleConfirm}
          className="honor-checkbox"
        />
        <span>I have completed this challenge with mindful attention and respect for the natural environment.</span>
      </label>

      {/* Optional Field Notes */}
      <div className="honor-notes-box">
        <label className="notes-label" htmlFor={`honor-notes-${taskId}`}>
          <Edit3 size={13} />
          <span>Field Notes & Impressions (Optional):</span>
        </label>
        <textarea
          id={`honor-notes-${taskId}`}
          className="honor-notes-textarea"
          placeholder="Jot down sensory impressions, colors, textures, or feelings..."
          value={notes}
          onChange={handleNotesChange}
          rows={3}
          maxLength={300}
        />
      </div>

      {/* Honest Naturalist Disclaimer */}
      <div className="evidence-disclaimer">
        <Info size={14} className="disclaimer-icon" />
        <p>{getVerificationDisclaimer('HONOR')}</p>
      </div>
    </div>
  );
}
