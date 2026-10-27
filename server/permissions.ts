import type { User } from './storage';

// L1 T5: the one permission table. Every role of the org may read (GET); a change needs a role listed here.
// A changing route missing from the table is refused for every role.
type Role = User['role'];
const ADMIN: Role[] = ['org_admin'];
const WORKSPACE_ADMIN: Role[] = [...ADMIN, 'workspace_admin'];
const BUILD: Role[] = [...WORKSPACE_ADMIN, 'builder'];
const OPERATE: Role[] = [...BUILD, 'operator'];
const EVALUATE: Role[] = [...BUILD, 'evaluator'];
const ANY: Role[] = [...OPERATE, 'evaluator', 'viewer'];

export const PERMISSIONS: Record<string, Role[]> = {
  'POST /api/v1/auth/logout': ANY,
  'POST /api/v1/auth/switch-context': ANY,
  'POST /api/v1/knowledge/search': ANY,
  // Every role reaches the approve route; the role the approval node names decides (L1 T6, T16).
  'POST /api/v1/executions/:id/approve': ANY,
  'POST /api/v1/agents': BUILD,
  'PUT /api/v1/agents/:id': BUILD,
  'POST /api/v1/agents/:id/test': BUILD,
  'POST /api/v1/agents/:id/duplicate': BUILD,
  'POST /api/v1/workflows': BUILD,
  'PUT /api/v1/workflows/:id': BUILD,
  'POST /api/v1/workflows/:id/validate': BUILD,
  'POST /api/v1/workflows/:id/duplicate': BUILD,
  'POST /api/v1/ai/think-and-generate': BUILD,
  'POST /api/v1/knowledge': BUILD,
  'DELETE /api/v1/knowledge/:id': BUILD,
  'POST /api/v1/knowledge/:id/reindex': BUILD,
  'POST /api/v1/integrations/:id/test': BUILD,
  'POST /api/v1/integrations/:id/sync': BUILD,
  'POST /api/v1/fine-tuning': BUILD,
  'DELETE /api/v1/fine-tuning/:id': BUILD,
  'POST /api/v1/data-foundry/generate': BUILD,
  'DELETE /api/v1/data-foundry/:id': BUILD,
  'POST /api/v1/workflows/:id/execute': OPERATE,
  'POST /api/v1/executions/:id/cancel': OPERATE,
  'POST /api/v1/deployments/:id/test-invoke': OPERATE,
  'POST /api/v1/evaluations/datasets': EVALUATE,
  'POST /api/v1/evaluations/runs': EVALUATE,
  'POST /api/v1/data-foundry/annotate': EVALUATE,
  'POST /api/v1/red-teaming/execute': EVALUATE,
  'POST /api/v1/red-teaming/test-probe': EVALUATE,
  'POST /api/v1/knowledge/reindex-all': WORKSPACE_ADMIN,
  'POST /api/v1/integrations': WORKSPACE_ADMIN,
  'DELETE /api/v1/integrations/:id': WORKSPACE_ADMIN,
  'POST /api/v1/deployments': WORKSPACE_ADMIN,
  'PATCH /api/v1/deployments/:id/status': WORKSPACE_ADMIN,
  'DELETE /api/v1/deployments/:id': WORKSPACE_ADMIN,
  'POST /api/v1/fine-tuning/:id/deploy': WORKSPACE_ADMIN,
  'PATCH /api/v1/settings': ADMIN,
  'PATCH /api/v1/red-teaming/guardrails': ADMIN,
  'POST /api/v1/audit-events/simulate': ADMIN,
  'POST /api/v1/governance/compliance-scan': ADMIN,
};

const patterns = Object.entries(PERMISSIONS).map(([key, roles]) => {
  const [method, path] = key.split(' ');
  return { method, path: new RegExp(`^${path.replace(/:\w+/g, '[^/]+')}/?$`, 'i'), roles };
});

export function allowed(role: Role, method: string, path: string) {
  if (method === 'GET' || method === 'HEAD') return true;
  const entry = patterns.find((p) => p.method === method && p.path.test(path));
  return !!entry && entry.roles.includes(role);
}
