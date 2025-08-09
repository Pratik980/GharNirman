import React from 'react';
import { Link } from 'react-router-dom';
import './MaterialListing.css';
import { 
  FaHardHat, 
  FaBolt, 
  FaTint, 
  FaPaintRoller,
  FaTools,
  FaTruck
} from 'react-icons/fa';

const MaterialListing = () => {
  const materialCategories = [
    {
      id: 1,
      name: 'Structural Materials',
      icon: <FaHardHat className="category-icon" />,
      items: [
        { name: 'Portland Cement', unit: '50kg bag', price: 'Rs 670' },
        { name: 'Reinforcement Bars', unit: 'per kg', price: 'Rs 150' },
        { name: 'Concrete Blocks', unit: 'per unit', price: 'Rs 480' },
        { name: 'Structural Steel', unit: 'per kg', price: 'Rs 180' }
      ]
    },
    {
      id: 2,
      name: 'Electrical',
      icon: <FaBolt className="category-icon" />,
      items: [
        { name: 'Copper Wiring', unit: 'per meter', price: 'Rs 25' },
        { name: 'Circuit Breakers', unit: 'per unit', price: 'Rs 450' },
        { name: 'Conduit Pipes', unit: '3m length', price: 'Rs 650' }
      ]
    },
    {
      id: 3,
      name: 'Plumbing',
      icon: <FaTint className="category-icon" />,
      items: [
        { name: 'PVC Pipes', unit: '6m length', price: 'Rs 680' },
        { name: 'Copper Pipes', unit: 'per meter', price: 'Rs 990' },
        { name: 'Water Tanks', unit: '1000L', price: 'Rs 25000' }
      ]
    },
    {
      id: 4,
      name: 'Finishing',
      icon: <FaPaintRoller className="category-icon" />,
      items: [
        { name: 'Ceramic Tiles', unit: 'per sqm', price: 'Rs 450' },
        { name: 'Paint', unit: '4L can', price: 'Rs 770' },
        { name: 'Gypsum Board', unit: '8x4 sheet', price: 'Rs 1200 ' }
      ]
    }
  ];

  return (
    <div className="material-listing-container">
      {/* Green Header Section - Centered and lowered */}
      <div className="material-header">
        <div className="header-content">
          <h1 className="page-title">CONSTRUCTION MATERIAL LISTINGS</h1>
          <p className="page-subtitle">"Prevailing market rates for construction materials"</p>
        </div>
      </div>
      
      <div className="material-grid">
        {materialCategories.map(category => (
          <div key={category.id} className="material-card">
            <div className="category-header">
              {category.icon}
              <h2>{category.name}</h2>
            </div>
            <table className="material-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Unit</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {category.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>{item.unit}</td>
                    <td>{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="supplier-section">
        <FaTruck className="supplier-icon" />
        <h3>Local Suppliers</h3>
        <div className="supplier-list">
          <div className="supplier-card">
            <h4>ABC Construction Supply</h4>
            <p>Contact: 01-4223456</p>
          </div>
          <div className="supplier-card">
            <h4>XYZ Building Materials</h4>
            <p>Contact: 01-4332211</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default MaterialListing;