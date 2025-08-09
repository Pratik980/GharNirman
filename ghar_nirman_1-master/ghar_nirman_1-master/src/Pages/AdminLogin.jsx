import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./Firebase";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      // Firebase Auth sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check Firestore for userType
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().userType === "admin") {
        navigate("/admin-dashboard");
      } else {
        setError("You are not authorized as admin.");
      }
    } catch (err) {
      setError("Invalid admin credentials");
    }
    setIsLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f7fa" }}>
      <form onSubmit={handleSubmit} style={{ background: "white", padding: 32, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", minWidth: 320 }}>
        <h2 style={{ marginBottom: 24, textAlign: "center" }}>Admin Login</h2>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="admin-email" style={{ display: "block", marginBottom: 4 }}>Email</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="admin-password" style={{ display: "block", marginBottom: 4 }}>Password</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
          />
        </div>
        {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
        <button type="submit" style={{ width: "100%", padding: 10, borderRadius: 4, background: "#556b2f", color: "white", border: "none", fontWeight: 600 }} disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login as Admin"}
        </button>
      </form>
    </div>
  );
};

export default AdminLogin; 