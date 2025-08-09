import React, { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "./Firebase";
import { FiMail } from "react-icons/fi";
import { toast } from "react-toastify";
import ReCAPTCHA from "react-google-recaptcha";
import logo from "../assets/logo.png";
import "react-toastify/dist/ReactToastify.css";
import "./Login.css"; // We'll reuse some login styling

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    if (!captchaValue) {
      toast.error("Please verify that you're not a robot");
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Password reset error:", error);
      
      // Provide user-friendly error messages
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many requests. Please try again later.");
      } else {
        setError(error.message);
      }
      
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="Company Logo" className="login-logo" />
          <h2>Reset Password</h2>
          <p>Enter your email to receive a password reset link</p>
        </div>

        {resetSent ? (
          <div className="reset-success">
            <div className="success-icon">✓</div>
            <h3>Reset Link Sent</h3>
            <p>
              We've sent a password reset link to <strong>{email}</strong>.
              Please check your inbox and follow the instructions to reset your password.
            </p>
            <p className="small-text">
              If you don't see the email, check your spam folder.
            </p>
            <Link to="/login" className="login-button">
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <FiMail className="input-icon" />
              </div>
            </div>

            <div className="input-group">
              <ReCAPTCHA
                sitekey="6LfoGCArAAAAALTEEYs3y1ETt-dAdex13sjrU2rh"
                onChange={(value) => setCaptchaValue(value)}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        )}

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

export default ForgotPassword;