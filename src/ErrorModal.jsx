import React from 'react';
import './ErrorModal.css'; 

const ErrorModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* The red circle with the 'X' icon */}
        <div className="error-icon-circle">
          <div className="error-x-mark"></div>
        </div>
        
        <h2 className="error-title">Login Failed</h2>
        <p className="error-text">
          Invalid email or password. <br />
          Please check your credentials and try again.
        </p>
        
        {/* The Try Again Button */}
        <button onClick={onClose} className="try-again-btn">
          TRY AGAIN
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;