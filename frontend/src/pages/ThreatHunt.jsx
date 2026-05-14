import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import QueryBar from '../components/QueryBar';
import ResultsTable from '../components/ResultsTable';
import TimeRangePicker from '../components/TimeRangePicker';
import { useEventDrawerStore } from '../store/useEventDrawerStore';
import { Database, Filter, ArrowUpDown, Terminal, Shield } from 'lucide-react';

export default function ThreatHunt() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qParam = searchParams.get('q');
  
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ returned_count: 0, total_count: 0 });
  const [metadata, setMetadata] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");
  const [timeRange, setTimeRange] = useState("24h");
  const closeDrawer = useEventDrawerStore(state => state.closeDrawer);

  const performHunt = async (queryStr) => {
    setLoading(true);
    setCurrentQuery(queryStr);
    try {
      const res = await axios.post('/api/query', {
        query: queryStr,
        time_range: timeRange,
        page_size: 50,
        page: 1
      });

      setEvents(res.data.events);
      setStats(res.data.stats);
      setMetadata(res.data.metadata);
    } catch (err) {
      console.error("Hunt failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (qParam) {
      performHunt(qParam);
    } else {
      performHunt(currentQuery);
    }
  }, [qParam, timeRange]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Threat Hunting</h1>
          <p className="text-siem-muted text-sm font-medium">Analyze telemetry across segmented isolation grids.</p>
        </div>

        <div className="flex gap-3">
          <TimeRangePicker value={timeRange} onChange={setTimeRange} />
          <div className="bg-siem-panel border border-siem-border px-4 py-2 rounded-xl shadow-sm text-xs font-bold text-siem-text flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="siem-mono">{stats.total_count.toLocaleString()}</span> Events
          </div>
        </div>
      </div>

      <QueryBar onSearch={performHunt} initialQuery={currentQuery} />

      <div className="space-y-4">
        <div className="flex items-center justify-between text-[11px] text-siem-muted font-black uppercase tracking-widest px-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Filter className="w-3 h-3 text-blue-400"/> {stats.returned_count} Results</span>
            {metadata.execution_time_ms && <span>Execution: {metadata.execution_time_ms}ms</span>}
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 hover:text-white transition-colors"><ArrowUpDown className="w-3 h-3"/> Sort: Time</button>
          </div>
        </div>

        <ResultsTable 
          events={events} 
          loading={loading} 
        />
      </div>
    </div>
  );
}
