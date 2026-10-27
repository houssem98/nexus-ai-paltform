import React, { useState } from 'react';
import { Download, ArrowRight } from 'lucide-react';
import { NavTab } from './Sidebar';
import { SimulatedBadge } from './SimulatedBadge';

interface WorkflowLibraryProps {
  workflows: any[];
  onNavigate: (tab: NavTab) => void;
  onRefreshWorkflows: () => void;
  onSelectWorkflow?: (id: string) => void;
}

export const WorkflowLibrary: React.FC<WorkflowLibraryProps> = ({
  workflows,
  onNavigate,
  onRefreshWorkflows,
  onSelectWorkflow,
}) => {
  const [filterDepartment, setFilterDepartment] = useState<string>('All');

  const templates = [
    {
      id: 'tpl_invoice',
      name: 'High-Value Invoice Audit & CFO Escalation Pipeline',
      department: 'Finance',
      description: 'End-to-end invoice ingestion, contract verification, compliance checks, conditional CFO approval for amounts >$25k, and ERP ledger commit.',
      nodeCount: 7,
      useThinking: true,
      category: 'Financial Forensics',
    },
    {
      id: 'tpl_soc',
      name: 'Automated SOC Level-2 Threat Response & Host Quarantine',
      department: 'Cybersecurity',
      description: 'Correlates SIEM anomalies, determines MITRE attack vectors, verifies IP reputation, and formulates automated firewall block recommendations.',
      nodeCount: 6,
      useThinking: true,
      category: 'SecOps Incident Response',
    },
    {
      id: 'tpl_contract',
      name: 'Master Service Agreement (MSA) Compliance & Risk Extractor',
      department: 'Operations',
      description: 'Rapidly digests enterprise PDFs, RFPs, and technical specifications, extracting structured schemas and policy requirements.',
      nodeCount: 5,
      useThinking: false,
      category: 'Document Intelligence',
    },
    {
      id: 'tpl_support',
      name: 'Tier-3 Engineering Bug Escalation & Customer Triage',
      department: 'Customer Support',
      description: 'Classifies customer issues, queries internal technical docs, extracts stack traces, and creates prioritized Jira tickets with suggested fixes.',
      nodeCount: 5,
      useThinking: true,
      category: 'Customer Ops',
    },
  ];

  const filtered = filterDepartment === 'All' ? templates : templates.filter((t) => t.department === filterDepartment);

  const handleExportJson = (wf: any) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(wf, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${wf.name.toLowerCase().replace(/\s+/g, '_')}_workflow.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">Pipeline Blueprints <SimulatedBadge label="Sample templates" /></h1>
          <p className="text-xs text-slate-400 mt-1">
            Sample topologies to start from. Two have no stored workflow, and opening one does not load it into the builder.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="flex items-center gap-1 bg-[#0E121C]/60 backdrop-blur-md p-1 rounded-lg border border-white/[0.08] text-xs">
          {['All', 'Finance', 'Cybersecurity', 'Operations', 'Customer Support'].map((dept) => (
            <button
              key={dept}
              onClick={() => setFilterDepartment(dept)}
              className={`px-2.5 py-1 rounded-md transition font-medium ${
                filterDepartment === dept ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((tpl) => (
          <div
            key={tpl.id}
            className="p-5 rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] hover:border-white/[0.16] transition flex flex-col justify-between group shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{tpl.department}</span>
                <span className="font-mono">{tpl.nodeCount} nodes</span>
              </div>

              <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition mb-1.5">
                {tpl.name}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">{tpl.description}</p>
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                {tpl.useThinking ? 'Gemini 4 Argon (High Thinking)' : 'Gemini 3.8 Flash'}
              </span>

              <button
                onClick={() => onNavigate('workflow_builder')}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white text-slate-200 hover:text-slate-950 text-xs font-medium transition"
              >
                <span>Open in Builder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Published Pipelines Table */}
      <div className="rounded-xl bg-[#0E121C]/60 backdrop-blur-md border border-white/[0.08] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-white mb-0.5">Active Workspace Pipelines</h2>
        <p className="text-xs text-slate-400 mb-4">Export or inspect versioned topology definitions</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="pb-2.5 font-medium">Pipeline</th>
                <th className="pb-2.5 font-medium">Department</th>
                <th className="pb-2.5 font-medium">Version</th>
                <th className="pb-2.5 font-medium">Status</th>
                <th className="pb-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {workflows.map((wf) => (
                <tr key={wf.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 font-medium text-slate-200">{wf.name}</td>
                  <td className="py-3 text-slate-400">{wf.department}</td>
                  <td className="py-3 font-mono text-slate-400">v{wf.activeVersion}</td>
                  <td className="py-3 text-slate-300 font-medium capitalize">{wf.versions?.find((v: any) => v.version === wf.activeVersion)?.status ?? '—'}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onSelectWorkflow && (
                        <button
                          onClick={() => {
                            onSelectWorkflow(wf.id);
                            onNavigate('workflow_builder');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white text-slate-200 hover:text-slate-950 text-xs font-medium transition"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleExportJson(wf)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export JSON</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
