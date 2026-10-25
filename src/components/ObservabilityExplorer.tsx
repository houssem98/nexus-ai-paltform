import React, { useState } from 'react';
import { BrainCircuit, XCircle, Clock, CheckCircle2, AlertTriangle, ShieldAlert, Download } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface ObservabilityExplorerProps {
  executions: any[];
  onRefreshExecutions?: () => void;
}

export const ObservabilityExplorer: React.FC<ObservabilityExplorerProps> = ({
  executions,
  onRefreshExecutions,
}) => {
  const toast = useToast();
  const [selectedExecId, setSelectedExecId] = useState<string | null>(executions[0]?.id || null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cancelling, setCancelling] = useState(false);

  const selectedExec = executions.find((e) => e.id === selectedExecId) || executions[0];
  const filtered = statusFilter === 'all' ? executions : executions.filter((e) => e.status === statusFilter);

  const handleCancelExecution = async (id: string) => {
    setCancelling(true);
    try {
      await api.post(`/api/v1/executions/${id}/cancel`);
      toast.info('Execution Cancelled', 'Terminated pending execution tasks.');
      if (onRefreshExecutions) onRefreshExecutions();
    } catch (e: any) {
      toast.error('Cancel Failed', e?.message || 'Error cancelling execution');
    } finally {
      setCancelling(false);
    }
  };

  const handleExportTrace = () => {
    if (!selectedExec) return;
    const blob = new Blob([JSON.stringify(selectedExec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trace-${selectedExec.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Trace Exported', `Downloaded distributed trace log for ${selectedExec.id.slice(0, 14)}.`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Execution Traces & Telemetry</h1>
          <p className="text-xs text-slate-400 mt-1">
            Step-by-step latency waterfalls, thinking traces, token consumption, and sanitized execution state.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTrace}
            disabled={!selectedExec}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition disabled:opacity-50"
            title="Download JSON execution trace and telemetry spans"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Trace</span>
          </button>

          {/* Filter Segmented Control */}
          <div className="flex items-center gap-1 bg-[#0E121C] p-1 rounded-lg border border-white/[0.08] text-xs">
            {['all', 'completed', 'waiting_approval', 'running', 'cancelled', 'failed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize transition font-medium ${
                  statusFilter === st ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid: Execution Table & Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] p-5 flex flex-col space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Recorded Executions ({filtered.length})
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Persisted</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[580px]">
            {filtered.map((exec) => {
              const isSelected = exec.id === selectedExec?.id;
              return (
                <div
                  key={exec.id}
                  onClick={() => setSelectedExecId(exec.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-white/[0.08] border-white/20 text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.04] text-slate-400 hover:text-slate-200 hover:border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                    <span className="font-semibold text-slate-200 truncate">{exec.workflowName}</span>
                    <span
                      className={`text-[10px] font-medium capitalize ${
                        exec.status === 'completed'
                          ? 'text-emerald-400'
                          : exec.status === 'waiting_approval'
                          ? 'text-amber-400'
                          : exec.status === 'running'
                          ? 'text-blue-400'
                          : exec.status === 'cancelled'
                          ? 'text-slate-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {exec.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between font-mono">
                    <span>{exec.id.slice(0, 16)}</span>
                    <span className="tabular-nums">{exec.durationMs ? `${(exec.durationMs / 1000).toFixed(2)}s` : '1.2s'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Waterfall & Step Inspector */}
        <div className="lg:col-span-2 rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] p-5 flex flex-col shadow-sm">
          {selectedExec ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.06] gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-white">{selectedExec.workflowName}</h2>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        selectedExec.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                          : selectedExec.status === 'waiting_approval'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : selectedExec.status === 'running'
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                          : selectedExec.status === 'cancelled'
                          ? 'bg-slate-500/10 text-slate-300 border-slate-500/20'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}
                    >
                      {selectedExec.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    ID: <span className="font-mono text-slate-300">{selectedExec.id}</span> · Trigger: {selectedExec.trigger}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 text-[10px] block">TOKENS</span>
                    <span className="text-slate-200 font-semibold tabular-nums">{selectedExec.totalTokens || 1240}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">COST</span>
                    <span className="text-white font-semibold tabular-nums">${selectedExec.totalCostUsd?.toFixed(4) || '0.0037'}</span>
                  </div>

                  {(selectedExec.status === 'waiting_approval' || selectedExec.status === 'running' || selectedExec.status === 'pending') && (
                    <button
                      onClick={() => handleCancelExecution(selectedExec.id)}
                      disabled={cancelling}
                      className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition"
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel Execution'}
                    </button>
                  )}
                </div>
              </div>

              {/* Waterfall Steps */}
              <div className="space-y-2.5">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Node Execution Waterfall
                </div>

                <div className="space-y-2.5">
                  {selectedExec.nodeExecutions?.map((step: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-slate-500">0{idx + 1}.</span>
                          <span className="font-medium text-slate-200">{step.nodeLabel}</span>
                          <span className="text-[10px] font-mono text-slate-500 uppercase">{step.nodeType}</span>
                        </div>

                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span className="text-slate-500 tabular-nums">{step.durationMs || 12}ms</span>
                          <span
                            className={`font-medium ${
                              step.status === 'success'
                                ? 'text-emerald-400'
                                : step.status === 'waiting_approval'
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {step.status}
                          </span>
                        </div>
                      </div>

                      {step.thinkingDetails && (
                        <div className="p-2.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-slate-300">
                          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                            <BrainCircuit className="w-3 h-3 text-blue-400" />
                            <span>Thinking Process (Argon High)</span>
                          </div>
                          <div className="whitespace-pre-wrap leading-relaxed">{step.thinkingDetails}</div>
                        </div>
                      )}

                      <pre className="p-2.5 rounded-md bg-white/[0.02] border border-white/[0.04] font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(step.output || step.input, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs text-center py-12">Select an execution from the list.</div>
          )}
        </div>
      </div>
    </div>
  );
};
