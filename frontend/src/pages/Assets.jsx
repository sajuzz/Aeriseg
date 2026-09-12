import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Database, UploadCloud, Search, Server } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/assets');
      setAssets(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      await axios.post('/api/assets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchAssets();
      alert("Assets imported successfully!");
    } catch (err) {
      alert("Import failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
      event.target.value = null; // reset input
    }
  };

  const filteredAssets = assets.filter(a => 
    a.hostname?.toLowerCase().includes(search.toLowerCase()) || 
    a.ip_address?.includes(search) ||
    a.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2 rounded-xl border border-indigo-200">
            <Database className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-siem-text tracking-tight">Asset Inventory</h1>
            <p className="text-sm text-siem-muted font-medium mt-0.5">CMDB enrichment context</p>
          </div>
        </div>
        <div className="flex gap-3">
           <input 
             type="file" 
             ref={fileInputRef} 
             onChange={handleFileUpload} 
             accept=".csv" 
             className="hidden" 
           />
           <button 
             onClick={() => fileInputRef.current.click()}
             disabled={loading}
             className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all"
           >
             <UploadCloud className="w-4 h-4" /> Import CSV
           </button>
        </div>
      </div>

      <div className="bg-siem-panel border border-siem-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-4 border-b border-siem-border bg-siem-bg/50">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-siem-muted absolute left-3 top-3" />
            <input 
              type="text" 
              placeholder="Search by IP, Hostname, or Department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-siem-panel border border-siem-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading && assets.length === 0 ? (
             <div className="p-12 text-center text-siem-muted font-medium animate-pulse">Loading CMDB...</div>
          ) : assets.length === 0 ? (
             <div className="p-16 text-center text-siem-muted font-medium flex flex-col items-center">
                <div className="w-16 h-16 bg-siem-bg rounded-full flex items-center justify-center mb-4 border border-siem-border">
                  <Server className="w-8 h-8 text-slate-300" />
                </div>
                No assets in inventory. Import a CSV to begin.
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-siem-bg border-b border-siem-border text-[10px] uppercase tracking-widest text-siem-muted font-bold sticky top-0 shadow-sm z-10">
                  <th className="p-4 pl-6 font-medium">Hostname / IP</th>
                  <th className="p-4 font-medium">Criticality</th>
                  <th className="p-4 font-medium">Asset Type</th>
                  <th className="p-4 font-medium">Owner / Dept</th>
                  <th className="p-4 font-medium">Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-siem-border text-sm">
                {filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-siem-bg transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-siem-text flex items-center gap-2">
                        {asset.hostname || "Unknown"}
                      </div>
                      <div className="text-[10px] text-siem-muted font-mono mt-0.5">{asset.ip_address}</div>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={asset.criticality?.toUpperCase() || 'MEDIUM'} />
                    </td>
                    <td className="p-4">
                      <div className="text-siem-text font-medium">{asset.asset_type || "N/A"}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-800 font-medium">{asset.department || "N/A"}</div>
                      <div className="text-[10px] text-siem-muted">{asset.owner}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-siem-muted text-xs">{asset.vendor || "-"}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
