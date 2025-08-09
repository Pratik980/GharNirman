import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import './TenderCreationForm.css';

const TenderCreationForm = () => {
  const { userData, user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    location: '',
    startDate: '',
    endDate: '',
    licenseCategory: '',
    projectType: '',
    siteVisit: '',
    warranty: '',
    materials: '',
    safetyCert: '',
    attachments: [],
    deadline: '',
    visibility: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData({ ...formData, [name]: files });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is authenticated
      if (!userData && !user) {
        showNotification('Please log in to create a tender', 'error');
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!formData.title || !formData.description || !formData.location) {
        showNotification('Please fill in all required fields (Title, Description, Location)', 'error');
        setLoading(false);
        return;
      }

      // Generate a fallback ID if no user ID is available
      const fallbackId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const tenderData = {
        ...formData,
        homeownerId: userData?._id || userData?.uid || user?.uid || fallbackId,
        homeownerName: userData?.name || userData?.fullName || userData?.displayName || user?.displayName || 'Unknown Homeowner',
      };

      console.log('Form data being sent:', formData);
      console.log('User data:', userData);
      console.log('User object:', user);
      console.log('Final tender data:', tenderData);

      const response = await axios.post('/api/tenders/homeowner', tenderData);
      
      if (response.data.success) {
        showNotification('Tender created successfully!', 'success');
        // Reset form
        setFormData({
          title: '',
          description: '',
          budget: '',
          location: '',
          startDate: '',
          endDate: '',
          licenseCategory: '',
          projectType: '',
          siteVisit: '',
          warranty: '',
          materials: '',
          safetyCert: '',
          attachments: [],
          deadline: '',
          visibility: '',
          notes: '',
        });
      }
    } catch (error) {
      console.error('Error creating tender:', error);
      console.error('Error response:', error.response);
      console.error('Error details:', error.response?.data);
      console.error('Request data sent:', tenderData);
      
      let errorMessage = 'Failed to create tender. Please try again.';
      
      if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Please check if the backend server is running on port 5000';
      } else if (error.response?.status === 500) {
        errorMessage = 'Server error: Backend encountered an internal error. Please check server logs.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tender-creation-form">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <div className="form-container">
        {/* Header */}
        <div className="form-header">
          <h1>Create New Tender</h1>
          <p>Fill out the details below to publish your construction tender</p>
        </div>

        {/* Form Content */}
        <div className="form-content">
          <form onSubmit={handleSubmit}>
            
            {/* Basic Information Section */}
            <div className="section">
              <div className="section-header">
                <h3>Basic Information</h3>
                <p>Essential details about your tender</p>
              </div>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">
                    Tender Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="Enter a descriptive title for your tender"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    Project Description <span className="required">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows="4"
                    className="form-input"
                    placeholder="Provide detailed description of the project requirements, scope of work, and specifications"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Estimated Budget Range (NPR)
                  </label>
                  <input
                    type="text"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., 5,00,000 - 10,00,000"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Project Location <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="form-input"
                    placeholder="City, District, Province"
                  />
                </div>
              </div>
            </div>

            {/* Project Timeline Section */}
            <div className="section">
              <div className="section-header">
                <h3>Project Timeline</h3>
                <p>Important dates and deadlines</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    Preferred Start Date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Expected Completion Date
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Bid Submission Deadline
                  </label>
                  <input
                    type="datetime-local"
                    name="deadline"
                    value={formData.deadline}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Project Requirements Section */}
            <div className="section">
              <div className="section-header">
                <h3>Project Requirements</h3>
                <p>Technical specifications and contractor requirements</p>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">
                    Contractor License Category
                  </label>
                  <select
                    name="licenseCategory"
                    value={formData.licenseCategory}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">-- Select Category --</option>
                    <option value="A">Class A - Large Projects</option>
                    <option value="B">Class B - Medium Projects</option>
                    <option value="C">Class C - Small Projects</option>
                    <option value="D">Class D - Minor Projects</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Project Type
                  </label>
                  <select
                    name="projectType"
                    value={formData.projectType}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">-- Select Type --</option>
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="infrastructure">Infrastructure</option>
                    <option value="renovation">Renovation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Site Visit Required
                  </label>
                  <div className="radio-group">
                    <div className="radio-option">
                      <input
                        type="radio"
                        name="siteVisit"
                        value="Yes"
                        checked={formData.siteVisit === 'Yes'}
                        onChange={handleChange}
                      />
                      <span>Yes</span>
                    </div>
                    <div className="radio-option">
                      <input
                        type="radio"
                        name="siteVisit"
                        value="No"
                        checked={formData.siteVisit === 'No'}
                        onChange={handleChange}
                      />
                      <span>No</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Warranty Period (months)
                  </label>
                  <input
                    type="number"
                    name="warranty"
                    value={formData.warranty}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., 12"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Materials to be Provided
                  </label>
                  <input
                    type="text"
                    name="materials"
                    value={formData.materials}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="e.g., Cement, Steel, Bricks"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Safety Certification Required
                  </label>
                  <div className="radio-group">
                    <div className="radio-option">
                      <input
                        type="radio"
                        name="safetyCert"
                        value="Yes"
                        checked={formData.safetyCert === 'Yes'}
                        onChange={handleChange}
                      />
                      <span>Yes</span>
                    </div>
                    <div className="radio-option">
                      <input
                        type="radio"
                        name="safetyCert"
                        value="No"
                        checked={formData.safetyCert === 'No'}
                        onChange={handleChange}
                      />
                      <span>No</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Tender Visibility
                  </label>
                  <select
                    name="visibility"
                    value={formData.visibility}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">-- Select Visibility --</option>
                    <option value="Public">Public</option>
                    <option value="Private">Private</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    className="form-input"
                    placeholder="Any additional requirements or special instructions"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">
                    Attachments
                  </label>
                  <input
                    type="file"
                    name="attachments"
                    onChange={handleChange}
                    multiple
                    className="form-input file-input"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                </div>
              </div>
            </div>

            {/* Submit Section */}
            <div className="submit-section">
              <button
                type="submit"
                disabled={loading}
                className="submit-button"
              >
                {loading && <span className="loading-spinner"></span>}
                {loading ? 'Creating Tender...' : 'Create Tender'}
              </button>
            </div>
          </form>

          <div className="footer-note">
            <span className="required">*</span> Required fields
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenderCreationForm; 