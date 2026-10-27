// L1 T11: the one table of request bodies, beside the permission table. A route that reads its body has an entry here;
// a listed field is checked when present, and a field without "?" must be present. Type words:
//   string, boolean, object, array, string[]   as in JSON
//   number        a finite number              numeric  a number, or a string holding one, as HTML forms send
//   nonnegative   a finite number >= 0         any      anything
//   a|b|c         one of these words           nodes, edges, cases, schema   see CHECKS
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const CHECKS: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === 'string',
  boolean: (v) => typeof v === 'boolean',
  object: isObject,
  array: Array.isArray,
  'string[]': (v) => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  numeric: (v) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v)),
  nonnegative: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0,
  any: () => true,
  // A workflow graph: every node has an id, a type and a config; every edge joins two node ids.
  nodes: (v) => Array.isArray(v) && v.every((n) => isObject(n) && typeof n.id === 'string' && typeof n.type === 'string' && isObject(n.config)),
  edges: (v) => Array.isArray(v) && v.every((e) => isObject(e) && typeof e.source === 'string' && typeof e.target === 'string'),
  // Evaluation cases: each has an expected output and the keywords a run checks for.
  cases: (v) => Array.isArray(v) && v.every((c) => isObject(c) && c.expectedOutput !== undefined && CHECKS['string[]'](c.groundTruthKeywords)),
  // A workflow's input schema: field names mapped to the type words above.
  schema: (v) => isObject(v) && Object.values(v).every((t) => typeof t === 'string' && (t.replace(/\?$/, '') in CHECKS || t.includes('|'))),
};

const S = 'string?';
export const SCHEMAS: Record<string, Record<string, string>> = {
  'POST /api/v1/auth/login': { email: 'string', password: 'string' },
  'POST /api/v1/auth/switch-context': { userId: S, workspaceId: S, orgId: S },
  'POST /api/v1/agents': { name: S, description: S, department: S, model: S, systemPrompt: S, tools: 'string[]?', thinkingMode: 'boolean?', thinkingLevel: S },
  'PUT /api/v1/agents/:id': { name: S, description: S, department: S, model: S, systemPrompt: S, tools: 'string[]?', thinkingMode: 'boolean?', thinkingLevel: S, temperature: 'numeric?', maxSteps: 'numeric?' },
  'POST /api/v1/agents/:id/test': { userInput: 'any?', useHighThinking: 'boolean?' },
  'POST /api/v1/workflows': { name: S, description: S, department: S, category: S, nodes: 'nodes?', edges: 'edges?', inputSchema: 'schema?' },
  'PUT /api/v1/workflows/:id': { name: S, description: S, department: S, nodes: 'nodes?', edges: 'edges?', inputSchema: 'schema?' },
  // Validation reports what is wrong with any graph, so it takes graphs the other routes refuse.
  'POST /api/v1/workflows/:id/validate': { nodes: 'array?', edges: 'array?' },
  'POST /api/v1/workflows/:id/execute': { input: 'object?', trigger: S },
  'POST /api/v1/executions/:id/approve': { decision: 'approve|reject', notes: S },
  'POST /api/v1/knowledge': { title: S, category: S, content: S },
  'POST /api/v1/knowledge/search': { query: S },
  'POST /api/v1/integrations': { name: S, category: S, description: S, baseUrl: S, authType: S, permissionsRequired: 'string[]?' },
  'POST /api/v1/evaluations/datasets': { name: S, description: S, cases: 'cases?' },
  'POST /api/v1/evaluations/runs': { datasetId: S, targetType: S, targetId: S },
  // The whole body is the workflow's input; the workflow's own input schema checks its fields.
  'POST /api/v1/deployments/:id/execute': {},
  'POST /api/v1/deployments/:id/test-invoke': {},
  'POST /api/v1/deployments': { workflowId: S, name: S, environment: 'production|staging|sandbox?', rateLimitPerMinute: 'numeric?' },
  'PATCH /api/v1/deployments/:id/status': { status: 'active|suspended|rolled_back' },
  'POST /api/v1/audit-events/simulate': { eventType: S },
  'PATCH /api/v1/settings': { allowedModels: 'string[]?', requireHumanApprovalForDeploy: 'boolean?', dataRetentionDays: 'numeric?', demoMode: 'boolean?' },
  'POST /api/v1/fine-tuning': { name: S, baseModel: S, method: S, datasetName: S, datasetSize: 'numeric?', learningRate: 'numeric?', epochs: 'numeric?', loraRank: 'numeric?', loraAlpha: 'numeric?', batchSize: 'numeric?' },
  'POST /api/v1/data-foundry/generate': { name: S, domain: S, method: S, count: 'numeric?', seedPrompt: S },
  'POST /api/v1/data-foundry/annotate': { datasetId: 'string', sampleId: 'string', preference: S, rationale: S },
  'POST /api/v1/red-teaming/execute': { targetModel: S, attackVector: S },
  'POST /api/v1/red-teaming/test-probe': { prompt: S },
  'PATCH /api/v1/red-teaming/guardrails': { piiMasking: 'boolean?', jailbreakSensitivity: 'numeric?', blockCbrnHazards: 'boolean?', semanticFirewallEnabled: 'boolean?', toxicContentThreshold: 'numeric?' },
  'POST /api/v1/ai/think-and-generate': { prompt: S, systemInstruction: S },
};

export const valid = (type: string, value: unknown) => CHECKS[type](value);

// The first problem with a value against a schema; the message names the field and nothing internal.
export function problem(schema: Record<string, string>, value: unknown): string | undefined {
  if (!isObject(value)) return 'The body must be a JSON object.';
  for (const [field, spec] of Object.entries(schema)) {
    const type = spec.replace(/\?$/, '');
    const v = value[field];
    if (v === undefined) {
      if (!spec.endsWith('?')) return `${field} is required.`;
      continue;
    }
    const words = type.includes('|') ? type.split('|') : undefined;
    if (!(words ? words.includes(v as string) : CHECKS[type](v))) {
      return `${field} must be ${words ? `one of: ${words.join(', ')}` : `of type ${type}`}.`;
    }
  }
  return undefined;
}

const patterns = Object.entries(SCHEMAS).map(([key, schema]) => {
  const [method, path] = key.split(' ');
  return { method, path: new RegExp(`^${path.replace(/:\w+/g, '[^/]+')}/?$`, 'i'), schema };
});

// The problem with a request's body, or undefined when the route takes no body or the body fits.
export function bodyProblem(method: string, path: string, body: unknown) {
  const entry = patterns.find((p) => p.method === method && p.path.test(path));
  return entry && problem(entry.schema, body);
}
