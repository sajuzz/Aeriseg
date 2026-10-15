import { useState, useEffect, useRef } from 'react'
import { Bot, Send, Zap, Factory, ShieldAlert, Wrench, FileText, BarChart3, Sparkles, RefreshCw, ChevronRight, Copy, Check, AlertTriangle, Lock, Cpu, Activity } from 'lucide-react'

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash'

const SYSTEM_PROMPT = `You are the AeriSeg Manufacturing AI Copilot — an expert in OT/ICS cybersecurity, Purdue Model (L0-L4), MITRE ATT&CK for ICS, predictive maintenance (MTBF/OEE), and ISA/IEC 62443 compliance.
Respond as a concise expert OT security analyst. Use:
- 🔴🟡🟢 risk indicators
- Numbered action steps  
- Production impact estimates (% downtime risk, $/hr loss)
- MITRE ATT&CK ICS technique references
Always flag if actions require human approval before execution on live OT systems.
Keep responses structured and under 350 words.`

const STARTERS = [
  { id:'s1', label:'🔴 Active Threat Assessment', prompt:'What are the highest priority OT threats right now and what should I do first?', cat:'threat' },
  { id:'s2', label:'🔧 Predictive Maintenance', prompt:'Which assets are at highest risk of failure? Give me MTBF estimates and production impact.', cat:'maintenance' },
  { id:'s3', label:'🏭 PLC Anomaly Analysis', prompt:'Explain the PLC anomaly detected on Assembly Line B in plain English for a plant manager.', cat:'explain' },
  { id:'s4', label:'📊 Executive Report', prompt:'Generate an executive OT security summary for the last 24 hours with ISA 62443 compliance status.', cat:'report' },
  { id:'s5', label:'🤖 Gemini Deep Analysis', prompt:'Use AI to analyze the latest cross-zone lateral movement event and assess TRITON/TRISIS risk.', cat:'gemini' },
  { id:'s6', label:'⚡ 5-Step Response Plan', prompt:'The engineering workstation is talking to PLC subnet outside maintenance hours. Give me a 5-step response plan.', cat:'response' },
]

const CAT_COLORS = {
  threat:'border-red-500/40 hover:border-red-400 text-red-400',
  maintenance:'border-amber-500/40 hover:border-amber-400 text-amber-400',
  explain:'border-cyan-500/40 hover:border-cyan-400 text-cyan-400',
  report:'border-blue-500/40 hover:border-blue-400 text-blue-400',
  gemini:'border-violet-500/40 hover:border-violet-400 text-violet-400',
  response:'border-emerald-500/40 hover:border-emerald-400 text-emerald-400',
}

async function callGemini(message, history) {
  const contents = history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts:[{text: m.content}] }))
  contents.push({ role:'user', parts:[{text: message}] })
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        system_instruction:{ parts:[{text: SYSTEM_PROMPT}] },
        contents,
        generationConfig:{ temperature:0.7, maxOutputTokens:1024 }
      })
    }
  )
  if (!res.ok) throw new Error(`Gemini error ${res.status}`)
  const data = await res.json()
  return data.candidates[0].content.parts[0].text
}

