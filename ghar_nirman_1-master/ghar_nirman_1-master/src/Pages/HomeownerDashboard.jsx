import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import TenderForm from "./TenderForm";
import TenderCreationForm from "./TenderCreationForm";
import axios from "axios";
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import "./HomeownerDashboard.css";
import { FaBell } from "react-icons/fa";
import { db } from "./Firebase";
import { subscribeToNotifications, subscribeToPrivateNotifications, EVENTS, CHANNELS } from "../config/pusher";

// Mock data for payments (will be replaced with real data)
const mockPayments = [
  {
    id: 1,
    projectId: 2,
    amount: 5000,
    date: "2025-07-15",
    status: "Completed",
    method: "Bank Transfer",
    invoice: "INV-2025-07-001",
  },
  {
    id: 2,
    projectId: 2,
    amount: 3000,
    date: "2025-08-01",
    status: "Pending",
    method: "Credit Card",
    invoice: "INV-2025-08-001",
  },
];

// SVG Icons Components
const DashboardIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
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

const ContractorsIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const PaymentsIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);

const DocumentsIcon = () => (
  <svg className="nav-icon" viewBox="0 0 14 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const SettingsIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
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

const HomeIcon = () => (
  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

// Stripe Payment Form Component
const StripePaymentForm = ({ amount, projectId, onSuccess, onClose }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setProcessing(true);
    setError(null);

    if (!stripe || !elements) {
      return;
    }

    try {
      // Create payment intent
      const response = await axios.post('http://localhost:5000/api/payments/create-intent', {
        amount: amount * 100, // Convert to cents
        currency: 'usd',
        metadata: { projectId }
      });

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        response.data.clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: "Homeowner",
            },
          }
        }
      );

      if (stripeError) {
        setError(stripeError.message);
        setProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent);
      }
    } catch (err) {
      setError(err.message);
      setProcessing(false);
    }
  };

  return (
    <div className="payment-modal">
      <h3>Pay ${amount.toLocaleString()}</h3>
      <form onSubmit={handleSubmit}>
    <CardElement options={{ style: { base: { fontSize: '16px' } } }} />

        {error && <div className="payment-error">{error}</div>}
        <div className="payment-actions">
          <button type="button" onClick={onClose} disabled={processing}>
            Cancel
          </button>
          <button type="submit" disabled={!stripe || processing}>
            {processing ? 'Processing...' : `Pay $${amount.toLocaleString()}`}
          </button>
        </div>
      </form>
    </div>
  );
};

