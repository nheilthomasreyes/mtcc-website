import { useState } from 'react';
import SuccessModal from './SuccessModal';
import ErrorModal from './ErrorModal';
import logo from './images/MTCCLOGO.jpg';
import schoollogo from './images/BSULOGO.png';
import emailicon from './images/EMAIL.png';
import passwordicon from './images/LOCK.png';
import hidepasswordicon from './images/EYECLOSED.png';
import showpasswordicon from './images/EYE.png';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showModal, setShowModal] = useState(false); 
  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const passwordInput = formData.get("password");
    const emailInput = email;

    const VALID_EMAIL = "admin@mtcc.com";
    const VALID_PASSWORD = "password123";

    setEmailError("");

    if (emailInput === VALID_EMAIL && passwordInput === VALID_PASSWORD) {
      setShowModal(true);
      setShowErrorModal(false);
    } else {
      setShowErrorModal(true);
      setEmailError("Invalid credentials");
    }
  };

  // --- NEW FUNCTION: The Transfer Logic ---
  const handleContinue = () => {
  console.log("Login: Continue clicked, calling onLoginSuccess...");
  setShowModal(false);
  if (onLoginSuccess) {
    onLoginSuccess(); // This is what tells App.js to switch!
  } else {
    console.error("onLoginSuccess prop is missing!");
  }
};

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="page-wrap">
      <img src={schoollogo} className="corner-logo" alt="BSU Logo" />
      <div className="card-container">
        <div className="card">
          <div className="header-row">
            <img src={logo} className="logo" alt="MTCC Logo" />
            <div className="title-text">
              <h1 className="company-name-stacked">
                MATERIAL <br />
                TESTING AND <br />
                CALIBRATION <br />
                CENTER
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <div className="input-group">
              <div 
                className={`input-wrapper ${emailError ? 'shake-animation' : ''}`} 
                style={{ border: emailError ? '1px solid #dc3545' : '1px solid #ccc' }}
              >
                <img src={emailicon} className='input-icon' alt="email" />
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if(emailError) setEmailError("");
                  }}
                  required 
                />
              </div>

              <div className="input-wrapper">
                <img src={passwordicon} className='input-icon' alt="password" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  placeholder="Enter your password" 
                  required
                />
                <img 
                  src={showPassword ? showpasswordicon : hidepasswordicon}
                  className='eye-icon' 
                  onClick={togglePassword}
                  alt="passwordtoggle" 
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>

            <button type="submit" className="login-btn">LOG IN</button>
          </form>
        </div>
      </div>

      {/* SUCCESS MODAL - Now using handleContinue */}
      <SuccessModal 
        isOpen={showModal} 
        onClose={handleContinue} 
      />

      {/* ERROR MODAL - Stays local */}
      <ErrorModal 
        isOpen={showErrorModal} 
        onClose={() => setShowErrorModal(false)} 
      />

    </div>
  );
};

export default Login;