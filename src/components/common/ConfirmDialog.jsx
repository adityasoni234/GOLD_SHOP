import { useState } from 'react';
import Modal from './Modal.jsx';

/**
 * Confirmation dialog. Pass `requireReason` to force the user to type a reason
 * (used for cancelling / editing finalized invoices).
 */
export default function ConfirmDialog({
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  danger = false,
  requireReason = false,
  reasonLabel = 'Reason',
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (requireReason && !reason.trim()) {
      setError('Please enter a reason.');
      return;
    }
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>Go back</button>
          <button className={`btn ${danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={submit} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack">
        {message && <div>{message}</div>}
        {requireReason && (
          <div className="field">
            <label>{reasonLabel} <span className="req">*</span></label>
            <textarea className="textarea" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        {error && <div className="field-error">{error}</div>}
      </div>
    </Modal>
  );
}
