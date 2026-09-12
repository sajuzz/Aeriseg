import React from 'react';

const DashboardList = ({ dashboards, loading, onSelect }) => {
  if (loading) return <div className="text-center py-12">Loading dashboards...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {dashboards.map(dash => (
        <div 
          key={dash.id}
          onClick={() => onSelect(dash)}
          className="border border-gray-200 hover:border-blue-400 p-6 rounded-2xl cursor-pointer hover:shadow transition-all bg-siem-panel"
        >
          <h3 className="font-semibold text-xl text-gray-900 mb-2">{dash.name}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{dash.description}</p>
          
          <div className="mt-6 text-xs text-gray-500">
            Refreshes every {dash.refresh_interval}s • {dash.widgets?.length || 0} widgets
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardList;
