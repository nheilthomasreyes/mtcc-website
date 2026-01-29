import React from 'react';
import './SuccessModal.css'; // We'll move the CSS here too

const SuccessModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null; // Don't render anything if not open

  return (
    <div className="modal-overlay">
      <div className="success-card">
        <div className="success-icon">
          <div className="check-mark"></div> {/* Styled like a checkmark */}
        </div>
        <h2>Login Successful!</h2>
        <p>Welcome back to the MTCC Portal.</p>
        <button
        onClick={onClose}
        className="modal-btn"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
};

export default SuccessModal;