import React, { useState, useEffect } from 'react';
import {
  Database,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Trash2,
  Plus,
  Download,
  Filter,
  Layers,
  ArrowRight,
  Star,
  MessageSquare,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { SimulatedBadge } from './SimulatedBadge';

export const DataFoundryStudio: React.FC = () => {
  const toast = useToast();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<any | null>(null);
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Annotation state
  const [userRationale, setUserRationale] = useState('');
  const [starRating, setStarRating] = useState(5);
  const [submittingAnnotation, setSubmittingAnnotation] = useState(false);

  // New dataset generation form
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('Enterprise Financial & Tax AP');
  const [method, setMethod] = useState<'self_instruct' | 'constitutional_critique' | 'rejection_sampling'>('self_instruct');
  const [count, setCount] = useState('1000');
  const [seedPrompt, setSeedPrompt] = useState('Analyze tax code variance across cross-border VAT exemptions.');

  const fetchData = async () => {
    try {
      const data = await api.getDataFoundry();
      setDatasets(data.datasets || []);
      if (!selectedDataset && data.datasets?.length > 0) {
        setSelectedDataset(data.datasets[0]);
      } else if (selectedDataset) {
        const found = data.datasets?.find((d: any) => d.id === selectedDataset.id);
        if (found) setSelectedDataset(found);
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.generateSyntheticData({
        name: name || `${domain} Synthetic Benchmark`,
        domain,
        method,
        count: Number(count),
        seedPrompt,
      });
      setIsModalOpen(false);
      setName('');
      toast.success('Synthetic Pipeline Completed', `Generated ${count} candidate pairs via ${method.replace('_', ' ')}.`);
      fetchData();
      if (res?.dataset) setSelectedDataset(res.dataset);
    } catch (err: any) {
      toast.error('Generation Failed', err?.message || 'Failed to generate synthetic pairs');
    }
  };

  const handleVote = async (preference: 'A' | 'B' | 'tie') => {
    if (!selectedDataset || !currentSample) return;
    setSubmittingAnnotation(true);
    try {
      await api.annotateSample({
        datasetId: selectedDataset.id,
        sampleId: currentSample.id,
        preference,
        rationale: userRationale || currentSample.rationale || 'Human verified adherence to domain truth and precision.',
      });
      setUserRationale('');
      toast.success('Annotation Submitted', `Marked choice as ${preference === 'tie' ? 'Equivalent' : 'Model ' + preference} with 5-star rubric.`);
      await fetchData();
    } catch (err: any) {
      toast.error('Vote Failed', err?.message || 'Error recording human feedback');
    } finally {
      setSubmittingAnnotation(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSyntheticDataset(id);
      toast.info('Dataset Deleted', 'Removed dataset from Data Foundry.');
      await fetchData();
      if (selectedDataset?.id === id) setSelectedDataset(null);
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || 'Error deleting dataset');
    }
  };

  const currentSample = selectedDataset?.samples?.[selectedSampleIndex] || selectedDataset?.samples?.[0];

  const handleExportJSONL = () => {
    if (!selectedDataset) return;
    const jsonl = selectedDataset.samples
      .map((s: any) => JSON.stringify(s))
      .join('\n');
    const blob = new Blob([jsonl], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDataset.name.toLowerCase().replace(/\s+/g, '_')}.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSONL Exported', `Downloaded ${selectedDataset.samples?.length || 0} instruction pairs.`);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white tracking-tight">Scale Data Foundry & RLHF Engine</h1>
            <SimulatedBadge />
            <span className="text-[11px] font-mono text-purple-400 bg-purple-950/40 px-2.5 py-0.5 rounded border border-purple-500/20">
              Synthetic & Human Annotation
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span>Automated Self-Instruct Data Generation</span>
            <span aria-hidden="true">·</span>
            <span>Pairwise RLHF Preference Annotation</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-emerald-400">Curated Gold-Standard Outputs</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {selectedDataset && (
            <button
              onClick={handleExportJSONL}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-200 text-xs font-medium transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSONL</span>
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Synthetic Data</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Datasets Sidebar + Pairwise RLHF Evaluation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Dataset Catalog */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Curated Datasets ({datasets.length})
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Deduplicated</span>
          </div>

          <div className="space-y-2">
            {datasets.map((ds) => {
              const isSelected = selectedDataset?.id === ds.id;
              return (
                <div
                  key={ds.id}
                  onClick={() => {
                    setSelectedDataset(ds);
                    setSelectedSampleIndex(0);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-purple-500/50 bg-purple-950/20 shadow-sm'
                      : 'border-white/[0.08] bg-[#0E121C]/60 hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span className="font-mono text-purple-400 uppercase">{ds.method}</span>
                    <span className="font-mono text-emerald-400 font-semibold">{ds.qualityScore}% Quality</span>
                  </div>

                  <div className="font-semibold text-white text-sm mb-1">{ds.name}</div>
                  <div className="text-xs text-slate-400 mb-2">{ds.domain}</div>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] text-slate-500 font-mono">
                    <span>{ds.recordCount.toLocaleString()} instruction pairs</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(ds.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 transition"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (8 cols): Pairwise RLHF Annotation Workspace */}
        <div className="lg:col-span-8 rounded-xl border border-white/[0.08] bg-[#0E121C]/60 backdrop-blur-md p-6 flex flex-col shadow-sm space-y-6">
          {selectedDataset && currentSample ? (
            <>
              {/* Sample Header & Stepper */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Pairwise Human Preference Studio</span>
                    <span className="text-[10px] font-mono text-purple-400 bg-purple-950/30 px-2 py-0.5 rounded border border-purple-500/20">
                      Sample #{selectedSampleIndex + 1} of {selectedDataset.samples.length}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Blind evaluation: Grade Model A vs Model B on correctness, safety, and alignment
                  </div>
                </div>

                {/* Sample Navigator */}
                <div className="flex items-center gap-1.5">
                  {selectedDataset.samples.map((_: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedSampleIndex(idx)}
                      className={`w-6 h-6 rounded-md text-xs font-mono transition ${
                        selectedSampleIndex === idx
                          ? 'bg-purple-600 text-white font-semibold'
                          : 'bg-white/[0.04] text-slate-400 hover:text-white'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Prompt Box */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Instruction / Adversarial Prompt
                </span>
                <p className="text-xs font-mono text-slate-200 leading-relaxed">{currentSample.prompt}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentSample.tags?.map((t: string, i: number) => (
                    <span key={i} className="text-[10px] text-slate-400 font-mono">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Side-by-Side Model A vs Model B Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Model Candidate A */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    currentSample.preference === 'A'
                      ? 'border-emerald-500/50 bg-emerald-950/10'
                      : 'border-white/[0.08] bg-white/[0.02]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <span className="font-semibold text-xs text-white">Candidate A</span>
                      {currentSample.preference === 'A' && (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Preferred
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{currentSample.responseA}</p>
                  </div>

                  <button
                    onClick={() => handleVote('A')}
                    disabled={submittingAnnotation}
                    className={`mt-4 w-full py-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                      currentSample.preference === 'A'
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-200'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Prefer Output A</span>
                  </button>
                </div>

                {/* Model Candidate B */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    currentSample.preference === 'B'
                      ? 'border-emerald-500/50 bg-emerald-950/10'
                      : 'border-white/[0.08] bg-white/[0.02]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <span className="font-semibold text-xs text-white">Candidate B</span>
                      {currentSample.preference === 'B' && (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Preferred
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentSample.responseB || 'Fallback baseline response generated without chain-of-thought grounding.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleVote('B')}
                    disabled={submittingAnnotation}
                    className={`mt-4 w-full py-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                      currentSample.preference === 'B'
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-200'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Prefer Output B</span>
                  </button>
                </div>
              </div>

              {/* Rationale & Critique Feedback Box */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                    <span>Annotator Rationale & Preference Justification</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        onClick={() => setStarRating(star)}
                        className={`w-3.5 h-3.5 cursor-pointer ${
                          star <= starRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <textarea
                  rows={2}
                  placeholder={currentSample.rationale || 'Explain why one candidate conforms better to grounding rules or mathematical invariants...'}
                  value={userRationale}
                  onChange={(e) => setUserRationale(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090D16] border border-white/[0.08] rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Reinforcement Learning from Human Feedback (RLHF DPO Target)</span>
                  <button
                    onClick={() => handleVote(currentSample.preference || 'A')}
                    className="px-3 py-1 rounded bg-purple-600/80 hover:bg-purple-600 text-white font-medium transition"
                  >
                    Save Annotation
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500 text-xs font-mono">
              Select or generate a synthetic dataset to begin pairwise RLHF annotation
            </div>
          )}
        </div>
      </div>

      {/* Synthetic Generation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#0A0D14] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden p-6 text-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">Generate Synthetic Instruction Dataset</h3>
                <p className="text-xs text-slate-400">Scale Data Engine automated prompt generation</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Dataset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Legal Compliance & Indemnity Pairs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Target Domain</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Enterprise Financial & Tax AP">Enterprise Financial & Tax AP</option>
                    <option value="Cybersecurity & Zero-Day Threat Triage">Cybersecurity Threat Triage</option>
                    <option value="Legal & Regulatory SEC Compliance">Legal & Regulatory Compliance</option>
                    <option value="Clinical & Pharmaceutical Research">Clinical Research Protocols</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Generation Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="self_instruct">Self-Instruct (Multi-Turn Prompt Expansion)</option>
                    <option value="constitutional_critique">Constitutional AI Critique & Revision</option>
                    <option value="rejection_sampling">Rejection Sampling with Invariant Verifier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Seed Instruction Prompt</label>
                <textarea
                  rows={2}
                  value={seedPrompt}
                  onChange={(e) => setSeedPrompt(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Number of Synthetic Pairs</label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0E121C] border border-white/[0.08] rounded-lg text-slate-100 font-mono text-xs"
                />
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
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-sm transition"
                >
                  Synthesize Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
