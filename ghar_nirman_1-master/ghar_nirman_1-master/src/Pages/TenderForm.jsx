import React, { useState, useEffect } from "react";
import axios from "axios";
import {
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
  FiUpload,
  FiFile,
  FiSearch,
  FiAward,
  FiBarChart2,
  FiPercent,
  FiCalendar,
  FiStar
} from "react-icons/fi";
import "./TenderForm.css";

const apiBaseUrl = "http://localhost:5000/api/tenders";
const mlApiUrl = "http://localhost:8000/analyze";
const uploadApiUrl = "http://localhost:5000/api/tenders/upload";

const TenderForm = () => {
  // State declarations
  const [tenders, setTenders] = useState([]);
  const [formData, setFormData] = useState({
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
  const [editingId, setEditingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [rankings, setRankings] = useState(null);
  const [loadingRankings, setLoadingRankings] = useState(false);
  const [rankingError, setRankingError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Fetch tenders and uploaded files on component mount
  useEffect(() => {
    fetchTenders();
    fetchUploadedFiles();
  }, []);

  const fetchTenders = async () => {
    try {
      console.log('🔍 Fetching tenders from:', apiBaseUrl);
      const res = await axios.get(apiBaseUrl);
      console.log('🔍 Raw tenders response:', res.data);
      
      // Handle both array and object responses
      let tenderData = res.data;
      if (res.data.tenders) {
        tenderData = res.data.tenders;
      }
      
      console.log('🔍 Processed tenders:', tenderData);
      setTenders(tenderData);
    } catch (error) {
      console.error("Failed to fetch tenders", error);
      showNotification("Failed to fetch tenders", "error");
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      const res = await axios.get(`${uploadApiUrl}/files`);
      setUploadedFiles(res.data);
    } catch (error) {
      console.error("Failed to fetch uploaded files", error);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.contractor.trim() || !formData.specialization.trim()) {
      showNotification("Contractor and Specialization are required", "error");
      return;
    }

    try {
      if (editingId !== null) {
        await axios.put(`${apiBaseUrl}/${editingId}`, {
          ...formData,
          bidAmount: Number(formData.bidAmount),
          projectDuration: Number(formData.projectDuration),
          warranty: Number(formData.warranty),
          experience: Number(formData.experience),
          successRate: Number(formData.successRate),
          clientRating: Number(formData.clientRating),
          rejectionHistory: Number(formData.rejectionHistory),
        });
        showNotification("Tender updated successfully!");
      } else {
        await axios.post(apiBaseUrl, {
          ...formData,
          bidAmount: Number(formData.bidAmount),
          projectDuration: Number(formData.projectDuration),
          warranty: Number(formData.warranty),
          experience: Number(formData.experience),
          successRate: Number(formData.successRate),
          clientRating: Number(formData.clientRating),
          rejectionHistory: Number(formData.rejectionHistory),
        });
        showNotification("Tender created successfully!");
      }
      setFormData({
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
      setEditingId(null);
      fetchTenders();
      setRankings(null);
    } catch (error) {
      console.error("Failed to submit tender", error);
      showNotification("Failed to submit tender", "error");
    }
  };

  const handleEdit = (tender) => {
    setFormData({
      contractor: tender.contractor || "",
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
    setEditingId(tender._id);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this tender?")) {
      try {
        await axios.delete(`${apiBaseUrl}/${id}`);
        showNotification("Tender deleted successfully");
        fetchTenders();
        setRankings(null);
      } catch (error) {
        console.error("Failed to delete tender", error);
        showNotification("Failed to delete tender", "error");
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

      const res = await axios.post(mlApiUrl, bidsPayload);
      setRankings(res.data);
    } catch (error) {
      console.error("Failed to analyze bids", error);
      setRankingError("Failed to analyze bids. Please try again.");
    } finally {
      setLoadingRankings(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      showNotification("Please select a valid PDF file", "error");
      e.target.value = "";
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      showNotification("Please select a PDF file first", "error");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadData = new FormData();
    uploadData.append("pdf", selectedFile);

    try {
      await axios.post(uploadApiUrl, uploadData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      showNotification("PDF uploaded successfully!");
      setSelectedFile(null);
      setUploadProgress(0);
      fetchUploadedFiles();
      fetchTenders();

      const fileInput = document.getElementById("pdf-upload");
      if (fileInput) fileInput.value = "";
    } catch (error) {
      console.error("Failed to upload PDF", error);
      showNotification("Failed to upload PDF", "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="tender-form-container">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            {notification.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
            {notification.message}
          </div>
        </div>
      )}

      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <FiAward className="header-icon" />
            <h1>Contractor Bidding Management</h1>
          </div>
          <div className="header-search">
            <FiSearch className="search-icon" />
            <input type="text" placeholder="Search tenders..." />
          </div>
        </div>
      </header>

      <div className="dashboard-layout">
        <main className="main-content">
          {/* Contractor Bid Form Download & Upload Section */}
          <div className="pdf-form-section" style={{ marginBottom: 32 }}>
            <h2>Contractor Bid Form</h2>
            <a
              href="/contractor-bid-form.pdf"
              download
              className="btn btn-primary"
              style={{ marginRight: 16 }}
            >
              Download Bid Form (PDF)
            </a>
          </div>

          <section className="card pdf-upload-section">
            <div className="card-header">
              <div className="card-title">
                <FiUpload className="card-icon" />
                <h2>Document Upload</h2>
              </div>
              <p className="card-subtitle">
                Upload tender documents, contracts, and related files in PDF format
              </p>
            </div>

            <div className="card-body">
              <div className="file-upload-area">
                <input
                  type="file"
                  id="pdf-upload"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                <label htmlFor="pdf-upload" className="upload-dropzone">
                  <FiUpload className="upload-icon" />
                  <span className="upload-text">
                    {selectedFile ? selectedFile.name : "Drag & drop files or click to browse"}
                  </span>
                  {selectedFile && (
                    <span className="file-size">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  )}
                </label>

                {selectedFile && (
                  <div className="upload-actions">
                    <button
                      className="btn btn-primary"
                      onClick={handleFileUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <span className="spinner"></span>
                          Uploading...
                        </>
                      ) : (
                        "Upload Document"
                      )}
                    </button>
                    <button
                      className="btn btn-text"
                      onClick={() => setSelectedFile(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {isUploading && (
                  <div className="upload-progress">
                    <div className="progress-container">
                      <div
                        className="progress-bar"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{uploadProgress}% Complete</span>
                  </div>
                )}
              </div>

              {uploadedFiles.length > 0 && (
                <div className="uploaded-files-section">
                  <h3 className="section-title">
                    <FiFile className="section-icon" />
                    Uploaded Documents
                  </h3>
                  <div className="files-grid">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="file-card">
                        <div className="file-icon-container">
                          <FiFile className="file-icon" />
                        </div>
                        <div className="file-details">
                          <h4 className="file-name">{file.filename}</h4>
                          <div className="file-meta">
                            <span className="file-date">
                              {new Date(file.uploadDate).toLocaleDateString()}
                            </span>
                            <span className="file-size">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="card bids-management">
            <div className="card-header">
              <div className="card-title">
                <FiList className="card-icon" />
                <h2>Contractor Bids</h2>
              </div>
              <div className="card-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={analyzeBids} 
                  disabled={loadingRankings || tenders.length === 0}
                >
                  {loadingRankings ? (
                    <>
                      <span className="spinner"></span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FiBarChart2 className="btn-icon" />
                      Analyze Bids
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="card-body">
              {rankingError && (
                <div className="alert alert-error">
                  <FiAlertTriangle className="alert-icon" />
                  {rankingError}
                </div>
              )}

              {tenders.length === 0 ? (
                <div className="empty-state">
                  <FiUser className="empty-icon" />
                  <h3>No bids submitted yet</h3>
                  <p>Add contractor bids to get started</p>
                </div>
              ) : (
                <>
                  <div className="bids-grid">
                    {tenders.map((t) => (
                      <div
                        key={t._id}
                        className={`bid-card ${editingId === t._id ? "editing" : ""}`}
                      >
                        <div className="bid-header">
                          <div className="contractor-info">
                            <div className="contractor-avatar">
                              <FiUser />
                            </div>
                            <div>
                              <h3 className="contractor-name">{t.contractor}</h3>
                              <span className="contractor-specialization">
                                {t.specialization}
                              </span>
                            </div>
                          </div>
                          <div className="bid-actions">
                            <button
                              className="btn btn-icon"
                              onClick={() => handleEdit(t)}
                              aria-label="Edit bid"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              className="btn btn-icon"
                              onClick={() => handleDelete(t._id)}
                              aria-label="Delete bid"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </div>

                        <div className="bid-details">
                          <div className="detail-item">
                            <FiShield className="detail-icon" />
                            <span>{t.licenseCategory || 'Not specified'}</span>
                          </div>
                          <div className="detail-item highlight">
                            <FiDollarSign className="detail-icon" />
                            <span>${t.bidAmount?.toLocaleString() || '0'}</span>
                          </div>
                          <div className="detail-item">
                            <FiClock className="detail-icon" />
                            <span>{t.projectDuration} days</span>
                          </div>
                        </div>

                        <div className="bid-stats">
                          <div className="stat-item">
                            <div className="stat-label">
                              <FiCheckCircle className="stat-icon" />
                              <span>Warranty</span>
                            </div>
                            <div className="stat-value">{t.warranty} months</div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">
                              <FiTrendingUp className="stat-icon" />
                              <span>Success Rate</span>
                            </div>
                            <div className="stat-value">
                              <span className="percentage">{t.successRate}%</span>
                            </div>
                          </div>
                          <div className="stat-item">
                            <div className="stat-label">
                              <FiStar className="stat-icon" />
                              <span>Rating</span>
                            </div>
                            <div className="stat-value">
                              <div className="rating-stars">
                                {[...Array(5)].map((_, i) => (
                                  <FiStar
                                    key={i}
                                    className={`star ${i < Math.floor(t.clientRating) ? 'filled' : ''} ${i === Math.floor(t.clientRating) && t.clientRating % 1 > 0 ? 'half-filled' : ''}`}
                                  />
                                ))}
                                <span className="rating-text">{t.clientRating}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {rankings && (
                    <div className="rankings-section">
                      <div className="section-header">
                        <h3>
                          <FiBarChart2 className="section-icon" />
                          AI-Powered Bid Analysis
                        </h3>
                        <p className="section-subtitle">
                          Rankings based on composite scoring algorithm
                        </p>
                      </div>

                      <div className="rankings-table-container">
                        <table className="rankings-table">
                          <thead>
                            <tr>
                              <th>Rank</th>
                              <th>Contractor</th>
                              <th>Score</th>
                              <th>Win Chance</th>
                              <th>Bid Amount</th>
                              <th>Technical</th>
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
                                <tr key={r.contractor_name}>
                                  <td>
                                    <span className={`rank-badge ${idx < 3 ? 'top-rank' : ''}`}>
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="contractor-cell">
                                    <div className="contractor-info">
                                      <div className="contractor-avatar small">
                                        {r.contractor_name.charAt(0)}
                                      </div>
                                      <span>{r.contractor_name}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="score-bar-container">
                                      <div
                                        className="score-bar"
                                        style={{ width: `${r.composite_score}%` }}
                                      ></div>
                                      <span className="score-text">
                                        {r.composite_score.toFixed(1)}
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="win-probability">
                                      <div
                                        className="probability-bar"
                                        style={{ width: `${r.win_probability * 100}%` }}
                                      ></div>
                                      <span className="probability-text">
                                        {(r.win_probability * 100).toFixed(1)}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="bid-amount">
                                    ${Number(r.bid_amount).toLocaleString()}
                                  </td>
                                  <td>
                                    <div className="technical-merit">
                                      <div
                                        className="merit-bar"
                                        style={{ width: `${r.technical_merit * 100}%` }}
                                      ></div>
                                      <span className="merit-text">
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
                </>
              )}
            </div>
          </section>
        </main>

        {/* Remove the manual tender creation form from the sidebar */}
        {/* <aside className="sidebar-form">
          <div className="card form-card">
            <div className="card-header">
              <div className="card-title">
                {editingId ? <FiEdit2 className="card-icon" /> : <FiPlus className="card-icon" />}
                <h2>{editingId ? "Edit Bid" : "Create New Bid"}</h2>
              </div>
              {editingId && (
                <button
                  className="btn btn-icon"
                  onClick={() => {
                    setFormData({
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
                    setEditingId(null);
                  }}
                  aria-label="Cancel edit"
                >
                  <FiX />
                </button>
              )}
            </div>

            <div className="card-body">
              <form className="bid-form" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">
                      <FiUser className="input-icon" />
                      Contractor Name *
                    </label>
                    <input
                      type="text"
                      name="contractor"
                      className="form-input"
                      value={formData.contractor}
                      onChange={handleChange}
                      placeholder="Enter contractor name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiShield className="input-icon" />
                      License Category
                    </label>
                    <input
                      type="text"
                      name="licenseCategory"
                      className="form-input"
                      value={formData.licenseCategory}
                      onChange={handleChange}
                      placeholder="e.g., Class A"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiAward className="input-icon" />
                      Specialization *
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      className="form-input"
                      value={formData.specialization}
                      onChange={handleChange}
                      placeholder="e.g., Residential Construction"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiDollarSign className="input-icon" />
                      Bid Amount ($)
                    </label>
                    <input
                      type="number"
                      name="bidAmount"
                      className="form-input"
                      value={formData.bidAmount}
                      onChange={handleChange}
                      placeholder="e.g., 500000"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiCalendar className="input-icon" />
                      Project Duration (days)
                    </label>
                    <input
                      type="number"
                      name="projectDuration"
                      className="form-input"
                      value={formData.projectDuration}
                      onChange={handleChange}
                      placeholder="e.g., 180"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiCheckCircle className="input-icon" />
                      Warranty (months)
                    </label>
                    <input
                      type="number"
                      name="warranty"
                      className="form-input"
                      value={formData.warranty}
                      onChange={handleChange}
                      placeholder="e.g., 24"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiClock className="input-icon" />
                      Experience (years)
                    </label>
                    <input
                      type="number"
                      name="experience"
                      className="form-input"
                      value={formData.experience}
                      onChange={handleChange}
                      placeholder="e.g., 10"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiPercent className="input-icon" />
                      Success Rate (%)
                    </label>
                    <input
                      type="number"
                      name="successRate"
                      className="form-input"
                      value={formData.successRate}
                      onChange={handleChange}
                      placeholder="e.g., 85"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiStar className="input-icon" />
                      Client Rating (1-5)
                    </label>
                    <input
                      type="number"
                      name="clientRating"
                      className="form-input"
                      value={formData.clientRating}
                      onChange={handleChange}
                      placeholder="e.g., 4.5"
                      min="1"
                      max="5"
                      step="0.1"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiAlertTriangle className="input-icon" />
                      Rejection History
                    </label>
                    <input
                      type="number"
                      name="rejectionHistory"
                      className="form-input"
                      value={formData.rejectionHistory}
                      onChange={handleChange}
                      placeholder="e.g., 2"
                      min="0"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <FiShield className="input-icon" />
                      Safety Certification
                    </label>
                    <select
                      name="safetyCertification"
                      className="form-input"
                      value={formData.safetyCertification}
                      onChange={handleChange}
                    >
                      <option value="">Select option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary btn-block">
                    {editingId ? "Update Tender" : "Create Tender"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </aside> */}
      </div>
    </div>
  );
};

export default TenderForm;