import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Hero.css";
import dark_arrow from "../../assets/dark-arrow.png";

const Hero = () => {
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);

  const handleExploreClick = () => {
    setShowPrompt(true); // Show confirmation prompt
  };

  const handleConfirm = () => {
    setShowPrompt(false);
    navigate("/login"); // Navigate after confirmation
  };

  const handleCancel = () => {
    setShowPrompt(false);
  };

  return (
    <div className="hero container">
      <div className="hero-text">
        <h1>Building the Future, One Brick at a Time!</h1>
        <p>
          Welcome to Ghar Nirman, your all-in-one platform for seamless
          construction project management. Whether you're a homeowner,
          contractor, or supplier, we bring efficiency, transparency, and smart
          decision-making to every stage of your construction journey. Browse
          tenders, connect with skilled professionals, and manage projects
          effortlessly—all in one place. Let’s build smarter, faster, and better
          together!
        </p>
        <button className="btn" onClick={handleExploreClick}>
          Explore More <img src={dark_arrow} alt="/" />
        </button>
      </div>

      {/* Confirmation Modal */}
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

export default Hero;
