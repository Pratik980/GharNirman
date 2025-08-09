import React, { useEffect, useState } from "react";

const TenderDashboard = () => {
  const [tenders, setTenders] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/tenders")
      .then((res) => res.json())
      .then((data) => setTenders(data))
      .catch((err) => console.error("Error fetching tenders:", err));
  }, []);

  return (
    <div>
      <h2>Tender Evaluations</h2>
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Budget</th>
            <th>Deadline</th>
            <th>AI Score</th>
          </tr>
        </thead>
        <tbody>
          {tenders.map((tender) => (
            <tr key={tender.id}>
              <td>{tender.projectName}</td>
              <td>${tender.budget}</td>
              <td>{tender.deadline}</td>
              <td>{tender.aiScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TenderDashboard;