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

const API_URL = "http://192.168.0.121:5000";

const Login = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showModal, setShowModal] = useState(false); 
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setEmailError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful
        setShowModal(true);
        setShowErrorModal(false);
      } else {
        // Login failed
        setShowErrorModal(true);
        setEmailError(data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      setShowErrorModal(true);
      setEmailError("Server connection failed. Make sure backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    console.log("Login: Continue clicked, calling onLoginSuccess...");
    setShowModal(false);
    if (onLoginSuccess) {
      onLoginSuccess();
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
                  disabled={isLoading}
                />
              </div>

              <div className="input-wrapper">
                <img src={passwordicon} className='input-icon' alt="password" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password" 
                  required
                  disabled={isLoading}
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

            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading}
            >
              {isLoading ? 'LOGGING IN...' : 'LOG IN'}
            </button>
          </form>
        </div>
      </div>

      <SuccessModal 
        isOpen={showModal} 
        onClose={handleContinue} 
      />

      <ErrorModal 
        isOpen={showErrorModal} 
        onClose={() => setShowErrorModal(false)} 
      />

    </div>
  );
};

export default Login; 