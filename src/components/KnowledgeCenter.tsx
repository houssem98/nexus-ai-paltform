import React, { useState } from 'react';
import { pressable, useDialog } from '../lib/a11y';
import { Search, Plus, FileText, CheckCircle2, Trash2, RefreshCw, UploadCloud, Database, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

interface KnowledgeCenterProps {
  knowledge: any[];
  onRefreshKnowledge: () => void;
}

export const KnowledgeCenter: React.FC<KnowledgeCenterProps> = ({ knowledge, onRefreshKnowledge }) => {
  const toast = useToast();
  const [selectedDocId, setSelectedDocId] = useState<string>(knowledge[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('approval thresholds for invoices over $25,000');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isReindexingAll, setIsReindexingAll] = useState(false);

  // New Document modal
  const [showAddModal, setShowAddModal] = useState(false);
  const dialogRef = useDialog<HTMLDivElement>(showAddModal, () => setShowAddModal(false));
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Compliance & Legal');
  const [newContent, setNewContent] = useState('');
  const [fileName, setFileName] = useState('');

  const selectedDoc = knowledge.find((k) => k.id === selectedDocId) || knowledge[0];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.post<any>('/api/v1/knowledge/search', { query: searchQuery });
      setSearchResults(res.results || []);
      toast.success('Grounding Search Complete', `Found ${res.results?.length || 0} cited vector partitions.`);
    } catch (e: any) {
      toast.error('Search Failed', e?.message || 'Error executing semantic search');
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!newTitle) {
      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setNewContent(text);
        toast.info('File Parsed', `Loaded ${file.name} for chunk indexing.`);
      }
    };
    reader.readAsText(file);
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;
    try {
      await api.post('/api/v1/knowledge', {
        title: newTitle,
        category: newCategory,
        content: newContent,
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewContent('');
      setFileName('');
      toast.success('Document Ingested', `Partitioned "${newTitle}" into vector corpus.`);
      onRefreshKnowledge();
    } catch (err: any) {
      toast.error('Ingestion Failed', err?.message || 'Could not ingest document');
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await api.delete(`/api/v1/knowledge/${id}`);
      toast.info('Document Removed', 'Purged document and associated vector partitions.');
      onRefreshKnowledge();
    } catch (err: any) {
      toast.error('Deletion Failed', err?.message || 'Failed to delete document');
    }
  };

  const handleReindexDocument = async (id: string) => {
    setIsReindexing(true);
    try {
      await api.post(`/api/v1/knowledge/${id}/reindex`);
      toast.success('Index Refreshed', 'Re-indexed document vector partitions.');
      onRefreshKnowledge();
    } catch (err: any) {
      toast.error('Re-index Failed', err?.message || 'Failed to re-index document');
    } finally {
      setIsReindexing(false);
    }
  };

  const handleReindexAll = async () => {
    setIsReindexingAll(true);
    try {
      const res = await api.post<any>('/api/v1/knowledge/reindex-all');
      toast.info('Timestamps Updated', `Touched ${res.reindexedCount} documents. No search index exists yet.`);
      onRefreshKnowledge();
    } catch (err: any) {
      toast.error('Re-index All Failed', err?.message || 'Failed full re-indexing');
    } finally {
      setIsReindexingAll(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Knowledge & Grounding Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic document ingestion, chunking verification, and vector search with verifiable citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReindexAll}
            disabled={isReindexingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-medium transition disabled:opacity-50"
            title="Updates timestamps only; no search index exists yet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexingAll ? 'animate-spin text-blue-400' : 'text-slate-400'}`} />
            <span>{isReindexingAll ? 'Touching Documents...' : 'Touch All Documents'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-200 text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ingest Document</span>
          </button>
        </div>
      </div>

      {/* Search bar: substring match */}
      <div className="p-5 rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] space-y-3 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-300">Retrieval & Citation Sandbox</span>
          <span className="text-slate-400 font-mono text-[11px]">Substring match, no ranking yet</span>
        </div>

        <div className="flex gap-2">
          <input aria-label="Type a policy query to test grounding"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type a policy query to test grounding..."
            className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white/20"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 rounded-lg bg-white/[0.08] hover:bg-white text-slate-200 hover:text-slate-950 text-xs font-semibold transition"
          >
            {isSearching ? 'Searching...' : 'Search Evidence'}
          </button>
        </div>

        {/* Results list */}
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2 pt-3 border-t border-white/[0.06]">
            {searchResults.map((res, i) => (
              <div key={i} className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-200 font-mono">{res.docTitle}</span>
                  <span className="text-emerald-400 font-mono tabular-nums">Relevance: {(res.relevanceScore * 100).toFixed(0)}%</span>
                </div>
                <p className="text-slate-300 leading-relaxed italic">&ldquo;{res.text}&rdquo;</p>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                  <span>Section: {res.section}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">Chunk: {res.chunkId}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid: Document List & Chunk Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Corpus Collection ({knowledge.length})
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Chunked</span>
          </div>

          <div className="space-y-1.5">
            {knowledge.map((doc) => {
              const isSelected = doc.id === selectedDoc?.id;
              return (
                <div
                  key={doc.id}
                  {...pressable(() => setSelectedDocId(doc.id))}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    isSelected
                      ? 'bg-white/[0.08] border-white/20 text-white shadow-sm'
                      : 'bg-white/[0.02] border-white/[0.04] text-slate-400 hover:text-slate-200 hover:border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 font-medium text-slate-200 truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{doc.category}</span>
                    <span className="font-mono tabular-nums">{doc.chunkCount} chunks</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Doc Details */}
        <div className="lg:col-span-2 rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] p-5 shadow-sm">
          {selectedDoc ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/[0.06] gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{selectedDoc.title}</h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedDoc.category} · {(selectedDoc.fileSize / 1024).toFixed(1)} KB · {selectedDoc.chunkCount} chunks
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReindexDocument(selectedDoc.id)}
                    disabled={isReindexing}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-slate-300 transition"
                    title="Re-index vector embeddings"
                  >
                    <RefreshCw className={`w-3 h-3 ${isReindexing ? 'animate-spin' : ''}`} />
                    <span>{isReindexing ? 'Re-indexing...' : 'Re-index'}</span>
                  </button>

                  <button aria-label="Delete document from corpus"
                    onClick={() => handleDeleteDocument(selectedDoc.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    title="Delete document from corpus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Indexed Passages & Citations</span>
                  <span className="text-[11px] font-mono text-slate-400">Substring match</span>
                </div>
                {selectedDoc.chunks?.map((chunk: any) => (
                  <div key={chunk.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="text-slate-300 font-semibold">{chunk.section || 'General Clause'}</span>
                      <span>ID: {chunk.id}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">{chunk.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-xs text-center py-12">Select a document from the corpus.</div>
          )}
        </div>
      </div>

      {/* Ingestion Modal with File Upload */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Ingest Grounding Document" tabIndex={-1}
            className="w-full max-w-lg bg-[#0F131D] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div>
                <h3 className="text-sm font-semibold text-white">Ingest Grounding Document</h3>
                <p className="text-xs text-slate-400">Deterministic chunking with verifiable citation anchors</p>
              </div>
              <button aria-label="Close" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-4">
              {/* File Upload Drop Zone */}
              <div className="p-4 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.04] transition text-center cursor-pointer relative">
                <input aria-label="Upload document file"
                  type="file"
                  accept=".txt,.md,.json,.csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <div className="text-xs text-slate-300 font-medium">
                  {fileName ? `Loaded: ${fileName}` : 'Choose or drop a file (.txt, .md, .json)'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Max 10MB per document</div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Title</label>
                <input aria-label="Title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Nexus Security Incident Escalation Protocol"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Category</label>
                <select aria-label="Category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/20"
                >
                  <option value="Compliance & Legal" className="bg-slate-900 text-white">Compliance & Legal</option>
                  <option value="SecOps Protocols" className="bg-slate-900 text-white">SecOps Protocols</option>
                  <option value="Finance & Procurement" className="bg-slate-900 text-white">Finance & Procurement</option>
                  <option value="Operations & IT" className="bg-slate-900 text-white">Operations & IT</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Content (Paragraphs will be auto-chunked)</label>
                <textarea aria-label="Content (Paragraphs will be auto-chunked)"
                  required
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste policy clauses, operational procedures, or SLA matrices here..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-white/20 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/[0.08] text-slate-300 text-xs font-medium hover:bg-white/[0.04] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-white text-slate-950 text-xs font-semibold hover:bg-slate-200 transition"
                >
                  Ingest & Chunk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
