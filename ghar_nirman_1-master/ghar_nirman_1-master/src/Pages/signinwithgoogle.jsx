import React from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../Pages/Firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";

const SigninWithGoogle = () => {
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // If not, create the user in Firestore
        await setDoc(userRef, {
          fullName: user.displayName || "",
          email: user.email,
          userType: "homeowner", // default role
          createdAt: new Date(),
        });
      }

      toast.success("Signed in with Google!");
      navigate("/"); // redirect after login
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error(`Google sign-in failed: ${error.message}`);
    }
  };

  return (
    <button onClick={handleGoogleSignIn} className="google-signin-button">
      Sign in with Google
    </button>
  );
};

export default SigninWithGoogle;
