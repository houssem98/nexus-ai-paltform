import React, { useState, useEffect, useCallback } from 'react';
import { api } from './lib/api';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { CommandCenter } from './components/CommandCenter';
import { AgentStudio } from './components/AgentStudio';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { WorkflowLibrary } from './components/WorkflowLibrary';
import { KnowledgeCenter } from './components/KnowledgeCenter';
import { IntegrationsCatalog } from './components/IntegrationsCatalog';
import { EvaluationLab } from './components/EvaluationLab';
import { ObservabilityExplorer } from './components/ObservabilityExplorer';
import { DeploymentCenter } from './components/DeploymentCenter';
import { GovernanceSecurity } from './components/GovernanceSecurity';
import { ModelCustomizationStudio } from './components/ModelCustomizationStudio';
import { DataFoundryStudio } from './components/DataFoundryStudio';
import { RedTeamingSecurityStudio } from './components/RedTeamingSecurityStudio';
import { RoadmapViewer } from './components/RoadmapViewer';
import { SystemVerifierModal } from './components/SystemVerifierModal';
import { ToastProvider } from './context/ToastContext';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('command_center');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [verifierOpen, setVerifierOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Active entity selection for breadcrumbs and focused IDE views
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Platform state
  const [me, setMe] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any>({ datasets: [], runs: [] });
  const [deployments, setDeployments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);

  // Keep selected workflow & agent valid when lists update
  useEffect(() => {
    if (workflows.length > 0 && (!selectedWorkflowId || !workflows.some((w) => w.id === selectedWorkflowId))) {
      setSelectedWorkflowId(workflows[0].id);
    }
  }, [workflows, selectedWorkflowId]);

  useEffect(() => {
    if (agents.length > 0 && (!selectedAgentId || !agents.some((a) => a.id === selectedAgentId))) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Load all server state
  const loadPlatformData = useCallback(async () => {
    try {
      const [meRes, agRes, wfRes, exRes, knRes, inRes, evRes, depRes, audRes, appRes] = await Promise.all([
        api.get<any>('/api/v1/me'),
        api.get<any>('/api/v1/agents'),
        api.get<any>('/api/v1/workflows'),
        api.get<any>('/api/v1/executions'),
        api.get<any>('/api/v1/knowledge'),
        api.get<any>('/api/v1/integrations'),
        api.get<any>('/api/v1/evaluations'),
        api.get<any>('/api/v1/deployments'),
        api.get<any>('/api/v1/audit-events'),
        api.get<any>('/api/v1/approvals'),
      ]);

      setMe(meRes);
      setAgents(agRes.agents || []);
      setWorkflows(wfRes.workflows || []);
      setExecutions(exRes.executions || []);
      setKnowledge(knRes.documents || []);
      setIntegrations(inRes.integrations || []);
      setEvaluations(evRes.evaluations || { datasets: [], runs: [] });
      setDeployments(depRes.deployments || []);
      setAuditLogs(audRes.auditLogs || []);
      setApprovals(appRes.approvals || []);
    } catch (err) {
      console.error('Failed to load platform data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  // Context switch handlers
  const handleSwitchWorkspace = async (workspaceId: string) => {
    try {
      await api.post('/api/v1/auth/switch-context', { workspaceId });
      loadPlatformData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      await api.post('/api/v1/auth/switch-context', { userId });
      loadPlatformData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveExecution = async (executionId: string, decision: 'approve' | 'reject') => {
    try {
      await api.post(`/api/v1/executions/${executionId}/approve`, {
        decision,
        notes: decision === 'approve' ? 'Signoff authorized in Command Center' : 'Declined by reviewer',
      });
      loadPlatformData();
    } catch (e) {
      console.error(e);
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  // Compute dynamic breadcrumb entity hierarchy based on current navigation location
  let activeEntityName: string | undefined = undefined;
  let availableEntities: { id: string; name: string }[] | undefined = undefined;
  let handleSelectEntity: ((id: string) => void) | undefined = undefined;

  if (currentTab === 'workflow_builder') {
    const activeWf = workflows.find((w) => w.id === selectedWorkflowId) || workflows[0];
    activeEntityName = activeWf?.name;
    availableEntities = workflows.map((w) => ({ id: w.id, name: w.name }));
    handleSelectEntity = (id: string) => setSelectedWorkflowId(id);
  } else if (currentTab === 'agent_studio') {
    const activeAg = agents.find((a) => a.id === selectedAgentId) || agents[0];
    activeEntityName = activeAg?.name;
    availableEntities = agents.map((a) => ({ id: a.id, name: a.name }));
    handleSelectEntity = (id: string) => setSelectedAgentId(id);
  } else if (currentTab === 'workflow_library') {
    activeEntityName = 'Enterprise Catalog';
  } else if (currentTab === 'knowledge') {
    activeEntityName = `${knowledge.length} Grounding Sources`;
  } else if (currentTab === 'integrations') {
    activeEntityName = `${integrations.length} Active Connectors`;
  } else if (currentTab === 'evaluations') {
    activeEntityName = 'Quality Benchmarks';
  } else if (currentTab === 'observability') {
    activeEntityName = `${executions.length} Traces Logged`;
  } else if (currentTab === 'deployments') {
    activeEntityName = 'Production Ingress';
  } else if (currentTab === 'governance') {
    activeEntityName = pendingApprovalsCount > 0 ? `${pendingApprovalsCount} Pending Signoffs` : 'Audit Ledger';
  } else if (currentTab === 'model_customization') {
    activeEntityName = 'PEFT & LoRA Studio';
  } else if (currentTab === 'data_foundry') {
    activeEntityName = 'Data Engine & RLHF Foundry';
  } else if (currentTab === 'red_teaming') {
    activeEntityName = 'Scale SEAL Safety Benchmark';
  }

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#080B11] flex flex-col items-center justify-center text-slate-300 gap-3 select-none">
        <Loader2 className="w-5 h-5 text-white/80 animate-spin" />
        <div className="font-medium text-xs tracking-tight text-white">Initializing Nexus AI Platform</div>
        <p className="text-[11px] text-slate-500 font-mono">Loading tenant context & topology runtime...</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#080B11] text-slate-100 flex flex-col font-sans selection:bg-white/[0.15] selection:text-white relative overflow-hidden">
        {/* Subtle Ambient Illumination for Glassmorphism Refraction */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-[140px]" />
          <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-indigo-600/[0.03] rounded-full blur-[160px]" />
          <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-violet-600/[0.03] rounded-full blur-[140px]" />
        </div>

        {/* Persistent Enterprise Header with Global Breadcrumbs */}
        <Header
          currentOrg={me?.organization}
          currentWorkspace={me?.workspace}
          currentUser={me?.user}
          availableWorkspaces={me?.availableWorkspaces || []}
          availableUsers={me?.availableUsers || []}
          onSwitchWorkspace={handleSwitchWorkspace}
          onSwitchUser={handleSwitchUser}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          currentTab={currentTab}
          onNavigate={setCurrentTab}
          activeEntityName={activeEntityName}
          availableEntities={availableEntities}
          onSelectEntity={handleSelectEntity}
          onOpenRoadmap={() => setRoadmapOpen(true)}
          onOpenVerifier={() => setVerifierOpen(true)}
          demoMode={me?.demoMode}
        />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* Dynamic Content Region */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {currentTab === 'command_center' && (
            <CommandCenter
              agents={agents}
              workflows={workflows}
              executions={executions}
              deployments={deployments}
              approvals={approvals}
              auditLogs={auditLogs}
              onNavigate={setCurrentTab}
              onApproveExecution={handleApproveExecution}
              onRefreshData={loadPlatformData}
              onOpenRoadmap={() => setRoadmapOpen(true)}
            />
          )}

          {currentTab === 'agent_studio' && (
            <AgentStudio
              agents={agents}
              onRefreshAgents={loadPlatformData}
              selectedAgentId={selectedAgentId}
              onSelectAgentId={setSelectedAgentId}
            />
          )}

          {currentTab === 'workflow_builder' && (
            <WorkflowBuilder
              workflows={workflows}
              agents={agents}
              knowledge={knowledge}
              integrations={integrations}
              onRefreshWorkflows={loadPlatformData}
              onRefreshExecutions={loadPlatformData}
              selectedWorkflowId={selectedWorkflowId}
              onSelectWorkflowId={setSelectedWorkflowId}
            />
          )}

          {currentTab === 'workflow_library' && (
            <WorkflowLibrary
              workflows={workflows}
              onNavigate={setCurrentTab}
              onRefreshWorkflows={loadPlatformData}
              onSelectWorkflow={setSelectedWorkflowId}
            />
          )}

          {currentTab === 'knowledge' && (
            <KnowledgeCenter knowledge={knowledge} onRefreshKnowledge={loadPlatformData} />
          )}

          {currentTab === 'integrations' && (
            <IntegrationsCatalog
              integrations={integrations}
              onRefreshIntegrations={loadPlatformData}
            />
          )}

          {currentTab === 'evaluations' && (
            <EvaluationLab evaluations={evaluations} onRefreshEvaluations={loadPlatformData} />
          )}

          {currentTab === 'observability' && (
            <ObservabilityExplorer
              executions={executions}
              onRefreshExecutions={loadPlatformData}
            />
          )}

          {currentTab === 'deployments' && (
            <DeploymentCenter
              deployments={deployments}
              workflows={workflows}
              onRefreshDeployments={loadPlatformData}
            />
          )}

          {currentTab === 'governance' && (
            <GovernanceSecurity
              approvals={approvals}
              auditLogs={auditLogs}
              onApproveExecution={handleApproveExecution}
            />
          )}

          {currentTab === 'model_customization' && (
            <ModelCustomizationStudio
              onNavigateToDeployments={() => setCurrentTab('deployments')}
            />
          )}

          {currentTab === 'data_foundry' && (
            <DataFoundryStudio />
          )}

          {currentTab === 'red_teaming' && (
            <RedTeamingSecurityStudio />
          )}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={setCurrentTab}
        agents={agents}
        workflows={workflows}
        onSelectAgent={setSelectedAgentId}
        onSelectWorkflow={setSelectedWorkflowId}
        onOpenVerifier={() => setVerifierOpen(true)}
      />

      {/* Interactive Platform Roadmap & Release Gates Modal */}
      <RoadmapViewer
        isOpen={roadmapOpen}
        onClose={() => setRoadmapOpen(false)}
        onNavigate={setCurrentTab}
      />

      {/* Live Platform Feature Verifier Suite */}
      <SystemVerifierModal
        isOpen={verifierOpen}
        onClose={() => setVerifierOpen(false)}
      />
      </div>
    </ToastProvider>
  );
}
