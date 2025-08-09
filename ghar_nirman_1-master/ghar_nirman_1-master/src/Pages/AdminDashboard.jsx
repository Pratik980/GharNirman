import React, { useState, useEffect } from 'react';
import { 
  FiHome, FiUsers, FiClipboard, FiAlertTriangle, 
  FiBarChart2, FiSettings, FiLogOut, FiChevronDown,
  FiUser, FiBriefcase, FiDollarSign, FiShield, FiTrash2,
  FiEdit, FiFlag, FiCheck, FiX, FiActivity, FiEye
} from 'react-icons/fi';
import { FaBell } from "react-icons/fa";
import './AdminDashboard.css';
import axios from 'axios';
import { subscribeToNotifications, subscribeToPrivateNotifications, EVENTS, CHANNELS } from "../config/pusher";

const AdminDashboard = () => {
  // State Management
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedSection, setExpandedSection] = useState(null);
  const [users, setUsers] = useState([]);
  const [bids, setBids] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState([]);
  
  // Bid Management States
  const [bidsLoading, setBidsLoading] = useState(false);
  const [bidStatusFilter, setBidStatusFilter] = useState('all');
  const [bidSearchTerm, setBidSearchTerm] = useState('');
  const [selectedBid, setSelectedBid] = useState(null);
  const [showBidDetails, setShowBidDetails] = useState(false);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Mock Data Initialization
  useEffect(() => {
    // Simulate API fetch
    const mockUsers = [
      { id: 1, name: 'John Contractor', email: 'john@example.com', role: 'contractor', status: 'verified', joinDate: '2023-05-15' },
      { id: 2, name: 'Jane Homeowner', email: 'jane@example.com', role: 'homeowner', status: 'pending', joinDate: '2023-06-20' },
      { id: 3, name: 'Bob Builder', email: 'bob@example.com', role: 'contractor', status: 'verified', joinDate: '2023-04-10' }
    ];

    const mockAlerts = [
      { id: 201, type: 'Bid Rigging', contractor: 'XYZ Builders', severity: 'high', date: '2023-07-06' },
      { id: 202, type: 'Fake Account', user: 'fake@example.com', severity: 'medium', date: '2023-07-04' }
    ];

    setUsers(mockUsers);
    setFraudAlerts(mockAlerts);
    fetchContractors();
    fetchBids();
  }, []);

  // Setup Pusher notifications for admins
  useEffect(() => {
    console.log("Setting up Pusher notifications for admin");

    // Subscribe to general admin notifications
    const unsubscribeGeneral = subscribeToNotifications(
      CHANNELS.ADMINS, 
      EVENTS.CONTRACTOR_APPROVAL_REQUEST, 
      (data) => {
        setNotifications(prev => [
          ...prev,
          { ...data, timestamp: new Date().toISOString() }
        ]);
      }
    );

    // Subscribe to contractor approval notifications
    const unsubscribeApprovals = subscribeToNotifications(
      CHANNELS.CONTRACTOR_APPROVALS, 
      EVENTS.CONTRACTOR_APPROVAL_REQUEST, 
      (data) => {
        setNotifications(prev => [
          ...prev,
          { ...data, timestamp: new Date().toISOString() }
        ]);
      }
    );

    return () => {
      unsubscribeGeneral();
      unsubscribeApprovals();
    };
  }, []);

  const fetchBids = async () => {
    setBidsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/bids');
      console.log('Fetched bids:', response.data);
      setBids(response.data.bids || []);
    } catch (error) {
      console.error('Failed to fetch bids:', error);
      // Fallback to mock data if API fails
      setBids([
        { 
          _id: 'bid1', 
          tenderTitle: 'House Construction', 
          contractor_name: 'John Contractor', 
          bidAmount: 50000, 
          status: 'Under Review', 
          submissionDate: '2023-07-01',
          projectDuration: 90,
          warranty: 12,
          clientRating: 4.5,
          successRate: 85
        },
        { 
          _id: 'bid2', 
          tenderTitle: 'Road Repair', 
          contractor_name: 'ABC Builders', 
          bidAmount: 120000, 
          status: 'Accepted', 
          submissionDate: '2023-07-05',
          projectDuration: 120,
          warranty: 24,
          clientRating: 4.2,
          successRate: 78
        },
        { 
          _id: 'bid3', 
          tenderTitle: 'Office Renovation', 
          contractor_name: 'Bob Builder', 
          bidAmount: 75000, 
          status: 'Rejected', 
          submissionDate: '2023-07-03',
          projectDuration: 60,
          warranty: 18,
          clientRating: 3.8,
          successRate: 72
        }
      ]);
    } finally {
      setBidsLoading(false);
    }
  };

  const fetchContractors = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:5000/api/contractors");
      console.log("Fetched contractors:", res.data);
      setContractors(res.data.contractors || []);
      
      // Debug: Check documents for each contractor
      if (res.data.contractors) {
        res.data.contractors.forEach((contractor, index) => {
          console.log(`Contractor ${index + 1} (${contractor.fullName}) documents:`, contractor.documents);
        });
      }
    } catch (err) {
      console.error("Failed to fetch contractors:", err);
      // Fallback to mock data if API fails
      setContractors([
        {
          _id: "mock1",
          fullName: "John Contractor",
          email: "john@example.com",
          companyName: "ABC Construction",
          phoneNumber: "+1234567890",
          yearsOfExperience: 5,
          status: "pending",
          createdAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const updateBidStatus = async (bidId, newStatus) => {
    try {
      const response = await axios.put(`http://localhost:5000/api/bids/${bidId}/status`, {
        status: newStatus
      });
      
      if (response.data.success) {
        alert(`Bid status updated to ${newStatus} successfully!`);
        fetchBids(); // Refresh the bids list
      } else {
        alert(`Failed to update bid status: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Failed to update bid status:', error);
      alert(`Failed to update bid status: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteBid = async (bidId) => {
    if (window.confirm("Are you sure you want to delete this bid?")) {
      try {
        const response = await axios.delete(`http://localhost:5000/api/bids/${bidId}`);
        
        if (response.data.success) {
          alert("Bid deleted successfully!");
          fetchBids(); // Refresh the bids list
        } else {
          alert(`Failed to delete bid: ${response.data.message}`);
        }
      } catch (error) {
        console.error('Failed to delete bid:', error);
        alert(`Failed to delete bid: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const viewBidDetails = (bid) => {
    setSelectedBid(bid);
    setShowBidDetails(true);
  };

  const verifyContractor = async (contractorId, status) => {
    try {
      const verificationNotes = status === 'verified' 
        ? 'Approved by admin after review' 
        : 'Rejected by admin - please contact support for more information';
      
      const response = await axios.put(`http://localhost:5000/api/contractors/${contractorId}/verify`, {
        status,
        verificationNotes,
        verifiedBy: 'admin'
      });
      
      if (response.data.success) {
        alert(`Contractor ${status} successfully! ${status === 'verified' ? 'They can now login to the platform.' : 'They will not be able to login.'}`);
        fetchContractors(); // Refresh the list
      } else {
        alert(`Failed to ${status} contractor: ${response.data.message}`);
      }
    } catch (err) {
      console.error("Failed to verify contractor:", err);
      alert(`Failed to ${status} contractor: ${err.response?.data?.message || err.message}`);
    }
  };

  const deleteContractor = async (contractorId) => {
    if (window.confirm("Are you sure you want to delete this contractor?")) {
      try {
        await axios.delete(`http://localhost:5000/api/contractors/${contractorId}`);
        alert("Contractor deleted successfully!");
        fetchContractors(); // Refresh the list
      } catch (err) {
        console.error("Failed to delete contractor:", err);
        alert("Failed to delete contractor");
      }
    }
  };

  const verifyDocuments = async (contractorId, documentType, status) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/contractors/${contractorId}/verify-documents`,
        { documentType, status },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('adminToken') && { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` })
          }
        }
      );

      if (response.data.success) {
        alert(`Document ${status} successfully!`);
        fetchContractors(); // Refresh list
      } else {
        alert(`Verification failed: ${response.data.error}`);
      }
    } catch (err) {
      console.error("Document verification failed:", err);
      let errorMessage = "Document verification failed";
      if (err.response) {
        errorMessage = err.response.data.error || err.response.data.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = "No response from server";
      }
      alert(errorMessage);
    }
  };

  // Helper Functions
  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Core Functionalities
  const deleteUser = (userId) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const toggleUserStatus = (userId) => {
    setUsers(users.map(user => 
      user.id === userId ? { 
        ...user, 
        status: user.status === 'verified' ? 'pending' : 'verified' 
      } : user
    ));
  };

  const resolveAlert = (alertId) => {
    setFraudAlerts(fraudAlerts.filter(alert => alert.id !== alertId));
  };

  // Filtered Data
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredBids = bids.filter(bid => {
    const matchesSearch = 
      bid.tenderTitle?.toLowerCase().includes(bidSearchTerm.toLowerCase()) ||
      bid.contractor_name?.toLowerCase().includes(bidSearchTerm.toLowerCase()) ||
      bid._id?.toLowerCase().includes(bidSearchTerm.toLowerCase());
    
    const matchesStatus = bidStatusFilter === 'all' || bid.status === bidStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const flaggedBids = bids.filter(bid => bid.status === 'Rejected');
  const activeBids = bids.filter(bid => bid.status === 'Under Review');
  const acceptedBids = bids.filter(bid => bid.status === 'Accepted');

  // Components
  const DashboardOverview = () => (
    <div className="dashboard-overview">
      <div className="stats-grid">
        <StatCard 
          icon={<FiUsers />} 
          title="Total Users" 
          value={users.length} 
          change="+12%"
        />
        <StatCard 
          icon={<FiBriefcase />} 
          title="Active Bids" 
          value={activeBids.length} 
          change="+5%"
        />
        <StatCard 
          icon={<FiAlertTriangle />} 
          title="Rejected Bids" 
          value={flaggedBids.length} 
          change="+2"
          warning
        />
        <StatCard 
          icon={<FiActivity />} 
          title="Accepted Bids" 
          value={acceptedBids.length} 
          change="+1.2%"
        />
      </div>

      <div className="recent-activity">
        <h3>Recent Bids</h3>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Bid ID</th>
                <th>Project</th>
                <th>Contractor</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bids.slice(0, 5).map(bid => (
                <tr key={bid._id}>
                  <td>#{bid._id.slice(-6)}</td>
                  <td>{bid.tenderTitle}</td>
                  <td>{bid.contractor_name || 'Unknown'}</td>
                  <td>{formatCurrency(bid.bidAmount)}</td>
                  <td>{formatDate(bid.submissionDate)}</td>
                  <td>
                    <span className={`status-badge ${bid.status?.toLowerCase().replace(' ', '-')}`}>
                      {bid.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="action-btn primary"
                      onClick={() => viewBidDetails(bid)}
                    >
                      <FiEye /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const UserManagement = () => {
    const pendingCount = contractors.filter(c => c.status === 'pending').length;
    const verifiedCount = contractors.filter(c => c.status === 'verified').length;
    const rejectedCount = contractors.filter(c => c.status === 'rejected').length;
    
    return (
    <div className="user-management">
      <div className="header-actions">
        <h2>Contractor Management</h2>
        <div className="contractor-stats">
          <span className="stat-item pending">Pending: {pendingCount}</span>
          <span className="stat-item verified">Verified: {verifiedCount}</span>
          <span className="stat-item rejected">Rejected: {rejectedCount}</span>
        </div>
        <div className="search-filter">
          <input 
            type="text" 
            placeholder="Search contractors..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">Loading contractors...</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Company</th>
                <th>Documents</th>
                <th>Phone</th>
                <th>Experience</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th>Actions</th>
              </tr>
            </thead>
                              <tbody>
                    {contractors
                      .filter(contractor => {
                        const matchesSearch = 
                          contractor.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contractor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          contractor.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
                        
                        const matchesStatus = statusFilter === 'all' || contractor.status === statusFilter;
                        
                        return matchesSearch && matchesStatus;
                      })
                      .map(contractor => (
                      <tr key={contractor._id}>
                        <td>#{contractor._id.slice(-6)}</td>
                        <td>
                          <div className="user-info">
                            <FiUser className="user-icon" />
                            <div>
                              <div className="user-name">{contractor.fullName}</div>
                              <div className="user-email">{contractor.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>{contractor.email}</td>
                        <td>
                          <div className="company-info">
                            <div className="company-name">{contractor.companyName}</div>
                            <div className="company-reg">{contractor.companyRegistrationNumber}</div>
                          </div>
                        </td>
                        <td>
                          <div className="documents-info">
                            {contractor.documents?.licenseFile && (
                              <div className="document-item">
                                <span className="document-label">License:</span>
                                <a href={`http://localhost:5000/${contractor.documents.licenseFile.filePath}`} target="_blank" rel="noopener noreferrer" className="document-link">View</a>
                                <div className="verification-buttons">
                                  <button
                                    onClick={() => verifyDocuments(contractor._id, 'licenseFile', 'verified')}
                                    disabled={contractor.documents.licenseFile.status === 'verified'}
                                  >
                                    <FiCheck /> Approve
                                  </button>
                                  <button
                                    onClick={() => verifyDocuments(contractor._id, 'licenseFile', 'rejected')}
                                    disabled={contractor.documents.licenseFile.status === 'rejected'}
                                  >
                                    <FiX /> Reject
                                  </button>
                                </div>
                                <span className={`doc-status ${contractor.documents.licenseFile.status}`}>
                                  {contractor.documents.licenseFile.status}
                                </span>
                              </div>
                            )}
                            {contractor.documents?.registrationCertificate && (
                              <div className="document-item">
                                <span className="document-label">Registration:</span>
                                <a href={`http://localhost:5000/${contractor.documents.registrationCertificate.filePath}`} target="_blank" rel="noopener noreferrer" className="document-link">View</a>
                                <div className="verification-buttons">
                                  <button
                                    onClick={() => verifyDocuments(contractor._id, 'registrationCertificate', 'verified')}
                                    disabled={contractor.documents.registrationCertificate.status === 'verified'}
                                  >
                                    <FiCheck /> Approve
                                  </button>
                                  <button
                                    onClick={() => verifyDocuments(contractor._id, 'registrationCertificate', 'rejected')}
                                    disabled={contractor.documents.registrationCertificate.status === 'rejected'}
                                  >
                                    <FiX /> Reject
                                  </button>
                                </div>
                                <span className={`doc-status ${contractor.documents.registrationCertificate.status}`}>
                                  {contractor.documents.registrationCertificate.status}
                                </span>
                              </div>
                            )}
                            {contractor.documents?.insuranceDocument && (
                              <div className="document-item">
                                <span className="document-label">Insurance:</span>
                                <a href={`http://localhost:5000/${contractor.documents.insuranceDocument.filePath}`} target="_blank" rel="noopener noreferrer" className="document-link">View</a>
                                <div className="verification-buttons">
                                  <button
                                    onClick={() => verifyDocuments(contractor._id, 'insuranceDocument', 'verified')}
                                    disabled={contractor.documents.insuranceDocument.status === 'rejected'}
                                  >
                                    <FiCheck /> Approve
                                  </button>
                                  <button
                                    onClick={() => verifyDocuments(contractor._id, 'insuranceDocument', 'rejected')}
                                    disabled={contractor.documents.insuranceDocument.status === 'rejected'}
                                  >
                                    <FiX /> Reject
                                  </button>
                                </div>
                                <span className={`doc-status ${contractor.documents.insuranceDocument.status}`}>
                                  {contractor.documents.insuranceDocument.status}
                                </span>
                              </div>
                            )}
                            {(!contractor.documents?.licenseFile && !contractor.documents?.registrationCertificate && !contractor.documents?.insuranceDocument) && (
                              <div className="document-item">
                                <span className="no-documents">No documents uploaded</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{contractor.phoneNumber}</td>
                        <td>{contractor.yearsOfExperience} years</td>
                        <td>
                          <span className={`status-badge ${contractor.status}`}>
                            {contractor.status}
                          </span>
                          {contractor.verifiedAt && (
                            <div className="verification-date">
                              {new Date(contractor.verifiedAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td>{new Date(contractor.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            {contractor.status === 'pending' && (
                              <>
                                <button 
                                  className="action-btn primary"
                                  onClick={() => verifyContractor(contractor._id, 'verified')}
                                >
                                  <FiCheck /> Verify
                                </button>
                                <button 
                                  className="action-btn warning"
                                  onClick={() => verifyContractor(contractor._id, 'rejected')}
                                >
                                  <FiX /> Reject
                                </button>
                              </>
                            )}
                            {contractor.status === 'verified' && (
                              <div className="verified-info">
                                <FiCheck className="verified-icon" />
                                <span>Verified</span>
                              </div>
                            )}
                            {contractor.status === 'rejected' && (
                              <div className="rejected-info">
                                <FiX className="rejected-icon" />
                                <span>Rejected</span>
                              </div>
                            )}
                            <button 
                              className="action-btn danger"
                              onClick={() => deleteContractor(contractor._id)}
                            >
                              <FiTrash2 /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
          </table>
          
          {contractors.length === 0 && (
            <div className="no-data">
              <p>No contractors found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
  };

  const BidMonitoring = () => (
    <div className="bid-monitoring">
      <div className="header-actions">
        <h2>Bid Management</h2>
        <div className="bid-stats">
          <span className="stat-item">Total: {bids.length}</span>
          <span className="stat-item active">Active: {activeBids.length}</span>
          <span className="stat-item accepted">Accepted: {acceptedBids.length}</span>
          <span className="stat-item rejected">Rejected: {flaggedBids.length}</span>
        </div>
        <div className="search-filter">
          <input 
            type="text" 
            placeholder="Search bids..." 
            value={bidSearchTerm}
            onChange={(e) => setBidSearchTerm(e.target.value)}
          />
          <select 
            value={bidStatusFilter}
            onChange={(e) => setBidStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="Under Review">Under Review</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {bidsLoading ? (
        <div className="loading">Loading bids...</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Bid ID</th>
                <th>Project</th>
                <th>Contractor</th>
                <th>Amount</th>
                <th>Duration</th>
                <th>Rating</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBids.map(bid => (
                <tr key={bid._id}>
                  <td>#{bid._id.slice(-6)}</td>
                  <td>{bid.tenderTitle}</td>
                  <td>{bid.contractor_name || 'Unknown'}</td>
                  <td>{formatCurrency(bid.bidAmount)}</td>
                  <td>{bid.projectDuration || '-'} days</td>
                  <td>
                    <div className="rating-display">
                      {bid.clientRating ? (
                        <>
                          <span className="stars">
                            {"★".repeat(Math.floor(bid.clientRating))}
                            {"☆".repeat(5 - Math.floor(bid.clientRating))}
                          </span>
                          <span className="rating-number">({bid.clientRating})</span>
                        </>
                      ) : '-'}
                    </div>
                  </td>
                  <td>{formatDate(bid.submissionDate)}</td>
                  <td>
                    <span className={`status-badge ${bid.status?.toLowerCase().replace(' ', '-')}`}>
                      {bid.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="action-btn primary"
                        onClick={() => viewBidDetails(bid)}
                      >
                        <FiEye /> View
                      </button>
                      {bid.status === 'Under Review' && (
                        <>
                          <button 
                            className="action-btn success"
                            onClick={() => updateBidStatus(bid._id, 'Accepted')}
                          >
                            <FiCheck /> Accept
                          </button>
                          <button 
                            className="action-btn warning"
                            onClick={() => updateBidStatus(bid._id, 'Rejected')}
                          >
                            <FiX /> Reject
                          </button>
                        </>
                      )}
                      <button 
                        className="action-btn danger"
                        onClick={() => deleteBid(bid._id)}
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredBids.length === 0 && (
            <div className="no-data">
              <p>No bids found</p>
            </div>
          )}
        </div>
      )}

      {/* Bid Details Modal */}
      {showBidDetails && selectedBid && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Bid Details</h3>
              <button 
                className="modal-close"
                onClick={() => setShowBidDetails(false)}
              >
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="bid-details-grid">
                <div className="detail-item">
                  <label>Bid ID:</label>
                  <span>#{selectedBid._id.slice(-6)}</span>
                </div>
                <div className="detail-item">
                  <label>Project:</label>
                  <span>{selectedBid.tenderTitle}</span>
                </div>
                <div className="detail-item">
                  <label>Contractor:</label>
                  <span>{selectedBid.contractor_name || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                  <label>Bid Amount:</label>
                  <span>{formatCurrency(selectedBid.bidAmount)}</span>
                </div>
                <div className="detail-item">
                  <label>Project Duration:</label>
                  <span>{selectedBid.projectDuration || '-'} days</span>
                </div>
                <div className="detail-item">
                  <label>Warranty Period:</label>
                  <span>{selectedBid.warranty || '-'} months</span>
                </div>
                <div className="detail-item">
                  <label>Client Rating:</label>
                  <span>
                    {selectedBid.clientRating ? (
                      <>
                        {"★".repeat(Math.floor(selectedBid.clientRating))}
                        {"☆".repeat(5 - Math.floor(selectedBid.clientRating))}
                        ({selectedBid.clientRating})
                      </>
                    ) : 'N/A'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Success Rate:</label>
                  <span>{selectedBid.successRate || '-'}%</span>
                </div>
                <div className="detail-item">
                  <label>Safety Certification:</label>
                  <span>{selectedBid.safetyCertification || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>License Category:</label>
                  <span>{selectedBid.licenseCategory || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`status-badge ${selectedBid.status?.toLowerCase().replace(' ', '-')}`}>
                    {selectedBid.status}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Submission Date:</label>
                  <span>{formatDate(selectedBid.submissionDate)}</span>
                </div>
                {selectedBid.notes && (
                  <div className="detail-item full-width">
                    <label>Notes:</label>
                    <span>{selectedBid.notes}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {selectedBid.status === 'Under Review' && (
                <>
                  <button 
                    className="action-btn success"
                    onClick={() => {
                      updateBidStatus(selectedBid._id, 'Accepted');
                      setShowBidDetails(false);
                    }}
                  >
                    <FiCheck /> Accept Bid
                  </button>
                  <button 
                    className="action-btn warning"
                    onClick={() => {
                      updateBidStatus(selectedBid._id, 'Rejected');
                      setShowBidDetails(false);
                    }}
                  >
                    <FiX /> Reject Bid
                  </button>
                </>
              )}
              <button 
                className="action-btn secondary"
                onClick={() => setShowBidDetails(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const FraudDetection = () => (
    <div className="fraud-detection">
      <h2>Fraud Detection Alerts</h2>
      <div className="alerts-grid">
        {fraudAlerts.map(alert => (
          <div key={alert.id} className={`alert-card ${alert.severity}`}>
            <div className="alert-header">
              <FiAlertTriangle className="alert-icon" />
              <div>
                <h3>{alert.type}</h3>
                <p>{alert.contractor || alert.user}</p>
              </div>
              <span className="alert-date">{alert.date}</span>
            </div>
            <div className="alert-actions">
              <button className="action-btn danger" onClick={() => resolveAlert(alert.id)}>
                <FiX /> Dismiss
              </button>
              <button className="action-btn primary">
                <FiEdit /> Investigate
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const SystemSettings = () => (
    <div className="system-settings">
      <h2>System Configuration</h2>
      <div className="settings-cards">
        <div className="setting-card">
          <FiSettings className="setting-icon" />
          <h3>AI Model Parameters</h3>
          <p>Configure XGBoost and K-Means thresholds</p>
          <button className="action-btn primary">Edit Settings</button>
        </div>
        <div className="setting-card">
          <FiShield className="setting-icon" />
          <h3>Security Policies</h3>
          <p>Manage KYC rules and authentication</p>
          <button className="action-btn primary">Update Policies</button>
        </div>
        <div className="setting-card">
          <FiAlertTriangle className="setting-icon" />
          <h3>Fraud Detection</h3>
          <p>Set alert sensitivity levels</p>
          <button className="action-btn primary">Adjust Sensitivity</button>
        </div>
      </div>
    </div>
  );

  const StatCard = ({ icon, title, value, change, warning = false }) => (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <h3>{title}</h3>
        <p className="stat-value">{value}</p>
        <p className={`stat-change ${warning ? 'warning' : ''}`}>{change}</p>
      </div>
    </div>
  );

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login';
  };

  return (
    <div className={`admin-container ${darkMode ? 'dark' : 'light'}`}>
      {/* Notification Bell */}
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

      {/* Sidebar Navigation */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>Ghar Nirman</h2>
          <span>Admin Portal</span>
        </div>

        <div className="sidebar-menu">
          <div 
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <FiHome /> Dashboard
          </div>

          <div 
            className={`menu-item ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <FiUsers /> Contractor Management
          </div>

          <div 
            className={`menu-item ${activeTab === 'bids' ? 'active' : ''}`}
            onClick={() => setActiveTab('bids')}
          >
            <FiBriefcase /> Bid Management
          </div>

          <div 
            className={`menu-item ${activeTab === 'fraud' ? 'active' : ''}`}
            onClick={() => setActiveTab('fraud')}
          >
            <FiShield /> Fraud Detection
          </div>

          <div 
            className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <FiSettings /> System Settings
          </div>
        </div>

        <div className="sidebar-footer">
          <button 
            className="theme-toggle" 
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? '☀ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="admin-main">
        {activeTab === 'dashboard' && <DashboardOverview />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'bids' && <BidMonitoring />}
        {activeTab === 'fraud' && <FraudDetection />}
        {activeTab === 'settings' && <SystemSettings />}
      </div>
    </div>
  );
};

export default AdminDashboard;