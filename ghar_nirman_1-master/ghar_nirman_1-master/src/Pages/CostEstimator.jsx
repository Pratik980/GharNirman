import React, { useState } from 'react';
import './CostEstimator.css';

const CostEstimator = () => {
  const [area, setArea] = useState(0);
  const [material, setMaterial] = useState('medium');
  const [laborCost, setLaborCost] = useState(0);
  const [projectType, setProjectType] = useState('residential');
  const [estimate, setEstimate] = useState(null);
  const [duration, setDuration] = useState(0);

  // Material and labor rates
  const materialRates = {
    basic: 15000, // Rs per sqm
    medium: 20000,
    premium: 25000
  };

  const laborRates = {
    residential: 5000, // Rs per day
    commercial: 8000,
    industrial: 12000
  };

  const calculateEstimate = () => {
    const materialCost = area * materialRates[material];
    const laborCostEstimate = laborCost * laborRates[projectType] * duration;
    const totalCost = materialCost + laborCostEstimate;

    setEstimate({
      materialCost,
      laborCostEstimate,
      totalCost
    });
  };

  return (
    <div className="estimator-container">
      <h1>Construction Cost Estimator</h1>

      <div className="input-group">
        <label>Construction Area (sqm):</label>
        <input
          type="number"
          value={area}
          onChange={(e) => setArea(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Material Quality:</label>
        <select value={material} onChange={(e) => setMaterial(e.target.value)}>
          <option value="basic">Basic Quality</option>
          <option value="medium">Medium Quality</option>
          <option value="premium">Premium Quality</option>
        </select>
      </div>

      <div className="input-group">
        <label>Labor Cost (Rs per day):</label>
        <input
          type="number"
          value={laborCost}
          onChange={(e) => setLaborCost(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Project Type:</label>
        <select value={projectType} onChange={(e) => setProjectType(e.target.value)}>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="industrial">Industrial</option>
        </select>
      </div>

      <div className="input-group">
        <label>Project Duration (days):</label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>

      <button onClick={calculateEstimate}>Calculate Estimate</button>

      {estimate && (
        <div className="result">
          <h2>Estimated Cost Breakdown:</h2>
          <p>Material Cost: Rs. {estimate.materialCost.toLocaleString()}</p>
          <p>Labor Cost (for {duration} days): Rs. {estimate.laborCostEstimate.toLocaleString()}</p>
          <h3>Total Estimated Cost: Rs. {estimate.totalCost.toLocaleString()}</h3>
          <p className="note">(Approximate calculation, subject to change)</p>
        </div>
      )}
    </div>
  );
};

export default CostEstimator;