function MsgContent({ text }) {
  return (
    <div className="text-sm leading-relaxed space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1"/>
        if (line.startsWith('# ')) return <p key={i} className="text-base font-bold text-white mt-2">{line.slice(2)}</p>
        if (line.startsWith('## ')) return <p key={i} className="font-bold text-white mt-2">{line.slice(3)}</p>
        if (line.match(/^[-*] /)) return (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-cyan-400 flex-shrink-0 mt-0.5">•</span>
            <span className="text-gray-300" dangerouslySetInnerHTML={{__html: line.slice(2).replace(/\*\*(.*?)\*\*/g,'<strong class="text-white">$1</strong>')}}/>
          </div>
        )
        if (line.match(/^\d+\./)) return (
          <div key={i} className="flex gap-2 items-start">
            <span className="text-cyan-400 font-bold w-5 flex-shrink-0">{line.match(/^\d+/)[0]}.</span>
            <span className="text-gray-300" dangerouslySetInnerHTML={{__html: line.replace(/^\d+\./,'').replace(/\*\*(.*?)\*\*/g,'<strong class="text-white">$1</strong>')}}/>
          </div>
        )
        if (line.startsWith('|')) {
          const cells = line.split('|').filter(Boolean)
          if (cells.every(c => /^[-: ]+$/.test(c))) return null
          return (
            <div key={i} className="flex text-xs font-mono border-b border-white/10 pb-1">
              {cells.map((c,ci) => <span key={ci} className={`flex-1 px-2 py-0.5 ${ci===0?'text-cyan-300':'text-gray-300'}`}>{c.trim()}</span>)}
            </div>
          )
        }
        return <p key={i} className="text-gray-300" dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g,'<strong class="text-white">$1</strong>').replace(/`(.*?)`/g,'<code class="bg-white/10 px-1 rounded text-cyan-300 text-xs">$1</code>')}}/>
      })}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0,1,2].map(i=>(
        <div key={i} className="w-2 h-2 rounded-full bg-cyan-400" style={{animation:`copilot-bounce 1.2s ease-in-out ${i*0.2}s infinite`}}/>
      ))}
      <span className="text-xs text-gray-400 ml-2">Gemini is analyzing OT telemetry…</span>
    </div>
  )
}

