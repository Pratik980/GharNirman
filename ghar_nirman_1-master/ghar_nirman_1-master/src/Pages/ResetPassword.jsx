import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "./Firebase";
import { FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { toast } from "react-toastify";
import logo from "../assets/logo.png";
import "react-toastify/dist/ReactToastify.css";
import "./Login.css"; // Reusing login styling

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [oobCode, setOobCode] = useState(""); // Out-of-band code from URL

  useEffect(() => {
    // Extract the oobCode (action code) from the URL
    const queryParams = new URLSearchParams(location.search);
    const code = queryParams.get("oobCode");
    
    if (!code) {
      setError("Invalid password reset link. Please request a new one.");
      setIsVerifying(false);
      return;
    }
    
    setOobCode(code);
    
    // Verify the password reset code
    const verifyCode = async () => {
      try {
        const email = await verifyPasswordResetCode(auth, code);
        setResetEmail(email);
        setIsVerifying(false);
      } catch (error) {
        console.error("Error verifying reset code:", error);
        setError("This password reset link has expired or is invalid. Please request a new one.");
        setIsVerifying(false);
      }
    };
    
    verifyCode();
  }, [location]);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      toast.success("Password has been reset successfully!");
      
      // Wait a moment before redirecting to login
      setTimeout(() => {
        navigate("/login", { 
          state: { 
            message: "Your password has been reset successfully. You can now log in with your new password." 
          } 
        });
      }, 2000);
    } catch (error) {
      console.error("Error resetting password:", error);
      
      if (error.code === "auth/expired-action-code") {
        setError("This password reset link has expired. Please request a new one.");
      } else if (error.code === "auth/invalid-action-code") {
        setError("This password reset link is invalid. Please request a new one.");
      } else if (error.code === "auth/weak-password") {
        setError("Please choose a stronger password.");
      } else {
        setError(error.message);
      }
      
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src={logo} alt="Company Logo" className="login-logo" />
            <h2>Verifying Link</h2>
          </div>
          <div className="verifying-container">
            <div className="spinner"></div>
            <p>Verifying your password reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !resetEmail) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src={logo} alt="Company Logo" className="login-logo" />
            <h2>Invalid Link</h2>
          </div>
          <div className="error-container">
            <div className="error-icon">!</div>
            <p>{error}</p>
            <Link to="/forgot-password" className="login-button">
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="Company Logo" className="login-logo" />
          <h2>Reset Your Password</h2>
          <p>Enter a new password for <strong>{resetEmail}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="newPassword">New Password</label>
            <div className="password-input-container">
              <input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                name="newPassword"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength="8"
                className="password-input"
              />
              <button
                type="button"
                className="password-toggle-fixed"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-container">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Repeat your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength="8"
                className="password-input"
              />
              <button
                type="button"
                className="password-toggle-fixed"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Remember your password?{" "}
            <Link to="/login" className="login-link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;