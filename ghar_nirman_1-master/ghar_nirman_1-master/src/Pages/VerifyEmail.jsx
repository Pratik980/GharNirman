import React, { useEffect, useState } from "react";
import { auth } from "../Pages/Firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const VerifyEmail = () => {
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  const checkVerification = async () => {
    setChecking(true);
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      toast.success("Email verified successfully!");
      navigate("/dashboard");
    } else {
      toast.error("Email not verified yet. Please check again.");
    }
    setChecking(false);
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Verify Your Email</h2>
      <p>
        A verification link was sent to <b>{auth.currentUser?.email}</b>.
        <br />
        Please check your inbox and click the link.
      </p>
      <button onClick={checkVerification} disabled={checking}>
        {checking ? "Checking..." : "I have verified"}
      </button>
    </div>
  );
};

export default VerifyEmail;
