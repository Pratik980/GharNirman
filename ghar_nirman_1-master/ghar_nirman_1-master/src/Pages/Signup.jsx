import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "./Firebase";
import { doc, setDoc } from "firebase/firestore";
import { FiUser, FiMail, FiEye, FiEyeOff, FiBriefcase, FiHome, FiMapPin, FiPhone, FiFileText } from "react-icons/fi";
import { toast } from "react-toastify";
import ReCAPTCHA from "react-google-recaptcha";
import logo from "../assets/logo.png";
import "react-toastify/dist/ReactToastify.css";
import "./SignUp.css";

const Signup = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capVal, setCapVal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });



  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };



  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () =>
    setShowConfirmPassword(!showConfirmPassword);



  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Signup form submitted", formData);
    setIsLoading(true);

    const { fullName, email, password, confirmPassword, agreeToTerms } = formData;

    if (!fullName || !email || !password || !confirmPassword) {
      console.log("Validation failed: missing required fields");
      toast.error("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      console.log("Validation failed: passwords do not match");
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Password validation for special characters
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error("Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)");
      setIsLoading(false);
      return;
    }

    if (!agreeToTerms) {
      console.log("Validation failed: terms not agreed");
      toast.error("You must agree to the terms and conditions");
      setIsLoading(false);
      return;
    }

    if (!capVal) {
      console.log("Validation failed: reCAPTCHA not checked");
      toast.error("Please verify the reCAPTCHA");
      setIsLoading(false);
      return;
    }

    try {
      console.log("About to call createUserWithEmailAndPassword", email, password);
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (error) {
        console.error("Error in Firebase createUserWithEmailAndPassword:", error);
        toast.error("Signup failed at Firebase: " + (error.message || error));
        setIsLoading(false);
        return;
      }
      console.log("Firebase user created", userCredential);
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);
      console.log("Verification email sent");

      // Wait for auth state to be established, then save user data
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser && currentUser.uid === user.uid) {
          try {
            // Prepare user data for Firestore
            const userData = {
              fullName,
              email,
              userType: "homeowner",
              createdAt: new Date().toISOString(),
              emailVerified: false,
              status: "approved",
            };

            // Save user data to Firestore
            await setDoc(doc(db, "users", user.uid), userData);
            console.log("User data saved to Firestore");

            // Get Firebase ID token for backend verification
            const idToken = await currentUser.getIdToken();
            console.log("Got Firebase ID token", idToken);

            // Send user data to backend to sync with MongoDB
            const response = await fetch("http://localhost:5000/api/sync-user", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                fullName,
                userType: "homeowner",
              }),
            });
            console.log("Backend sync response", response);

            toast.success("Signup successful! Please check your email to verify your account.");
            
            navigate("/login");
          } catch (firestoreError) {
            console.error("Firestore error:", firestoreError);
            toast.error("Account created but failed to save user data. Please try logging in.");
            navigate("/login");
          }
          unsubscribe(); // Clean up listener
        }
      });

      // Cleanup timeout if auth state doesn't change
      setTimeout(() => {
        unsubscribe();
        if (!auth.currentUser) {
          toast.error("Authentication failed. Please try again.");
          setIsLoading(false);
        }
      }, 10000);

    } catch (error) {
      console.error("Firebase signup error:", error);
      let errorMessage = "Signup failed. Please try again.";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please use a different email or try logging in.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      }

      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  // Google sign-in is only allowed for homeowners
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Wait for auth state and save Google user to Firestore
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser && currentUser.uid === user.uid) {
          try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(
              userRef,
              {
                fullName: user.displayName || "",
                email: user.email,
                userType: "homeowner", // Force homeowner role for Google sign-in
                createdAt: new Date().toISOString(),
                emailVerified: true,
                status: "approved",
              },
              { merge: true }
            );

            // Get Firebase ID token
            const idToken = await currentUser.getIdToken();

            // Sync Google user with backend MongoDB
            await fetch("http://localhost:5000/api/sync-user", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${idToken}`,
              },
              body: JSON.stringify({
                fullName: user.displayName || "",
                userType: "homeowner",
              }),
            });

            toast.success("Signed in with Google!");
            navigate("/");
          } catch (firestoreError) {
            console.error("Firestore error:", firestoreError);
            toast.error("Sign-in successful but failed to save user data.");
            navigate("/");
          }
          unsubscribe();
        }
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error(`Google sign-in failed: ${error.message}`);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <img src={logo} alt="Company Logo" className="signup-logo" />
          <h2>Create Your Account</h2>
          <p>Join us to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {/* Contractor Signup Section */}
          <div className="contractor-signup-section">
            <div className="contractor-signup-card">
              <div className="contractor-signup-header">
                <FiBriefcase className="contractor-icon" />
                <h3>Are you a Contractor?</h3>
              </div>
              <p><strong>For contractor signup, click here to access our dedicated contractor registration page</strong></p>
              <div className="contractor-benefits">
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Access to construction tenders</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Verified contractor status</span>
                </div>
                <div className="benefit-item">
                  <span className="benefit-icon">✓</span>
                  <span>Direct client connections</span>
                </div>
              </div>
              <Link to="/contractor-signup" className="contractor-signup-btn">
                <FiBriefcase />
                Apply as Contractor
              </Link>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="fullName">Full Name</label>
            <div className="input-with-icon">
              <input
                type="text"
                name="fullName"
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
              <FiUser className="input-icon" />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <input
                type="email"
                name="email"
                id="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <FiMail className="input-icon" />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-container">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
                minLength="8"
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="password-toggle-fixed"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            <div className="password-requirements">
              <small>Password must contain: 8+ characters, uppercase, lowercase, number, and special character (@$!%*?&)</small>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                id="confirmPassword"
                placeholder="Repeat your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                minLength="8"
                required
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="password-toggle-fixed"
                aria-label={
                  showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                }
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>



          <div className="terms-container">
            <div className="terms-checkbox-container">
              <input
                type="checkbox"
                id="agreeToTerms"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="terms-checkbox"
              />
            </div>
            <label htmlFor="agreeToTerms" className="terms-label">
              I agree to the <Link to="/terms">Terms of Service</Link> and{" "}
              <Link to="/privacy">Privacy Policy</Link>
            </label>
          </div>

          <div className="recaptcha-container">
            <ReCAPTCHA
              sitekey="6LfoGCArAAAAALTEEYs3y1ETt-dAdex13sjrU2rh"
              onChange={(value) => setCapVal(value)}
            />
          </div>

          <button type="submit" className="signup-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Creating Account...
              </>
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="separator">
          <span>or</span>
        </div>

        <center>
          <button onClick={handleGoogleSignIn} className="google-signin-button">
            Continue with Google
          </button>
        </center>

        <div className="signup-footer">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="login-link">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;