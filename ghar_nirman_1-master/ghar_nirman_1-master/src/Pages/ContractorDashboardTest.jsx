import React, { useState, useEffect } from "react";
import "./ContractorDashboard.css";

const ContractorDashboardTest = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tenders, setTenders] = useState([]);

  const apiBaseUrl = "http://localhost:5000/api";
  const tendersApiUrl = `${apiBaseUrl}/tenders`;

  useEffect(() => {
    console.log('🚀 ContractorDashboardTest loaded successfully!');
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching tenders from:', tendersApiUrl);
      
      const response = await fetch(`${tendersApiUrl}?page=1&limit=5`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Tenders response:', data);
      
      setTenders(data.tenders || []);
    } catch (err) {
      console.error('❌ Error fetching tenders:', err);
      setError(err.message);
      setTenders([]);
    } finally {
      setLoading(false);
    }
  };

  const debugApi = async () => {
    try {
      console.log('🔍 Testing API endpoints...');
      
      // Test base API
      const baseResponse = await fetch(`${apiBaseUrl.replace('/api', '')}/health`);
      console.log('Base API:', baseResponse.ok ? '✅' : '❌', baseResponse.status);
      
      // Test tender debug endpoint
      const debugResponse = await fetch(`${tendersApiUrl}/debug`);
      console.log('Tender Debug:', debugResponse.ok ? '✅' : '❌', debugResponse.status);
      if (debugResponse.ok) {
        const debugData = await debugResponse.json();
        console.log('Debug data:', debugData);
      }
      
    } catch (err) {
      console.error('❌ API Debug Error:', err);
    }
  };

  const createTestTender = async () => {
    try {
      const testTender = {
        contractor: "Test Construction Co.",
        licenseCategory: "General Contractor",
        specialization: "Residential",
        bidAmount: 150000,
        projectDuration: 90,
        warranty: 2,
        experience: 10,
        successRate: 85,
        clientRating: 92,
        rejectionHistory: 2,
        safetyCertification: "OSHA Certified",
        materialSourceCertainty: 95,
        status: "open"
      };

      const response = await fetch(tendersApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testTender),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Test tender created:', result);
        alert('Test tender created successfully!');
        fetchTenders(); // Refresh the list
      } else {
        const error = await response.json();
        console.error('❌ Failed to create test tender:', error);
        alert('Failed to create test tender: ' + error.error);
      }
    } catch (err) {
      console.error('❌ Error creating test tender:', err);
      alert('Error creating test tender: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="contractor-dashboard">
        <div className="dashboard-container">
          <div className="loading-state">
            <h2>Loading Test Dashboard...</h2>
            <p>Please wait while we load the test dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contractor-dashboard">
        <div className="dashboard-container">
          <div className="error-state">
            <h2>Connection Error</h2>
            <p>Unable to connect to the server. Please check if your backend is running.</p>
            <div className="error-actions">
              <button onClick={() => window.location.reload()}>Retry</button>
              <button onClick={debugApi}>Debug API</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="contractor-dashboard">
      <div className="dashboard-container">
        {/* Sidebar removed */}
        <main className="main-content" style={{ width: '100%' }}>
          <header className="dashboard-header">
            <h1>Test Contractor Dashboard</h1>
            <p>This is a simplified test version that should definitely load!</p>
          </header>

          {activeTab === "dashboard" && (
            <div>
              <div className="dashboard-stats">
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-content">
                      <h3>Status</h3>
                      <p className="stat-value">✅ Working</p>
                      <p className="stat-trend positive">Dashboard loaded successfully</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-content">
                      <h3>Tenders</h3>
                      <p className="stat-value">{tenders.length}</p>
                      <p className="stat-trend neutral">Available tenders</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="action-buttons">
                  <button className="action-btn" onClick={debugApi} style={{ backgroundColor: '#ff6b6b' }}>
                    🔍 <span>Debug API</span>
                  </button>
                  <button className="action-btn" onClick={createTestTender} style={{ backgroundColor: '#4ecdc4' }}>
                    ➕ <span>Create Test Tender</span>
                  </button>
                  <button className="action-btn" onClick={() => setActiveTab("tenders") } style={{ backgroundColor: '#45b7d1' }}>
                    📋 <span>View Tenders</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tenders" && (
            <div className="tender-marketplace">
              <div className="marketplace-header">
                <h1>Available Tenders</h1>
                <button onClick={createTestTender} className="btn-bid">Create Test Tender</button>
              </div>

              <div className="tenders-grid">
                {tenders.length > 0 ? (
                  tenders.map(tender => (
                    <div className="tender-card" key={tender._id}>
                      <div className="tender-header">
                        <h3>{tender.contractor || tender.originalFilename || "Unnamed Tender"}</h3>
                        <span className="status">{tender.status}</span>
                      </div>
                      <p><strong>Specialization:</strong> {tender.specialization || "N/A"}</p>
                      <p><strong>Bid Amount:</strong> ${tender.bidAmount?.toLocaleString() || 0}</p>
                      <p><strong>Duration:</strong> {tender.projectDuration || 0} days</p>
                    </div>
                  ))
                ) : (
                  <div className="loading-state">
                    <h3>No Tenders Available</h3>
                    <p>Click "Create Test Tender" to add some sample data.</p>
                    <button onClick={createTestTender} className="btn-bid">Create Test Tender</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ContractorDashboardTest; 