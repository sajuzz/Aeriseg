import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const WidgetRenderer = ({ widget }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWidgetData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboards/widgets/${widget.id}/evaluate`);
      const result = await res.json();
      setData(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWidgetData();
    const interval = setInterval(fetchWidgetData, widget.refresh_interval * 1000);
    return () => clearInterval(interval);
  }, [widget.id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  // Handle simple object returns for pie/bar arrays, stat objects etc
  const chartData = data.data || data;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b font-medium text-gray-800">{widget.title}</div>
      
      <div className="flex-1 p-4 flex flex-col justify-center min-h-[200px]">
        {widget.widget_type === 'stat' && (
          <div className="text-6xl font-bold text-center text-gray-800">
            {chartData.value || chartData || 0}
          </div>
        )}

        {widget.widget_type === 'bar' && Array.isArray(chartData) && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {widget.widget_type === 'line' && Array.isArray(chartData) && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {widget.widget_type === 'pie' && Array.isArray(chartData) && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#eab308', '#22c55e'][index % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}

        {widget.widget_type === 'table' && Array.isArray(chartData) && chartData.length > 0 && (
          <div className="overflow-auto max-h-full">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {Object.keys(chartData[0] || {}).map(key => <th key={key} className="text-left py-2 font-semibold">{key}</th>)}
                </tr>
              </thead>
              <tbody>
                {chartData.map((row, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    {Object.values(row).map((val, j) => <td key={j} className="py-2 text-xs font-mono">{String(val)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetRenderer;
