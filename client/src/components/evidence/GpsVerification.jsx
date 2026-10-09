import { useState, useEffect } from 'react';
import { MapPin, Trash2, CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { getVerificationDisclaimer, isValidGpsData } from '../../utils/evidenceLogic';

export default function GpsVerification({
  taskId,
  initialEvidence,
  onSaveEvidence,
  onRemoveEvidence
}) {
  const [gpsData, setGpsData] = useState(initialEvidence?.data || null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Sync with initial evidence
  useEffect(() => {
    setGpsData(initialEvidence?.data || null);
  }, [initialEvidence]);

  const handleGetLocation = () => {
    setGpsError(null);

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;

        if (!isValidGpsData(latitude, longitude, accuracy)) {
          setGpsError('Received invalid coordinates from device.');
          return;
        }

        const data = {
          latitude: parseFloat(latitude.toFixed(5)),
          longitude: parseFloat(longitude.toFixed(5)),
          accuracyMeters: Math.round(accuracy),
          timestamp: new Date(position.timestamp).toISOString()
        };

        setGpsData(data);
        onSaveEvidence(data);
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Location permission was denied. Please allow location access in your browser settings to acquire coordinates.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('Location position is unavailable. Please check device GPS or internet connection.');
            break;
          case error.TIMEOUT:
            setGpsError('Location request timed out. Please try again in an open-sky area.');
            break;
          default:
            setGpsError('Unable to retrieve GPS coordinates.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000
      }
    );
  };

  const handleRemove = () => {
    setGpsData(null);
    setGpsError(null);
    onRemoveEvidence();
  };

  return (
    <div className="evidence-module gps-module">
      <div className="evidence-header">
        <div className="evidence-title-group">
          <MapPin size={18} className="text-forest" />
          <h4 className="evidence-heading">Geographic Landmark Waypoint</h4>
        </div>
        {gpsData && (
          <span className="evidence-status-pill success">
            <CheckCircle2 size={13} />
            <span>Waypoint Logged</span>
          </span>
        )}
      </div>

      <p className="evidence-instruction">
        Record your approximate device coordinates to document your exploration habitat.
      </p>

      {gpsError && (
        <div className="evidence-error-box">
          <AlertCircle size={15} />
          <span>{gpsError}</span>
        </div>
      )}

      {gpsData ? (
        <div className="gps-result-box">
          <div className="gps-coords-display">
            <div className="coord-item">
              <span className="coord-label">Latitude:</span>
              <span className="coord-value">{gpsData.latitude}°</span>
            </div>
            <div className="coord-item">
              <span className="coord-label">Longitude:</span>
              <span className="coord-value">{gpsData.longitude}°</span>
            </div>
            <div className="coord-item">
              <span className="coord-label">Est. Accuracy:</span>
              <span className="coord-value">±{gpsData.accuracyMeters} meters</span>
            </div>
          </div>
          <div className="gps-actions-bar">
            <button
              type="button"
              className="btn-evidence-danger"
              onClick={handleRemove}
              title="Clear logged waypoint"
              aria-label="Clear logged GPS waypoint"
            >
              <Trash2 size={14} />
              <span>Clear Waypoint</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="evidence-dropzone gps-dropzone">
          <button
            type="button"
            className="btn-journal"
            onClick={handleGetLocation}
            disabled={isLocating}
          >
            <MapPin size={15} className={isLocating ? 'spin' : ''} />
            <span>{isLocating ? 'Acquiring GPS Fix...' : 'Log Current GPS Coordinates'}</span>
          </button>
          <span className="dropzone-hint">Coordinates are kept purely on your local device. Zero server tracking.</span>
        </div>
      )}

      {/* Honest Naturalist Disclaimer */}
      <div className="evidence-disclaimer">
        <Info size={14} className="disclaimer-icon" />
        <p>{getVerificationDisclaimer('GPS')}</p>
      </div>
    </div>
  );
}
