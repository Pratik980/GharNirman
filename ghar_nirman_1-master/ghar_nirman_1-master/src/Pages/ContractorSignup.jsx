import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './Firebase';
import logo from '../assets/logo.png';
import './ContractorSignup.css';

const ContractorSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    companyName: '',
    companyRegistrationNumber: '',
    businessAddress: '',
    licenseNumber: '',
    yearsOfExperience: '',
    specialization: '',
    portfolioLink: '',
    references: ''
  });
  const [documents, setDocuments] = useState({
    contractorLicense: null,
    businessRegistration: null,
    insuranceCertificate: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setDocuments({
      ...documents,
      [name]: files[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Password validation for special characters
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)');
      setLoading(false);
      return;
    }

    // Validate required documents
    if (!documents.contractorLicense) {
      setError('Please upload your contractor license');
      setLoading(false);
      return;
    }

    if (!documents.businessRegistration) {
      setError('Please upload your business registration certificate');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const user = userCredential.user;

      // Step 2: Create Firestore document for contractor
      const contractorData = {
        uid: user.uid,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        userType: 'contractor',
        status: 'pending', // Will be updated by admin verification
        createdAt: new Date().toISOString(),
        // Additional contractor-specific fields
        companyName: formData.companyName,
        companyRegistrationNumber: formData.companyRegistrationNumber,
        businessAddress: formData.businessAddress,
        licenseNumber: formData.licenseNumber,
        yearsOfExperience: parseInt(formData.yearsOfExperience),
        specialization: formData.specialization,
        portfolioLink: formData.portfolioLink,
        references: formData.references
      };

      await setDoc(doc(db, 'users', user.uid), contractorData);

      // Step 3: Submit to MongoDB backend with documents
      const formDataToSend = new FormData();
      
      // Add form data
      Object.keys(formData).forEach(key => {
        formDataToSend.append(key, formData[key]);
      });
      
      // Add Firebase UID
      formDataToSend.append('uid', user.uid);
      
      // Add documents
      formDataToSend.append('contractorLicense', documents.contractorLicense);
      formDataToSend.append('businessRegistration', documents.businessRegistration);
      if (documents.insuranceCertificate) {
        formDataToSend.append('insuranceCertificate', documents.insuranceCertificate);
      }

      const response = await axios.post('http://localhost:5000/api/contractors/signup', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        alert('Contractor application submitted successfully! We will review your application and get back to you soon. You can now login with your credentials.');
        navigate('/login');
      }
    } catch (err) {
      console.error('Contractor signup error:', err);
      
      // Handle specific Firebase errors
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please use a different email or try logging in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please choose a stronger password.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.response?.data?.message || 'Failed to submit application. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-form-card">
        <div className="signup-header">
          <img src={logo} alt="Company Logo" className="signup-logo" />
          <h1>Contractor Registration</h1>
          <p>Join our platform as a verified contractor</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="form-section">
            <h3>Personal Information</h3>
            
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email address"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                minLength="8"
              />
              <div className="password-requirements">
                <small>Password must contain: 8+ characters, uppercase, lowercase, number, and special character (@$!%*?&)</small>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number *</label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Company Information</h3>
            
            <div className="form-group">
              <label htmlFor="companyName">Company Name *</label>
              <input
                type="text"
                id="companyName"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                placeholder="Enter your company name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="companyRegistrationNumber">Company Registration Number *</label>
              <input
                type="text"
                id="companyRegistrationNumber"
                name="companyRegistrationNumber"
                value={formData.companyRegistrationNumber}
                onChange={handleChange}
                required
                placeholder="Enter company registration number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="businessAddress">Business Address *</label>
              <textarea
                id="businessAddress"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                required
                placeholder="Enter your business address"
                rows="3"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Professional Information</h3>
            
            <div className="form-group">
              <label htmlFor="licenseNumber">License Number *</label>
              <input
                type="text"
                id="licenseNumber"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                required
                placeholder="Enter your license number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="yearsOfExperience">Years of Experience *</label>
              <input
                type="number"
                id="yearsOfExperience"
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                required
                min="0"
                max="50"
                placeholder="Enter years of experience"
              />
            </div>

            <div className="form-group">
              <label htmlFor="specialization">Specialization *</label>
              <input
                type="text"
                id="specialization"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                required
                placeholder="e.g., Residential Construction, Commercial Projects"
              />
            </div>

            <div className="form-group">
              <label htmlFor="portfolioLink">Portfolio Link</label>
              <input
                type="url"
                id="portfolioLink"
                name="portfolioLink"
                value={formData.portfolioLink}
                onChange={handleChange}
                placeholder="Enter your portfolio website URL"
              />
            </div>

            <div className="form-group">
              <label htmlFor="references">References</label>
              <textarea
                id="references"
                name="references"
                value={formData.references}
                onChange={handleChange}
                placeholder="List your professional references"
                rows="3"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Required Documents</h3>
            
            <div className="form-group">
              <label htmlFor="contractorLicense">Contractor License *</label>
              <input
                type="file"
                id="contractorLicense"
                name="contractorLicense"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
              <small>Upload a clear photo/scan of your contractor license (PDF, JPG, PNG)</small>
            </div>

            <div className="form-group">
              <label htmlFor="businessRegistration">Business Registration Certificate *</label>
              <input
                type="file"
                id="businessRegistration"
                name="businessRegistration"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                required
              />
              <small>Upload your business registration document (PDF, JPG, PNG)</small>
            </div>

            <div className="form-group">
              <label htmlFor="insuranceCertificate">Insurance Certificate (Optional)</label>
              <input
                type="file"
                id="insuranceCertificate"
                name="insuranceCertificate"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <small>Upload your liability insurance document if available</small>
            </div>
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
            
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractorSignup; 