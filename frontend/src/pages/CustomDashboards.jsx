import React, { useState, useEffect } from 'react';
import DashboardViewer from '../components/dashboards/DashboardViewer';
import DashboardList from '../components/dashboards/DashboardList';

const CustomDashboards = () => {
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboards = async () => {
    try {
      const res = await fetch('/api/dashboards');
      const data = await res.json();
      setDashboards(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboards();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold text-gray-800">Custom Dashboards</h1>
        <button 
          onClick={() => alert("Dashboard creation UI coming soon")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium"
        >
          + New Dashboard
        </button>
      </div>

      {!selectedDashboard ? (
        <DashboardList 
          dashboards={dashboards} 
          loading={loading}
          onSelect={setSelectedDashboard}
        />
      ) : (
        <DashboardViewer 
          dashboard={selectedDashboard} 
          onClose={() => setSelectedDashboard(null)}
          onRefresh={fetchDashboards}
        />
      )}
    </div>
  );
};

export default CustomDashboards;
