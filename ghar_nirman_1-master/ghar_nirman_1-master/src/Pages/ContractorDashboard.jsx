// IMPORTANT: Ensure your backend is running on http://localhost:5000 before using this dashboard.
// Also, make sure you have only one version of React installed in your node_modules.

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import "./ContractorDashboard.css";
import { FaBell } from "react-icons/fa";
import { subscribeToNotifications, subscribeToPrivateNotifications, EVENTS, CHANNELS } from "../config/pusher";
import ContractorBiddingManagement from "./ContractorBiddingManagement";
import axios from "axios";
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './Firebase';
import { 
  FiUpload, 
  FiPlus, 
  FiList, 
  FiEdit2, 
  FiTrash2, 
  FiUser, 
  FiShield, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiTrendingUp, 
  FiThumbsUp, 
  FiClock, 
  FiDollarSign, 
  FiX, 
  FiFile, 
  FiSearch, 
  FiAward, 
  FiBarChart2, 
  FiPercent, 
  FiCalendar, 
  FiStar 
} from "react-icons/fi";

// Move API URLs outside component
const apiBaseUrl = "http://localhost:5000/api";
const tendersApiUrl = `${apiBaseUrl}/tenders`;
const bidsApiUrl = `${apiBaseUrl}/bids`;
const contractorsApiUrl = `${apiBaseUrl}/contractors`;

// ErrorBoundary component to catch errors in the dashboard
class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Dashboard caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'red', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, margin: 40 }}>
          <h2>Something went wrong in the Contractor Dashboard.</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#d4380d' }}>{this.state.error && this.state.error.toString()}</pre>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ContractorDashboard = () => {
  // All useState declarations first!
  const [notification, setNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { userData, logout, setUserData } = useAuth();

  const [contractorProfile, setContractorProfile] = useState({
    contractor: "",
    licenseCategory: "",
    specialization: "",
    experience: 0,
    successRate: 0,
    clientRating: 0,
    rejectionHistory: 0,
    safetyCertification: "",
    documents: [],
  });
  const [estimatorParams, setEstimatorParams] = useState({
    area: 1500,
    type: "residential",
    quality: "standard",
    location: "urban",
  });
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [bidWizardStep, setBidWizardStep] = useState(1);
  const [myBids, setMyBids] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState({
    tenders: false,
    bids: false,
    profile: false
  });
  const [error, setError] = useState(null);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({ total: 0, pages: 1, currentPage: 1 });
  const [tenderFilters, setTenderFilters] = useState({
    status: "all",
    contractor: "",
  });
  const [showFullText, setShowFullText] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTender, setSelectedTender] = useState(null);
  const [bidForm, setBidForm] = useState({
    bidAmount: "",
    projectDuration: "",
    warranty: "1",
    notes: "",
    attachments: [],
  });
  const [materialPrices, setMaterialPrices] = useState([
    { id: 1, name: "Concrete (per m³)", currentPrice: 125, trend: "up", lastUpdated: "2025-07-18" },
    { id: 2, name: "Steel Rebar (per ton)", currentPrice: 780, trend: "stable", lastUpdated: "2025-07-18" },
    { id: 3, name: "Lumber (per board ft)", currentPrice: 3.20, trend: "down", lastUpdated: "2025-07-18" },
    { id: 4, name: "Drywall (per sheet)", currentPrice: 12.50, trend: "stable", lastUpdated: "2025-07-18" },
  ]);
  const [activeBids, setActiveBids] = useState(0);
  const [wonProjects, setWonProjects] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [showBidWizard, setShowBidWizard] = useState(false);
  const [uploadingTenderId, setUploadingTenderId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadNotification, setUploadNotification] = useState(null);
  const [selectedTenderFile, setSelectedTenderFile] = useState({}); // { [tenderId]: File }
  
  // Contractor Bidding Management states
  const [bidFormData, setBidFormData] = useState({
    contractor: "",
    contractor_name: "",
    licenseCategory: "",
    specialization: "",
    bidAmount: "",
    projectDuration: "",
    warranty: "",
    experience: "",
    successRate: "",
    clientRating: "",
    rejectionHistory: "",
    safetyCertification: "",
  });
  const [editingBidId, setEditingBidId] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [rankingError, setRankingError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showBidForm, setShowBidForm] = useState(false);
  const [showExtractedModal, setShowExtractedModal] = useState(false);
  const [extractedBidData, setExtractedBidData] = useState(null);
  const [extractedTenderId, setExtractedTenderId] = useState(null);

  // Fallback data
  const fallbackUserData = {
    _id: "test-user-id",
    uid: "test-contractor-uid",
    contractor: "Test Contractor",
    email: "test@example.com"
  };

  const currentUserData = userData || fallbackUserData;

// SVG Icons
const DashboardIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);
  
const EstimatorIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20V10m0 10l-3-3m3 3l3-3M3 17l3-3m-3 3l3 3M3 7l3 3m-3-3l3-3m12 10l-3-3m3 3l3-3m0 10a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"></path>
  </svg>
);
  
const TenderIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);
  
const ProjectsIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
  
const MaterialsIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="3" y1="9" x2="21" y2="9"></line>
    <line x1="9" y1="21" x2="9" y2="9"></line>
  </svg>
);
  
const DocumentsIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);
  
const HistoryIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
  
const LogoutIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
  
const LocationIcon = () => (
  <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);
  
