import React from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth, db } from "../Pages/Firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";

const SigninWithGoogle = () => {
  const navigate = useNavigate();

  // Function to redirect based on user type
  const redirectBasedOnUserType = (userType) => {
    console.log('Redirecting user type:', userType);
    switch (userType) {
      case 'contractor':
        navigate('/contractor-dashboard');
        break;
      case 'admin':
        navigate('/admin-dashboard');
        break;
      case 'homeowner':
      default:
        navigate('/homeowner-dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();

    try {
      // Try popup first
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      let userData;
      if (!userSnap.exists()) {
        // If not, create the user in Firestore
        await setDoc(userRef, {
          fullName: user.displayName || "",
          email: user.email,
          userType: "homeowner", // default role
          createdAt: new Date(),
        });
        userData = { userType: "homeowner" };
      } else {
        userData = userSnap.data();
      }

      toast.success("Signed in with Google!");
      // Redirect based on user type
      redirectBasedOnUserType(userData.userType || "homeowner");
    } catch (error) {
      console.error("Google sign-in error:", error);

      // Handle various popup-related errors and fall back to redirect
      if (
        error?.code === "auth/popup-blocked" ||
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "auth/cancelled-popup-request" ||
        error?.message?.includes("Cross-Origin-Opener-Policy")
      ) {
        toast.info("Using redirect flow for Google sign-in...");
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          console.error("Google redirect sign-in error:", redirectError);
          toast.error(`Google sign-in failed: ${redirectError.message}`);
          return;
        }
      }

      toast.error(`Google sign-in failed: ${error.message || "Unknown error"}`);
    }
  };

  return (
    <button onClick={handleGoogleSignIn} className="google-signin-button">
      Sign in with Google
    </button>
  );
};

export default SigninWithGoogle;
