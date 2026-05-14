import React, { useEffect, useState } from 'react';
import WidgetRenderer from './WidgetRenderer';

const DashboardViewer = ({ dashboard, onClose, onRefresh }) => {
  const [widgets, setWidgets] = useState([]);

  useEffect(() => {
    if (dashboard?.widgets) {
      setWidgets(dashboard.widgets);
    }
  }, [dashboard]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold">{dashboard.name}</h2>
          <p className="text-gray-600">{dashboard.description}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 auto-rows-min">
        {widgets.map(widget => (
          <div 
            key={widget.id}
            className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
            style={{
              gridColumn: `span ${widget.width || 4}`,
              gridRow: `span ${widget.height || 3}`
            }}
          >
            <WidgetRenderer widget={widget} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardViewer;
