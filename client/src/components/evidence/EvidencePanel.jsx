import PhotoVerification from './PhotoVerification';
import AudioVerification from './AudioVerification';
import TimeVerification from './TimeVerification';
import GpsVerification from './GpsVerification';
import HonorVerification from './HonorVerification';

export default function EvidencePanel({
  task,
  evidence,
  onSaveEvidence,
  onRemoveEvidence,
  isPaused = false,
  sessionEnded = false
}) {
  if (!task) return null;

  switch (task.verificationType) {
    case 'PHOTO':
      return (
        <PhotoVerification
          taskId={task.id}
          initialEvidence={evidence}
          onSaveEvidence={onSaveEvidence}
          onRemoveEvidence={onRemoveEvidence}
        />
      );

    case 'AUDIO':
      return (
        <AudioVerification
          taskId={task.id}
          initialEvidence={evidence}
          onSaveEvidence={onSaveEvidence}
          onRemoveEvidence={onRemoveEvidence}
        />
      );

    case 'TIME':
      return (
        <TimeVerification
          task={task}
          initialEvidence={evidence}
          onSaveEvidence={onSaveEvidence}
          onRemoveEvidence={onRemoveEvidence}
          isPaused={isPaused}
          sessionEnded={sessionEnded}
        />
      );

    case 'GPS':
      return (
        <GpsVerification
          taskId={task.id}
          initialEvidence={evidence}
          onSaveEvidence={onSaveEvidence}
          onRemoveEvidence={onRemoveEvidence}
        />
      );

    case 'HONOR':
    default:
      return (
        <HonorVerification
          taskId={task.id}
          initialEvidence={evidence}
          onSaveEvidence={onSaveEvidence}
          onRemoveEvidence={onRemoveEvidence}
        />
      );
  }
}