export default function ManufacturingCopilot() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(null)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}) }, [messages, loading])

  const send = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = { role:'user', content:text.trim(), ts:new Date() }
    setMessages(p => [...p, userMsg])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const history = messages.map(m=>({role:m.role, content:m.content}))
      const reply = await callGemini(text.trim(), history)
      setMessages(p => [...p, { role:'assistant', content:reply, ts:new Date() }])
    } catch(e) {
      setError('Gemini API error: ' + e.message)
      setMessages(p => [...p, { role:'assistant', content:'⚠️ Gemini connection failed. Check VITE_GEMINI_API_KEY in frontend/.env and restart the dev server.', error:true, ts:new Date() }])
    } finally {
      setLoading(false)
      setTimeout(()=>inputRef.current?.focus(),100)
    }
  }

  const injectJson = () => {
    if (!jsonText.trim()) return
    setJsonMode(false)
    send(`Analyze this raw OT telemetry and assess security implications:\n\`\`\`json\n${jsonText.trim()}\n\`\`\``)
    setJsonText('')
  }

  const copyMsg = (idx, txt) => { navigator.clipboard.writeText(txt); setCopied(idx); setTimeout(()=>setCopied(null),2000) }

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] -m-8 bg-[var(--background)]">
      <style>{`@keyframes copilot-bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}`}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Bot className="w-5 h-5 text-white"/>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[var(--surface)] animate-pulse"/>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text)]">Manufacturing AI Copilot</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-violet-500/10 text-violet-400 border border-violet-500/30 uppercase">Gemini Live</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">OT/ICS expert · Purdue Model-aware · Safety-first</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setJsonMode(s=>!s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors">
            <FileText className="w-3.5 h-3.5"/><span className="hidden md:inline">Inject JSON</span>
          </button>
          {messages.length>0 && (
            <button onClick={()=>setMessages([])} className="px-3 py-1.5 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)] text-xs font-semibold hover:text-[var(--text)] transition-colors">
              <RefreshCw className="w-3.5 h-3.5"/>
            </button>
          )}
        </div>
      </div>

      {/* JSON Inject Panel */}
      {jsonMode && (
        <div className="mx-8 mt-4 flex-shrink-0 p-4 bg-[var(--surface)] rounded-xl border border-amber-500/40">
          <p className="text-sm font-bold text-amber-400 mb-2">Paste OT Alert / Suricata EVE JSON</p>
          <textarea value={jsonText} onChange={e=>setJsonText(e.target.value)}
            className="w-full h-28 bg-black/40 border border-[var(--border)] rounded-lg p-3 text-xs font-mono text-green-300 focus:outline-none focus:border-amber-500 resize-none"
            placeholder='{"event_type":"alert","src_ip":"192.168.1.200","alert":{"signature":"ET ICS Modbus Write"}}'/>
          <div className="flex gap-2 mt-2">
            <button onClick={injectJson} disabled={!jsonText.trim()||loading} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50">
              <Zap className="w-3.5 h-3.5"/>Analyze with Gemini
            </button>
            <button onClick={()=>setJsonMode(false)} className="px-4 py-2 rounded-lg bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-muted)] text-xs">Cancel</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-start px-8 py-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600/30 to-cyan-500/30 border border-violet-500/30 flex items-center justify-center mb-4">
              <Factory className="w-10 h-10 text-violet-300"/>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Ask about your manufacturing operations</h2>
            <p className="text-sm text-[var(--text-muted)] max-w-lg text-center">OT/ICS expert AI with full Purdue-model context, asset inventory, and real-time telemetry awareness.</p>
            <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--text-muted)]">
              <Sparkles className="w-3.5 h-3.5 text-violet-400"/>
              <span>Powered by <strong className="text-violet-300">Google Gemini on Vertex AI</strong> · Live API</span>
            </div>
            <div className="w-full max-w-3xl mt-8">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold mb-3">Quick Starts</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {STARTERS.map(s => (
                  <button key={s.id} onClick={()=>send(s.prompt)} disabled={loading}
                    className={`text-left p-3 rounded-xl border bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-all disabled:opacity-40 ${CAT_COLORS[s.cat]||'border-[var(--border)]'}`}>
                    <p className={`text-xs font-bold mb-1 ${CAT_COLORS[s.cat]?.split(' ').find(c=>c.startsWith('text-'))||'text-gray-400'}`}>{s.label}</p>
                    <p className="text-xs text-gray-400 line-clamp-2">{s.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-8 py-6 space-y-6 max-w-4xl mx-auto w-full">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role==='user'?'justify-end':'justify-start'}`}>
                {msg.role==='assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-1 shadow-lg shadow-violet-500/20">
                    <Bot className="w-4 h-4 text-white"/>
                  </div>
                )}
                <div className="max-w-[85%]">
                  {msg.role==='user' ? (
                    <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm shadow-md">
                      <p>{msg.content}</p>
                    </div>
                  ) : (
                    <div className={`rounded-2xl rounded-tl-sm px-5 py-4 border ${msg.error?'bg-red-950/20 border-red-500/30':'bg-[var(--surface)] border-[var(--border)]'}`}>
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--border)]">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0"/>
                        <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Google Gemini · {GEMINI_MODEL}</span>
                      </div>
                      <MsgContent text={msg.content}/>
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--border)]">
                        <span className="text-[10px] text-[var(--text-muted)]">{msg.ts?.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                        <button onClick={()=>copyMsg(idx, msg.content)} className="ml-auto flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
                          {copied===idx?<Check className="w-3 h-3 text-emerald-400"/>:<Copy className="w-3 h-3"/>}
                          {copied===idx?'Copied':'Copy'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {msg.role==='user' && (
                  <div className="w-8 h-8 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold text-[var(--text)]">OP</div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white"/>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl rounded-tl-sm"><TypingDots/></div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2 text-[10px] text-[var(--text-muted)]">
            <Lock className="w-3 h-3 text-amber-400 flex-shrink-0"/>
            <span>Disruptive OT actions require <strong className="text-amber-400">human operator authorization</strong> — AeriSeg Safety Policy enforced.</span>
          </div>
          <div className="flex gap-3 items-end">
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(input)} }}
              disabled={loading} rows={1} placeholder="Ask about OT threats, maintenance risks, PLC anomalies, compliance status…"
              className="flex-1 bg-[var(--background)] border border-[var(--border)] focus:border-cyan-500 rounded-2xl px-5 py-3.5 text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none transition-colors resize-none disabled:opacity-50"
              style={{minHeight:'52px',maxHeight:'140px'}}
              onInput={e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,140)+'px'}}
            />
            <button onClick={()=>send(input)} disabled={loading||!input.trim()} id="copilot-send-btn"
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 transition-all disabled:opacity-40 flex-shrink-0">
              {loading?<RefreshCw className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}
            </button>
          </div>
          {messages.length>0&&!loading&&(
            <div className="flex flex-wrap gap-2 mt-3">
              {['Generate incident response playbook','Show ISA 62443 compliance gaps','Estimate production downtime cost in $'].map((s,i)=>(
                <button key={i} onClick={()=>send(s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-cyan-500/50 transition-colors">
                  <ChevronRight className="w-3 h-3"/>{s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
