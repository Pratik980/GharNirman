import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Programs.css";
import program_1 from "../../assets/program-1.jpg";
import program_2 from "../../assets/program-2.jpg";
import program_3 from "../../assets/program-3.jpg";
import program_icon_1 from "../../assets/program-icon-1.png";
import program_icon_2 from "../../assets/program-icon-2.png";
import program_icon_3 from "../../assets/program-icon-3.png";

const Programs = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [selectedLink, setSelectedLink] = useState("");
  const navigate = useNavigate();

  const programsData = [
    {
      id: 1,
      image: program_1,
      icon: program_icon_1,
      text: "View Projects",
      link: "/login"
    },
    {
      id: 2,
      image: program_3,
      icon: program_icon_3,
      text: "Material Listings",
      link: "/login"
    },
    {
      id: 3,
      image: program_2,
      icon: program_icon_2,
      text: "Estimate Cost",
      link: "/login",
      className: "cost-estimator-card"
    }
  ];

  const handleCardClick = (link) => {
    setSelectedLink(link);
    setShowPrompt(true);
  };

  const handleConfirm = () => {
    setShowPrompt(false);
    navigate(selectedLink);
  };

  const handleCancel = () => {
    setShowPrompt(false);
    setSelectedLink("");
  };

  return (
    <div className="programs">
      {programsData.map((program) => (
        <div
          key={program.id}
          className={`program-link ${program.className || ''}`}
          onClick={() => handleCardClick(program.link)}
          style={{ cursor: "pointer" }}
        >
          <div className="program">
            <img src={program.image} alt={program.text} />
            <div className="caption">
              <img src={program.icon} alt={`${program.text} icon`} />
              <p>{program.text}</p>
              <span className="nav-arrow">→</span>
            </div>
          </div>
        </div>
      ))}

      {showPrompt && (
        <div className="modal">
          <div className="modal-content">
            <h3>🚀 Ready to Explore?</h3>
            <p>Do you want to dive into smarter construction with us?</p>
            <div className="modal-buttons">
              <button className="btn" onClick={handleConfirm}>Yes, let's go!</button>
              <button className="btn cancel" onClick={handleCancel}>Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Programs;
