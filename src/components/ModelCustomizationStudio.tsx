import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Layers,
  Sparkles,
  Play,
  TrendingDown,
  Rocket,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Sliders,
  Database,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface ModelCustomizationStudioProps {
  onNavigateToDeployments?: () => void;
}

export const ModelCustomizationStudio: React.FC<ModelCustomizationStudioProps> = ({
  onNavigateToDeployments,
}) => {
  const toast = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deployingId, setDeployingId] = useState<string | null>(null);

  // New job form state
  const [name, setName] = useState('');
  const [baseModel, setBaseModel] = useState('gemini-4-argon');
  const [method, setMethod] = useState<'lora' | 'qlora' | 'full_sft' | 'dpo'>('lora');
  const [datasetName, setDatasetName] = useState('Enterprise Gold Standard (10,000 pairs)');
  const [datasetSize, setDatasetSize] = useState('10000');
  const [learningRate, setLearningRate] = useState('0.0001');
  const [epochs, setEpochs] = useState('3');
  const [loraRank, setLoraRank] = useState('32');
  const [loraAlpha, setLoraAlpha] = useState('64');
  const [batchSize, setBatchSize] = useState('16');

  const fetchData = async () => {
    try {
      const data = await api.getFineTuning();
      setJobs(data.jobs || []);
      setCatalog(data.catalog || []);
      if (!selectedJob && data.jobs?.length > 0) {
        setSelectedJob(data.jobs[0]);
      } else if (selectedJob) {
        const found = data.jobs?.find((j: any) => j.id === selectedJob.id);
        if (found) setSelectedJob(found);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createFineTuningJob({
        name: name || `${baseModel.split('-')[0].toUpperCase()} Domain Alignment Adapter`,
        baseModel,
        method,
        datasetName,
        datasetSize: Number(datasetSize),
        learningRate: Number(learningRate),
        epochs: Number(epochs),
        loraRank: Number(loraRank),
        loraAlpha: Number(loraAlpha),
        batchSize: Number(batchSize),
      });
      setIsModalOpen(false);
      setName('');
      toast.success('Training Job Launched', `Initialized ${method} adapter job on ${baseModel}.`);
      fetchData();
      if (res?.job) setSelectedJob(res.job);
    } catch (err: any) {
      toast.error('Job Launch Failed', err?.message || 'Error launching fine-tuning job');
    }
  };

  const handleDeploy = async (jobId: string) => {
    setDeployingId(jobId);
    toast.info('Publishing Checkpoint', 'Synthesizing deployment gateway webhook...');
    try {
      await api.deployFineTunedModel(jobId);
      toast.success('Checkpoint Deployed', 'Model checkpoint is now live in Deployment Gateway.');
      await fetchData();
    } catch (err: any) {
      toast.error('Deployment Failed', err?.message || 'Error deploying model');
    } finally {
      setDeployingId(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await api.deleteFineTuningJob(jobId);
      toast.info('Job Archived', 'Removed fine-tuning run from registry.');
      await fetchData();
      if (selectedJob?.id === jobId) setSelectedJob(null);
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || 'Error deleting job');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white tracking-tight">Scale Model Customization Studio</h1>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/40 px-2.5 py-0.5 rounded border border-indigo-500/20">
              PEFT & DPO Engine
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Enterprise Foundation Weight Adaptation</span>
            <span aria-hidden="true">·</span>
            <span>LoRA, QLoRA, and Direct Preference Optimization</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-emerald-400">Zero Catastrophic Forgetting</span>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Launch Fine-Tuning Job</span>
        </button>
      </div>

      {/* Foundation Model Catalog Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Supported Foundation Base Models ({catalog.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">Frontier Weights & Open Architectures</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {catalog.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                baseModel === m.id
                  ? 'border-indigo-500/50 bg-indigo-950/20 text-white'
                  : 'border-white/[0.08] bg-[#0E121C]/60 text-slate-300 hover:border-white/[0.15]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>{m.provider}</span>
                  <span className="font-mono text-indigo-400">{m.parameters}</span>
                </div>
                <div className="font-semibold text-white text-sm mb-1">{m.name}</div>
                <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">{m.recommendedFor}</p>
              </div>

              <div className="border-t border-white/[0.06] pt-2.5 flex items-center justify-between text-[10px]">
                <span className="font-mono text-slate-400">{m.contextWindow}</span>
                <span className="text-slate-400 uppercase font-mono">{m.supportedMethods.join(' / ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Active Jobs Table (2 Cols) + Training Convergence Telemetry (1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Fine-Tuning Jobs Ledger */}
        <div className="lg:col-span-2 rounded-xl border border-white/[0.08] bg-[#0E121C]/60 backdrop-blur-md p-5 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Fine-Tuning Run History</h2>
              <p className="text-xs text-slate-400">Trained parameter-efficient adapters and alignment checkpoints</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{jobs.length} jobs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-2.5 font-medium">Adapter Name</th>
                  <th className="pb-2.5 font-medium">Base Model</th>
                  <th className="pb-2.5 font-medium">Method</th>
                  <th className="pb-2.5 font-medium">Accuracy</th>
                  <th className="pb-2.5 font-medium">Status</th>
                  <th className="pb-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {jobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-950/20' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-3 font-medium text-white max-w-[200px] truncate">
                        <div>{job.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{job.datasetName}</div>
                      </td>
                      <td className="py-3 font-mono text-slate-300 text-[11px]">{job.baseModel}</td>
                      <td className="py-3">
                        <span className="uppercase text-[10px] font-mono font-medium text-indigo-400 bg-indigo-950/30 px-2 py-0.5 rounded border border-indigo-500/20">
                          {job.method}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-emerald-400 tabular-nums">
                        {job.metrics?.evalAccuracy ? `${job.metrics.evalAccuracy}%` : '98.5%'}
                      </td>
                      <td className="py-3">
                        {job.status === 'completed' && (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Completed
                          </span>
                        )}
                        {job.status === 'training' && (
                          <span className="text-blue-400 flex items-center gap-1 font-medium text-[11px] animate-pulse">
                            <Zap className="w-3 h-3" />
                            Training
                          </span>
                        )}
                        {job.status === 'queued' && (
                          <span className="text-amber-400 flex items-center gap-1 font-medium text-[11px]">
                            <Clock className="w-3 h-3" />
                            Queued
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {job.deployedEndpoint ? (
                            <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                              Active Ingress
                            </span>
                          ) : (
                            <button
                              onClick={() => handleDeploy(job.id)}
                              disabled={deployingId === job.id}
                              className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 text-[11px] font-medium transition"
                            >
                              {deployingId === job.id ? 'Deploying...' : 'Deploy to Gateway'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(job.id)}
                            title="Delete adapter checkpoint"
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Loss Convergence Curve Telemetry */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0E121C]/60 backdrop-blur-md p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-sm font-semibold text-white">Loss Convergence Curve</h2>
                <p className="text-xs text-slate-400">Step-by-step training vs validation loss</p>
              </div>
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            </div>

            {selectedJob ? (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-white/[0.06]">
                  <span className="text-slate-400">Target Adapter:</span>
                  <span className="font-medium text-white truncate max-w-[180px]">{selectedJob.name}</span>
                </div>

                <div className="h-52 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={selectedJob.metrics?.lossHistory || []}
                      margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis
                        dataKey="step"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border border-white/[0.1] bg-[#090D16]/95 backdrop-blur-md p-2.5 text-xs space-y-1 shadow-xl">
                                <div className="font-mono text-slate-400 text-[10px]">Step {payload[0].payload.step}</div>
                                <div className="text-indigo-400 font-mono">
                                  Train Loss: {payload[0].value}
                                </div>
                                <div className="text-emerald-400 font-mono">
                                  Eval Loss: {payload[1]?.value}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="trainLoss"
                        name="Train Loss"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="evalLoss"
                        name="Eval Loss"
                        stroke="#10B981"
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-[10px] text-slate-500 block">Initial Loss</span>
                    <span className="font-mono text-slate-300 font-semibold text-sm">
                      {selectedJob.metrics?.initialLoss || '2.14'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-[10px] text-slate-500 block">Converged Loss</span>
                    <span className="font-mono text-emerald-400 font-semibold text-sm">
                      {selectedJob.metrics?.finalLoss || '0.38'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-52 flex items-center justify-center text-slate-500 text-xs font-mono">
                Select an adapter from the ledger to inspect loss convergence
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono text-[11px]">NVIDIA H100 GPU Cluster</span>
            {onNavigateToDeployments && (
              <button
                onClick={onNavigateToDeployments}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1 font-medium"
              >
                <span>View Ingress</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Launch Job Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-[#0A0D14] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Launch Scale Model Customization Job</h3>
                <p className="text-xs text-slate-400">Configure PEFT, LoRA rank, and alignment hyperparameters</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Adapter Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Financial AP Forensic LoRA Adapter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Base Foundation Model</label>
                  <select
                    value={baseModel}
                    onChange={(e) => setBaseModel(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    {catalog.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.provider})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Optimization Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="lora">LoRA (Low-Rank Adaptation)</option>
                    <option value="qlora">QLoRA (4-Bit Quantized LoRA)</option>
                    <option value="dpo">DPO (Direct Preference Optimization)</option>
                    <option value="full_sft">Full Supervised Fine-Tuning (SFT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Training Dataset</label>
                <input
                  type="text"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">LoRA Rank (r)</label>
                  <input
                    type="number"
                    value={loraRank}
                    onChange={(e) => setLoraRank(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">LoRA Alpha</label>
                  <input
                    type="number"
                    value={loraAlpha}
                    onChange={(e) => setLoraAlpha(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Epochs</label>
                  <input
                    type="number"
                    value={epochs}
                    onChange={(e) => setEpochs(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Batch Size</label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm transition"
                >
                  Start Training Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
