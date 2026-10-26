import React from 'react';
import {
  LayoutDashboard,
  Bot,
  GitBranch,
  Library,
  BookOpen,
  Blocks,
  TestTube2,
  Activity,
  Rocket,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Cpu,
  Database,
  ShieldAlert,
} from 'lucide-react';

export type NavTab =
  | 'command_center'
  | 'model_customization'
  | 'agent_studio'
  | 'workflow_builder'
  | 'workflow_library'
  | 'data_foundry'
  | 'knowledge'
  | 'integrations'
  | 'evaluations'
  | 'red_teaming'
  | 'observability'
  | 'deployments'
  | 'governance';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pendingApprovalsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  pendingApprovalsCount,
}) => {
  const sections = [
    {
      heading: 'Platform',
      items: [
        { id: 'command_center' as NavTab, label: 'Command Center', icon: LayoutDashboard },
        { id: 'model_customization' as NavTab, label: 'Fine-Tuning Studio', icon: Cpu },
        { id: 'workflow_builder' as NavTab, label: 'Workflow Builder', icon: GitBranch },
        { id: 'agent_studio' as NavTab, label: 'Agent Studio', icon: Bot },
        { id: 'workflow_library' as NavTab, label: 'Pipeline Blueprints', icon: Library },
      ],
    },
    {
      heading: 'Data & Safety Engine',
      items: [
        { id: 'data_foundry' as NavTab, label: 'Data Engine & RLHF', icon: Database },
        { id: 'red_teaming' as NavTab, label: 'SEAL Red-Teaming', icon: ShieldAlert },
        { id: 'knowledge' as NavTab, label: 'Knowledge & Context', icon: BookOpen },
        { id: 'integrations' as NavTab, label: 'Tools & Connectors', icon: Blocks },
        { id: 'evaluations' as NavTab, label: 'Evaluation Lab', icon: TestTube2 },
      ],
    },
    {
      heading: 'Operations',
      items: [
        { id: 'observability' as NavTab, label: 'Execution Traces', icon: Activity },
        { id: 'deployments' as NavTab, label: 'Deployment Ingress', icon: Rocket },
        {
          id: 'governance' as NavTab,
          label: 'Governance & Audit',
          icon: ShieldCheck,
          count: pendingApprovalsCount,
        },
      ],
    },
  ];

  return (
    <aside
      className={`border-r border-white/[0.08] bg-[#0A0D14]/75 backdrop-blur-md flex flex-col transition-all duration-200 relative select-none z-20 ${
        collapsed ? 'w-14' : 'w-60'
      }`}
    >
      {/* Navigation Sections */}
      <div className="flex-1 py-3 px-2 space-y-5 overflow-y-auto">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!collapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {section.heading}
              </div>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors group relative ${
                    isActive
                      ? 'bg-white/[0.08] text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />

                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1 truncate">
                      <span className="truncate">{item.label}</span>
                      {item.count && item.count > 0 ? (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                          {item.count}
                        </span>
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Understated Engine Footer */}
      {!collapsed && (
        <div className="p-3 mx-2 mb-2 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300 font-medium mb-0.5">
            <BrainCircuit className="w-3.5 h-3.5 text-blue-400" />
            <span>High Thinking</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal">
            Workflow agent steps always request high thinking, whatever each agent's setting.
          </p>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-white/[0.07] flex justify-end">
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
