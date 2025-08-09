import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./Pages/AuthContext";
import Navbar from "./components/Navbar/Navbar";
import Hero from "./components/Hero/Hero";
import Programs from "./components/Programs/Programs";
import Title from "./components/Title/Title";
import Contact from "./components/Contact/Contact";
import Footer from "./components/Footer/Footer";
import SignUp from "./Pages/Signup";
import Login from "./Pages/Login";
import ForgotPassword from "./Pages/ForgetPassword";
import ResetPassword from "./Pages/ResetPassword";
import TenderForm from "./Pages/TenderForm";
import TenderCreationForm from "./Pages/TenderCreationForm";
import ContractorBiddingManagement from "./Pages/ContractorBiddingManagement";
import TenderDashboard from "./Pages/TenderDashboard";
import ViewProjectStatus from "./Pages/ViewProjectStatus";
import MaterialListing from "./Pages/MaterialListing";
import CostEstimator from "./Pages/CostEstimator";
import VerifyEmail from "./Pages/VerifyEmail";
import ContractorDashboard from "./Pages/ContractorDashboard";
import AdminDashboard from "./Pages/AdminDashboard";
import HomeownerDashboard from "./Pages/HomeownerDashboard"; // Add this import
import AdminLogin from "./Pages/AdminLogin";
import ContractorSignup from "./Pages/ContractorSignup";

// Protected Route Component for Homeowner
const HomeownerProtectedRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (userData?.userType !== 'homeowner') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Protected Route Component for Admin
const AdminProtectedRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (userData?.userType !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Protected Route Component for Contractor
const ContractorProtectedRoute = ({ children }) => {
  const { user, userData, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (userData?.userType !== 'contractor') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// General Protected Route Component (for any authenticated user)
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

const Layout = ({ children }) => {
  const location = useLocation();
  // Routes where navbar and footer should be hidden
  const hideNavbarRoutes = [
    "/signup", 
    "/login", 
    "/forgot-password", 
    "/reset-password",
    "/contractor-signup",
    "/contractor-dashboard",
    "/admin-dashboard",
    "/homeowner-dashboard" // Add homeowner dashboard to hidden navbar routes
  ];

  return (
    <>
      {!hideNavbarRoutes.includes(location.pathname) && <Navbar />}
      {children}
      {!hideNavbarRoutes.includes(location.pathname) && <Footer />}
    </>
  );
};

const AppRoutes = () => {
  return (
    <Layout>
      <Routes>
        {/* Home Route */}
        <Route
          path="/"
          element={
            <>
              <Hero />
              <div className="container">
                <Title subTitle="Our Services" title="What We Offer" />
                <Programs />
                <Title subTitle="Contact Us" title="Get in Touch" />
                <Contact />
              </div>
            </>
          }
        />

        {/* Public Auth Routes */}
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/contractor-signup" element={<ContractorSignup />} />

        {/* Homeowner Protected Routes */}
        <Route 
          path="/homeowner-dashboard" 
          element={
            <HomeownerProtectedRoute>
              <HomeownerDashboard />
            </HomeownerProtectedRoute>
          } 
        />

        {/* Contractor Protected Routes */}
        <Route 
          path="/contractor-dashboard" 
          element={
            <ContractorProtectedRoute>
              <ContractorDashboard />
            </ContractorProtectedRoute>
          } 
        />

        {/* Admin Protected Routes */}
        <Route 
          path="/admin-dashboard" 
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } 
        />
        
        {/* Legacy admin route - redirect to admin-dashboard */}
        <Route 
          path="/admin" 
          element={<AdminLogin />} 
        />

        {/* Protected Routes for any authenticated user */}
        <Route 
          path="/view-project-status" 
          element={
            <ProtectedRoute>
              <ViewProjectStatus />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/material-listing" 
          element={
            <ProtectedRoute>
              <MaterialListing />
            </ProtectedRoute>
          } 
        />

        {/* Tender Routes */}
        <Route
          path="/tender"
          element={
            <ProtectedRoute>
              <div className="container">
                <TenderForm />
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tender-creation"
          element={
            <ProtectedRoute>
              <div className="container">
                <TenderCreationForm />
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/contractor-bidding-management"
          element={
            <ProtectedRoute>
              <div className="container">
                <ContractorBiddingManagement />
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tender-dashboard"
          element={
            <ProtectedRoute>
              <div className="container">
                <TenderDashboard />
              </div>
            </ProtectedRoute>
          }
        />

        {/* Cost Estimator Route */}
        <Route
          path="/cost-estimator"
          element={
            <ProtectedRoute>
              <div className="container">
                <CostEstimator />
              </div>
            </ProtectedRoute>
          }
        />

        {/* Catch all route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;