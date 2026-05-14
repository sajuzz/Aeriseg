import React, { useCallback, useMemo, useEffect, useState } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Shield, Target, User, Activity, Zap } from 'lucide-react';

export default function CorrelationGraph() {
  const { id } = useParams();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  const fetchGraphData = useCallback(async () => {
    try {
      const res = await axios.get(`/api/investigations/${id}`);
      const { investigation, events } = res.data;

      const newNodes = [];
      const newEdges = [];

      // 1. Center Node (The Investigation/Campaign)
      newNodes.push({
        id: 'campaign',
        type: 'default',
        data: { label: (
          <div className="flex flex-col items-center gap-2 p-2">
            <Target className="w-6 h-6 text-red-500" />
            <div className="text-[10px] font-black uppercase text-white">{investigation.title}</div>
            <div className="text-[8px] text-siem-muted">INVESTIGATION CORE</div>
          </div>
        ) },
        position: { x: 400, y: 300 },
        style: { background: '#1e293b', border: '2px solid #e11d48', borderRadius: '12px', width: 200 }
      });

      // 2. Event Nodes & Entity Nodes
      const uniqueIps = new Set();
      
      events.forEach((event, idx) => {
        const eventNodeId = `event-${event.id || idx}`;
        const angle = (idx / events.length) * 2 * Math.PI;
        const radius = 250;
        
        newNodes.push({
          id: eventNodeId,
          data: { label: (
            <div className="flex flex-col items-center gap-1 p-1">
              <Zap className="w-4 h-4 text-amber-500" />
              <div className="text-[9px] font-bold text-white truncate w-24">{event.event_type}</div>
            </div>
          ) },
          position: { 
            x: 400 + radius * Math.cos(angle), 
            y: 300 + radius * Math.sin(angle) 
          },
          style: { background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', width: 120 }
        });

        newEdges.push({
          id: `e-camp-${eventNodeId}`,
          source: 'campaign',
          target: eventNodeId,
          animated: true,
          style: { stroke: '#334155' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#334155' }
        });

        // 3. IP Entity Nodes
        if (event.source_ip && !uniqueIps.has(event.source_ip)) {
          uniqueIps.add(event.source_ip);
          const ipNodeId = `ip-${event.source_ip}`;
          
          newNodes.push({
            id: ipNodeId,
            data: { label: (
              <div className="flex flex-col items-center gap-1 p-1">
                <Activity className="w-4 h-4 text-blue-500" />
                <div className="text-[9px] font-black text-blue-400">{event.source_ip}</div>
              </div>
            ) },
            position: { 
              x: 400 + (radius + 150) * Math.cos(angle + 0.2), 
              y: 300 + (radius + 150) * Math.sin(angle + 0.2) 
            },
            style: { background: '#1e293b', border: '1px solid #3b82f6', borderRadius: '20px', width: 100 }
          });

          newEdges.push({
            id: `e-${eventNodeId}-${ipNodeId}`,
            source: eventNodeId,
            target: ipNodeId,
            style: { stroke: '#3b82f6', strokeDasharray: '5,5' }
          });
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err) {
      console.error("Graph build failed:", err);
    } finally {
      setLoading(false);
    }
  }, [id, setNodes, setEdges]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  return (
    <div className="h-full w-full bg-slate-950 enterprise-card overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur p-2 rounded-lg border border-siem-border">
        <Shield className="w-4 h-4 text-blue-500" />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">Attack Correlation Graph</span>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background color="#334155" gap={20} />
        <Controls />
        <MiniMap 
          nodeColor={(n) => {
            if (n.id === 'campaign') return '#e11d48';
            return '#1e293b';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
          style={{ background: '#0f172a', border: '1px solid #334155' }}
        />
      </ReactFlow>
    </div>
  );
}