const HomeownerDashboard = () => {
  const { userData, setUserData, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contractors, setContractors] = useState([]);
  const [contractorsLoading, setContractorsLoading] = useState(true);
  const [contractorsError, setContractorsError] = useState(null);
  const [bidActionLoading, setBidActionLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");
  const [payments, setPayments] = useState(mockPayments);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const [newProject, setNewProject] = useState({
    title: "",
    budget: "",
    location: "",
    startDate: "",
    completionDate: "",
    description: "",
  });

  const [contractorBids, setContractorBids] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const notificationDropdownRef = useRef(null);
  const [notification, setNotification] = useState({ message: '', type: '' });

  // Add state for tender bids
  const [tenderBidsMap, setTenderBidsMap] = useState({}); // { [tenderId]: [bids] }
  const [bidsLoadingMap, setBidsLoadingMap] = useState({});
  
  // Add state for bid details modal
  const [showBidDetailsModal, setShowBidDetailsModal] = useState(false);
  const [selectedBidDetails, setSelectedBidDetails] = useState(null);

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('homeownerNotifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('homeownerNotifications', JSON.stringify(notifications));
  }, [notifications]);

  // Function to fetch homeowner data from backend
  const fetchHomeownerProfile = async () => {
    try {
      if (!userData?.uid) {
        console.log('❌ No Firebase UID available for homeowner');
        return;
      }
      
      console.log('🔄 Fetching homeowner profile for UID:', userData.uid);
      console.log('Current userData from Firebase:', userData);
      
      // First, try to get homeowner from backend
      const response = await fetch(`http://localhost:5000/api/auth/homeowner/by-uid/${userData.uid}`);
      console.log('Backend response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('⚠️ Homeowner not found in backend, creating from Firebase data...');
          
          // Create homeowner record using Firebase data
          const createResponse = await fetch('http://localhost:5000/api/auth/homeowner/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              uid: userData.uid,
              fullName: userData.fullName || userData.displayName || 'Homeowner',
              email: userData.email,
              userType: 'homeowner',
              photoURL: userData.photoURL || '',
              provider: 'google' // Use 'google' for Firebase users
            })
          });
          
          if (createResponse.ok) {
            const createdData = await createResponse.json();
            console.log('✅ Created homeowner record from Firebase:', createdData);
            
            if (createdData._id && setUserData) {
              setUserData(prev => ({
                ...prev,
                _id: createdData._id
              }));
              console.log('✅ Updated userData with new homeowner ID:', createdData._id);
              return;
            }
          } else {
            console.log('❌ Failed to create homeowner record:', createResponse.status);
            const errorData = await createResponse.json();
            console.log('Error details:', errorData);
          }
          return;
        }
        throw new Error(`Failed to fetch homeowner profile: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📥 Homeowner profile data received:', data);
      
      // Update userData with the MongoDB _id from backend
      if (data._id && setUserData) {
        setUserData(prev => ({
          ...prev,
          _id: data._id
        }));
        console.log('✅ Updated userData with homeowner ID:', data._id);
      } else {
        console.warn('⚠️ No homeowner ID found in backend response or setUserData not available');
        console.log('Backend response data:', data);
      }
    } catch (err) {
      console.error('❌ Error fetching homeowner profile:', err);
    }
  };

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

  // Debug useEffect to track userData changes
  useEffect(() => {
    console.log('🔄 userData changed:', userData);
    console.log('🔄 userData type:', typeof userData);
    console.log('🔄 userData keys:', userData ? Object.keys(userData) : 'null/undefined');
  }, [userData]);

  // Simple function to create homeowner ID directly
  const createHomeownerIdDirectly = async () => {
    try {
      if (!userData?.uid) {
        alert('❌ No Firebase UID available');
        return;
      }
      
      console.log('🚀 Creating homeowner ID directly for UID:', userData.uid);
      
      const response = await fetch('http://localhost:5000/api/auth/homeowner/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userData.uid,
          fullName: userData.fullName || userData.displayName || 'Homeowner',
          email: userData.email,
          userType: 'homeowner',
          photoURL: userData.photoURL || '',
          provider: 'google'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Homeowner ID created directly:', data);
        alert(`✅ Homeowner ID created: ${data._id}\nPlease refresh the page to see the updated ID.`);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to create homeowner ID:', errorData);
        alert(`❌ Failed to create homeowner ID: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('❌ Error in createHomeownerIdDirectly:', err);
      alert(`❌ Error: ${err.message}`);
    }
  };

  // Function to check authentication status
  const checkAuthStatus = () => {
    console.log('🔐 Auth Status Check:');
    console.log('- UID:', userData?.uid);
    console.log('- Email:', userData?.email);
    console.log('- Name:', userData?.displayName || userData?.fullName);
    console.log('- MongoDB ID:', userData?._id);
    console.log('- User Type:', userData?.userType);
    console.log('- Full userData:', userData);
    
    alert(`Auth Status:\nUID: ${userData?.uid || 'Not set'}\nEmail: ${userData?.email || 'Not set'}\nName: ${userData?.displayName || userData?.fullName || 'Not set'}\nMongoDB ID: ${userData?._id || 'Not set'}\nUser Type: ${userData?.userType || 'Not set'}`);
  };

  const testNotification = async () => {
    if (!userData?._id) {
      alert('❌ No homeowner ID available for testing');
      return;
    }
    
    try {
      console.log('🧪 Testing notification for homeowner:', userData._id);
      
      const response = await axios.post('http://localhost:5000/api/notifications/test/send', {
        homeownerId: userData._id,
        message: '🧪 Test notification from debug button!'
      });
      
      console.log('✅ Test notification response:', response.data);
      alert('✅ Test notification sent! Check your notification dropdown.');
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      alert(`❌ Failed to send test notification: ${error.response?.data?.error || error.message}`);
    }
  };

  // Handle click outside notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setShowNotificationDropdown(false);
      }
    };

    if (showNotificationDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationDropdown]);

  // Mark notifications as read when dropdown is opened
  useEffect(() => {
    if (showNotificationDropdown && notifications.some(n => !n.read)) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  }, [showNotificationDropdown]);

  // Fetch notifications from backend for homeowner
  useEffect(() => {
    if (!userData?._id) {
      console.log('No homeowner ID available, skipping notifications fetch');
      return;
    }
    fetch(`http://localhost:5000/api/notifications/user/${userData._id}?userType=homeowner`)
      .then(res => res.json())
      .then(data => {
        console.log('📢 Fetched notifications from backend:', data);
        if (data.success && data.notifications) {
          setNotifications(data.notifications);
          console.log(`📢 Set ${data.notifications.length} notifications`);
        } else {
          console.log('📢 No notifications found or invalid response');
          setNotifications([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch homeowner notifications:', err);
        setNotifications([]);
      });
  }, [userData?._id]);

  // Setup Pusher notifications for homeowners
  useEffect(() => {
    const homeownerId = userData?._id;
    
    console.log("Setting up Pusher notifications for homeowner:", homeownerId);
    console.log("Current user data:", userData);

    // Subscribe to general homeowner notifications (works for all homeowners)
    const unsubscribeGeneral = subscribeToNotifications(
      CHANNELS.HOMEOWNERS, 
      EVENTS.NEW_BID, 
      (data) => {
        console.log("📢 Received general homeowner notification:", data);
        setNotifications(prev => [
          ...prev,
          { ...data, timestamp: new Date().toISOString() }
        ]);
        setNotification({ message: `New bid received: ${data.message}`, type: 'success' });
      }
    );

    // Subscribe to private homeowner notifications (only if homeownerId exists)
    let unsubscribePrivate = null;
    if (homeownerId) {
      console.log("Subscribing to private notifications for homeowner:", homeownerId);
      unsubscribePrivate = subscribeToPrivateNotifications(
        homeownerId,
        'homeowner',
        EVENTS.NEW_BID,
        (data) => {
          console.log("📢 Received private homeowner notification:", data);
          setNotifications(prev => [
            ...prev,
            { ...data, timestamp: new Date().toISOString() }
          ]);
          setNotification({ message: `New bid received: ${data.message}`, type: 'success' });
        }
      );
      
      // Also subscribe to general notifications for this homeowner
      const unsubscribeGeneralHomeowner = subscribeToNotifications(
        `private-homeowner-${homeownerId}`,
        EVENTS.GENERAL_NOTIFICATION,
        (data) => {
          console.log("📢 Received general notification for homeowner:", data);
          setNotifications(prev => [
            ...prev,
            { ...data, timestamp: new Date().toISOString() }
          ]);
          setNotification({ message: `Notification: ${data.message}`, type: 'success' });
        }
      );
      
      return () => {
        unsubscribeGeneral();
        if (unsubscribePrivate) {
          unsubscribePrivate();
        }
        unsubscribeGeneralHomeowner();
      };
    } else {
      console.log("No homeowner ID available, skipping private notifications");
      return () => {
        unsubscribeGeneral();
      };
    }
  }, [userData?._id, userData?.uid]);

  // API base URL
  const apiBaseUrl = "http://localhost:5000/api";
  const projectsApiBaseUrl = `${apiBaseUrl}/tenders`;
  const paymentsApiBaseUrl = `${apiBaseUrl}/payments`;

  // Initialize Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await loadStripe('your_publishable_key');
      setStripePromise(stripeInstance);
    };
    initializeStripe();
  }, []);

  // Fetch projects from the database
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const config = {
          headers: { Authorization: `Bearer ${userData?.token || ""}` },
        };
        const response = await axios.get(projectsApiBaseUrl, config);
        
        console.log('🔍 Raw API response:', response.data);
        
        // Handle both array and object responses
        let tenderData = response.data;
        if (response.data.tenders) {
          tenderData = response.data.tenders;
        }
        
        const fetchedProjects = tenderData.map((project) => ({
          id: project._id || project.id || Math.random().toString(36).substr(2, 9),
          title: project.title || project.contractor || project.originalFilename || "Untitled Project",
          budget: Number(project.budget || project.bidAmount || 0),
          location: project.location || "N/A",
          startDate: project.startDate || project.lastUpdated ? new Date(project.lastUpdated).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          completionDate: project.completionDate || new Date().toISOString().split("T")[0],
          status: project.status || "Planning",
          contractor: project.contractor || null,
          bids: project.bids || [],
          documents: project.documents || [],
          progress: Number(project.progress || 0),
        }));
        
        console.log('🔍 Processed projects:', fetchedProjects);
        setProjects(fetchedProjects);
        
        // Fetch bids data for these projects
        if (fetchedProjects.length > 0) {
          await fetchBidsData();
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
        setError("Failed to load projects. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, [userData?.token]);

  // Fetch payments from the database
  const fetchPayments = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${userData?.token || ""}` },
      };
      const response = await axios.get(paymentsApiBaseUrl, config);
      setPayments(response.data);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
      // Fallback to mock data if API fails
      setPayments(mockPayments);
    }
  };

  // Fetch bids data for all tenders
  const fetchBidsData = async () => {
    try {
      const config = {
        headers: { Authorization: `Bearer ${userData?.token || ""}` },
      };
      
      // Fetch all bids for this homeowner's tenders
      const bidsResponse = await axios.get(`${apiBaseUrl}/bids`, config);
      
      // Update projects with bids data
      setProjects(prevProjects => {
        return prevProjects.map(project => {
          const projectBids = bidsResponse.data.bids?.filter(bid => bid.tender === project.id) || [];
          return {
            ...project,
            bids: projectBids
          };
        });
      });
      
    } catch (err) {
      console.error("Failed to fetch bids data:", err);
    }
  };

  // Load bids when documents tab is accessed
  useEffect(() => {
    if (activeTab === "documents" && projects.length > 0) {
      fetchBidsData();
    }
  }, [activeTab, projects.length]);

  // Load settings when settings tab is accessed
  useEffect(() => {
    if (activeTab === "settings" && userData) {
      loadSettings();
    }
  }, [activeTab, userData]);

  // Load user settings from Firebase
  const loadSettings = async () => {
    try {
      if (!userData?.uid) {
        console.error("No Firebase UID available for loading settings");
        // Fallback to userData
        setSettingsForm({
          fullName: userData?.fullName || userData?.displayName || '',
          email: userData?.email || '',
          phoneNumber: '',
          address: '',
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true
        });
        return;
      }

      // Get user data from Firebase Firestore
      const userDocRef = doc(db, 'users', userData.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const firestoreData = userDoc.data();
        setSettingsForm({
          fullName: firestoreData.fullName || firestoreData.displayName || userData?.fullName || userData?.displayName || '',
          email: firestoreData.email || userData?.email || '',
          phoneNumber: firestoreData.phoneNumber || '',
          address: firestoreData.address || '',
          emailNotifications: firestoreData.emailNotifications !== false,
          smsNotifications: firestoreData.smsNotifications !== false,
          pushNotifications: firestoreData.pushNotifications !== false
        });
      } else {
        // Fallback to current userData
        setSettingsForm({
          fullName: userData?.fullName || userData?.displayName || '',
          email: userData?.email || '',
          phoneNumber: '',
          address: '',
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true
        });
      }
    } catch (err) {
      console.error("Failed to load settings from Firebase:", err);
      // Fallback to userData
      setSettingsForm({
        fullName: userData?.fullName || userData?.displayName || '',
        email: userData?.email || '',
        phoneNumber: '',
        address: '',
        emailNotifications: true,
        smsNotifications: true,
        pushNotifications: true
      });
    }
  };

  // Handle settings form changes
  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettingsForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save settings to database
const saveSettings = async () => {
  try {
    setSettingsLoading(true);
    setSettingsSaved(false);

    if (!userData?.uid) {
      alert("No Firebase UID available.");
      return;
    }

    // Save settings to Firestore under 'users' collection
    await setDoc(doc(db, "users", userData.uid), {
      ...settingsForm,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setSettingsSaved(true);
    // Optionally update local userData
    if (setUserData) {
      setUserData(prev => ({
        ...prev,
        fullName: settingsForm.fullName,
        email: settingsForm.email
      }));
    }
    setTimeout(() => setSettingsSaved(false), 3000);
  } catch (err) {
    console.error("Failed to save settings to Firebase:", err);
    alert("Failed to save settings. Please try again.");
  } finally {
    setSettingsLoading(false);
  }
};

  // Fetch contractors from the bids array of tenders
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        setContractorsLoading(true);
        setContractorsError(null);
        const config = {
          headers: { Authorization: `Bearer ${userData?.token || ""}` },
        };
        const response = await axios.get(projectsApiBaseUrl, config);
        
        // Handle both array and object responses
        let tenderData = response.data;
        if (response.data.tenders) {
          tenderData = response.data.tenders;
        }
        
        const contractorMap = new Map();
        tenderData.forEach((tender) => {
          const bidsArray = Array.isArray(tender.bids) ? tender.bids : [];
          bidsArray.forEach((bid) => {
            const contractorId = bid.contractorId || bid.contractor || Math.random().toString(36).substr(2, 9);
            if (!contractorMap.has(contractorId)) {
              contractorMap.set(contractorId, {
                id: contractorId,
                name: bid.contractor || "Unknown Contractor",
                rating: Number(bid.rating || 0),
                experience: bid.experience || "N/A",
                specialization: bid.specialization || ["General"],
                completedProjects: Number(bid.completedProjects || 0),
                location: bid.location || tender.location || "N/A",
                contact: bid.contact || "N/A",
                priceRange: bid.priceRange || "$$",
                bids: [{
                  tenderId: tender._id || tender.id,
                  tenderTitle: tender.title || tender.contractor || tender.originalFilename || "Untitled Tender",
                  amount: Number(bid.amount || 0),
                  timeline: bid.timeline || "N/A",
                }],
              });
            } else {
              const existing = contractorMap.get(contractorId);
              existing.bids.push({
                tenderId: tender._id || tender.id,
                tenderTitle: tender.title || tender.contractor || tender.originalFilename || "Untitled Tender",
                amount: Number(bid.amount || 0),
                timeline: bid.timeline || "N/A",
              });
              contractorMap.set(contractorId, existing);
            }
          });
        });

        const fetchedContractors = Array.from(contractorMap.values());
        setContractors(fetchedContractors);
      } catch (err) {
        console.error("Failed to fetch contractors from tenders:", err);
        setContractorsError(`Failed to load contractors: ${err.message}. Please try again later.`);
      } finally {
        setContractorsLoading(false);
      }
    };
    fetchContractors();
  }, [userData?.token]);

  const fetchContractorBids = async (tenders) => {
    setBidsLoading(true);
    try {
      let allBids = [];
      for (const tender of tenders) {
        const res = await axios.get(`http://localhost:5000/api/bids?tender=${tender.id}`);
        allBids = allBids.concat(res.data.bids);
      }
      // Group by contractor
      const contractorMap = new Map();
      allBids.forEach((bid) => {
        // Use a fallback contractor name if bid.contractor is undefined
        const contractorName = bid.contractor || bid.contractor_name || bid.contractorName || 'Unknown Contractor';
        
        if (!contractorMap.has(contractorName)) {
          contractorMap.set(contractorName, {
            contractorId: contractorName,
            tenderBids: [bid],
          });
        } else {
          contractorMap.get(contractorName).tenderBids.push(bid);
        }
      });
      setContractorBids(Array.from(contractorMap.values()));
    } catch (err) {
      setContractorBids([]);
    }
    setBidsLoading(false);
  };

  useEffect(() => {
    if (projects.length > 0) {
      fetchContractorBids(projects);
    }
  }, [projects]);

  // Calculate project status counts
  const statusCounts = projects.reduce((acc, project) => {
    acc[project.status] = (acc[project.status] || 0) + 1;
    return acc;
  }, {});

  // Calculate additional statistics from bids
  const calculateBidStatistics = () => {
    let totalBids = 0;
    let pendingApprovals = 0;
    let activeProjects = 0;
    let completedProjects = 0;
    let totalBudget = 0;

    projects.forEach(project => {
      // Count bids for this project
      if (project.bids && Array.isArray(project.bids)) {
        totalBids += project.bids.length;
        
        // Count pending approvals (bids under review)
        const pendingBids = project.bids.filter(bid => bid.status === 'Under Review').length;
        pendingApprovals += pendingBids;
      }

      // Count project statuses
      if (project.status === 'In Progress' || project.status === 'Active') {
        activeProjects++;
      } else if (project.status === 'Completed') {
        completedProjects++;
      }

      // Calculate total budget
      totalBudget += Number(project.budget || 0);
    });

    return {
      totalBids,
      pendingApprovals,
      activeProjects,
      completedProjects,
      totalBudget
    };
  };

  const bidStats = calculateBidStatistics();

  // Filter projects based on status and time range
  const filteredProjects = projects.filter((project) => {
    if (statusFilter !== "all" && project.status !== statusFilter) return false;
    const now = new Date();
    const startDate = new Date(project.startDate);
    if (timeRangeFilter === "upcoming" && startDate < now) return false;
    if (timeRangeFilter === "active" && (startDate > now || project.status === "Completed")) return false;
    if (timeRangeFilter === "completed" && project.status !== "Completed") return false;
    if (searchQuery && !project.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCreateProject = async (e) => {
    e.preventDefault();
    const project = {
      title: newProject.title,
      budget: parseFloat(newProject.budget),
      location: newProject.location,
      startDate: newProject.startDate,
      completionDate: newProject.completionDate,
      status: "Planning",
      contractor: null,
      bids: [],
      documents: [],
      progress: 0,
    };
    try {
      const response = await axios.post(projectsApiBaseUrl, project, {
        headers: { Authorization: `Bearer ${userData?.token || ""}` },
      });
      setProjects([...projects, { id: response.data._id, ...project }]);
      setNotifications(prev => [
        ...prev,
        {
          message: "You created a new tender!",
          tender: response.data,
          timestamp: new Date().toISOString()
        }
      ]);
      setNewProject({
        title: "",
        budget: "",
        location: "",
        startDate: "",
        completionDate: "",
        description: "",
      });
      setShowNewProjectForm(false);
      alert("Project created successfully!");
    } catch (err) {
      console.error("Failed to create project:", err);
      alert("Failed to create project. Please try again.");
    }
  };

  const acceptBid = async (bidId, projectId) => {
    try {
      setBidActionLoading(true);
      console.log('🔍 Accepting bid:', bidId, 'for project:', projectId);
      console.log('🔍 Selected bid details:', selectedBidDetails);
      console.log('🔍 Available projects:', projects.map(p => ({ id: p.id, title: p.title })));
      
      // Update bid status to "Accepted" in backend
      const config = {
        headers: { Authorization: `Bearer ${userData?.token || ""}` },
      };
      
      const response = await axios.patch(`${apiBaseUrl}/bids/${bidId}/status`, {
        status: "Accepted"
      }, config);
      
      console.log('✅ Bid accepted in backend:', response.data);
      
      // Update local state
      setProjects(prevProjects => 
        prevProjects.map(project => {
          if (project.id === projectId) {
            const updatedBids = project.bids.map(bid => 
              bid._id === bidId || bid.id === bidId 
                ? { ...bid, status: "Accepted" }
                : { ...bid, status: "Rejected" }
            );
            
            const acceptedBid = updatedBids.find(bid => bid.status === "Accepted");
            
            return {
              ...project,
              status: "In Progress",
              contractor: acceptedBid?.contractor || acceptedBid?.contractor_name,
              bids: updatedBids,
              acceptedBid: acceptedBid
            };
          }
          return project;
        })
      );
      
      // Update tender bids map to reflect the status change
      setTenderBidsMap(prevMap => {
        const newMap = { ...prevMap };
        if (newMap[projectId]) {
          newMap[projectId] = newMap[projectId].map(bid => 
            bid._id === bidId || bid.id === bidId 
              ? { ...bid, status: "Accepted" }
              : { ...bid, status: "Rejected" }
          );
        }
        return newMap;
      });
      
      // Add notification
      setNotifications(prev => [
        ...prev,
        {
          message: `Bid accepted for ${selectedBidDetails?.contractor || selectedBidDetails?.contractor_name || 'contractor'}`,
          type: 'success',
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Close modal
      setShowBidDetailsModal(false);
      setSelectedBidDetails(null);
      
      // Show success message
      alert("✅ Bid accepted successfully! Project status updated to 'In Progress'.");
      
      // Navigate to projects tab to show the updated project
      setActiveTab("projects");
      
    } catch (error) {
      console.error('❌ Error accepting bid:', error);
      alert('❌ Failed to accept bid. Please try again.');
    } finally {
      setBidActionLoading(false);
    }
  };

  const rejectBid = async (bidId, projectId) => {
    try {
      setBidActionLoading(true);
      console.log('🔍 Rejecting bid:', bidId, 'for project:', projectId);
      
      // Update bid status to "Rejected" in backend
      const config = {
        headers: { Authorization: `Bearer ${userData?.token || ""}` },
      };
      
      const response = await axios.patch(`${apiBaseUrl}/bids/${bidId}/status`, {
        status: "Rejected"
      }, config);
      
      console.log('✅ Bid rejected in backend:', response.data);
      
      // Update local state
      setProjects(prevProjects => 
        prevProjects.map(project => {
          if (project.id === projectId) {
            const updatedBids = project.bids.map(bid => 
              bid._id === bidId || bid.id === bidId 
                ? { ...bid, status: "Rejected" }
                : bid
            );
            
            return {
              ...project,
              bids: updatedBids
            };
          }
          return project;
        })
      );
      
      // Update tender bids map to reflect the status change
      setTenderBidsMap(prevMap => {
        const newMap = { ...prevMap };
        if (newMap[projectId]) {
          newMap[projectId] = newMap[projectId].map(bid => 
            bid._id === bidId || bid.id === bidId 
              ? { ...bid, status: "Rejected" }
              : bid
          );
        }
        return newMap;
      });
      
      // Add notification
      setNotifications(prev => [
        ...prev,
        {
          message: `Bid rejected for ${selectedBidDetails?.contractor || selectedBidDetails?.contractor_name || 'contractor'}`,
          type: 'info',
          timestamp: new Date().toISOString()
        }
      ]);
      
      // Close modal
      setShowBidDetailsModal(false);
      setSelectedBidDetails(null);
      
      // Show success message
      alert("❌ Bid rejected successfully!");
      
    } catch (error) {
      console.error('❌ Error rejecting bid:', error);
      alert('❌ Failed to reject bid. Please try again.');
    } finally {
      setBidActionLoading(false);
    }
  };

  const updateProjectStatus = (projectId, newStatus) => {
    setProjects(
      projects.map((project) => {
        if (project.id === projectId) {
          return { ...project, status: newStatus };
        }
        return project;
      })
    );
  };

  const uploadProjectDocument = (projectId, files) => {
    const newDocs = Array.from(files).map((f) => f.name);
    setProjects(
      projects.map((project) => {
        if (project.id === projectId) {
          return {
            ...project,
            documents: [...project.documents, ...newDocs],
          };
        }
        return project;
      })
    );
  };

  const removeProjectDocument = (projectId, index) => {
    setProjects(
      projects.map((project) => {
        if (project.id === projectId) {
          const newDocs = [...project.documents];
          newDocs.splice(index, 1);
          return {
            ...project,
            documents: newDocs,
          };
        }
        return project;
      })
    );
  };

  const updateProjectProgress = (projectId, progress) => {
    setProjects(
      projects.map((project) => {
        if (project.id === projectId) {
          return { ...project, progress };
        }
        return project;
      })
    );
  };

  // Handle payment initiation
  const handlePaymentInitiation = (payment) => {
    setSelectedPayment(payment);
    setShowPaymentModal(true);
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentIntent) => {
    try {
      // Update payment status in backend
      await axios.post(`${paymentsApiBaseUrl}/confirm`, {
        paymentId: selectedPayment.id,
        stripePaymentId: paymentIntent.id,
        status: 'completed'
      }, {
        headers: { Authorization: `Bearer ${userData?.token || ""}` }
      });
      
      alert('Payment succeeded!');
      fetchPayments(); // Refresh payments list
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Payment confirmation failed. Please check your payments.');
    }
  };

  const userInitial = userData?.name?.charAt(0) || "H";

  const fetchBidsForTender = async (tenderId) => {
    setBidsLoadingMap(prev => ({ ...prev, [tenderId]: true }));
    try {
      console.log('🔍 Fetching bids for tender:', tenderId);
      const res = await axios.get(`http://localhost:5000/api/bids?tender=${tenderId}`);
      console.log('📊 Bids response:', res.data);
      setTenderBidsMap(prev => ({ ...prev, [tenderId]: res.data.bids || [] }));
    } catch (err) {
      console.error('❌ Error fetching bids:', err);
      setTenderBidsMap(prev => ({ ...prev, [tenderId]: [] }));
    } finally {
      setBidsLoadingMap(prev => ({ ...prev, [tenderId]: false }));
    }
  };

  const showBidDetails = (bid, projectId) => {
    console.log('🔍 Showing bid details:', bid);
    console.log('🔍 Project ID:', projectId);
    setSelectedBidDetails({ ...bid, projectId });
    setShowBidDetailsModal(true);
  };

  return (
    <>

        {/* Notification Bell - Fixed Position like Contractor Dashboard */}
        <div style={{ position: 'fixed', top: 20, right: 30, zIndex: 1000 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
          <FaBell
            size={28}
            style={{ cursor: 'pointer', color: notifications.length > 0 ? '#4caf50' : '#888' }}
            onClick={() => setShowNotificationDropdown(v => !v)}
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
          {showNotificationDropdown && (
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
                    {n.contractorName && (
                      <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                        By: {n.contractorName}
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

      {/* Transient Notification */}
      {notification.message && (
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
          background: '#4caf50',
          maxWidth: '300px',
          wordWrap: 'break-word'
        }}>
          {notification.message}
          <button 
            onClick={() => setNotification({ message: '', type: '' })}
            style={{
              marginLeft: '10px',
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}

      <div className="dashboard-container">
          <aside className="sidebar blue-theme">
            <div className="brand">
              <div className="logo-white">
                <HomeIcon />
              </div>
              <h1>Ghar Nirman</h1>
              <h4>Homeowner Portal</h4>
            </div>
            <div className="user-profile">
              <div className="avatar">
                <div className="avatar-initial">{userInitial}</div>
              </div>
              <div className="user-info">
                <h4>{userData?.name || "Homeowner"}</h4>
              </div>
            </div>
            <ul className="nav-links">
              <li onClick={() => setActiveTab("dashboard")} className={activeTab === "dashboard" ? "active" : ""}>
                <DashboardIcon />
                Dashboard
              </li>
              <li onClick={() => setActiveTab("tenders")} className={activeTab === "tenders" ? "active" : ""}>
                <TenderIcon />
                Tender Management
              </li>
              <li onClick={() => setActiveTab("contractors")} className={activeTab === "contractors" ? "active" : ""}>
                <ContractorsIcon />
                Contractors
              </li>
              <li onClick={() => setActiveTab("payments")} className={activeTab === "payments" ? "active" : ""}>
                <PaymentsIcon />
                Payments
              </li>
              <li onClick={() => setActiveTab("documents")} className={activeTab === "documents" ? "active" : ""}>
                <DocumentsIcon />
                Documents
              </li>
              <li onClick={() => setActiveTab("settings")} className={activeTab === "settings" ? "active" : ""}>
                <SettingsIcon />
                Settings
              </li>
              <li onClick={logout}>
                <LogoutIcon />
                Logout
              </li>
            </ul>
          </aside>

          <main className="main-content">
            {activeTab === "dashboard" && (
              <>
                <header className="dashboard-header">
                  <h1>Welcome back, {userData?.name?.split(" ")[0] || "Homeowner"}!</h1>
                  <p>Here's what's happening with your projects</p>
                  <div className="stats-container">
                    <div className="stat-card">
                      <h3>Active Projects</h3>
                      <p>{bidStats.activeProjects}</p>
                    </div>
                    <div className="stat-card">
                      <h3>Pending Approvals</h3>
                      <p>{bidStats.pendingApprovals}</p>
                    </div>
                    <div className="stat-card">
                      <h3>Completed Projects</h3>
                      <p>{bidStats.completedProjects}</p>
                    </div>
                    <div className="stat-card">
                      <h3>Total Budget</h3>
                      <p>${bidStats.totalBudget.toLocaleString()}</p>
                    </div>
                    <div className="stat-card">
                      <h3>Total Bids</h3>
                      <p>{bidStats.totalBids}</p>
                    </div>
                  </div>
                </header>

                <div className="dashboard-insights">
                  <div className="ai-panel glass-card">
                    <h3>Project Insights</h3>
                    <div className="ai-metrics">
                      <div className="metric-card">
                        <h4>Current Project Status</h4>
                        <div className="status-bars">
                          {Object.entries(statusCounts).map(([status, count]) => (
                            <div key={status} className="status-bar">
                              <span className="status-label">{status}</span>
                              <div className="bar-container">
                                <div className="bar-fill" style={{ width: `${(count / projects.length) * 100}%` }}></div>
                              </div>
                              <span className="status-count">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="metric-card">
                        <h4>Budget Utilization</h4>
                        <div className="budget-gauge">
                          <div className="gauge-fill" style={{ width: `${Math.min(100, (bidStats.totalBudget / 10000000) * 100)}%` }}>
                            <span>{Math.min(100, Math.round((bidStats.totalBudget / 10000000) * 100))}%</span>
                          </div>
                        </div>
                        <p>Total budget: ${bidStats.totalBudget.toLocaleString()} / $10,000,000</p>
                      </div>
                    </div>
                  </div>
                </div>

                <section className="recent-projects">
                  <div className="section-header">
                    <h2>Recent Projects</h2>
                    <button className="btn-text" onClick={() => setActiveTab("tenders")}>
                      View All
                    </button>
                  </div>
                  {loading ? (
                    <div className="loading-state glass-card">
                      <p>Loading projects...</p>
                    </div>
                  ) : error ? (
                    <div className="error-state glass-card">
                      <p>{error}</p>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setLoading(true);
                          setError(null);
                          const fetchProjects = async () => {
                            try {
                              const config = {
                                headers: { Authorization: `Bearer ${userData?.token || ""}` },
                              };
                              const response = await axios.get(projectsApiBaseUrl, config);
                              
                              console.log('🔍 Raw API response (retry):', response.data);
                              
                              // Handle both array and object responses
                              let tenderData = response.data;
                              if (response.data.tenders) {
                                tenderData = response.data.tenders;
                              }
                              
                              const fetchedProjects = tenderData.map((project) => ({
                                id: project._id || project.id || Math.random().toString(36).substr(2, 9),
                                title: project.title || project.contractor || project.originalFilename || "Untitled Project",
                                budget: Number(project.budget || project.bidAmount || 0),
                                location: project.location || "N/A",
                                startDate: project.startDate || project.lastUpdated ? new Date(project.lastUpdated).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                                completionDate: project.completionDate || new Date().toISOString().split("T")[0],
                                status: project.status || "Planning",
                                contractor: project.contractor || null,
                                bids: project.bids || [],
                                documents: project.documents || [],
                                progress: Number(project.progress || 0),
                              }));
                              
                              console.log('🔍 Processed projects (retry):', fetchedProjects);
                              setProjects(fetchedProjects);
                            } catch (err) {
                              console.error("Failed to fetch projects:", err);
                              setError("Failed to load projects. Please try again later.");
                            } finally {
                              setLoading(false);
                            }
                          };
                          fetchProjects();
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="empty-state glass-card">
                      <p>No projects found</p>
                      <button className="btn-primary" onClick={() => setActiveTab("tenders")}>
                        Create a New Tender
                      </button>
                    </div>
                  ) : (
                    <div className="projects-grid">
                      {projects.slice(0, 3).map((project) => (
                        <div
                          className="project-card glass-card"
                          key={project.id}
                          onClick={() => {
                            setSelectedProject(project);
                            setActiveTab("projects");
                          }}
                        >
                          <div className="project-header">
                            <h3>{project.title}</h3>
                            <span className={`status-badge ${project.status.toLowerCase().replace(" ", "-")}`}>
                              {project.status}
                            </span>
                          </div>
                          <p className="project-budget">Budget: ${project.budget.toLocaleString()}</p>
                          <p className="project-location">
                            <LocationIcon />
                            {project.location}
                          </p>
                          <p className="project-dates">
                            <CalendarIcon />
                            {project.startDate} - {project.completionDate}
                          </p>
                          {project.status === "In Progress" && (
                            <div className="progress-bar">
                              <div className="progress-fill" style={{ width: `${project.progress}%` }}>
                                <span>{project.progress}%</span>
                              </div>
                            </div>
                          )}
                          <div className="project-actions">
                            <button className="btn-view">View Details</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="quick-actions">
                  <h2>Quick Actions</h2>
                  <div className="action-buttons">
                    <button className="action-btn glass-card" onClick={() => setActiveTab("tenders")}>
                      <div className="action-icon">
                        <TenderIcon />
                      </div>
                      <span>Create Tender</span>
                    </button>
                    <button className="action-btn glass-card" onClick={() => setActiveTab("contractors")}>
                      <div className="action-icon">
                        <ContractorsIcon />
                      </div>
                      <span>Find Contractors</span>
                    </button>
                    <button className="action-btn glass-card" onClick={() => setActiveTab("payments")}>
                      <div className="action-icon">
                        <PaymentsIcon />
                      </div>
                      <span>Manage Payments</span>
                    </button>
                    <button className="action-btn glass-card" onClick={() => setActiveTab("documents")}>
                      <div className="action-icon">
                        <DocumentsIcon />
                      </div>
                      <span>Manage Documents</span>
                    </button>
                    <button className="action-btn glass-card" onClick={() => setActiveTab("settings")}>
                      <div className="action-icon">
                        <SettingsIcon />
                      </div>
                      <span>Settings</span>
                    </button>
                  </div>
                </section>
              </>
            )}

            {activeTab === "tenders" && (
              <div className="tender-management">
                <TenderCreationForm />
              </div>
            )}

            {activeTab === "contractors" && (
              <div className="contractors-management">
                <div className="contractors-header">
                  <div>
                    <h1>Find Contractors</h1>
                    <p>Browse contractors who have bid on your tenders</p>
                  </div>
                  <div className="search-box glass-card">
                    <input
                      type="text"
                      placeholder="Search by name, specialty..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button>
                      <i className="fas fa-search"></i>
                    </button>
                  </div>
                </div>

                <div className="contractors-filters glass-card">
                  <div className="filter-group">
                    <label>Specialization:</label>
                    <select>
                      <option>All</option>
                      <option>Residential</option>
                      <option>Commercial</option>
                      <option>Renovation</option>
                      <option>Luxury</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Price Range:</label>
                    <select>
                      <option>Any</option>
                      <option>$ (Budget)</option>
                      <option>$$ (Standard)</option>
                      <option>$$$ (Premium)</option>
                      <option>$$$$ (Luxury)</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Location:</label>
                    <input type="text" placeholder="City or region" />
                  </div>
                </div>

                {bidsLoading ? (
                  <div className="loading-state glass-card">
                    <p>Loading contractors...</p>
                  </div>
                ) : contractorBids.length === 0 ? (
                  <div className="empty-state glass-card">
                    <p>No contractors have bid on your tenders yet</p>
                    <button className="btn-primary" onClick={() => setActiveTab("tenders")}>
                      Create a New Tender
                    </button>
                  </div>
                ) : (
                  <div className="contractors-grid">
                    {projects.map((tender) => (
                      <div key={tender.id} className="tender-bids-section glass-card" style={{ marginBottom: 32 }}>
                        <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{tender.title || tender.contractor || 'Untitled Tender'}</h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: 12 }}>
                          <button
                            className="btn-primary"
                            onClick={() => fetchBidsForTender(tender.id)}
                            disabled={bidsLoadingMap[tender.id]}
                          >
                            {bidsLoadingMap[tender.id] ? 'Loading Bids...' : 'Show Contractor Bids'}
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '8px 12px' }}
                          >
                            🧪 Test Enhanced Display
                          </button>
                        </div>
                        {tenderBidsMap[tender.id] && tenderBidsMap[tender.id].length > 0 ? (
                          <div className="enhanced-bids-section">
                            {console.log('�� Rendering enhanced bids for tender:', tender.id, 'with', tenderBidsMap[tender.id].length, 'bids')}
                            <div className="bids-summary" style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                              <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>📊 AI-Extracted Bid Analysis</h4>
                              <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                                {tenderBidsMap[tender.id].length} bid{tenderBidsMap[tender.id].length > 1 ? 's' : ''} received • 
                                AI-powered analysis completed
                              </p>
                            </div>
                            
                            <table className="bids-table enhanced-bids-table" style={{ width: '100%', marginTop: 8 }}>
                              <thead>
                                <tr>
                                  <th>Contractor</th>
                                  <th>Bid Amount</th>
                                  <th>Duration</th>
                                  <th>Warranty</th>
                                  <th>Rating</th>
                                  <th>Success Rate</th>
                                  <th>Certification</th>
                                  <th>License</th>
                                  <th>Status</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tenderBidsMap[tender.id].map((bid) => (
                                  (() => { console.log("Bid row:", bid); return null; })(),
                                  <tr key={bid._id} className="bid-row">
                                    <td>
                                      <div className="contractor-info">
                                        <strong>{bid.contractor_name || bid.contractorName || bid.contractor || 'Unknown'}</strong>
                                        {bid.contract_name && (
                                          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                                            {bid.contract_name}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <span className="bid-amount">
                                        {bid.bidAmount ? `$${bid.bidAmount.toLocaleString()}` : 
                                         bid.bid_amount ? `$${bid.bid_amount.toLocaleString()}` : '-'}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="duration">
                                        {bid.projectDuration || bid.project_duration || '-'} days
                                      </span>
                                    </td>
                                    <td>
                                      <span className="warranty">
                                        {bid.warranty || bid.warranty_period || '-'} months
                                      </span>
                                    </td>
                                    <td>
                                      <div className="rating-display">
                                        {bid.clientRating || bid.client_rating ? (
                                          <>
                                            <span className="stars">
                                              {"★".repeat(Math.floor(bid.clientRating || bid.client_rating))}
                                              {"☆".repeat(5 - Math.floor(bid.clientRating || bid.client_rating))}
                                            </span>
                                            <span className="rating-number">({bid.clientRating || bid.client_rating})</span>
                                          </>
                                        ) : '-'}
                                      </div>
                                    </td>
                                    <td>
                                      <span className="success-rate">
                                        {bid.project_success_rate ? `${bid.project_success_rate}%` : 
                                         bid.successRate ? `${bid.successRate}%` : '-'}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="certification">
                                        {bid.safetyCertification || bid.safety_certification || '-'}
                                      </span>
                                    </td>
                                    <td>
                                      <span className="license">
                                        {bid.licenseCategory || bid.license_category || '-'}
                                      </span>
                                    </td>
                                    <td>
                                      <span className={`status-badge status-${bid.status?.toLowerCase().replace(' ', '-') || 'under-review'}`}>
                                        {bid.status || 'Under Review'}
                                      </span>
                                    </td>
                                    <td>
                                      <div className="bid-actions">
                                        <button
                                          className="btn-view-details"
                                          onClick={() => showBidDetails(bid, tender.id)}
                                          style={{
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            backgroundColor: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          View Details
                                        </button>
                                        {bid.documents && bid.documents.length > 0 && (
                                          <a 
                                            href={`http://localhost:5000/${bid.documents[0]}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{
                                              padding: '4px 8px',
                                              fontSize: '12px',
                                              backgroundColor: '#28a745',
                                              color: 'white',
                                              textDecoration: 'none',
                                              borderRadius: '4px',
                                              marginLeft: '4px'
                                            }}
                                          >
                                            PDF
                                          </a>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : bidsLoadingMap[tender.id] ? null : (
                          <div style={{ color: '#888', marginTop: 8 }}>No bids yet.</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedContractor && (
                  <div className="contractor-detail glass-card">
                    <div className="detail-header">
                      <h2>{selectedContractor.name}</h2>
                      <button className="btn-close" onClick={() => setSelectedContractor(null)}>
                        ×
                      </button>
                    </div>
                    <div className="detail-content">
                      <div className="detail-section">
                        <h3>Company Information</h3>
                        <div className="info-grid">
                          <div className="info-item">
                            <span>Rating</span>
                            <span>
                              {"★".repeat(Math.floor(selectedContractor.rating))}
                              {"☆".repeat(5 - Math.floor(selectedContractor.rating))}
                              ({selectedContractor.rating})
                            </span>
                          </div>
                          <div className="info-item">
                            <span>Experience</span>
                            <span>{selectedContractor.experience}</span>
                          </div>
                          <div className="info-item">
                            <span>Projects Completed</span>
                            <span>{selectedContractor.completedProjects}</span>
                          </div>
                          <div className="info-item">
                            <span>Specialization</span>
                            <span>{selectedContractor.specialization.join(", ")}</span>
                          </div>
                          <div className="info-item">
                            <span>Location</span>
                            <span>{selectedContractor.location}</span>
                          </div>
                          <div className="info-item">
                            <span>Price Range</span>
                            <span>{selectedContractor.priceRange}</span>
                          </div>
                          <div className="info-item">
                            <span>Contact</span>
                            <span>{selectedContractor.contact}</span>
                          </div>
                        </div>
                      </div>
                      <div className="detail-section">
                        <h3>Submitted Bids</h3>
                        <div className="bids-list">
                          {selectedContractor.bids.length > 0 ? (
                            selectedContractor.bids.map((bid) => (
                              <div key={bid.tenderId} className="bid-item glass-card">
                                <div className="bid-info">
                                  <h4>{bid.tenderTitle}</h4>
                                  <p>${bid.amount.toLocaleString()} • {bid.timeline}</p>
                                </div>
                                <div className="bid-actions">
                                  <button
                                    className="btn-accept"
                                    onClick={() => acceptBid(bid.tenderId, bid.tenderId)}
                                  >
                                    Accept Bid
                                  </button>
                                  <button
                                    className="btn-view"
                                    onClick={() => {
                                      const project = projects.find((p) => p.id === bid.tenderId);
                                      if (project) {
                                        setSelectedProject(project);
                                        setActiveTab("projects");
                                      }
                                    }}
                                  >
                                    View Tender
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p>No bids submitted by this contractor</p>
                          )}
                        </div>
                      </div>
                      <div className="detail-section">
                        <h3>Portfolio Projects</h3>
                        <div className="portfolio-grid">
                          <div className="portfolio-item">
                            <div className="portfolio-image"></div>
                            <h4>Modern Residence</h4>
                            <p>Completed 2024</p>
                          </div>
                          <div className="portfolio-item">
                            <div className="portfolio-image"></div>
                            <h4>Office Complex</h4>
                            <p>Completed 2023</p>
                          </div>
                          <div className="portfolio-item">
                            <div className="portfolio-image"></div>
                            <h4>Kitchen Renovation</h4>
                            <p>Completed 2023</p>
                          </div>
                        </div>
                      </div>
                      <div className="detail-section">
                        <h3>Client Reviews</h3>
                        <div className="reviews-list">
                          <div className="review-item">
                            <div className="review-header">
                              <span className="reviewer">John D.</span>
                              <span className="review-rating">★★★★★</span>
                            </div>
                            <p className="review-text">
                              "Excellent work and attention to detail. Completed our house construction on time and within budget."
                            </p>
                            <p className="review-date">March 2024</p>
                          </div>
                          <div className="review-item">
                            <div className="review-header">
                              <span className="reviewer">Sarah M.</span>
                              <span className="review-rating">★★★★☆</span>
                            </div>
                            <p className="review-text">
                              "Great communication throughout the project. Would hire again for future work."
                            </p>
                            <p className="review-date">January 2024</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="detail-actions">
                      <button className="btn-primary">Request Quote</button>
                      <button className="btn-secondary">Send Message</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "projects" && (
              <div className="projects-management">
                <div className="projects-header">
                  <div>
                    <h1>My Projects</h1>
                    <p>Manage all your construction projects in one place</p>
                  </div>
                  <div className="projects-actions">
                    <button className="btn-primary" onClick={() => setShowNewProjectForm(true)}>
                      + New Project
                    </button>
                    <div className="search-box glass-card">
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
                  </div>
                </div>
                <div className="projects-filters glass-card">
                  <div className="filter-group">
                    <label>Status:</label>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="Planning">Planning</option>
                      <option value="Pending Approval">Pending Approval</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Time Range:</label>
                    <select value={timeRangeFilter} onChange={(e) => setTimeRangeFilter(e.target.value)}>
                      <option value="all">All</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
                {loading ? (
                  <div className="loading-state glass-card">
                    <p>Loading projects...</p>
                  </div>
                ) : error ? (
                  <div className="error-state glass-card">
                    <p>{error}</p>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setLoading(true);
                        setError(null);
                        const fetchProjects = async () => {
                          try {
                            const config = {
                              headers: { Authorization: `Bearer ${userData?.token || ""}` },
                            };
                            const response = await axios.get(projectsApiBaseUrl, config);
                            
                            console.log('🔍 Raw API response (projects retry):', response.data);
                            
                            // Handle both array and object responses
                            let tenderData = response.data;
                            if (response.data.tenders) {
                              tenderData = response.data.tenders;
                            }
                            
                            const fetchedProjects = tenderData.map((project) => ({
                              id: project._id || project.id || Math.random().toString(36).substr(2, 9),
                              title: project.title || project.contractor || project.originalFilename || "Untitled Project",
                              budget: Number(project.budget || project.bidAmount || 0),
                              location: project.location || "N/A",
                              startDate: project.startDate || project.lastUpdated ? new Date(project.lastUpdated).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                              completionDate: project.completionDate || new Date().toISOString().split("T")[0],
                              status: project.status || "Planning",
                              contractor: project.contractor || null,
                              bids: project.bids || [],
                              documents: project.documents || [],
                              progress: Number(project.progress || 0),
                            }));
                            
                            console.log('🔍 Processed projects (projects retry):', fetchedProjects);
                            setProjects(fetchedProjects);
                          } catch (err) {
                            console.error("Failed to fetch projects:", err);
                            setError("Failed to load projects. Please try again later.");
                          } finally {
                            setLoading(false);
                          }
                        };
                        fetchProjects();
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="empty-state glass-card">
                    <p>No projects match your filters</p>
                    <button className="btn-primary" onClick={() => setShowNewProjectForm(true)}>
                      Create a New Project
                    </button>
                  </div>
                ) : (
                  <div className="projects-grid">
                    {filteredProjects.map((project) => (
                      <div
                        className="project-card glass-card"
                        key={project.id}
                        onClick={() => {
                          setSelectedProject(project);
                        }}
                      >
                        <div className="project-header">
                          <h3>{project.title}</h3>
                          <span className={`status-badge ${project.status.toLowerCase().replace(" ", "-")}`}>
                            {project.status}
                          </span>
                        </div>
                        <p className="project-budget">Budget: ${project.budget.toLocaleString()}</p>
                        <p className="project-location">
                          <LocationIcon />
                          {project.location}
                        </p>
                        <p className="project-dates">
                          <CalendarIcon />
                          {project.startDate} - {project.completionDate}
                        </p>
                        {project.status === "In Progress" && (
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${project.progress}%` }}>
                              <span>{project.progress}%</span>
                            </div>
                          </div>
                        )}
                        <div className="project-actions">
                          <button className="btn-view">View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedProject && (
                  <div className="project-detail glass-card">
                    <div className="detail-header">
                      <h2>{selectedProject.title}</h2>
                      <button className="btn-close" onClick={() => setSelectedProject(null)}>
                        ×
                      </button>
                    </div>
                    <div className="detail-content">
                      <div className="detail-section">
                        <h3>Project Information</h3>
                        <div className="info-grid">
                          <div className="info-item">
                            <span>Status</span>
                            <span>{selectedProject.status}</span>
                          </div>
                          <div className="info-item">
                            <span>Budget</span>
                            <span>${selectedProject.budget.toLocaleString()}</span>
                          </div>
                          <div className="info-item">
                            <span>Location</span>
                            <span>{selectedProject.location}</span>
                          </div>
                          <div className="info-item">
                            <span>Start Date</span>
                            <span>{selectedProject.startDate}</span>
                          </div>
                          <div className="info-item">
                            <span>Completion Date</span>
                            <span>{selectedProject.completionDate}</span>
                          </div>
                          <div className="info-item">
                            <span>Contractor</span>
                            <span>{selectedProject.contractor || "Not assigned"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="detail-section">
                        <h3>Bids</h3>
                        <div className="bids-list">
                          {selectedProject.bids.length > 0 ? (
                            selectedProject.bids.map((bid) => (
                              <div key={bid.id} className="bid-item glass-card">
                                <div className="bid-info">
                                  <h4>{bid.contractor}</h4>
                                  <p>${bid.amount.toLocaleString()} • {bid.timeline}</p>
                                </div>
                                <div className="bid-actions">
                                  <button
                                    className="btn-accept"
                                    onClick={() => acceptBid(selectedProject.id, bid.id)}
                                  >
                                    Accept Bid
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p>No bids received yet</p>
                          )}
                        </div>
                      </div>
                      <div className="detail-section">
                        <h3>Documents</h3>
                        <div className="documents-list">
                          {selectedProject.documents.length > 0 ? (
                            selectedProject.documents.map((doc, index) => (
                              <div key={index} className="document-item">
                                <span>{doc}</span>
                                <button
                                  className="btn-remove"
                                  onClick={() => removeProjectDocument(selectedProject.id, index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          ) : (
                            <p>No documents uploaded</p>
                          )}
                          <div className="document-upload">
                            <input
                              type="file"
                              multiple
                              onChange={(e) => uploadProjectDocument(selectedProject.id, e.target.files)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="detail-section">
                        <h3>Progress Updates</h3>
                        <div className="progress-update">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedProject.progress}
                            onChange={(e) => updateProjectProgress(selectedProject.id, Number(e.target.value))}
                          />
                          <span>{selectedProject.progress}% Complete</span>
                        </div>
                      </div>
                    </div>
                    <div className="detail-actions">
                      <button
                        className="btn-primary"
                        onClick={() => updateProjectStatus(selectedProject.id, "In Progress")}
                      >
                        Mark as In Progress
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => updateProjectStatus(selectedProject.id, "Completed")}
                      >
                        Mark as Completed
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "payments" && (
              <div className="payments-management">
                <div className="payments-header">
                  <h1>Payments</h1>
                  <p>Manage all your project payments</p>
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      setSelectedPayment({
                        id: Math.random().toString(36).substr(2, 9),
                        projectId: selectedProject?.id || null,
                        amount: selectedProject?.budget || 0,
                        date: new Date().toISOString().split('T')[0],
                        status: "Pending",
                        method: "Card",
                        invoice: `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`
                      });
                      setShowPaymentModal(true);
                    }}
                  >
                    + New Payment
                  </button>
                </div>
                
                <div className="payments-list">
                  {payments.map((payment) => (
                    <div key={payment.id} className="payment-card glass-card">
                      <div className="payment-info">
                        <h3>Invoice #{payment.invoice}</h3>
                        <p>Project ID: {payment.projectId}</p>
                        <p>Amount: ${payment.amount.toLocaleString()}</p>
                        <p>Date: {payment.date}</p>
                        <p>Status: 
                          <span className={`status-badge ${payment.status.toLowerCase()}`}>
                            {payment.status}
                          </span>
                        </p>
                        <p>Method: {payment.method}</p>
                      </div>
                      <div className="payment-actions">
                        <button className="btn-view">View Invoice</button>
                        {payment.status === "Pending" && (
                          <button 
                            className="btn-primary" 
                            onClick={() => handlePaymentInitiation(payment)}
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="documents-management">
                <h1>Documents</h1>
                <div className="documents-list">
                  {/* Project Documents */}
                  {projects
                    .filter((project) => project.documents && project.documents.length > 0)
                    .map((project) => (
                      <div key={project.id} className="project-documents glass-card">
                        <h3>📁 {project.title} - Project Documents</h3>
                        {project.documents.map((doc, index) => (
                          <div key={index} className="document-item">
                            <span>📄 {doc}</span>
                            <div className="document-actions">
                              <a 
                                href={`http://localhost:5000/${doc}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn-view"
                              >
                                View
                              </a>
                              <button
                                className="btn-remove"
                                onClick={() => removeProjectDocument(project.id, index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}

                  {/* Contractor Bid Documents */}
                  {projects
                    .filter((project) => project.bids && project.bids.length > 0)
                    .map((project) => {
                      const bidsWithDocuments = project.bids.filter(bid => 
                        bid.documents && Array.isArray(bid.documents) && bid.documents.length > 0
                      );
                      
                      if (bidsWithDocuments.length === 0) return null;
                      
                      return (
                        <div key={`${project.id}-bids`} className="bid-documents glass-card">
                          <h3>📋 {project.title} - Contractor Bid Documents</h3>
                          {bidsWithDocuments.map((bid, bidIndex) => (
                            <div key={bidIndex} className="bid-document-section">
                              <h4>💼 {bid.contractor || bid.contractor_name || bid.contractorName || 'Unknown Contractor'}</h4>
                              <p className="bid-info">
                                <span>Amount: ${bid.amount?.toLocaleString() || 'N/A'}</span>
                                <span>Status: {bid.status || 'Under Review'}</span>
                              </p>
                              {bid.documents.map((doc, docIndex) => (
                                <div key={docIndex} className="document-item">
                                  <span>📄 {doc}</span>
                                  <div className="document-actions">
                                    <a 
                                      href={`http://localhost:5000/${doc}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="btn-view"
                                    >
                                      View
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      );
                    })}

                  {/* Empty State */}
                  {projects.every((project) => 
                    (!project.documents || project.documents.length === 0) && 
                    (!project.bids || project.bids.every(bid => !bid.documents || bid.documents.length === 0))
                  ) && (
                    <div className="empty-state glass-card">
                      <p>No documents found</p>
                      <p>Documents will appear here when contractors upload files with their bids or when you add project documents.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="settings-management">
                <h1>Settings</h1>
                <div className="settings-form glass-card">
                  <h3>Account Settings</h3>
                  
                  {settingsSaved && (
                    <div className="success-message" style={{ 
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: 'white',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      textAlign: 'center'
                    }}>
                      ✅ Settings saved successfully!
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      name="fullName"
                      value={settingsForm.fullName} 
                      onChange={handleSettingsChange}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Email</label>
                    <input 
                      type="email" 
                      name="email"
                      value={settingsForm.email} 
                      onChange={handleSettingsChange}
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="tel" 
                      name="phoneNumber"
                      value={settingsForm.phoneNumber} 
                      onChange={handleSettingsChange}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Address</label>
                    <textarea 
                      name="address"
                      value={settingsForm.address} 
                      onChange={handleSettingsChange}
                      placeholder="Enter your address"
                      rows="3"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Notification Preferences</label>
                    <div className="checkbox-group">
                      <label className="checkbox-item">
                        <input 
                          type="checkbox" 
                          name="emailNotifications"
                          checked={settingsForm.emailNotifications}
                          onChange={handleSettingsChange}
                        />
                        <span>Email Notifications</span>
                      </label>
                      <label className="checkbox-item">
                        <input 
                          type="checkbox" 
                          name="smsNotifications"
                          checked={settingsForm.smsNotifications}
                          onChange={handleSettingsChange}
                        />
                        <span>SMS Notifications</span>
                      </label>
                      <label className="checkbox-item">
                        <input 
                          type="checkbox" 
                          name="pushNotifications"
                          checked={settingsForm.pushNotifications}
                          onChange={handleSettingsChange}
                        />
                        <span>Push Notifications</span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      className="btn-primary" 
                      onClick={saveSettings}
                      disabled={settingsLoading}
                    >
                      {settingsLoading ? (
                        <>
                          <span className="spinner"></span>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showNewProjectForm && (
              <div className="modal-overlay">
                <div className="modal-content glass-card">
                  <div className="modal-header">
                    <h2>Create New Project</h2>
                    <button className="btn-close" onClick={() => setShowNewProjectForm(false)}>
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Title</label>
                      <input
                        type="text"
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Budget ($)</label>
                      <input
                        type="number"
                        value={newProject.budget}
                        onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input
                        type="text"
                        value={newProject.location}
                        onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={newProject.startDate}
                        onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Completion Date</label>
                      <input
                        type="date"
                        value={newProject.completionDate}
                        onChange={(e) => setNewProject({ ...newProject, completionDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-primary" onClick={handleCreateProject}>
                      Create Project
                    </button>
                    <button className="btn-secondary" onClick={() => setShowNewProjectForm(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showPaymentModal && stripePromise && (
              <div className="modal-overlay">
                <div className="modal-content glass-card">
                  <Elements stripe={stripePromise}>
                    <StripePaymentForm
                      amount={selectedPayment?.amount || 0}
                      projectId={selectedPayment?.projectId || null}
                      onSuccess={handlePaymentSuccess}
                      onClose={() => setShowPaymentModal(false)}
                    />
                  </Elements>
                </div>
              </div>
            )}

            {/* Bid Details Modal */}
            {showBidDetailsModal && selectedBidDetails && (
              <div className="modal-overlay">
                <div className="modal-content glass-card" style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
                  <div className="modal-header">
                    <h2>📊 AI-Extracted Bid Details</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`status-badge status-${selectedBidDetails?.status?.toLowerCase().replace(' ', '-') || 'under-review'}`}>
                        {selectedBidDetails?.status || 'Under Review'}
                      </span>
                      <button className="btn-close" onClick={() => setShowBidDetailsModal(false)}>
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="modal-body">
                    <div className="bid-details-container">
                      {/* Contractor Information */}
                      <div className="detail-section">
                        <h3>👤 Contractor Information</h3>
                        <div className="info-grid">
                          <div className="info-item">
                            <span>Contractor Name:</span>
                            <span>{selectedBidDetails.contractor || selectedBidDetails.contractor_name || 'Unknown'}</span>
                          </div>
                          {selectedBidDetails.contract_name && (
                            <div className="info-item">
                              <span>Contract Name:</span>
                              <span>{selectedBidDetails.contract_name}</span>
                            </div>
                          )}
                          <div className="info-item">
                            <span>Client Rating:</span>
                            <span>
                              {selectedBidDetails.clientRating || selectedBidDetails.client_rating ? (
                                <>
                                  {"★".repeat(Math.floor(selectedBidDetails.clientRating || selectedBidDetails.client_rating))}
                                  {"☆".repeat(5 - Math.floor(selectedBidDetails.clientRating || selectedBidDetails.client_rating))}
                                  ({selectedBidDetails.clientRating || selectedBidDetails.client_rating})
                                </>
                              ) : 'N/A'}
                            </span>
                          </div>
                          <div className="info-item">
                            <span>Project Success Rate:</span>
                            <span>
                              {selectedBidDetails.project_success_rate ? `${selectedBidDetails.project_success_rate}%` : 
                               selectedBidDetails.successRate ? `${selectedBidDetails.successRate}%` : 'N/A'}
                            </span>
                          </div>
                          <div className="info-item">
                            <span>Rejection History:</span>
                            <span>
                              {selectedBidDetails.rejection_history || selectedBidDetails.rejectionHistory || 0} projects
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bid Financial Details */}
                      <div className="detail-section">
                        <h3>💰 Financial Details</h3>
                        <div className="info-grid">
                          <div className="info-item">
                            <span>Bid Amount:</span>
                            <span className="bid-amount-large">
                              ${(selectedBidDetails.bidAmount || selectedBidDetails.bid_amount || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="info-item">
                            <span>Project Duration:</span>
                            <span>
                              {selectedBidDetails.projectDuration || selectedBidDetails.project_duration || 'N/A'} days
                            </span>
                          </div>
                          <div className="info-item">
                            <span>Warranty Period:</span>
                            <span>
                              {selectedBidDetails.warranty || selectedBidDetails.warranty_period || 'N/A'} months
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Certifications & Licenses */}
                      <div className="detail-section">
                        <h3>🏆 Certifications & Licenses</h3>
                        <div className="info-grid">
                          <div className="info-item">
                            <span>Safety Certification:</span>
                            <span className={selectedBidDetails.safetyCertification || selectedBidDetails.safety_certification ? 'certified' : 'not-certified'}>
                              {selectedBidDetails.safetyCertification || selectedBidDetails.safety_certification || 'Not Certified'}
                            </span>
                          </div>
                          <div className="info-item">
                            <span>License Category:</span>
                            <span>{selectedBidDetails.licenseCategory || selectedBidDetails.license_category || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Additional Information */}
                      {selectedBidDetails.notes && (
                        <div className="detail-section">
                          <h3>📝 Additional Notes</h3>
                          <div className="notes-container">
                            <p>{selectedBidDetails.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Documents */}
                      {selectedBidDetails.documents && selectedBidDetails.documents.length > 0 && (
                        <div className="detail-section">
                          <h3>📄 Documents</h3>
                          <div className="documents-list">
                            {selectedBidDetails.documents.map((doc, index) => (
                              <a 
                                key={index}
                                href={`http://localhost:5000/${doc}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="document-link"
                              >
                                📎 View Document {index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-actions">
                    {selectedBidDetails?.status === 'Under Review' && (
                      <>
                        <button 
                          className="btn-accept" 
                          onClick={() => {
                            if (selectedBidDetails._id && selectedBidDetails.projectId) {
                              acceptBid(selectedBidDetails._id, selectedBidDetails.projectId);
                            } else if (selectedBidDetails._id) {
                              // Fallback: try to find project by searching through all projects
                              const projectId = projects.find(p => 
                                p.bids && p.bids.some(b => b._id === selectedBidDetails._id || b.id === selectedBidDetails._id)
                              )?.id;
                              
                              if (projectId) {
                                acceptBid(selectedBidDetails._id, projectId);
                              } else {
                                alert('❌ Could not find project for this bid. Please try again.');
                              }
                            } else {
                              alert('❌ Could not find project for this bid. Please try again.');
                            }
                          }}
                          disabled={bidActionLoading}
                          style={{
                            backgroundColor: bidActionLoading ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '5px',
                            cursor: bidActionLoading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {bidActionLoading ? '⏳ Processing...' : '✅ Accept Bid'}
                        </button>
                        <button 
                          className="btn-reject" 
                          onClick={() => {
                            if (selectedBidDetails._id && selectedBidDetails.projectId) {
                              rejectBid(selectedBidDetails._id, selectedBidDetails.projectId);
                            } else if (selectedBidDetails._id) {
                              // Fallback: try to find project by searching through all projects
                              const projectId = projects.find(p => 
                                p.bids && p.bids.some(b => b._id === selectedBidDetails._id || b.id === selectedBidDetails._id)
                              )?.id;
                              
                              if (projectId) {
                                rejectBid(selectedBidDetails._id, projectId);
                              } else {
                                alert('❌ Could not find project for this bid. Please try again.');
                              }
                            } else {
                              alert('❌ Could not find project for this bid. Please try again.');
                            }
                          }}
                          disabled={bidActionLoading}
                          style={{
                            backgroundColor: bidActionLoading ? '#6c757d' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '5px',
                            cursor: bidActionLoading ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {bidActionLoading ? '⏳ Processing...' : '❌ Reject Bid'}
                        </button>
                      </>
                    )}
                    <button 
                      className="btn-secondary" 
                      onClick={() => setShowBidDetailsModal(false)}
                      style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
    </>
  );
};

export default HomeownerDashboard;