import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    
    setLoading(true)
    setOpen(true)
    try {
      const res = await axios.get(`http://${window.location.hostname}:8000/api/search?q=${encodeURIComponent(query)}`)
      setResults(res.data.data || [])
    } catch (err) {
      console.error(err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-6 z-40">
      <form onSubmit={handleSearch} className="relative flex items-center">
        <div className="absolute left-4 text-siem-muted">
          <Search className="w-5 h-5" />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query Telemetry (e.g. source_ip:10.0.0.52)"
          className="w-full bg-siem-panel border border-slate-300 rounded-md py-1.5 pl-10 pr-4 text-siem-text text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
        />
        <button type="submit" className="absolute right-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold transition-colors">
          Search
        </button>
      </form>

      <AnimatePresence>
        {open && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-full left-0 right-0 mt-1 bg-siem-panel border border-siem-border rounded-md shadow-xl overflow-hidden z-50"
          >
            <div className="flex justify-between items-center bg-siem-bg px-4 py-2 border-b border-siem-border">
              <span className="text-xs font-semibold text-siem-muted uppercase tracking-wider">Search Results</span>
              <button onClick={() => setOpen(false)} className="text-siem-muted hover:text-siem-text text-xs font-medium">Close</button>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-2">
              {loading ? (
                <div className="flex justify-center items-center py-10 text-teal-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-10 text-siem-muted">No events found matching your query.</div>
              ) : (
                <div className="space-y-1">
                  {results.map((r, i) => (
                    <div key={i} className="p-2 bg-siem-panel hover:bg-siem-bg border-b border-siem-border font-mono text-[11px] text-siem-muted transition-colors cursor-default">
                      <div className="flex justify-between text-blue-600 font-semibold mb-1">
                        <span>{r.source_ip}</span>
                        <span>{new Date(r.timestamp).toLocaleTimeString()}</span>
                      </div>
                      {r.raw_log ? JSON.stringify(r.raw_log) : "No raw log data"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
