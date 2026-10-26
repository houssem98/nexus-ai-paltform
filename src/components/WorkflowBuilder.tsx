import React, { useState, useEffect } from 'react';
import {
  Play,
  Save,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bot,
  Blocks,
  BookOpen,
  Filter,
  UserCheck,
  Flag,
  X,
  Loader2,
  Sliders,
  Copy,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface WorkflowNode {
  id: string;
  type: 'start' | 'end' | 'agent' | 'model' | 'tool' | 'condition' | 'transform' | 'approval' | 'loop' | 'knowledge';
  label: string;
  x: number;
  y: number;
  config: Record<string, any>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: string;
}

interface WorkflowBuilderProps {
  workflows: any[];
  agents: any[];
  knowledge: any[];
  integrations: any[];
  onRefreshWorkflows: () => void;
  onRefreshExecutions: () => void;
  selectedWorkflowId?: string;
  onSelectWorkflowId?: (id: string) => void;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  workflows,
  agents,
  knowledge,
  integrations,
  onRefreshWorkflows,
  onRefreshExecutions,
  selectedWorkflowId: externalWorkflowId,
  onSelectWorkflowId: externalSelectWorkflowId,
}) => {
  const toast = useToast();
  const [internalWorkflowId, setInternalWorkflowId] = useState<string>(workflows[0]?.id || '');
  const selectedWorkflowId = externalWorkflowId || internalWorkflowId;

  const workflow = workflows.find((w) => w.id === selectedWorkflowId) || workflows[0];
  const activeVer = workflow?.versions?.find((v: any) => v.version === workflow?.activeVersion) || workflow?.versions?.[0];

  const [nodes, setNodes] = useState<WorkflowNode[]>(activeVer?.nodes || []);
  const [edges, setEdges] = useState<WorkflowEdge[]>(activeVer?.edges || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (externalWorkflowId) {
      const wf = workflows.find((w) => w.id === externalWorkflowId);
      if (wf) {
        const v = wf.versions?.find((ver: any) => ver.version === wf.activeVersion) || wf.versions?.[0];
        setNodes(v?.nodes || []);
        setEdges(v?.edges || []);
      }
    }
  }, [externalWorkflowId, workflows]);

  // Viewport transforms
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mouseStartPan, setMouseStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Edge drawing
  const [connectingSourceNodeId, setConnectingSourceNodeId] = useState<string | null>(null);

  // Validation & Test Execution
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: string[]; warnings: string[] } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<any>(null);
  const [nodeExecutionStatuses, setNodeExecutionStatuses] = useState<Record<string, 'running' | 'success' | 'failed' | 'waiting_approval'>>({});
  const [isSaved, setIsSaved] = useState(false);

  // Custom Test Input payload
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify(
      {
        invoiceId: 'INV-2026-9042',
        vendor: 'Apex Frontier AI Hardware Corp',
        amount: 84200,
        poNumber: 'PO-88190',
      },
      null,
      2
    )
  );

  const nodePalette = [
    { type: 'start' as const, label: 'Start Trigger', icon: Play },
    { type: 'knowledge' as const, label: 'Knowledge Retrieval', icon: BookOpen },
    { type: 'agent' as const, label: 'AI Agent (Reasoning)', icon: Bot },
    { type: 'condition' as const, label: 'Conditional Branch', icon: Filter },
    { type: 'approval' as const, label: 'Human Approval Gate', icon: UserCheck },
    { type: 'tool' as const, label: 'Tool / ERP Commit', icon: Blocks },
    { type: 'end' as const, label: 'End Terminal', icon: Flag },
  ];

  const handleSelectWorkflow = (wf: any) => {
    if (externalSelectWorkflowId) {
      externalSelectWorkflowId(wf.id);
    } else {
      setInternalWorkflowId(wf.id);
    }
    const v = wf.versions?.find((ver: any) => ver.version === wf.activeVersion) || wf.versions?.[0];
    setNodes(v?.nodes || []);
    setEdges(v?.edges || []);
    setSelectedNodeId(null);
    setValidationResult(null);
    setExecutionOutput(null);
    setNodeExecutionStatuses({});
  };

  const handleAutoLayout = () => {
    const inDegree: Record<string, number> = {};
    nodes.forEach((n) => (inDegree[n.id] = 0));
    edges.forEach((e) => {
      if (inDegree[e.target] !== undefined) inDegree[e.target]++;
    });

    const levels: Record<string, number> = {};
    const queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);
    queue.forEach((id) => (levels[id] = 0));

    let safety = 0;
    while (queue.length > 0 && safety < 100) {
      safety++;
      const current = queue.shift()!;
      const currentLevel = levels[current] || 0;
      const outgoing = edges.filter((e) => e.source === current);
      for (const edge of outgoing) {
        levels[edge.target] = Math.max(levels[edge.target] || 0, currentLevel + 1);
        if (!queue.includes(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    const levelGroups: Record<number, WorkflowNode[]> = {};
    nodes.forEach((n) => {
      const lvl = levels[n.id] || 0;
      if (!levelGroups[lvl]) levelGroups[lvl] = [];
      levelGroups[lvl].push(n);
    });

    const updatedNodes = nodes.map((n) => {
      const lvl = levels[n.id] || 0;
      const group = levelGroups[lvl] || [n];
      const idx = group.findIndex((gn) => gn.id === n.id);
      return {
        ...n,
        x: 80 + lvl * 260,
        y: 120 + idx * 160,
      };
    });

    setNodes(updatedNodes);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    toast.success('Auto-Layout Applied', 'Optimized DAG layout and port alignment.');
  };

  const handleDuplicateWorkflow = async () => {
    try {
      const res = await api.post<any>(`/api/v1/workflows/${workflow.id}/duplicate`, {});
      toast.success('Workflow Cloned', `Created copy "${res.workflow?.name}".`);
      onRefreshWorkflows();
      if (res.workflow) {
        handleSelectWorkflow(res.workflow);
      }
    } catch (err: any) {
      toast.error('Clone Failed', err?.message || 'Failed to duplicate workflow');
    }
  };

  const handleAddNode = (type: WorkflowNode['type'], label: string) => {
    const id = `n_${type}_${Date.now().toString().slice(-4)}`;
    const newNode: WorkflowNode = {
      id,
      type,
      label,
      x: Math.round(-pan.x + 280 + Math.random() * 80),
      y: Math.round(-pan.y + 180 + Math.random() * 60),
      config:
        type === 'agent'
          ? { agentId: agents[0]?.id }
          : type === 'condition'
          ? { field: 'input.amount', operator: '>', value: 25000 }
          : type === 'approval'
          ? { requiredRole: 'workspace_admin' }
          : type === 'knowledge'
          ? { collectionId: knowledge[0]?.id }
          : type === 'tool'
          ? { toolId: integrations[0]?.id, method: 'POST' }
          : {},
    };

    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
    toast.info('Node Added', `Inserted ${label} into DAG canvas.`);
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    toast.info('Node Deleted', 'Removed node and linked edges.');
  };

  const handleStartConnect = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connectingSourceNodeId) {
      setConnectingSourceNodeId(nodeId);
    } else if (connectingSourceNodeId !== nodeId) {
      const newEdgeId = `e_${connectingSourceNodeId}_${nodeId}_${Date.now().toString().slice(-3)}`;
      const sourceNode = nodes.find((n) => n.id === connectingSourceNodeId);
      const isCondition = sourceNode?.type === 'condition';

      const existingEdges = edges.filter((edge) => edge.source === connectingSourceNodeId);
      let label = undefined;
      if (isCondition) {
        label = existingEdges.length === 0 ? 'True' : 'False';
      }

      setEdges((prev) => [...prev, { id: newEdgeId, source: connectingSourceNodeId, target: nodeId, label }]);
      setConnectingSourceNodeId(null);
      toast.success('Nodes Connected', 'Established execution dependency edge.');
    }
  };

  const handleValidateGraph = async () => {
    try {
      const res = await api.post<any>(`/api/v1/workflows/${workflow.id}/validate`, {
        nodes,
        edges,
      });
      setValidationResult(res);
      if (res.valid) {
        toast.success('Graph Checked', 'Start and End present, edges point to real nodes. Cycles are not checked yet.');
      } else {
        toast.warning('Topology Warning', res.errors?.[0] || 'Graph validation issues found.');
      }
    } catch (err: any) {
      setValidationResult({
        valid: false,
        errors: [err?.message || 'Validation request failed'],
        warnings: [],
      });
      toast.error('Validation Failed', err?.message || 'Failed to validate graph');
    }
  };

  const handleSaveWorkflow = async () => {
    try {
      await api.put(`/api/v1/workflows/${workflow.id}`, {
        nodes,
        edges,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
      toast.success('Workflow Saved', `Saved ${nodes.length} nodes and ${edges.length} edges.`);
      onRefreshWorkflows();
    } catch (e: any) {
      toast.error('Save Failed', e?.message || 'Failed to save workflow');
    }
  };

  const handleExecuteWorkflow = async () => {
    setIsExecuting(true);
    setExecutionOutput(null);
    setNodeExecutionStatuses({});
    toast.info('Executing Pipeline', 'Traversing DAG node sequence...');

    let parsedPayload = {};
    try {
      parsedPayload = JSON.parse(testPayload);
    } catch {
      parsedPayload = { test: true };
    }

    try {
      const res = await api.post<any>(`/api/v1/workflows/${workflow.id}/execute`, {
        input: parsedPayload,
        trigger: 'manual',
      });

      // Node rings show what the server recorded for each node, nothing more.
      setNodeExecutionStatuses(Object.fromEntries((res.execution?.nodeExecutions ?? []).map((n: any) => [n.nodeId, n.status])));
      setExecutionOutput(res.execution);
      if (res.execution?.status === 'completed') {
        toast.success('Execution Completed', res.execution.simulated ? 'Simulated in demo mode.' : 'Every node ran.');
      } else {
        toast.warning(`Execution ${res.execution?.status ?? 'unknown'}`, res.execution?.error ?? 'See the node trace.');
      }
      onRefreshExecutions();
    } catch (err: any) {
      setExecutionOutput({ error: err?.message || 'Execution error' });
      toast.error('Execution Failed', err?.message || 'Pipeline execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleMouseDownNode = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggedNodeId(nodeId);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      const dx = (e.clientX - dragStartPos.x) / zoom;
      const dy = (e.clientY - dragStartPos.y) / zoom;
      setNodes((prev) =>
        prev.map((n) => (n.id === draggedNodeId ? { ...n, x: Math.round(n.x + dx), y: Math.round(n.y + dy) } : n))
      );
      setDragStartPos({ x: e.clientX, y: e.clientY });
    } else if (isPanning) {
      setPan({
        x: pan.x + (e.clientX - mouseStartPan.x),
        y: pan.y + (e.clientY - mouseStartPan.y),
      });
      setMouseStartPan({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUpCanvas = () => {
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden select-none bg-[#080B11]">
      {/* 1. Left: Node Palette & Pipeline Selector */}
      <div className="w-64 border-r border-white/[0.07] bg-[#0A0D14]/80 backdrop-blur-md p-4 flex flex-col shrink-0">
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Active Workflow Pipeline
          </label>
          <select
            value={selectedWorkflowId}
            onChange={(e) => {
              const wf = workflows.find((w) => w.id === e.target.value);
              if (wf) handleSelectWorkflow(wf);
            }}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-white/20"
          >
            {workflows.map((w) => (
              <option key={w.id} value={w.id} className="bg-[#0F131D]">
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* Node Library */}
        <div className="flex-1 overflow-y-auto space-y-1">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Available Node Types
          </div>
          {nodePalette.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.type}
                onClick={() => handleAddNode(p.type, p.label)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/[0.1] text-slate-300 text-xs transition group"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors" />
                  <span className="font-normal text-slate-300 group-hover:text-white">{p.label}</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-white/[0.07] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAutoLayout}
              className="py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
              title="Organize DAG layout horizontally"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Auto-Layout</span>
            </button>
            <button
              onClick={handleDuplicateWorkflow}
              className="py-1.5 px-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
              title="Clone this visual pipeline"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Clone DAG</span>
            </button>
          </div>
          <button
            onClick={handleValidateGraph}
            className="w-full py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Validate Topology</span>
          </button>
          <button
            onClick={handleSaveWorkflow}
            className="w-full py-1.5 px-3 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaved ? 'Saved' : 'Save Workflow'}</span>
          </button>
        </div>
      </div>

      {/* 2. Center: Interactive Architectural Graph Canvas */}
      <div
        className="flex-1 relative bg-canvas-grid overflow-hidden cursor-crosshair"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
            setIsPanning(true);
            setMouseStartPan({ x: e.clientX, y: e.clientY });
            setConnectingSourceNodeId(null);
          }
        }}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
      >
        {/* Floating Canvas Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-[#0D111A]/90 backdrop-blur-md border border-white/[0.08] rounded-lg p-1 shadow-lg text-xs">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.15, 2))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-1.5 tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
            title="Reset View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-white/[0.1] mx-0.5" />
          <button
            onClick={handleAutoLayout}
            className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-white/[0.06] transition flex items-center gap-1"
            title="Auto-Layout Nodes"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Canvas Toolbar Top Right: Run Test Trigger */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {connectingSourceNodeId && (
            <div className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium shadow-lg flex items-center gap-2">
              <span>Select target node port to link</span>
              <button onClick={() => setConnectingSourceNodeId(null)}>
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          <button
            onClick={handleExecuteWorkflow}
            disabled={isExecuting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Test Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* Validation Overlay */}
        {validationResult && (
          <div
            className={`absolute top-16 left-4 z-10 max-w-sm p-3 rounded-lg text-xs border backdrop-blur-md ${
              validationResult.valid
                ? 'bg-[#0E1520]/95 border-emerald-500/30 text-emerald-300'
                : 'bg-[#1A0E12]/95 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold flex items-center gap-1.5">
                {validationResult.valid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {validationResult.valid ? 'Topology Valid' : 'Topology Errors'}
              </span>
              <button onClick={() => setValidationResult(null)}>
                <X className="w-3 h-3 text-slate-400 hover:text-white" />
              </button>
            </div>
            {validationResult.errors.map((e, i) => (
              <p key={i} className="text-[11px] mt-0.5">• {e}</p>
            ))}
          </div>
        )}

        {/* Transform Container with Node Grid & Connections */}
        <div
          className="w-full h-full transform-gpu origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* SVG Connecting Edges (Bezier curves) */}
          <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none z-0">
            {edges.map((edge) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;

              const sx = sourceNode.x + 200;
              const sy = sourceNode.y + 36;
              const tx = targetNode.x;
              const ty = targetNode.y + 36;
              const dx = Math.abs(tx - sx) * 0.5;

              const pathData = `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
              const isHighlight =
                nodeExecutionStatuses[sourceNode.id] === 'success' ||
                nodeExecutionStatuses[sourceNode.id] === 'running';

              return (
                <g key={edge.id}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke={isHighlight ? '#3B82F6' : 'rgba(255, 255, 255, 0.16)'}
                    strokeWidth={isHighlight ? '2' : '1.5'}
                    strokeDasharray={edge.label ? '4 2' : undefined}
                    className="transition-colors duration-200"
                  />
                  {edge.label && (
                    <text
                      x={(sx + tx) / 2}
                      y={(sy + ty) / 2 - 6}
                      fill="#94A3B8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Render Graph Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const executionStatus = nodeExecutionStatuses[node.id];

            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleMouseDownNode(node.id, e)}
                style={{ left: `${node.x}px`, top: `${node.y}px` }}
                className={`absolute w-52 rounded-xl border p-3 shadow-xl backdrop-blur-md transition-all cursor-move select-none z-10 ${
                  executionStatus === 'running'
                    ? 'border-blue-500 bg-[#0E1422]/90 ring-1 ring-blue-500'
                    : executionStatus === 'success'
                    ? 'border-emerald-500/60 bg-[#0B1516]/90 ring-1 ring-emerald-500/40'
                    : executionStatus === 'waiting_approval'
                    ? 'border-amber-500/70 bg-[#16120D]/90 ring-1 ring-amber-500/50'
                    : isSelected
                    ? 'border-white/40 bg-[#101522]/90 ring-1 ring-white/20'
                    : 'border-white/[0.08] bg-[#0C1018]/85 hover:border-white/[0.16]'
                }`}
              >
                {/* Micro Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-semibold">
                    {node.type}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNode(node.id);
                    }}
                    className="text-slate-600 hover:text-slate-300 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Node Title */}
                <div className="text-xs font-semibold text-slate-100 mb-1 leading-snug">{node.label}</div>

                {/* Node Subtext */}
                <div className="text-[10px] text-slate-400 font-normal truncate">
                  {node.type === 'agent' && 'Gemini 4 Argon · High Thinking'}
                  {node.type === 'condition' && `${node.config.field ?? '?'} ${node.config.operator ?? '>'} ${node.config.value ?? '?'}`}
                  {node.type === 'approval' && `Role: ${node.config.requiredRole ?? 'workspace_admin'}`}
                  {node.type === 'knowledge' && (node.config.collectionId ?? 'No collection')}
                  {node.type === 'tool' && `${node.config.toolId ?? 'No tool'} (simulated)`}
                  {node.type === 'start' && 'Inbound Payload'}
                  {node.type === 'end' && 'Pipeline Terminal'}
                </div>

                {/* Connection Right Port */}
                {node.type !== 'end' && (
                  <button
                    onClick={(e) => handleStartConnect(node.id, e)}
                    title="Click to link wire"
                    className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-700 hover:bg-blue-400 border border-slate-900 transition flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </button>
                )}

                {/* Connection Left Port */}
                {node.type !== 'start' && (
                  <button
                    onClick={(e) => handleStartConnect(node.id, e)}
                    title="Connect target wire here"
                    className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-700 hover:bg-blue-400 border border-slate-900 transition flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Right: Inspector & Live Result Drawer */}
      <div className="w-80 border-l border-white/[0.07] bg-[#0A0D14]/80 backdrop-blur-md p-4 flex flex-col shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 border-b border-white/[0.07] pb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {selectedNode ? 'Node Properties' : 'Pipeline Test Payload'}
          </h3>
          {selectedNode && (
            <button onClick={() => setSelectedNodeId(null)} className="text-slate-500 hover:text-slate-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {selectedNode ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Node Title</label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes((prev) => prev.map((n) => (n.id === selectedNode.id ? { ...n, label: val } : n)));
                }}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-white/20"
              />
            </div>

            {selectedNode.type === 'agent' && (
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Reasoning Agent</label>
                <select
                  value={selectedNode.config.agentId || agents[0]?.id}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) =>
                      prev.map((n) => (n.id === selectedNode.id ? { ...n, config: { ...n.config, agentId: val } } : n))
                    );
                  }}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id} className="bg-[#0F131D]">
                      {ag.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">Model: Gemini 4 Argon (High Thinking)</p>
              </div>
            )}

            {selectedNode.type === 'condition' && (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Field</label>
                  <input
                    type="text"
                    value={selectedNode.config.field || 'input.amount'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes((prev) =>
                        prev.map((n) => (n.id === selectedNode.id ? { ...n, config: { ...n.config, field: val } } : n))
                      );
                    }}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Operator</label>
                  <select
                    value={selectedNode.config.operator || '>'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes((prev) =>
                        prev.map((n) => (n.id === selectedNode.id ? { ...n, config: { ...n.config, operator: val } } : n))
                      );
                    }}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    <option value=">">&gt; Greater than</option>
                    <option value=">=">&gt;= Greater or equal</option>
                    <option value="<">&lt; Less than</option>
                    <option value="==">== Equal</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">Threshold</label>
                  <input
                    type="number"
                    value={selectedNode.config.value ?? ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNodes((prev) =>
                        prev.map((n) => (n.id === selectedNode.id ? { ...n, config: { ...n.config, value: val } } : n))
                      );
                    }}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>
            )}

            {selectedNode.type === 'approval' && (
              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">Required Authority</label>
                <select
                  value={selectedNode.config.requiredRole || 'workspace_admin'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNodes((prev) =>
                      prev.map((n) => (n.id === selectedNode.id ? { ...n, config: { ...n.config, requiredRole: val } } : n))
                    );
                  }}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  <option value="workspace_admin" className="bg-[#0F131D]">Workspace Admin (CFO)</option>
                  <option value="org_admin" className="bg-[#0F131D]">Org Admin</option>
                  <option value="operator" className="bg-[#0F131D]">SecOps Operator</option>
                </select>
              </div>
            )}

            <div className="pt-2 border-t border-white/[0.07] text-[10px] text-slate-500 font-mono">
              ID: {selectedNode.id}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Input Payload (JSON)
              </label>
              <textarea
                rows={6}
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Execution Result */}
            {executionOutput && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-300">Run Output</span>
                  <span
                    className={`font-mono text-[10px] ${
                      executionOutput.status === 'completed'
                        ? 'text-emerald-400'
                        : executionOutput.status === 'waiting_approval'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {executionOutput.status}
                  </span>
                </div>

                <pre className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(executionOutput.output || executionOutput, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
