import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, CheckCircle2, AlertCircle, Info, Volume2 } from 'lucide-react';
import { getVerificationDisclaimer } from '../../utils/evidenceLogic';

export default function AudioVerification({
  taskId,
  initialEvidence,
  onSaveEvidence,
  onRemoveEvidence
}) {
  const [audioData, setAudioData] = useState(initialEvidence?.data || null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [permissionError, setPermissionError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // Sync with initial evidence
  useEffect(() => {
    setAudioData(initialEvidence?.data || null);
  }, [initialEvidence]);

  // Clean up recording streams and timers on unmount
  useEffect(() => {
    return () => {
      stopMediaStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const stopMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (_) {}
      });
      mediaStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];

    // Browser feature support check
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPermissionError('Audio recording is not supported by your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const data = {
          audioUrl,
          durationSeconds: recordingSeconds,
          sizeBytes: audioBlob.size,
          mimeType: audioBlob.type
        };

        setAudioData(data);
        onSaveEvidence(data);
        stopMediaStream();
      };

      mediaRecorder.start(250); // Slice data every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start elapsed timer and auto-stop at 15 seconds
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 14) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Microphone permission was denied. Please allow microphone access in your browser settings to record audio.');
      } else {
        setPermissionError(`Microphone error: ${err.message || 'Unable to access audio device.'}`);
      }
      stopMediaStream();
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }

    setIsRecording(false);
  };

  const handleRemove = () => {
    if (audioData?.audioUrl) {
      try {
        URL.revokeObjectURL(audioData.audioUrl);
      } catch (_) {}
    }
    setAudioData(null);
    onRemoveEvidence();
  };

  return (
    <div className="evidence-module audio-module">
      <div className="evidence-header">
        <div className="evidence-title-group">
          <Mic size={18} className="text-forest" />
          <h4 className="evidence-heading">Audio Soundscape Snippet</h4>
        </div>
        {audioData && (
          <span className="evidence-status-pill success">
            <CheckCircle2 size={13} />
            <span>Audio Clip Ready</span>
          </span>
        )}
      </div>

      <p className="evidence-instruction">
        Record a 10–15 second snippet of ambient nature sounds (e.g. bird calls, rustling wind, water).
      </p>

      {permissionError && (
        <div className="evidence-error-box">
          <AlertCircle size={15} />
          <span>{permissionError}</span>
        </div>
      )}

      {audioData ? (
        <div className="audio-playback-container">
          <div className="audio-player-wrap">
            <Volume2 size={18} className="text-forest" />
            <audio controls src={audioData.audioUrl} className="audio-element" />
          </div>
          <div className="audio-meta-bar">
            <span className="audio-meta-text">
              Recorded snippet (~{audioData.durationSeconds || 10}s)
            </span>
            <button
              type="button"
              className="btn-evidence-danger"
              onClick={handleRemove}
              title="Delete audio snippet"
              aria-label="Delete recorded audio snippet"
            >
              <Trash2 size={14} />
              <span>Delete Clip</span>
            </button>
          </div>
        </div>
      ) : isRecording ? (
        <div className="recording-active-box">
          <div className="recording-indicator">
            <span className="recording-dot" />
            <span>Recording Soundscape... 0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 0:15</span>
          </div>
          <button
            type="button"
            className="btn-journal btn-stop-rec"
            onClick={stopRecording}
            aria-label="Stop recording audio"
          >
            <Square size={14} />
            <span>Stop Recording</span>
          </button>
        </div>
      ) : (
        <div className="evidence-dropzone audio-dropzone">
          <button
            type="button"
            className="btn-journal"
            onClick={startRecording}
          >
            <Mic size={15} />
            <span>Record Ambient Nature (15s Max)</span>
          </button>
          <span className="dropzone-hint">Stored locally in browser audio memory. Zero server uploads.</span>
        </div>
      )}

      {/* Honest Naturalist Disclaimer */}
      <div className="evidence-disclaimer">
        <Info size={14} className="disclaimer-icon" />
        <p>{getVerificationDisclaimer('AUDIO')}</p>
      </div>
    </div>
  );
}