const CalendarIcon = () => (
  <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
  
const ConstructionIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);  
  
  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('contractorNotifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('contractorNotifications', JSON.stringify(notifications));
  }, [notifications]);

  // Helper to validate MongoDB ObjectId
  const isValidObjectId = (v) =>
    typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

  useEffect(() => {
    const contractorId = currentUserData?._id;
    
    console.log("Setting up Pusher notifications for contractor:", contractorId);
    console.log("Current user data:", currentUserData);

    // Subscribe to general contractor notifications (works for all contractors)
    const unsubscribeGeneral = subscribeToNotifications(
      CHANNELS.CONTRACTORS, 
      EVENTS.NEW_TENDER, 
      (data) => {
        console.log("📢 Received general contractor notification:", data);
        setNotifications(prev => [
          ...prev,
          { ...data, timestamp: new Date().toISOString() }
        ]);
        setNotification({
          message: data.message,
          type: "success"
        });
        setShowNotifications(true);
      }
    );

    // Subscribe to private contractor notifications (only if contractorId exists and is valid)
    let unsubscribePrivate = null;
    if (isValidObjectId(contractorId)) {
      unsubscribePrivate = subscribeToPrivateNotifications(
        contractorId,
        'contractor',
        EVENTS.NEW_TENDER,
        (data) => {
          console.log("📢 Received private contractor notification:", data);
          setNotifications(prev => [
            ...prev,
            { ...data, timestamp: new Date().toISOString() }
          ]);
          setNotification({
            message: data.message,
            type: "success"
          });
          setShowNotifications(true);
        }
      );
    } else {
      console.log("No valid contractor ID available, skipping private notifications");
      // Try to fetch contractor profile if we have UID but no _id
      if (currentUserData?.uid && !contractorId) {
        console.log("🔄 Attempting to fetch contractor profile to get ID...");
        fetchContractorProfile();
      }
    }

    return () => {
      unsubscribeGeneral();
      if (unsubscribePrivate) {
        unsubscribePrivate();
      }
    };
  }, [currentUserData?._id, currentUserData?.uid]);

  // Function to show current Firebase data for debugging
  const showFirebaseData = () => {
    console.log('🔥 Current Firebase userData:', userData);
    console.log('🔥 Firebase UID:', userData?.uid);
    console.log('🔥 Firebase email:', userData?.email);
    console.log('🔥 Firebase displayName:', userData?.displayName);
    console.log('🔥 Firebase fullName:', userData?.fullName);
    console.log('🔥 Firebase photoURL:', userData?.photoURL);
    console.log('🔥 Firebase userType:', userData?.userType);
    console.log('🔥 Current MongoDB _id:', userData?._id);
    
    // Show alert with key info
    alert(`Firebase Data:\nUID: ${userData?.uid || 'undefined'}\nEmail: ${userData?.email || 'undefined'}\nName: ${userData?.fullName || userData?.displayName || 'undefined'}\nMongoDB ID: ${userData?._id || 'Not set'}`);
  };

  // Fetch persistent notifications from backend on load
  useEffect(() => {
    const id = currentUserData?._id;
    
    if (!isValidObjectId(id)) {
      console.log("No valid contractor ID available, skipping persistent notifications fetch");
      // Try to fetch contractor profile if we have UID but no _id
      if (currentUserData?.uid && !id) {
        console.log("🔄 Attempting to fetch contractor profile to get ID for notifications...");
        fetchContractorProfile();
      }
      return;
    }

    console.log("Fetching persistent notifications for contractor:", id);
    
    fetch(`http://localhost:5000/api/notifications/${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch notifications: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("📥 Received persistent notifications:", data);
        setNotifications(prev => {
          const ids = new Set(prev.map(n => n._id));
          const merged = [...data.filter(n => !ids.has(n._id)), ...prev];
          return merged;
        });
      })
      .catch(err => {
        console.error("Failed to fetch notifications:", err);
        // Don't show error to user, just log it
      });
  }, [currentUserData?._id, currentUserData?.uid]);

  // Debug function to test API endpoints
  const debugApi = async () => {
    try {
      console.log('🔍 Testing API endpoints...');
      console.log('Current user data:', currentUserData);
      console.log('Contractor profile:', contractorProfile);
      
      // Test base API
      const baseResponse = await fetch(`${apiBaseUrl.replace('/api', '')}/health`);
      console.log('Base API:', baseResponse.ok ? '✅' : '❌', baseResponse.status);
      
      // Test contractor by UID endpoint
      if (currentUserData?.uid) {
        const contractorResponse = await fetch(`${contractorsApiUrl}/by-uid/${currentUserData.uid}`);
        console.log('Contractor by UID:', contractorResponse.ok ? '✅' : '❌', contractorResponse.status);
        if (contractorResponse.ok) {
          const contractorData = await contractorResponse.json();
          console.log('Contractor data:', contractorData);
        }
      }
      
      // Test tender debug endpoint
      const debugResponse = await fetch(`${tendersApiUrl}/debug`);
      console.log('Tender Debug:', debugResponse.ok ? '✅' : '❌', debugResponse.status);
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('Debug data:', debugData);
      }
      
      // Test tender list endpoint
      const listResponse = await fetch(`${tendersApiUrl}?page=1&limit=5`);
      console.log('Tender List:', listResponse.ok ? '✅' : '❌', listResponse.status);
      if (listResponse.ok) {
        const listData = await listResponse.json();
        console.log('List data:', listData);
      }
      
      // Test contractor test endpoint
      const contractorTestResponse = await fetch(`${contractorsApiUrl}/test`);
      console.log('Contractor Test:', contractorTestResponse.ok ? '✅' : '❌', contractorTestResponse.status);
      if (contractorTestResponse.ok) {
        const contractorTestData = await contractorTestResponse.json();
        console.log('Contractor test data:', contractorTestData);
      }
      
    } catch (err) {
      console.error('❌ API Debug Error:', err);
    }
  };

  const fetchTenders = async (filters = {}, page = 1, limit = 10) => {
    try {
      setLoading(prev => ({ ...prev, tenders: true }));
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters,
      });
      
      const response = await fetch(`${tendersApiUrl}?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tenders: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.tenders) {
        setTenders(data.tenders);
        setPagination({
          total: data.total || 0,
          pages: data.pages || 1,
          currentPage: page
        });
      } else {
        setTenders([]);
        setPagination({
          total: 0,
          pages: 1,
          currentPage: 1
        });
      }

    } catch (err) {
      console.error('Error fetching tenders:', err);
      setError(err.message || 'Failed to load projects. Please try again.');
      setTenders([]);
    } finally {
      setLoading(prev => ({ ...prev, tenders: false }));
    }
  };

  const fetchMyBids = async () => {
    try {
      setLoading(prev => ({ ...prev, bids: true }));
      
      console.log('🔍 Fetching bids for user:', currentUserData);
      
      // If we're using test data, try to get bids for any contractor
      let contractorId = currentUserData._id;
      
      if (!contractorId || contractorId === "test-user-id") {
        console.log('🔍 Using test user, fetching all bids...');
        const response = await fetch(`${bidsApiUrl}`);
        if (!response.ok) throw new Error("Failed to fetch bids");
        const data = await response.json();
        
        // Handle both array and object responses
        const bids = Array.isArray(data) ? data : (data.bids || []);
        console.log('🔍 All bids fetched:', bids);
        setMyBids(bids);
        setActiveBids(bids.filter(b => b.status === "Under Review").length);
        setWonProjects(bids.filter(b => b.status === "Accepted").length);
        setPendingApprovals(bids.filter(b => b.status === "Under Review").length);
        return;
      }
      
      // Fetch bids for specific contractor
      const response = await fetch(`${bidsApiUrl}?contractor=${contractorId}`);
      if (!response.ok) throw new Error("Failed to fetch bids");
      const data = await response.json();
      
      // Handle both array and object responses
      const bids = Array.isArray(data) ? data : (data.bids || []);
      console.log('🔍 Bids for contractor:', bids);
      setMyBids(bids);
      setActiveBids(bids.filter(b => b.status === "Under Review").length);
      setWonProjects(bids.filter(b => b.status === "Accepted").length);
      setPendingApprovals(bids.filter(b => b.status === "Under Review").length);
    } catch (err) {
      console.error('Error fetching bids:', err);
      setError(err.message);
      setMyBids([]);
    } finally {
      setLoading(prev => ({ ...prev, bids: false }));
    }
  };

  const fetchContractorProfile = async (retryCount = 0) => {
    try {
      setLoading(prev => ({ ...prev, profile: true }));
      if (!currentUserData.uid) {
        setError('No UID found for current user.');
        return;
      }
      
      console.log(`🔄 Fetching contractor profile (attempt ${retryCount + 1}) for UID:`, currentUserData.uid);
      
      const response = await fetch(`${contractorsApiUrl}/by-uid/${currentUserData.uid}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Contractor profile does not exist yet; don't treat as network failure
          throw new Error("Contractor profile not found (404)");
        }
        if (response.status === 404 && retryCount < 2) {
          console.log("⚠️ Contractor not found, retrying in 2 seconds...");
          setTimeout(() => fetchContractorProfile(retryCount + 1), 2000);
          return;
        }
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("📥 Contractor profile data received:", data);
      
      // Transform document paths for easy access
      const transformedData = {
        ...data,
        documents: {
          licenseFile: data.documents?.licenseFile || null,
          businessRegistration: data.documents?.registrationCertificate || null,
          insuranceDocument: data.documents?.insuranceDocument || null
        }
      };
      setContractorProfile(transformedData);
      
      // Update user data with the contractor ID and name from backend
      if (setUserData && data._id) {
        setUserData(prev => ({
          ...prev,
          _id: data._id,
          displayName: data.name || prev.displayName,
          fullName: data.name || prev.fullName
        }));
        console.log("✅ Updated user data with contractor ID:", data._id);
        console.log("✅ Updated user data with contractor name:", data.name);
        
        // Update Firebase Firestore with the contractor name
        if (currentUserData?.uid && data.name) {
          try {
            await updateDoc(doc(db, 'users', currentUserData.uid), {
              displayName: data.name,
              fullName: data.name,
              userType: 'contractor'
            });
            console.log("✅ Updated Firebase Firestore with contractor name:", data.name);
          } catch (firebaseError) {
            console.error("❌ Error updating Firebase Firestore:", firebaseError);
          }
        }
      } else {
        console.warn("⚠️ No contractor ID found in backend response or setUserData not available");
        console.log("Backend response data:", data);
      }
    } catch (err) {
      console.error('Error fetching contractor profile:', err);
      setError(err.message);
      
      // Retry on network errors
      if (retryCount < 2 && (err.message.includes('Failed to fetch') || err.message.includes('Network'))) {
        console.log("🔄 Network error, retrying in 3 seconds...");
        setTimeout(() => fetchContractorProfile(retryCount + 1), 3000);
      }
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const submitBid = async (bidData) => {
    try {
      if (!isProfileComplete()) {
        throw new Error("Please complete all profile fields");
      }
      if (!selectedTender?._id) {
        throw new Error("No tender selected");
      }
      
      console.log("Submitting bid with contractor ID (currentUserData._id):", currentUserData._id);
      console.log("Submitting bid with contractor ID (contractorProfile._id):", contractorProfile._id);
      
      const formData = new FormData();
      formData.append('tenderId', selectedTender._id);
      formData.append('contractor', currentUserData._id || contractorProfile._id);
      formData.append('contractor_name', currentUserData?.displayName || currentUserData?.fullName || contractorProfile.name || 'Unknown Contractor');
      formData.append('tenderTitle', selectedTender.contractor || "Unnamed Tender");
      formData.append('bid_amount', bidData.bidAmount);
      formData.append('project_duration', bidData.projectDuration);
      formData.append('warranty_period', bidData.warranty);
      formData.append('notes', bidData.notes || '');
      formData.append('experience', contractorProfile.experience || 0);
      formData.append('successRate', contractorProfile.successRate || 0);
      formData.append('clientRating', contractorProfile.clientRating || 0);
      formData.append('rejectionHistory', contractorProfile.rejectionHistory || 0);
      formData.append('safetyCertification', contractorProfile.safetyCertification || '');
      formData.append('licenseCategory', contractorProfile.licenseCategory || '');
      formData.append('specialization', contractorProfile.specialization || '');
      if (attachedFiles && attachedFiles.length > 0) {
        attachedFiles.forEach(file => {
          formData.append('documents', file);
        });
      }
      const response = await fetch(bidsApiUrl, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bid submission failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Error in submitBid:', error);
      throw error;
    }
  };

  const updateProfile = async () => {
    try {
      const response = await fetch(`${contractorsApiUrl}/${currentUserData._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractorProfile),
      });
      if (!response.ok) throw new Error("Profile update failed");
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!bidForm.bidAmount || isNaN(bidForm.bidAmount)) {
        throw new Error("Please enter a valid bid amount");
      }
      if (!bidForm.projectDuration || isNaN(bidForm.projectDuration)) {
        throw new Error("Please enter a valid project duration");
      }
      const newBid = await submitBid({
        bidAmount: bidForm.bidAmount,
        projectDuration: bidForm.projectDuration,
        warranty: bidForm.warranty,
        notes: bidForm.notes
      });
      setMyBids(prev => [...prev, newBid]);
      setShowBidWizard(false);
      setNotification({
        message: "Bid submitted successfully!",
        type: "success"
      });
    } catch (error) {
      let userMessage = error.message;
      if (error.message.includes('422')) {
        userMessage = "Invalid bid data. Please check all fields.";
      } else if (error.message.includes('contractor profile')) {
        userMessage = "Please complete your contractor profile first.";
      }
      setError(userMessage);
      setNotification({
        message: userMessage,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const success = await updateProfile();
    if (success) {
      alert("Profile updated successfully!");
    }
  };

  const openBidWizard = (tender) => {
    if (!isProfileComplete()) {
      setNotification({
        message: "Please complete all profile fields",
        type: "error"
      });
      setActiveTab("profile");
      return;
    }
    setSelectedTender(tender);
    setBidForm({
      bidAmount: tender.bidAmount?.toString() || "",
      projectDuration: tender.projectDuration?.toString() || "30",
      warranty: tender.warranty?.toString() || "1",
      notes: "",
    });
    setShowBidWizard(true);
  };

  const calculateRiskScore = () => {
    if (!selectedTender) return 0;
    return Math.max(10, 100 - (selectedTender.successRate || contractorProfile.successRate));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachedFiles(files);
  };

  const calculateEstimate = () => {
    const baseCost = estimatorParams.area * 150;
    let multiplier = 1.0;
    if (estimatorParams.type === "commercial") multiplier *= 1.3;
    if (estimatorParams.type === "luxury") multiplier *= 1.8;
    if (estimatorParams.quality === "premium") multiplier *= 1.5;
    if (estimatorParams.quality === "economy") multiplier *= 0.8;
    if (estimatorParams.location === "rural") multiplier *= 0.9;
    const cost = baseCost * multiplier;
    setEstimatedCost(Math.round(cost));
  };

  const handleProfileFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newDocs = files.map(f => f.name);
    setContractorProfile({
      ...contractorProfile,
      documents: [...contractorProfile.documents, ...newDocs],
    });
  };

  const removeProfileDocument = (index) => {
    const newDocs = [...contractorProfile.documents];
    newDocs.splice(index, 1);
    setContractorProfile({
      ...contractorProfile,
      documents: newDocs,
    });
  };

  const refreshBids = async () => {
    try {
      console.log('🔄 Refreshing bids...');
      setLoading(prev => ({ ...prev, bids: true }));
      await fetchMyBids();
      showNotification('Bids refreshed successfully!', 'success');
    } catch (error) {
      console.error('❌ Error refreshing bids:', error);
      showNotification('Failed to refresh bids', 'error');
    } finally {
      setLoading(prev => ({ ...prev, bids: false }));
    }
  };

  const viewBidDetails = (bid) => {
    console.log('🔍 Viewing bid details:', bid);
    
    const bidDetails = `
📋 Bid Details Report
====================

🏗️ Project: ${bid.tenderTitle || 'N/A'}
💰 Bid Amount: $${bid.bidAmount?.toLocaleString() || '0'}
📅 Submission Date: ${new Date(bid.submissionDate).toLocaleDateString()}
⏱️ Project Duration: ${bid.projectDuration || 'N/A'} days
🛡️ Warranty: ${bid.warranty || 'N/A'} months
📊 Status: ${bid.status || 'N/A'}

👷 Contractor Information:
• Experience: ${bid.experience || 'N/A'} years
• Success Rate: ${bid.successRate || 'N/A'}%
• Client Rating: ${bid.clientRating || 'N/A'}/100
• Rejection History: ${bid.rejectionHistory || 'N/A'}
• Safety Certification: ${bid.safetyCertification || 'N/A'}
• License Category: ${bid.licenseCategory || 'N/A'}
• Specialization: ${bid.specialization || 'N/A'}

📝 Notes: ${bid.notes || 'No additional notes'}

📎 Attached Documents: ${bid.documents?.length || 0} files
    `;
    
    alert(bidDetails);
  };

  const downloadBidReport = async (bidId) => {
    try {
      console.log('📥 Downloading bid report for:', bidId);
      
      const bid = myBids.find(b => b._id === bidId);
      if (!bid) {
        throw new Error('Bid not found');
      }
      
      const reportContent = `
BID REPORT
==========

Project: ${bid.tenderTitle || 'N/A'}
Bid Amount: $${bid.bidAmount?.toLocaleString() || '0'}
Submission Date: ${new Date(bid.submissionDate).toLocaleDateString()}
Status: ${bid.status || 'N/A'}

Contractor Details:
- Experience: ${bid.experience || 'N/A'} years
- Success Rate: ${bid.successRate || 'N/A'}%
- Client Rating: ${bid.clientRating || 'N/A'}/100
- Safety Certification: ${bid.safetyCertification || 'N/A'}

Project Specifications:
- Duration: ${bid.projectDuration || 'N/A'} days
- Warranty: ${bid.warranty || 'N/A'} months
- License Category: ${bid.licenseCategory || 'N/A'}
- Specialization: ${bid.specialization || 'N/A'}

Notes: ${bid.notes || 'No additional notes'}

Generated on: ${new Date().toLocaleString()}
      `;
      
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bid-report-${bidId}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showNotification('Bid report downloaded successfully!', 'success');
    } catch (error) {
      console.error('❌ Error downloading bid report:', error);
      showNotification('Failed to download bid report', 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const generateBidAnalytics = () => {
    if (myBids.length === 0) {
      showNotification('No bids available for analytics', 'error');
      return;
    }
    
    const analytics = {
      totalBids: myBids.length,
      acceptedBids: myBids.filter(b => b.status === 'Accepted').length,
      rejectedBids: myBids.filter(b => b.status === 'Rejected').length,
      underReviewBids: myBids.filter(b => b.status === 'Under Review').length,
      totalValue: myBids.reduce((sum, b) => sum + (b.bidAmount || 0), 0),
      averageBidAmount: myBids.reduce((sum, b) => sum + (b.bidAmount || 0), 0) / myBids.length,
      successRate: (myBids.filter(b => b.status === 'Accepted').length / myBids.length) * 100,
      recentBids: myBids.filter(b => {
        const bidDate = new Date(b.submissionDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return bidDate >= thirtyDaysAgo;
      }).length
    };
    
    const analyticsReport = `
📊 BID ANALYTICS REPORT
======================

📈 Overall Statistics:
• Total Bids: ${analytics.totalBids}
• Accepted Bids: ${analytics.acceptedBids}
• Rejected Bids: ${analytics.rejectedBids}
• Under Review: ${analytics.underReviewBids}

💰 Financial Summary:
• Total Bid Value: $${analytics.totalValue.toLocaleString()}
• Average Bid Amount: $${analytics.averageBidAmount.toLocaleString()}

📊 Performance Metrics:
• Success Rate: ${analytics.successRate.toFixed(1)}%
• Recent Activity (30 days): ${analytics.recentBids} bids

🎯 Recommendations:
${analytics.successRate > 50 ? '✅ Excellent performance! Keep up the good work.' : '⚠️ Consider reviewing bid strategies to improve success rate.'}
${analytics.recentBids < 3 ? '📝 Consider submitting more bids to increase opportunities.' : '✅ Good bid activity level.'}

Generated on: ${new Date().toLocaleString()}
    `;
    
    alert(analyticsReport);
  };

  const statusCounts = myBids.reduce((acc, bid) => {
    acc[bid.status] = (acc[bid.status] || 0) + 1;
    return acc;
  }, {});
  const totalBids = myBids.length;
  const acceptedBids = statusCounts["Accepted"] || 0;
  const totalValue = myBids.reduce((sum, bid) => sum + bid.bidAmount, 0);

  const filteredBids = myBids.filter(bid => {
    if (statusFilter !== "all" && bid.status !== statusFilter) return false;
    const now = new Date();
    const submissionDate = new Date(bid.submissionDate);
    if (timeRangeFilter === "30days") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return submissionDate >= thirtyDaysAgo;
    }
    if (timeRangeFilter === "90days") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return submissionDate >= ninetyDaysAgo;
    }
    if (searchQuery && !bid.tenderTitle.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const performanceData = {
    winRate: contractorProfile.successRate,
    avgEvaluation: contractorProfile.clientRating,
    costDeviation: 4.7,
    clusterComparison: {
      current: contractorProfile.clientRating,
      average: 75,
      top: 92,
    },
  };

  const isProfileComplete = () => {
    const requiredFields = [
      contractorProfile.fullName,
      contractorProfile.email,
      contractorProfile.licenseNumber,
    ];
    return requiredFields.every(field => {
      return field !== undefined && field !== null && field !== '';
    });
  };

  const canPlaceBids = () => {
    return isProfileComplete();
  };

  useEffect(() => {
    // Test API connectivity first
    const testApiConnection = async () => {
      try {
        const response = await fetch(`${apiBaseUrl.replace('/api', '')}/health`);
        if (response.ok) {
          console.log('✅ Backend API is accessible');
        } else {
          console.warn('⚠️ Backend API health check failed');
        }
      } catch (err) {
        console.error('❌ Backend API is not accessible:', err.message);
      }
    };
    
    testApiConnection();
    fetchTenders(tenderFilters, pagination.currentPage);
    fetchMyBids();
    fetchContractorProfile();
  }, [tenderFilters, pagination.currentPage]);

  useEffect(() => {
    if (activeTab === "bids") {
      fetchMyBids();
    }
  }, [activeTab]);

  // After defining currentUserData:
  useEffect(() => {
    if (currentUserData && currentUserData.uid) {
      console.log("🔄 Fetching contractor profile for UID:", currentUserData.uid);
      fetchContractorProfile();
      fetchUploadedFiles();
    }
  }, [currentUserData?.uid]);

  // Log when contractor ID becomes available
  useEffect(() => {
    if (currentUserData?._id) {
      console.log("✅ Contractor ID is now available:", currentUserData._id);
    }
  }, [currentUserData?._id]);

  // Debug log before rendering recommended tenders
  console.log("Recommended Tenders - currentUserData:", currentUserData);

  // Show loading state if AuthContext is still loading
  if (!currentUserData) {
    return (
      <div className="contractor-dashboard">
        <div className="dashboard-container">
          <div className="loading-state">
            <h2>Loading Dashboard...</h2>
            <p>Please wait while we load your contractor dashboard.</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there's a critical error
  if (error && error.includes('Failed to fetch')) {
    return (
      <div className="contractor-dashboard">
        <div className="dashboard-container">
          <div className="error-state">
            <h2>Connection Error</h2>
            <p>Unable to connect to the server. Please check if your backend is running.</p>
            <div className="error-actions">
              <button onClick={() => window.location.reload()}>Retry</button>
              <button onClick={debugApi}>Debug API</button>
              <button onClick={showFirebaseData}>Debug Firebase</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleTenderFileSelect = (tenderId, e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedTenderFile(prev => ({ ...prev, [tenderId]: file }));
      handleTenderFileUpload(tenderId, file);
    } else {
      setUploadNotification({ message: "Please select a valid PDF file", type: "error" });
      e.target.value = "";
      
      // Auto-hide validation error after 5 seconds
      setTimeout(() => {
        setUploadNotification(null);
      }, 5000);
    }
  };

  const handleTenderFileUpload = async (tenderId, file) => {
    setUploadingTenderId(tenderId);
    setUploadProgress(0);
    setUploadNotification(null);
    
    try {
      // Get contractorId from userData or contractorProfile
      const contractorId = currentUserData?._id || contractorProfile._id;
      console.log("Uploading bid with contractorId:", contractorId);
      if (!contractorId || typeof contractorId !== 'string' || contractorId.length !== 24) {
        setUploadNotification({ 
          message: "No valid contractor ID found. Please refresh your profile or re-login.", 
          type: "error" 
        });
        setUploadingTenderId(null);
        setUploadProgress(0);
        return;
      }
      
      console.log("🚀 Starting AI-powered PDF upload and bid extraction...");
      console.log("📄 File:", file.name);
      console.log("🎯 Tender ID:", tenderId);
      console.log("👤 Contractor ID:", contractorId);
      
      const uploadData = new FormData();
      uploadData.append("pdf", file);
      uploadData.append("tenderId", tenderId);
      uploadData.append("contractor", contractorId);
      uploadData.append("contractor_name", currentUserData?.displayName || currentUserData?.fullName || contractorProfile.name);
      
      // Use the new AI-powered upload endpoint
      const response = await axios.post("http://localhost:5000/api/bids/upload", uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });
      
      console.log("✅ AI extraction response:", response.data);
      
      // Show success message with extracted data details
      const extractedData = response.data.extractedData;
      const savedBid = response.data.savedBid;
      let successMessage = "PDF uploaded, bid data extracted and saved to database successfully!";
      
      if (extractedData) {
        const details = [];
        if (extractedData.bid_amount) details.push(`Bid: $${extractedData.bid_amount.toLocaleString()}`);
        if (extractedData.project_duration) details.push(`Duration: ${extractedData.project_duration} days`);
        if (extractedData.warranty_period) details.push(`Warranty: ${extractedData.warranty_period} months`);
        if (extractedData.client_rating) details.push(`Rating: ${extractedData.client_rating}/5`);
        if (extractedData.project_success_rate) details.push(`Success: ${extractedData.project_success_rate}%`);
        
        if (details.length > 0) {
          successMessage += `\nExtracted: ${details.join(', ')}`;
        }
      }
      
      if (savedBid) {
        successMessage += `\nBid ID: ${savedBid._id}`;
      }
      
      setUploadNotification({ 
        message: successMessage, 
        type: "success" 
      });
      
      setSelectedTenderFile(prev => ({ ...prev, [tenderId]: undefined }));
      fetchTenders(tenderFilters, pagination.currentPage);
      fetchMyBids();
      
      // Auto-hide success notification after 8 seconds (longer for more details)
      setTimeout(() => {
        setUploadNotification(null);
      }, 8000);
      
      setExtractedBidData(extractedData);
      setExtractedTenderId(tenderId);
      setShowExtractedModal(true);
      
    } catch (error) {
      console.error("❌ AI upload error:", error);
      
      let errorMessage = "Failed to upload PDF. Please try again.";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.detail) {
          errorMessage += `\nDetails: ${error.response.data.detail}`;
        }
      }
      
      setUploadNotification({ 
        message: errorMessage, 
        type: "error" 
      });
      
      // Auto-hide error notification after 10 seconds (longer for detailed errors)
      setTimeout(() => {
        setUploadNotification(null);
      }, 10000);
    } finally {
      setUploadingTenderId(null);
      setUploadProgress(0);
    }
  };

  // Contractor Bidding Management Functions
  const fetchUploadedFiles = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/tenders/upload/files");
      setUploadedFiles(res.data);
    } catch (error) {
      console.error("Failed to fetch uploaded files", error);
    }
  };

  const handleBidFormChange = (e) => {
    const { name, value } = e.target;
    setBidFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleBidFormSubmit = async (e) => {
    e.preventDefault();

    if (!bidFormData.contractor.trim() || !bidFormData.specialization.trim()) {
      showNotification("Contractor and Specialization are required", "error");
      return;
    }

    try {
      if (editingBidId !== null) {
        await axios.put(`${apiBaseUrl}/${editingBidId}`, {
          ...bidFormData,
          bidAmount: Number(bidFormData.bidAmount),
          projectDuration: Number(bidFormData.projectDuration),
          warranty: Number(bidFormData.warranty),
          experience: Number(bidFormData.experience),
          successRate: Number(bidFormData.successRate),
          clientRating: Number(bidFormData.clientRating),
          rejectionHistory: Number(bidFormData.rejectionHistory),
        });
        showNotification("Bid updated successfully!");
      } else {
        await axios.post(apiBaseUrl, {
          ...bidFormData,
          contractor_name: currentUserData?.displayName || currentUserData?.fullName || contractorProfile.name || 'Unknown Contractor',
          bidAmount: Number(bidFormData.bidAmount),
          projectDuration: Number(bidFormData.projectDuration),
          warranty: Number(bidFormData.warranty),
          experience: Number(bidFormData.experience),
          successRate: Number(bidFormData.successRate),
          clientRating: Number(bidFormData.clientRating),
          rejectionHistory: Number(bidFormData.rejectionHistory),
        });
        showNotification("Bid created successfully!");
      }
      setBidFormData({
        contractor: "",
        contractor_name: "",
        licenseCategory: "",
        specialization: "",
        bidAmount: "",
        projectDuration: "",
        warranty: "",
        experience: "",
        successRate: "",
        clientRating: "",
        rejectionHistory: "",
        safetyCertification: "",
      });
      setEditingBidId(null);
      fetchTenders(tenderFilters, pagination.currentPage);
      setRankings(null);
    } catch (error) {
      console.error("Failed to submit bid", error);
      showNotification("Failed to submit bid", "error");
    }
  };

  const handleBidEdit = (tender) => {
    setBidFormData({
      contractor: tender.contractor || "",
      contractor_name: tender.contractor_name || currentUserData?.displayName || currentUserData?.fullName || contractorProfile.name || "",
      licenseCategory: tender.licenseCategory || "",
      specialization: tender.specialization || "",
      bidAmount: tender.bidAmount ? tender.bidAmount.toString() : "",
      projectDuration: tender.projectDuration ? tender.projectDuration.toString() : "",
      warranty: tender.warranty ? tender.warranty.toString() : "",
      experience: tender.experience ? tender.experience.toString() : "",
      successRate: tender.successRate ? tender.successRate.toString() : "",
      clientRating: tender.clientRating ? tender.clientRating.toString() : "",
      rejectionHistory: tender.rejectionHistory ? tender.rejectionHistory.toString() : "",
      safetyCertification: tender.safetyCertification || "",
    });
    setEditingBidId(tender._id);
    setShowBidForm(true);
  };

  const handleBidDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this bid?")) {
      try {
        await axios.delete(`${apiBaseUrl}/${id}`);
        showNotification("Bid deleted successfully");
        fetchTenders(tenderFilters, pagination.currentPage);
        setRankings(null);
      } catch (error) {
        console.error("Failed to delete bid", error);
        showNotification("Failed to delete bid", "error");
      }
    }
  };

  const analyzeBids = async () => {
    if (tenders.length === 0) {
      showNotification("No bids available for analysis", "error");
      return;
    }
    setLoadingRankings(true);
    setRankingError(null);
    try {
      const bidsPayload = tenders.map((t) => ({
        contract_name: t.contractor,
        license_category: t.licenseCategory,
        bid_amount: Number(t.bidAmount),
        project_duration: Number(t.projectDuration),
        warranty_period: Number(t.warranty),
        client_rating: Number(t.clientRating),
        project_success_rate: Number(t.successRate),
        rejection_history: Number(t.rejectionHistory),
        safety_certification: t.safetyCertification || "No",
      }));

      const res = await axios.post("http://localhost:8000/analyze", bidsPayload);
      setRankings(res.data);
    } catch (error) {
      console.error("Failed to analyze bids", error);
      setRankingError("Failed to analyze bids. Please try again.");
    } finally {
      setLoadingRankings(false);
    }
  };

  return (
    <div className="contractor-dashboard">
      <div style={{ position: 'fixed', top: 20, right: 30, zIndex: 1000 }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <FaBell
            size={28}
            style={{ cursor: 'pointer', color: notifications.length > 0 ? '#4caf50' : '#888' }}
            onClick={() => setShowNotifications(v => !v)}
            title="Notifications"
          />
          {notifications.length > 0 && (
            <span style={{
              position: 'absolute',
              top: -6,
              right: -6,
              background: '#f44336',
              color: 'white',
              borderRadius: '50%',
              padding: '2px 7px',
              fontSize: 12,
              fontWeight: 'bold',
            }}>{notifications.length}</span>
          )}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: 36,
              right: 0,
              background: 'white',
              border: '1px solid #ddd',
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              minWidth: 260,
              maxWidth: 320,
              maxHeight: 300,
              overflowY: 'auto',
              zIndex: 1001,
            }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                Notifications
                <button style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', color: '#888' }} onClick={() => setNotifications([])} title="Clear all">×</button>
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: 16, color: '#888' }}>No notifications</div>
              ) : (
                notifications.slice().reverse().map((n, idx) => (
                  <div key={idx} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', fontSize: 15 }}>
                    <div>{n.message}</div>
                    {n.tenderTitle && (
                      <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                        Tender: {n.tenderTitle}
                      </div>
                    )}
                    {n.homeownerName && (
                      <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                        By: {n.homeownerName}
                      </div>
                    )}
                    {n.timestamp && (
                      <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                        {new Date(n.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Upload Notification Display */}
      {uploadNotification && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 30,
          zIndex: 1002,
          padding: '12px 16px',
          borderRadius: '8px',
          color: 'white',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          background: uploadNotification.type === 'success' ? '#4caf50' : '#f44336',
          maxWidth: '300px',
          wordWrap: 'break-word'
        }}>
          {uploadNotification.message}
        </div>
      )}
      <div className="dashboard-container">
        <aside className="sidebar green-theme">
          <div className="brand">
            <div className="logo-white">
              <ConstructionIcon />
            </div>
            <h1>Ghar Nirman</h1>
            <h4>Construction Tender Platform</h4>
          </div>
          <div className="user-profile">
            <div className="avatar">
              <div className="avatar-initial">
                {(contractorProfile.fullName && contractorProfile.fullName.charAt(0).toUpperCase()) || "?"}
              </div>
            </div>
            <div className="user-info">
              <h4>{contractorProfile.contractor}</h4>
              <p>Contractor</p>
            </div>
          </div>
          <ul className="nav-links">
            <li onClick={() => setActiveTab("dashboard")} className={activeTab === "dashboard" ? "active" : ""}>
              <DashboardIcon /> Dashboard
            </li>
            <li onClick={() => setActiveTab("estimator")} className={activeTab === "estimator" ? "active" : ""}>
              <EstimatorIcon /> Cost Estimator
            </li>
            <li onClick={() => setActiveTab("tenders")} className={activeTab === "tenders" ? "active" : ""}>
              <TenderIcon /> Tender Management
            </li>
           
            <li onClick={() => setActiveTab("bids")} className={activeTab === "bids" ? "active" : ""}>
              <HistoryIcon /> Bid History
            </li>
            <li onClick={() => setActiveTab("materials")} className={activeTab === "materials" ? "active" : ""}>
              <MaterialsIcon /> Material Prices
            </li>
            <li onClick={() => setActiveTab("profile")} className={activeTab === "profile" ? "active" : ""}>
              <DocumentsIcon /> Profile & Docs
            </li>
            <li onClick={logout}>
              <LogoutIcon /> Logout
            </li>
          </ul>
        </aside>

        <main className="main-content">
          {activeTab === "dashboard" && (
            <>
              <header className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h1>Contractor Dashboard</h1>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: currentUserData?._id ? '#d4edda' : '#f8d7da',
                      color: currentUserData?._id ? '#155724' : '#721c24',
                      border: `1px solid ${currentUserData?._id ? '#c3e6cb' : '#f5c6cb'}`
                    }}>
                      {currentUserData?._id ? `✅ ID: ${currentUserData._id.substring(0, 8)}...` : '❌ No Contractor ID'}
                    </div>
                    <div style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      fontWeight: 'bold',
                      background: '#e7f3ff',
                      color: '#0056b3',
                      border: '1px solid #b3d9ff'
                    }}>
                      👤 {currentUserData?.displayName || currentUserData?.fullName || contractorProfile.name || 'Unknown Name'}
                    </div>
                
                  
                    <button 
                      onClick={() => fetchContractorProfile()}
                      style={{ 
                        padding: '8px 16px', 
                        background: '#28a745', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      🔄 Refresh Profile
                    </button>
                  </div>
                </div>
                <div className="dashboard-stats">
                  <div className="stats-grid">
                    <div className="stat-card">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 19v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6"></path>
                          <path d="M9 19V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14"></path>
                          <rect x="3" y="19" width="18" height="4" rx="1"></rect>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Active Bids</h3>
                        <p className="stat-value">{activeBids}</p>
                        <p className="stat-trend positive">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                          </svg>
                          +2 this week
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Successful Projects</h3>
                        <p className="stat-value">{wonProjects}</p>
                        <p className="stat-trend neutral">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="19" x2="12" y2="5"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                          </svg>
                          Steady
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 8v4l3 3"></path>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Pending Approvals</h3>
                        <p className="stat-value">{pendingApprovals}</p>
                        <p className="stat-trend negative">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                            <polyline points="17 18 23 18 23 12"></polyline>
                          </svg>
                          -1 this week
                        </p>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                        </svg>
                      </div>
                      <div className="stat-content">
                        <h3>Success Rate</h3>
                        <p className="stat-value">{contractorProfile.successRate}%</p>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${contractorProfile.successRate}%` }}></div>
                        </div>
                        <p className="stat-comparison">+7% vs last quarter</p>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              <div className="dashboard-insights">
                <div className="ai-panel">
                  <h3>AI Performance Insights</h3>
                  <div className="ai-metrics">
                    <div className="metric-card">
                      <h4>Bid Acceptance Probability</h4>
                      <div className="probability-gauge">
                        <div className="gauge-fill" style={{ width: `${selectedTender?.successRate || contractorProfile.successRate}%` }}>
                          <span>{selectedTender?.successRate || contractorProfile.successRate}%</span>
                        </div>
                      </div>
                      <p>Higher than {Math.round((selectedTender?.successRate || contractorProfile.successRate) * 0.72)}% of your competitors</p>
                    </div>
                    <div className="metric-card">
                      <h4>Specialization</h4>
                      <div className="cluster-badge">
                        {selectedTender?.specialization || contractorProfile.specialization || "N/A"}
                      </div>
                      <p>Similar to your most successful projects</p>
                    </div>
                  </div>
                </div>
              </div>

              <section className="performance-analytics">
                <h2>Performance Analytics</h2>
                <div className="analytics-grid">
                  <div className="chart-card">
                    <h3>Tender Winning Percentage</h3>
                    <div className="chart-container">
                      <div className="win-rate-chart">
                        <div className="win-rate-progress" style={{ height: `${performanceData.winRate}%` }}></div>
                        <span className="win-rate-value">{performanceData.winRate}%</span>
                      </div>
                      <div className="chart-labels">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  <div className="chart-card">
                    <h3>AI Evaluation Scores</h3>
                    <div className="chart-container">
                      <div className="evaluation-chart">
                        <div className="evaluation-bar" style={{ width: `${performanceData.avgEvaluation}%` }}>
                          <span>{performanceData.avgEvaluation}%</span>
                        </div>
                      </div>
                      <div className="chart-labels">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                  <div className="chart-card">
                    <h3>Cost vs. Estimation Deviation</h3>
                    <div className="chart-container">
                      <div className="deviation-chart">
                        <div className="deviation-indicator" style={{ left: "50%" }}>
                          <div
                            className={`deviation-value ${performanceData.costDeviation > 0 ? "positive" : "negative"}`}
                            style={{ marginLeft: performanceData.costDeviation > 0 ? "10px" : "-50px" }}
                          >
                            {performanceData.costDeviation > 0 ? "+" : ""}{performanceData.costDeviation}%
                          </div>
                        </div>
                        <div className="zero-line"></div>
                      </div>
                      <div className="chart-labels">
                        <span>-10%</span>
                        <span>0%</span>
                        <span>+10%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="recent-tenders">
                <h2>Recommended Tenders</h2>
                {loading.tenders ? (
                  <div className="loading-state">Loading tenders...</div>
                ) : error ? (
                  <div className="error-state">Error: {error}</div>
                ) : (
                  <div className="tenders-grid">
                    {tenders
                      .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
                      .slice(0, 3)
                      .map(tender => (
                        <div className="tender-card" key={tender._id}>
                          <div className="tender-header">
                            <h3>{tender.title || tender.contractor || tender.originalFilename || "Unnamed Tender"}</h3>
                            <span className="status">{tender.status}</span>
                          </div>
                          <p className="tender-description">
                            <strong>Description:</strong> {tender.description ? (tender.description.length > 100 ? tender.description.substring(0, 100) + '...' : tender.description) : "N/A"}
                          </p>
                          <p className="tender-budget">
                            <strong>Budget:</strong> {tender.budget || "N/A"}
                          </p>
                          <p className="tender-location">
                            <strong>Location:</strong> {tender.location || "N/A"}
                          </p>
                          <p className="tender-project-type">
                            <strong>Project Type:</strong> {tender.projectType || "N/A"}
                          </p>
                          <div className="tender-actions">
                            <button
                              className="btn-view"
                              onClick={() => {
                                setSelectedTender(tender);
                                setActiveTab("tenders");
                              }}
                            >
                              View Details
                            </button>
                            <label className="btn-bid" style={{ marginLeft: 8, cursor: 'pointer' }}>
                              <input
                                type="file"
                                accept=".pdf"
                                style={{ display: 'none' }}
                                onChange={e => handleTenderFileSelect(tender._id, e)}
                                disabled={uploadingTenderId === tender._id}
                              />
                              {uploadingTenderId === tender._id ? (
                                uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Uploading...'
                              ) : (
                                <>
                                  <span style={{ marginRight: 4 }}><FiUpload /></span> Upload PDF
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === "tenders" && (
            <div className="tender-marketplace">
              <div className="marketplace-header">
                <h1>Tender Marketplace</h1>
                <div style={{ marginBottom: 16 }}>
                  <a
                    href="/contractor-bid-form.pdf"
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      background: '#1976d2',
                      color: 'white',
                      padding: '10px 18px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      textDecoration: 'none',
                      marginBottom: '10px',
                      marginRight: '16px',
                      boxShadow: '0 2px 8px rgba(25, 118, 210, 0.15)'
                    }}
                  >
                    📄 Download Contractor Bid Form (PDF)
                  </a>
                </div>
                <div className="marketplace-filters">
                  <div className="filter-group">
                    <label>Status:</label>
                    <select
                      name="status"
                      value={tenderFilters.status}
                      onChange={(e) =>
                        setTenderFilters(prev => ({
                          ...prev,
                          status: e.target.value,
                          currentPage: 1,
                        }))
                      }
                    >
                      <option value="all">All</option>
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="awarded">Awarded</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Contractor:</label>
                    <input
                      type="text"
                      name="contractor"
                      placeholder="Search by contractor"
                      value={tenderFilters.contractor}
                      onChange={(e) =>
                        setTenderFilters(prev => ({
                          ...prev,
                          contractor: e.target.value,
                          currentPage: 1,
                        }))
                      }
                    />
                  </div>
                  {/* Refresh Tenders Button */}
                  <button style={{marginLeft: 16}} onClick={() => fetchTenders(tenderFilters, pagination.currentPage)}>
                    🔄 Refresh Tenders
                  </button>
                </div>
              </div>

              <div className="tenders-grid expanded">
                {loading.tenders ? (
                  <div className="loading-state">Loading tenders...</div>
                ) : error ? (
                  <div className="error-state">Error: {error}</div>
                ) : (
                  tenders.map(tender => (
                    <div
                      className={`tender-card ${selectedTender?._id === tender._id ? "selected" : ""}`}
                      key={tender._id}
                      onClick={() => setSelectedTender(tender)}
                    >
                      <div className="tender-header">
                        <h3>{tender.title || tender.contractor || tender.originalFilename || "Unnamed Tender"}</h3>
                        <span className="status">{tender.status}</span>
                      </div>
                      <p className="tender-description">
                        <strong>Description:</strong> {tender.description ? (tender.description.length > 100 ? tender.description.substring(0, 100) + '...' : tender.description) : "N/A"}
                      </p>
                      <p className="tender-budget">
                        <strong>Budget:</strong> {tender.budget || "N/A"}
                      </p>
                      <p className="tender-location">
                        <strong>Location:</strong> {tender.location || "N/A"}
                      </p>
                      <p className="tender-project-type">
                        <strong>Project Type:</strong> {tender.projectType || "N/A"}
                      </p>
                      <div className="tender-actions">
                        <input
                          type="file"
                          id={`pdf-upload-${tender._id}`}
                          accept=".pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => handleTenderFileSelect(tender._id, e)}
                          disabled={uploadingTenderId === tender._id}
                        />
                        <label 
                          htmlFor={`pdf-upload-${tender._id}`}
                          className="btn-bid"
                          style={{ 
                            cursor: uploadingTenderId === tender._id ? 'not-allowed' : 'pointer',
                            opacity: uploadingTenderId === tender._id ? 0.6 : 1
                          }}
                        >
                          {uploadingTenderId === tender._id ? (
                            uploadProgress > 0 ? `AI Processing... ${uploadProgress}%` : 'AI Processing...'
                          ) : (
                            <>
                              <FiUpload style={{ marginRight: '5px' }} />
                              Upload PDF (AI)
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pagination">
                <button
                  disabled={pagination.currentPage === 1}
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                >
                  Previous
                </button>
                <span>Page {pagination.currentPage} of {pagination.pages}</span>
                <button
                  disabled={pagination.currentPage === pagination.pages}
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                >
                  Next
                </button>
              </div>

              {selectedTender && (
                <div className="tender-detail">
                  <div className="detail-header">
                    <h2>{selectedTender.title || selectedTender.contractor || selectedTender.originalFilename || "Unnamed Tender"}</h2>
                    <button className="btn-close" onClick={() => setSelectedTender(null)}>×</button>
                  </div>
                  <div className="detail-content">
                    <div className="detail-section">
                      <h3>Tender Information</h3>
                      <p><strong>Title:</strong> {selectedTender.title || "N/A"}</p>
                      <p><strong>Description:</strong> {selectedTender.description || "N/A"}</p>
                      <p><strong>Budget:</strong> {selectedTender.budget || "N/A"}</p>
                      <p><strong>Location:</strong> {selectedTender.location || "N/A"}</p>
                      <p><strong>Project Type:</strong> {selectedTender.projectType || "N/A"}</p>
                      <p><strong>Homeowner:</strong> {selectedTender.homeownerName || "N/A"}</p>
                    </div>
                    <div className="detail-section">
                      <h3>Bid Details</h3>
                      <p><strong>Bid Amount:</strong> ${selectedTender.bidAmount?.toLocaleString() || 0}</p>
                      <p><strong>Project Duration:</strong> {selectedTender.projectDuration || 0} days</p>
                      <p><strong>Warranty:</strong> {selectedTender.warranty || 0} years</p>
                    </div>
                    <div className="detail-section">
                      <h3>Performance Metrics</h3>
                      <p><strong>Experience:</strong> {selectedTender.experience || 0} years</p>
                      <p><strong>Success Rate:</strong> {selectedTender.successRate || 0}%</p>
                      <p><strong>Client Rating:</strong> {selectedTender.clientRating || 0}/100</p>
                      <p><strong>Rejection History:</strong> {selectedTender.rejectionHistory || 0}</p>
                    </div>
                    <div className="detail-section">
                      <h3>Certifications & Documents</h3>
                      <p><strong>Safety Certification:</strong> {selectedTender.safetyCertification || "N/A"}</p>
                      <p><strong>Material Source Certainty:</strong> {selectedTender.materialSourceCertainty || 0}%</p>
                      <p><strong>Document:</strong> {selectedTender.originalFilename || "No document"}</p>
                      <p><strong>Document Path:</strong> {selectedTender.documentsPath || "N/A"}</p>
                    </div>
                    <div className="detail-section">
                      <h3>Extracted Text</h3>
                      <p>
                        {showFullText
                          ? selectedTender.extractedText || "No extracted text"
                          : selectedTender.extractedText?.substring(0, 500) + "..." || "No extracted text"}
                      </p>
                      {selectedTender.extractedText?.length > 500 && (
                        <button onClick={() => setShowFullText(!showFullText)}>
                          {showFullText ? "Show Less" : "Show Full Text"}
                        </button>
                      )}
                    </div>
                    <div className="detail-section">
                      <h3>Status & Updates</h3>
                      <p><strong>Status:</strong> {selectedTender.status || "N/A"}</p>
                      <p><strong>Bids:</strong> {selectedTender.bids || 0}</p>
                      <p><strong>Last Updated:</strong> {selectedTender.lastUpdated ? new Date(selectedTender.lastUpdated).toLocaleDateString() : "N/A"}</p>
                    </div>
                  </div>
                  <div className="detail-actions">
                    <input
                      type="file"
                      id={`pdf-upload-detail-${selectedTender._id}`}
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={(e) => handleTenderFileSelect(selectedTender._id, e)}
                      disabled={uploadingTenderId === selectedTender._id}
                    />
                    <label 
                      htmlFor={`pdf-upload-detail-${selectedTender._id}`}
                      className="btn-bid"
                      style={{ 
                        cursor: uploadingTenderId === selectedTender._id ? 'not-allowed' : 'pointer',
                        opacity: uploadingTenderId === selectedTender._id ? 0.6 : 1
                      }}
                    >
                                          {uploadingTenderId === selectedTender._id ? (
                      uploadProgress > 0 ? `AI Processing... ${uploadProgress}%` : 'AI Processing...'
                    ) : (
                      <>
                        <FiUpload style={{ marginRight: '5px' }} />
                        Upload PDF (AI)
                      </>
                    )}
                    </label>
                  </div>
                </div>
              )}

              {/* Contractor Bidding Management Section */}
              <div className="bidding-management-section" style={{ marginTop: '40px' }}>
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>
                    <FiAward style={{ marginRight: '10px' }} />
                    Contractor Bidding Management
                  </h2>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => setShowBidForm(!showBidForm)}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <FiPlus />
                      {showBidForm ? 'Hide Form' : 'Add Manual Bid'}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={analyzeBids} 
                      disabled={loadingRankings || tenders.length === 0}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      {loadingRankings ? (
                        <>
                          <span className="spinner"></span>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FiBarChart2 />
                          Analyze Bids
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Manual Bid Creation Form */}
                {showBidForm && (
                  <div className="bid-form-section" style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {editingBidId ? <FiEdit2 /> : <FiPlus />}
                      {editingBidId ? "Edit Bid" : "Create New Bid"}
                    </h3>
                    
                    <form onSubmit={handleBidFormSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiUser />
                          Contractor Name *
                        </label>
                        <input
                          type="text"
                          name="contractor"
                          value={bidFormData.contractor}
                          onChange={handleBidFormChange}
                          placeholder="Enter contractor name"
                          required
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiShield />
                          License Category
                        </label>
                        <input
                          type="text"
                          name="licenseCategory"
                          value={bidFormData.licenseCategory}
                          onChange={handleBidFormChange}
                          placeholder="e.g., Class A"
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiAward />
                          Specialization *
                        </label>
                        <input
                          type="text"
                          name="specialization"
                          value={bidFormData.specialization}
                          onChange={handleBidFormChange}
                          placeholder="e.g., Residential Construction"
                          required
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiDollarSign />
                          Bid Amount ($)
                        </label>
                        <input
                          type="number"
                          name="bidAmount"
                          value={bidFormData.bidAmount}
                          onChange={handleBidFormChange}
                          placeholder="e.g., 500000"
                          min="0"
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiCalendar />
                          Project Duration (days)
                        </label>
                        <input
                          type="number"
                          name="projectDuration"
                          value={bidFormData.projectDuration}
                          onChange={handleBidFormChange}
                          placeholder="e.g., 180"
                          min="0"
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiCheckCircle />
                          Warranty (months)
                        </label>
                        <input
                          type="number"
                          name="warranty"
                          value={bidFormData.warranty}
                          onChange={handleBidFormChange}
                          placeholder="e.g., 24"
                          min="0"
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiClock />
                          Experience (years)
                        </label>
                        <input
                          type="number"
                          name="experience"
                          value={bidFormData.experience}
                          onChange={handleBidFormChange}
                          placeholder="e.g., 10"
                          min="0"
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiPercent />
                          Success Rate (%)
                        </label>
                        <input
                          type="number"
                          name="successRate"
                          value={bidFormData.successRate}
                          onChange={handleBidFormChange}
                          placeholder="e.g., 85"
                          min="0"
                          max="100"
                          step="0.01"
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiStar />
                          Client Rating (1-5)
                        </label>
                        <input
                          type="number"
                          name="clientRating"
                          value={bidFormData.clientRating}
                          onChange={handleBidFormChange}
                          placeholder="e.g., 4.5"
                          min="1"
                          max="5"
                          step="0.1"
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiAlertTriangle />
                          Rejection History
                        </label>
                        <input
                          type="number"
                          name="rejectionHistory"
                          value={bidFormData.rejectionHistory}
                          onChange={handleBidFormChange}
                          placeholder="e.g., 2"
                          min="0"
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                      </div>

                      <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                          <FiShield />
                          Safety Certification
                        </label>
                        <select
                          name="safetyCertification"
                          value={bidFormData.safetyCertification}
                          onChange={handleBidFormChange}
                          style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        >
                          <option value="">Select option</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div className="form-actions" style={{ gridColumn: '1 / -1', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        {editingBidId && (
                          <button
                            type="button"
                            onClick={() => {
                              setBidFormData({
                                contractor: "",
                                licenseCategory: "",
                                specialization: "",
                                bidAmount: "",
                                projectDuration: "",
                                warranty: "",
                                experience: "",
                                successRate: "",
                                clientRating: "",
                                rejectionHistory: "",
                                safetyCertification: "",
                              });
                              setEditingBidId(null);
                            }}
                            style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        )}
                        <button 
                          type="submit" 
                          style={{ 
                            padding: '8px 16px', 
                            background: '#007bff', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: 'pointer' 
                          }}
                        >
                          {editingBidId ? "Update Bid" : "Create Bid"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Bid Analysis Results */}
                {rankingError && (
                  <div style={{ 
                    background: '#f8d7da', 
                    color: '#721c24', 
                    padding: '12px', 
                    borderRadius: '4px', 
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <FiAlertTriangle />
                    {rankingError}
                  </div>
                )}

                {rankings && (
                  <div className="rankings-section" style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FiBarChart2 />
                      AI-Powered Bid Analysis
                    </h3>
                    <p style={{ color: '#666', marginBottom: '20px' }}>
                      Rankings based on composite scoring algorithm
                    </p>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8f9fa' }}>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Rank</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Contractor</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Score</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Win Chance</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Bid Amount</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Technical</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankings
                            .sort(
                              (a, b) =>
                                b.composite_score - a.composite_score ||
                                b.win_probability - a.win_probability
                            )
                            .map((r, idx) => (
                              <tr key={r.contractor_name} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>
                                  <span style={{ 
                                    background: idx < 3 ? '#ffd700' : '#e9ecef', 
                                    color: idx < 3 ? '#000' : '#666',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold'
                                  }}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ 
                                    width: '30px', 
                                    height: '30px', 
                                    borderRadius: '50%', 
                                    background: '#007bff', 
                                    color: 'white', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}>
                                    {r.contractor_name.charAt(0)}
                                  </div>
                                  <span>{r.contractor_name}</span>
                                </td>
                                <td style={{ padding: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ 
                                      width: '100px', 
                                      height: '8px', 
                                      background: '#e9ecef', 
                                      borderRadius: '4px',
                                      overflow: 'hidden'
                                    }}>
                                      <div
                                        style={{ 
                                          width: `${r.composite_score}%`, 
                                          height: '100%', 
                                          background: '#007bff' 
                                        }}
                                      ></div>
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                      {r.composite_score.toFixed(1)}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ 
                                      width: '100px', 
                                      height: '8px', 
                                      background: '#e9ecef', 
                                      borderRadius: '4px',
                                      overflow: 'hidden'
                                    }}>
                                      <div
                                        style={{ 
                                          width: `${r.win_probability * 100}%`, 
                                          height: '100%', 
                                          background: '#28a745' 
                                        }}
                                      ></div>
                                    </div>
                                    <span style={{ fontSize: '14px' }}>
                                      {(r.win_probability * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>
                                  ${Number(r.bid_amount).toLocaleString()}
                                </td>
                                <td style={{ padding: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ 
                                      width: '100px', 
                                      height: '8px', 
                                      background: '#e9ecef', 
                                      borderRadius: '4px',
                                      overflow: 'hidden'
                                    }}>
                                      <div
                                        style={{ 
                                          width: `${r.technical_merit * 100}%`, 
                                          height: '100%', 
                                          background: '#dc3545' 
                                        }}
                                      ></div>
                                    </div>
                                    <span style={{ fontSize: '14px' }}>
                                      {r.technical_merit.toFixed(2)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Uploaded Files Section */}
                {uploadedFiles.length > 0 && (
                  <div className="uploaded-files-section" style={{ 
                    background: 'white', 
                    padding: '20px', 
                    borderRadius: '8px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                  }}>
                    <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FiFile />
                      Uploaded Documents
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} style={{ 
                          border: '1px solid #ddd', 
                          borderRadius: '8px', 
                          padding: '15px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px'
                        }}>
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '8px', 
                            background: '#f8f9fa', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: '#007bff'
                          }}>
                            <FiFile size={20} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: 'bold' }}>
                              {file.filename}
                            </h4>
                            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#666' }}>
                              <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                              <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "bids" && (
            <div className="bid-history">
              <div className="history-header">
                <h1>Bid History and Status Tracking</h1>
                <div className="header-actions">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button>
                      <i className="fas fa-search"></i>
                    </button>
                  </div>
                  <button className="refresh-btn" onClick={refreshBids}>
                    🔄 Refresh Bids
                  </button>
                  <button className="analytics-btn" onClick={generateBidAnalytics}>
                    📊 Analytics
                  </button>
                </div>
              </div>

              <div className="status-indicators">
                <div className="status-item status-review">
                  <div className="status-badge"></div>
                  <span>Under Review: {statusCounts["Under Review"] || 0}</span>
                </div>
                <div className="status-item status-accepted">
                  <div className="status-badge"></div>
                  <span>Accepted: {statusCounts["Accepted"] || 0}</span>
                </div>
                <div className="status-item status-rejected">
                  <div className="status-badge"></div>
                  <span>Rejected: {statusCounts["Rejected"] || 0}</span>
                </div>
              </div>

              <div className="bid-filters">
                <div className="filter-group">
                  <label>Status:</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="all">All</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Time Range:</label>
                  <select value={timeRangeFilter} onChange={(e) => setTimeRangeFilter(e.target.value)}>
                    <option value="all">All time</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                  </select>
                </div>
              </div>

              <div className="bids-table">
                <table>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Bid Amount</th>
                      <th>Date Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBids.length > 0 ? (
                      filteredBids.map(bid => (
                        <tr key={bid._id}>
                          <td>{bid.tenderTitle}</td>
                          <td>${typeof bid.bidAmount === 'number' && !isNaN(bid.bidAmount) ? bid.bidAmount.toLocaleString() : '-'}</td>
                          <td>{bid.submissionDate ? new Date(bid.submissionDate).toLocaleDateString() : '-'}</td>
                          <td className={`status-cell ${typeof bid.status === 'string' ? bid.status.toLowerCase().replace(/\s+/g, '-') : ''}`}>
                            <div className="status-dot"></div>
                            {typeof bid.status === 'string' && bid.status.length > 0 ? bid.status : '-'}
                          </td>
                          <td>
                            <button
                              className="action-btn view"
                              onClick={() => viewBidDetails(bid)}
                            >
                              <i className="fas fa-eye"></i> View
                            </button>
                            <button className="action-btn download" onClick={() => downloadBidReport(bid._id)}>
                              <i className="fas fa-download"></i> Report
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="no-bids">
                          <i className="fas fa-file-alt"></i>
                          <p>No bids match your filters</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bids-summary">
                <div className="summary-card">
                  <h3>Total Bids</h3>
                  <div className="summary-value">{totalBids}</div>
                </div>
                <div className="summary-card">
                  <h3>Accepted Bids</h3>
                  <div className="summary-value">{acceptedBids}</div>
                </div>
                <div className="summary-card">
                  <h3>Total Value</h3>
                  <div className="summary-value">${totalValue.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "materials" && (
            <div className="market-trends">
              <h1>Material Price Trends</h1>
              <div className="trends-container">
                {materialPrices.map(material => (
                  <div key={material.id} className="trend-card">
                    <div className="trend-header">
                      <h4>{material.name}</h4>
                      <span className={`price-trend ${material.trend}`}>
                        {material.trend === "up" ? "↑" : material.trend === "down" ? "↓" : "→"}
                      </span>
                    </div>
                    <div className="current-price">${material.currentPrice.toFixed(2)}</div>
                    <div className="trend-analysis">
                      {material.trend === "up" ? "Prices increasing steadily" : material.trend === "down" ? "Prices declining" : "Prices stable"}
                    </div>
                    <div className="trend-analysis">Last Updated: {material.lastUpdated}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="profile-management">
              <h1>Contractor Profile</h1>
              {/* Refresh Profile Button */}
              <button style={{marginBottom: 16}} onClick={fetchContractorProfile}>
                🔄 Refresh Profile
              </button>
              {loading.profile ? (
                <div className="loading">Loading profile...</div>
              ) : error ? (
                <div className="error">Error: {error}</div>
              ) : (
                <div className="profile-details">
                  <div className="profile-section">
                    <h3>Personal Information</h3>
                    <div className="detail-row">
                      <span className="detail-label">Full Name:</span>
                      <span className="detail-value">{contractorProfile.fullName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">{contractorProfile.email}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{contractorProfile.phoneNumber}</span>
                    </div>
                  </div>

                  <div className="profile-section">
                    <h3>Company Information</h3>
                    <div className="detail-row">
                      <span className="detail-label">Company Name:</span>
                      <span className="detail-value">{contractorProfile.companyName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Registration #:</span>
                      <span className="detail-value">{contractorProfile.companyRegistrationNumber}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">License #:</span>
                      <span className="detail-value">{contractorProfile.licenseNumber}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Address:</span>
                      <span className="detail-value">{contractorProfile.businessAddress}</span>
                    </div>
                  </div>

                  <div className="profile-section">
                    <h3>Professional Information</h3>
                    <div className="detail-row">
                      <span className="detail-label">Experience:</span>
                      <span className="detail-value">{contractorProfile.yearsOfExperience} years</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Specialization:</span>
                      <span className="detail-value">{contractorProfile.specialization}</span>
                    </div>
                    {contractorProfile.portfolioLink && (
                      <div className="detail-row">
                        <span className="detail-label">Portfolio:</span>
                        <a href={contractorProfile.portfolioLink} target="_blank" rel="noopener noreferrer">
                          View Portfolio
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="profile-section">
                    <h3>Documents</h3>
                    <div className="documents-grid">
                      {contractorProfile.documents?.licenseFile && (
                        <div className="document-card">
                          <h4>Contractor License</h4>
                          <p>Status: {contractorProfile.documents.licenseFile.status}</p>
                          <a 
                            href={`http://localhost:5000/${contractorProfile.documents.licenseFile.filePath}`} 
                            download
                            className="download-btn"
                          >
                            Download
                          </a>
                        </div>
                      )}

                      {contractorProfile.documents?.businessRegistration && (
                        <div className="document-card">
                          <h4>Business Registration</h4>
                          <p>Status: {contractorProfile.documents.businessRegistration.status}</p>
                          <a 
                            href={`http://localhost:5000/${contractorProfile.documents.businessRegistration.filePath}`} 
                            download
                            className="download-btn"
                          >
                            Download
                          </a>
                        </div>
                      )}

                      {contractorProfile.documents?.insuranceDocument && (
                        <div className="document-card">
                          <h4>Insurance Certificate</h4>
                          <p>Status: {contractorProfile.documents.insuranceDocument.status}</p>
                          <a 
                            href={`http://localhost:5000/${contractorProfile.documents.insuranceDocument.filePath}`} 
                            download
                            className="download-btn"
                          >
                            Download
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {contractorProfile.status === 'pending' && (
                    <div className="verification-notice">
                      <p>Your profile is under review. You'll be notified once verified.</p>
                    </div>
                  )}

                  <div className="profile-requirements">
                    <h3>Profile Completion Checklist</h3>
                    <ul>
                      <li className={contractorProfile.fullName ? "complete" : "incomplete"}>
                        Full Name: {contractorProfile.fullName || "Missing"}
                      </li>
                      <li className={contractorProfile.licenseNumber ? "complete" : "incomplete"}>
                        License Number: {contractorProfile.licenseNumber || "Missing"}
                      </li>
                      <li className={contractorProfile.companyName ? "complete" : "incomplete"}>
                        Company Name: {contractorProfile.companyName || "Missing"}
                      </li>
                      <li className={contractorProfile.documents?.licenseFile ? "complete" : "incomplete"}>
                        License File: {contractorProfile.documents?.licenseFile ? "Uploaded" : "Missing"}
                      </li>
                      <li className={contractorProfile.documents?.businessRegistration ? "complete" : "incomplete"}>
                        Business Registration: {contractorProfile.documents?.businessRegistration ? "Uploaded" : "Missing"}
                      </li>
                    </ul>
                  </div>
                  
                                    <section className="recent-projects">
                    <div className="section-header">
                      <h2>Recent Projects</h2>
                      <button className="btn-text" onClick={() => setActiveTab("tenders")}>
                        View All
                      </button>
                    </div>
                  
                    {loading.tenders ? (
                      <div className="loading-state">
                        <p>Loading recent projects...</p>
                      </div>
                    ) : error ? (
                      <div className="error-state">
                        <p>{error}</p>
                        <button 
                          className="btn-primary"
                          onClick={() => fetchTenders(tenderFilters, pagination.currentPage)}
                        >
                          Retry Loading Projects
                        </button>
                      </div>
                    ) : tenders.length === 0 ? (
                      <div className="empty-state">
                        <p>No recent projects found</p>
                      </div>
                    ) : (
                      <div className="projects-grid">
                        {tenders
                          .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
                          .slice(0, 3)
                          .map(tender => (
                            <div className="project-card" key={tender._id}>
                              {/* Existing card content */}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </section>

                  <div className="verification-status">
                    <h4>Verification Status</h4>
                    <p>
                      Profile: <span className={contractorProfile.status === "verified" ? "verified" : "pending"}>
                        {contractorProfile.status === "verified" ? "✓ Verified" : "⏳ Pending"}
                      </span>
                    </p>
                    <p>
                      Documents: <span className={contractorProfile.documentStatus === "verified" ? "verified" : "pending"}>
                        {contractorProfile.documentStatus === "verified" ? "✓ Verified" : "⏳ Pending"}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "bidding-management" && (
            <ContractorBiddingManagement />
          )}

          {activeTab === "estimator" && (
            <div className="cost-estimator">
              <h1>Project Cost Estimator</h1>
              <div className="estimator-container">
                <div className="estimator-form">
                  <h3>Project Parameters</h3>
                  <div className="form-group">
                    <label>Project Type</label>
                    <select
                      value={estimatorParams.type}
                      onChange={(e) => setEstimatorParams({ ...estimatorParams, type: e.target.value })}
                    >
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="industrial">Industrial</option>
                      <option value="renovation">Renovation</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Area (sq. ft.)</label>
                    <input
                      type="number"
                      value={estimatorParams.area}
                      onChange={(e) => setEstimatorParams({ ...estimatorParams, area: e.target.value })}
                      min="100"
                      step="100"
                    />
                  </div>
                  <div className="form-group">
                    <label>Quality Level</label>
                    <select
                      value={estimatorParams.quality}
                      onChange={(e) => setEstimatorParams({ ...estimatorParams, quality: e.target.value })}
                    >
                      <option value="economy">Economy</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="luxury">Luxury</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <select
                      value={estimatorParams.location}
                      onChange={(e) => setEstimatorParams({ ...estimatorParams, location: e.target.value })}
                    >
                      <option value="urban">Urban</option>
                      <option value="suburban">Suburban</option>
                      <option value="rural">Rural</option>
                    </select>
                  </div>
                  <button className="btn-calculate" onClick={calculateEstimate}>
                    Calculate Estimate
                  </button>
                </div>

                <div className="estimator-results">
                  <h3>Cost Estimation</h3>
                  {estimatedCost ? (
                    <div className="results-card">
                      <div className="estimated-cost">${estimatedCost.toLocaleString()}</div>
                      <div className="cost-range">
                        Range: ${Math.round(estimatedCost * 0.9).toLocaleString()} - ${Math.round(estimatedCost * 1.1).toLocaleString()}
                      </div>
                      <div className="cost-breakdown">
                        <h4>Cost Breakdown</h4>
                        <div className="breakdown-item">
                          <span>Materials</span>
                          <span>${Math.round(estimatedCost * 0.5).toLocaleString()}</span>
                        </div>
                        <div className="breakdown-item">
                          <span>Labor</span>
                          <span>${Math.round(estimatedCost * 0.3).toLocaleString()}</span>
                        </div>
                        <div className="breakdown-item">
                          <span>Equipment</span>
                          <span>${Math.round(estimatedCost * 0.1).toLocaleString()}</span>
                        </div>
                        <div className="breakdown-item">
                          <span>Overhead & Profit</span>
                          <span>${Math.round(estimatedCost * 0.1).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="ai-recommendation">
                        <h4>AI Recommendation</h4>
                        <p>Based on similar projects, we recommend increasing your material budget by 7% due to current market trends.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>Enter project parameters and click "Calculate Estimate" to see cost prediction</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="market-trends">
                <h3>Material Price Trends</h3>
                <div className="trends-container">
                  {materialPrices.map(material => (
                    <div key={material.id} className="trend-card">
                      <div className="trend-header">
                        <h4>{material.name}</h4>
                        <span className={`price-trend ${material.trend}`}>
                          {material.trend === "up" ? "↑" : material.trend === "down" ? "↓" : "→"}
                        </span>
                      </div>
                      <div className="current-price">${material.currentPrice.toFixed(2)}</div>
                      <div className="trend-analysis">
                        {material.trend === "up" ? "Prices increasing steadily" : material.trend === "down" ? "Prices declining" : "Prices stable"}
                      </div>
                      <div className="trend-analysis">Last Updated: {material.lastUpdated}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showBidWizard && selectedTender && (
            <div className="modal-overlay">
                              <div className="bid-wizard">
                  <div className="wizard-header">
                    <h2>Upload PDF Bid: {selectedTender.title || selectedTender.contractor || selectedTender.originalFilename || "Unnamed Tender"}</h2>
                  <button
                    className="close-btn"
                    onClick={() => {
                      setShowBidWizard(false);
                      setBidWizardStep(1);
                      setAttachedFiles([]);
                    }}
                  >
                    ×
                  </button>
                </div>

                <div className="wizard-steps">
                  <div className={`step ${bidWizardStep === 1 ? "active" : ""}`}>1. Bid Details</div>
                  <div className={`step ${bidWizardStep === 2 ? "active" : ""}`}>2. Documents</div>
                  <div className={`step ${bidWizardStep === 3 ? "active" : ""}`}>3. Review</div>
                </div>

                {bidWizardStep === 1 && (
                  <div className="wizard-step">
                    <div className="form-group">
                      <label>Bid Amount ($)*</label>
                      <input
                        type="number"
                        value={bidForm.bidAmount}
                        onChange={(e) => setBidForm({...bidForm, bidAmount: e.target.value})}
                        required
                        min="100"
                        step="100"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Project Duration (days)*</label>
                      <input
                        type="number"
                        value={bidForm.projectDuration}
                        onChange={(e) => setBidForm({...bidForm, projectDuration: e.target.value})}
                        required
                        min="1"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Warranty Period (years)*</label>
                      <select
                        value={bidForm.warranty}
                        onChange={(e) => setBidForm({...bidForm, warranty: e.target.value})}
                        required
                      >
                        <option value="1">1 Year</option>
                        <option value="2">2 Years</option>
                        <option value="5">5 Years</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Notes/Approach</label>
                      <textarea
                        value={bidForm.notes}
                        onChange={(e) => setBidForm({...bidForm, notes: e.target.value})}
                        placeholder="Describe your approach to this project..."
                      />
                    </div>
                  </div>
                )}
                
                {bidWizardStep === 2 && (
                  <div className="wizard-step">
                    <div className="form-group">
                      <label>Supporting Documents</label>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      <small>Upload any supporting documents (max 10MB each)</small>
                    </div>
                    
                    <div className="attachments-preview">
                      {attachedFiles.map((file, index) => (
                        <div key={index} className="attachment-item">
                          <span>{file.name}</span>
                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {bidWizardStep === 3 && (
                  <div className="wizard-step">
                    <h3>Review Your Bid</h3>
                    <div className="bid-summary">
                      <p><strong>Tender:</strong> {selectedTender.title || selectedTender.contractor || selectedTender.originalFilename}</p>
                      <p><strong>Bid Amount:</strong> ${parseFloat(bidForm.bidAmount).toLocaleString()}</p>
                      <p><strong>Duration:</strong> {bidForm.projectDuration} days</p>
                      <p><strong>Warranty:</strong> {bidForm.warranty} year(s)</p>
                      <p><strong>Documents:</strong> {attachedFiles.length} files</p>
                    </div>
                  </div>
                )}
                
                <div className="wizard-actions">
                  {bidWizardStep > 1 && (
                    <button type="button" onClick={() => setBidWizardStep(prev => prev - 1)}>
                      Previous
                    </button>
                  )}
                  
                  {bidWizardStep < 3 ? (
                    <button 
                      type="button" 
                      onClick={() => setBidWizardStep(prev => prev + 1)}
                      disabled={
                        (bidWizardStep === 1 && (!bidForm.bidAmount || !bidForm.projectDuration)) ||
                        (bidWizardStep === 2 && attachedFiles.length === 0)
                      }
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleBidSubmit}
                    >
                      {loading ? 'Uploading...' : 'Upload PDF Bid'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// At the very end, wrap the export in the error boundary
const DashboardExport = (props) => (
  <DashboardErrorBoundary>
    <ContractorDashboard {...props} />
  </DashboardErrorBoundary>
);

export default DashboardExport;