import { useState, useRef, useEffect } from 'react';
import { Camera, Image, Trash2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { getVerificationDisclaimer } from '../../utils/evidenceLogic';

export default function PhotoVerification({
  taskId,
  initialEvidence,
  onSaveEvidence,
  onRemoveEvidence
}) {
  const [photoData, setPhotoData] = useState(initialEvidence?.data || null);
  const fileInputRef = useRef(null);

  // Sync with initial evidence
  useEffect(() => {
    setPhotoData(initialEvidence?.data || null);
  }, [initialEvidence]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WEBP, etc.)');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const data = {
      previewUrl,
      fileName: file.name,
      fileSize: Math.round(file.size / 1024), // KB
      lastModified: new Date(file.lastModified).toISOString()
    };

    setPhotoData(data);
    onSaveEvidence(data);
  };

  const handleRemove = () => {
    if (photoData?.previewUrl) {
      try {
        URL.revokeObjectURL(photoData.previewUrl);
      } catch (_) {}
    }
    setPhotoData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemoveEvidence();
  };

  return (
    <div className="evidence-module photo-module">
      <div className="evidence-header">
        <div className="evidence-title-group">
          <Camera size={18} className="text-forest" />
          <h4 className="evidence-heading">Photographic Field Snapshot</h4>
        </div>
        {photoData && (
          <span className="evidence-status-pill success">
            <CheckCircle2 size={13} />
            <span>Photo Attached</span>
          </span>
        )}
      </div>

      <p className="evidence-instruction">
        Capture a snapshot of the specimen or phenomenon with your camera, or attach a photo from your gallery.
      </p>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id={`photo-input-${taskId}`}
      />

      {photoData ? (
        <div className="photo-preview-container">
          <div className="photo-img-wrap">
            <img src={photoData.previewUrl} alt="Field observation snapshot" className="photo-preview-img" />
          </div>
          <div className="photo-meta-bar">
            <div className="photo-meta-text">
              <span className="photo-filename">{photoData.fileName}</span>
              <span className="photo-filesize">({photoData.fileSize} KB)</span>
            </div>
            <button
              type="button"
              className="btn-evidence-danger"
              onClick={handleRemove}
              title="Remove photo from journal"
              aria-label="Remove attached photo"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="evidence-dropzone" onClick={() => fileInputRef.current?.click()}>
          <div className="dropzone-icon">
            <Image size={28} />
          </div>
          <button
            type="button"
            className="btn-journal"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            <Camera size={15} />
            <span>Take Photo / Choose File</span>
          </button>
          <span className="dropzone-hint">Stored strictly in local memory. Zero uploads to any server.</span>
        </div>
      )}

      {/* Honest Naturalist Disclaimer */}
      <div className="evidence-disclaimer">
        <Info size={14} className="disclaimer-icon" />
        <p>{getVerificationDisclaimer('PHOTO')}</p>
      </div>
    </div>
  );
}
