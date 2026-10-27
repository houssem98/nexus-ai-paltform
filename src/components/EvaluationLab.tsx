import React, { useState } from 'react';
import { useDialog } from '../lib/a11y';
import { Play, CheckCircle2, Loader2, Plus, TestTube2, Target, BarChart2, Download } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { SimulatedBadge } from './SimulatedBadge';

interface EvaluationLabProps {
  evaluations: any;
  onRefreshEvaluations: () => void;
}

export const EvaluationLab: React.FC<EvaluationLabProps> = ({ evaluations, onRefreshEvaluations }) => {
  const toast = useToast();
  const datasets = evaluations?.datasets || [];
  const runs = evaluations?.runs || [];

  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(datasets[0]?.id || '');
  const [isRunning, setIsRunning] = useState(false);

  // New Dataset modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dialogRef = useDialog<HTMLDivElement>(showCreateModal, () => setShowCreateModal(false));
  const [newSuiteName, setNewSuiteName] = useState('');
  const [newSuiteDesc, setNewSuiteDesc] = useState('');
  const [scenarioInput, setScenarioInput] = useState('Vendor rate card discrepancy check');
  const [amountInput, setAmountInput] = useState(48200);
  const [vendorInput, setVendorInput] = useState('Snowflake Computing');
  const [keywordsInput, setKeywordsInput] = useState('cleared, variance, authorized');

  const selectedDataset = datasets.find((d: any) => d.id === selectedDatasetId) || datasets[0];
  const latestRun = runs.find((r: any) => r.datasetId === selectedDataset?.id);

  const handleRunEvaluation = async () => {
    setIsRunning(true);
    toast.info('Simulated Evaluation', `Demo mode: ${selectedDataset?.cases?.length ?? 0} cases, and no model is called.`);
    try {
      const res = await api.post<any>('/api/v1/evaluations/runs', {
        datasetId: selectedDataset?.id,
        targetType: 'agent',
        targetId: 'agent_invoice_auditor',
      });
      toast.info('Simulated Run Stored', `Expected outputs were copied, so ${res.run?.accuracyRate}% is not a measurement.`);
      onRefreshEvaluations();
    } catch (e: any) {
      toast.error('Benchmark Failed', e?.message || 'Error running evaluation run');
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportReport = () => {
    const reportData = {
      benchmark: selectedDataset?.name || 'Enterprise Suite',
      generatedAt: new Date().toISOString(),
      latestRun: latestRun || null,
      datasetCases: selectedDataset?.cases || [],
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eval-benchmark-${selectedDataset?.id || 'suite'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report Exported', 'Downloaded evaluation JSON benchmark archive.');
  };

  const handleCreateDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuiteName) return;
    try {
      const res = await api.post<any>('/api/v1/evaluations/datasets', {
        name: newSuiteName,
        description: newSuiteDesc || 'Automated regression suite',
        cases: [
          {
            id: `tc_${Date.now()}_1`,
            input: { scenario: scenarioInput, amount: Number(amountInput), vendor: vendorInput },
            expectedOutput: { verified: true, signoffRequired: Number(amountInput) > 25000 },
            groundTruthKeywords: keywordsInput.split(',').map((k) => k.trim()),
          },
        ],
      });
      setShowCreateModal(false);
      setNewSuiteName('');
      setNewSuiteDesc('');
      toast.success('Benchmark Suite Created', `Registered "${newSuiteName}" with ground-truth test cases.`);
      onRefreshEvaluations();
      if (res.dataset) {
        setSelectedDatasetId(res.dataset.id);
      }
    } catch (err: any) {
      toast.error('Suite Creation Failed', err?.message || 'Failed to create dataset');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            Evaluation & Benchmark Lab
            <SimulatedBadge label="Runs simulated · demo mode" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated regression suites, schema validation rates, ground-truth accuracy, and latency benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition"
            title="Download JSON evaluation benchmark results"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export Report</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Benchmark Suite</span>
          </button>

          <button
            onClick={handleRunEvaluation}
            disabled={isRunning}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Evaluating Cases...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Benchmark Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dataset Selector Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-mono text-[11px] uppercase mr-1">Datasets:</span>
        {datasets.map((ds: any) => {
          const isSelected = ds.id === selectedDataset?.id;
          return (
            <button
              key={ds.id}
              onClick={() => setSelectedDatasetId(ds.id)}
              className={`px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              <TestTube2 className="w-3 h-3" />
              <span>{ds.name}</span>
              <span className="font-mono text-[11px] text-slate-400">({ds.cases?.length || 0})</span>
            </button>
          );
        })}
      </div>

      {/* Metrics Ribbon */}
      {latestRun && (
        <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-white/[0.08] bg-[#0E121C]/60 backdrop-blur-md divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08] shadow-sm">
          <div className="p-5">
            <div className="text-xs text-slate-400 mb-1">Ground Truth Accuracy</div>
            <div className="text-2xl font-semibold text-emerald-400 font-mono tabular-nums">{latestRun.accuracyRate}%</div>
            <div className="text-[11px] text-slate-400 mt-1">{latestRun.passedCases} of {latestRun.totalCases} cases passed</div>
          </div>

          <div className="p-5">
            <div className="text-xs text-slate-400 mb-1">Schema Validity</div>
            <div className="text-2xl font-semibold text-white font-mono tabular-nums">{latestRun.schemaValidityRate}%</div>
            <div className="text-[11px] text-slate-400 mt-1">Copied, not checked</div>
          </div>

          <div className="p-5">
            <div className="text-xs text-slate-400 mb-1">Average Latency</div>
            <div className="text-2xl font-semibold text-white font-mono tabular-nums">{latestRun.avgLatencyMs}ms</div>
            <div className="text-[11px] text-slate-400 mt-1">Fixed figure, not measured</div>
          </div>

          <div className="p-5">
            <div className="text-xs text-slate-400 mb-1">Total Benchmark Cost</div>
            <div className="text-2xl font-semibold text-white font-mono tabular-nums">${latestRun.totalCostUsd?.toFixed(4)}</div>
            <div className="text-[11px] text-slate-400 mt-1">Fixed figure; no tokens were billed</div>
          </div>
        </div>
      )}

      {/* Benchmark Test Cases Table */}
      <div className="rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] p-5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">{selectedDataset?.name || 'Gold Standard Benchmark'}</h2>
            <p className="text-xs text-slate-400">{selectedDataset?.description}</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Target: Autonomous Invoice Auditor v1</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="pb-2.5 font-medium">Case ID</th>
                <th className="pb-2.5 font-medium">Input Test Scenario</th>
                <th className="pb-2.5 font-medium">Ground Truth Assertion</th>
                <th className="pb-2.5 font-medium">Outcome</th>
                <th className="pb-2.5 font-medium text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {selectedDataset?.cases?.map((c: any) => {
                const runResult = latestRun?.results?.find((r: any) => r.caseId === c.id);
                return (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 font-mono text-slate-400">{c.id}</td>
                    <td className="py-3 text-slate-300 font-mono text-[11px]">
                      {c.input?.scenario ? `${c.input.scenario} · ` : ''}
                      {c.input?.amount ? `Amount: $${Number(c.input.amount).toLocaleString()} · ` : ''}
                      Vendor: {c.input?.vendor || 'Enterprise Cloud'}
                    </td>
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {c.groundTruthKeywords?.join(', ')}
                    </td>
                    <td className={`py-3 font-medium ${runResult?.passed ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {runResult ? (runResult.passed ? 'Passed' : 'Failed') : '—'}
                    </td>
                    <td className="py-3 text-right font-mono text-emerald-400 font-semibold tabular-nums">
                      {runResult ? `${runResult.score * 100}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Benchmark Suite Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Create Benchmark Dataset" tabIndex={-1}
            className="w-full max-w-lg bg-[#0E121C] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">Create Benchmark Dataset</h3>
                <p className="text-xs text-slate-400 mt-0.5">Define deterministic ground-truth evaluation suites</p>
              </div>
              <button aria-label="Close" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateDataset} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Dataset Name</label>
                <input aria-label="Dataset Name"
                  type="text"
                  required
                  value={newSuiteName}
                  onChange={(e) => setNewSuiteName(e.target.value)}
                  placeholder="e.g. Q1 High-Risk Vendor Forensics Benchmark"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Description</label>
                <input aria-label="Description"
                  type="text"
                  value={newSuiteDesc}
                  onChange={(e) => setNewSuiteDesc(e.target.value)}
                  placeholder="Regression tests for contract rate cards and threshold overrides"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">
                  Seed Test Scenario 1
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Vendor Name</label>
                    <input aria-label="Vendor Name"
                      type="text"
                      value={vendorInput}
                      onChange={(e) => setVendorInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Amount ($)</label>
                    <input aria-label="Amount ($)"
                      type="number"
                      value={amountInput}
                      onChange={(e) => setAmountInput(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Ground Truth Keywords (Comma-Separated)</label>
                  <input aria-label="Ground Truth Keywords (Comma-Separated)"
                    type="text"
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-slate-300 text-xs font-medium hover:bg-white/[0.04] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-semibold hover:bg-slate-200 transition"
                >
                  Create Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
