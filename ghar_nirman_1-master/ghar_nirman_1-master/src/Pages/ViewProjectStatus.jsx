import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./ViewProjectStatus.css";

const ViewProjectStatus = () => {
  const [comment, setComment] = useState("");

  const handleCommentSubmit = () => {
    if (comment.trim()) {
      alert("Comment submitted successfully!");
      setComment("");
    }
  };

  return (
    <div className="project-status-container">
      <h1 className="page-title">Project Status Overview</h1>
      <div className="status-card">
        <h2>Project Summary</h2>
        <p><strong>Project Name:</strong> Dhulikhel Apartment Construction Pvt.Ltd</p>
        <p><strong>Location:</strong> Dhulikhel, Nepal</p>
        <p><strong>Start Date:</strong> March 30, 2025</p>
        <p><strong>End Date:</strong> September, 2026</p>
        <p><strong>Client:</strong> Sabin Rokaya</p>
        <p><strong>Contractor:</strong> Tundi Raman J.V Pvt. Ltd.</p>
        <p><strong>Budget:</strong> $10 Million</p>
        <p><strong>Status:</strong> Ongoing</p>
      </div>

      <div className="status-card">
        <h2>Project Progress</h2>
        <div className="progress-container">
          <span>70% Completed</span>
          <div className="progress-bar">
            <div className="progress" style={{ width: "70%" }}></div>
          </div>
          <span>30% Remaining</span>
        </div>
      </div>

      <div className="status-card">
        <h2>Milestone Breakdown</h2>
        <ul>
          <li><strong>Phase 1:</strong> Excavation - ✅ Completed</li>
          <li><strong>Phase 2:</strong> Foundation Work - ✅ Completed</li>
          <li><strong>Phase 3:</strong> Superstructure - 🔄 In Progress</li>
          <li><strong>Phase 4:</strong> Finishing & Handover - ⏳ Pending</li>
        </ul>
      </div>

      <div className="status-card task-container">
        <div className="task-list completed">
          <h3>Completed Tasks ✅</h3>
          <ul>
            <li>Foundation Work</li>
            <li>Framework Setup</li>
            <li>Brickwork Done</li>
          </ul>
        </div>
        <div className="task-list pending">
          <h3>Pending Tasks ⏳</h3>
          <ul>
            <li>Interior Finishing</li>
            <li>Electrical Fitting</li>
            <li>Plumbing & Painting</li>
          </ul>
        </div>
      </div>

      <div className="status-card">
        <h2>Live Updates & Issues</h2>
        <p><strong>Weather Impact:</strong> Heavy rain delayed work by 3 days.</p>
        <p><strong>Current Issues:</strong> Shortage of steel rods, supplier delay.</p>
        <p><strong>Last Site Visit:</strong> April 2, 2025</p>
      </div>

      <div className="status-card">
        <h2>Workforce & Equipment Status</h2>
        <p><strong>Workers On-Site:</strong> 120</p>
        <p><strong>Engineers Assigned:</strong> 5</p>
        <p><strong>Equipment in Use:</strong> 2 Excavators, 3 Cranes, 5 Trucks</p>
      </div>

      <div className="status-card">
        <h2>Reports & Feedback</h2>
        <button className="download-btn">Download Project Report</button>
        <h3>Stakeholder Comments</h3>
        <textarea
          placeholder="Leave a comment..."
          rows="3"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button className="submit-btn" onClick={handleCommentSubmit}>Submit</button>
      </div>
    </div>
  );
};

export default ViewProjectStatus;