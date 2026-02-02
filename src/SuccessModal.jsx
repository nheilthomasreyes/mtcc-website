import React, { useEffect } from 'react';
import './SuccessModal.css';

const SuccessModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Enter') {
        onClose();
      }
    };

    // Add event listener when modal opens
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup: remove event listener when modal closes or component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="success-card">
        <div className="success-icon">
          <div className="check-mark"></div>
        </div>
        <h2>Login Successful!</h2>
        <p>Welcome back to the MTCC Service Monitoring System.</p>
        <button
          onClick={onClose}
          className="modal-btn"
          autoFocus // This ensures the button is focused when modal opens
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;