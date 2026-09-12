import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, { 
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    MiniMap,
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Play, Plus, X } from 'lucide-react';

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Trigger: High Severity Alert' },
    position: { x: 250, y: 25 },
  },
];

const initialEdges = [];

let id = 1;
const getId = () => `${++id}`;

export default function PlaybookDesigner() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type: 'default',
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance],
  );

  const savePlaybook = () => {
    if (reactFlowInstance) {
      const flow = reactFlowInstance.toObject();
      console.log('Saved playbook JSON:', flow);
      alert('Playbook saved! Check console for JSON.');
    }
  };

  const Sidebar = () => (
    <div className="w-64 bg-gray-900 border-r border-gray-800 p-4 text-white flex flex-col gap-4">
      <h3 className="font-bold text-lg mb-4 text-gray-200">SOAR Nodes</h3>
      
      <div className="text-sm font-semibold text-gray-400 mb-1">Logic</div>
      <div className="bg-gray-800 p-2 rounded cursor-grab border border-gray-700 hover:border-blue-500" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'Condition')} draggable>
        Condition (IF)
      </div>
      <div className="bg-gray-800 p-2 rounded cursor-grab border border-gray-700 hover:border-blue-500" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'ForEach')} draggable>
        ForEach Loop
      </div>
      <div className="bg-gray-800 p-2 rounded cursor-grab border border-gray-700 hover:border-blue-500" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'Approval')} draggable>
        Approval Gate
      </div>

      <div className="text-sm font-semibold text-gray-400 mt-4 mb-1">Actions</div>
      <div className="bg-gray-800 p-2 rounded cursor-grab border border-gray-700 hover:border-red-500" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'Block_IP')} draggable>
        Firewall: Block IP
      </div>
      <div className="bg-gray-800 p-2 rounded cursor-grab border border-gray-700 hover:border-green-500" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'VirusTotal')} draggable>
        Enrich: VirusTotal
      </div>

      <div className="text-sm font-semibold text-gray-400 mt-4 mb-1">Advanced</div>
      <div className="bg-gray-800 p-2 rounded cursor-grab border border-gray-700 hover:border-yellow-500" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'Python')} draggable>
        Python Script
      </div>
      <div className="bg-gray-800 p-2 rounded cursor-grab border border-gray-700 hover:border-yellow-500" onDragStart={(event) => event.dataTransfer.setData('application/reactflow', 'YARA')} draggable>
        YARA Scan
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] w-full text-gray-200">
      <Sidebar />
      <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
            className="bg-gray-950"
          >
            <Controls className="bg-gray-800 border-gray-700 fill-gray-200" />
            <MiniMap nodeStrokeColor="#555" nodeColor="#333" maskColor="rgba(0,0,0,0.7)" />
            <Background color="#333" gap={16} />
            
            <Panel position="top-right" className="flex gap-2">
              <button onClick={savePlaybook} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium">
                <Save size={16} /> Save Draft
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2 text-sm font-medium">
                <Play size={16} /> Simulate
              </button>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
