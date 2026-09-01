/**
 * EduGuard Core — Unified API  v1.3
 *
 * POST /api/v1/core?action=identity   — identity + per-product memberships
 * POST /api/v1/core?action=context    — product-scoped role for context switch
 * POST /api/v1/core?action=audit      — log audit event
 * POST /api/v1/core?action=tenant     — resolve tenant profile
 * POST /api/v1/core?action=notify     — queue notification
 * POST /api/v1/core?action=memberships-list   — list memberships for a user
 * POST /api/v1/core?action=memberships-add    — add membership
 * POST /api/v1/core?action=memberships-remove — revoke membership
 */

import { cors, resolveScope, buildPermissionsByRole, normalizeRole } from '../_lib/businessApiProxy.js';
import { createClient } from '@supabase/supabase-js';

/* ── Supabase client (serverless — use service role for server-side reads) ── */
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let _supabase = null;
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!_supabase) _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  return _supabase;
}

/* ── Portal access matrix ─────────────────────────────────────────── */
const PORTAL_ACCESS = {
  security:    { full: ['super_admin','admin','director','seguranca','professor','secretaria','financeiro','administrator'], restricted: ['parent','guardian','student'] },
  building360: { full: ['super_admin','admin','director','administrator'], restricted: ['secretaria','financeiro'] },
  edumarket:   { full: ['super_admin','admin','professor','teacher','administrator'], restricted: ['student','parent'] },
  'verify-ai': { full: ['super_admin','admin','administrator'], restricted: [] },
  literature:  { full: ['super_admin','admin','director','professor','secretaria','financeiro','seguranca','administrator','student','parent'], restricted: [] },
  enterprise:  { full: ['super_admin','admin','director','secretaria','financeiro','professor','coordenador','rh','administrator'], restricted: [] },
  analytics:   { full: ['super_admin','admin','director','administrator'], restricted: ['financeiro','secretaria'] },
};

const ROLE_LABELS = {
  super_admin:'Super Admin', admin:'Administrador Sistema', director:'Diretor',
  administrator:'Administrador', secretaria:'Secretaria', financeiro:'Financeiro',
  professor:'Professor', teacher:'Professor', seguranca:'Segurança',
  coordenador:'Coordenador', rh:'Recursos Humanos', student:'Aluno',
  parent:'Encarregado', guardian:'Encarregado',
};

/* ── Multi-product membership table (demo/fallback only) ────────── */
const DEMO_MEMBERSHIPS = {
  demo: {
    security:    { role: 'professor',     organizationId: 'escola-demo' },
    building360: { role: 'administrator', organizationId: 'condo-alpha' },
    edumarket:   { role: 'teacher',       organizationId: 'edumarket-global' },
    'verify-ai': null,
    literature:  { role: 'student',       organizationId: 'public' },
    enterprise:  { role: 'professor',     organizationId: 'escola-demo' },
    analytics:   null,
  },
};

/* ── Helpers ──────────────────────────────────────────────────────── */
function portalEntry(role, matrix, orgId) {
  const r = normalizeRole(role);
  if (!r) return { access: 'none', canOpen: false, role: null, roleLabel: null, organizationId: null };
  const inFull = matrix.full.includes(r);
  const inRestricted = matrix.restricted.includes(r);
  return {
    access: inFull ? 'full' : inRestricted ? 'restricted' : 'none',
    canOpen: inFull || inRestricted,
    role: (inFull || inRestricted) ? r : null,
    roleLabel: (inFull || inRestricted) ? (ROLE_LABELS[r] || r) : null,
    organizationId: orgId || null,
  };
}

/**
 * Resolve memberships from Supabase `core_memberships` table.
 * Falls back to demo/global-role if DB is unavailable or user has no records.
 */
async function resolveMembershipsFromDB(userId, globalRole, orgId) {
  const sb = getSupabase();

  if (sb && userId && userId !== 'unknown') {
    try {
      const { data, error } = await sb
        .from('core_memberships')
        .select('product_id, organization_id, role, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(50);

      if (!error && Array.isArray(data) && data.length > 0) {
        // Build memberships map from DB rows
        const dbMap = {};
        for (const row of data) {
          dbMap[row.product_id] = { role: row.role, organizationId: row.organization_id };
        }

        const memberships = {};
        for (const [productId, matrix] of Object.entries(PORTAL_ACCESS)) {
          if (dbMap[productId]) {
            memberships[productId] = portalEntry(dbMap[productId].role, matrix, dbMap[productId].organizationId || orgId);
          } else {
            // Not in DB → no access to this product
            memberships[productId] = { access: 'none', canOpen: false, role: null, roleLabel: null, organizationId: null };
          }
        }
        return { memberships, source: 'database' };
      }
    } catch (err) {
      console.warn('[CORE] DB memberships query failed, using fallback:', err?.message);
    }
  }

  // Fallback: demo table for known users, global role for everyone else
  return { memberships: resolveMembershipsFromDemo(userId, globalRole, orgId), source: 'fallback' };
}

function resolveMembershipsFromDemo(userId, globalRole, orgId) {
  const userMem = DEMO_MEMBERSHIPS[userId] || null;
  const memberships = {};
  for (const [productId, matrix] of Object.entries(PORTAL_ACCESS)) {
    if (userMem && Object.prototype.hasOwnProperty.call(userMem, productId)) {
      const mem = userMem[productId];
      if (!mem) {
        memberships[productId] = { access: 'none', canOpen: false, role: null, roleLabel: null, organizationId: null };
      } else {
        memberships[productId] = portalEntry(mem.role, matrix, mem.organizationId || orgId);
      }
    } else {
      memberships[productId] = portalEntry(globalRole, matrix, orgId);
    }
  }
  return memberships;
}

/** Keep sync alias for context/list actions */
function resolveMemberships(userId, globalRole, orgId) {
  return resolveMembershipsFromDemo(userId, globalRole, orgId);
}

function decodeJwtPayload(token) {
  try {
    const json = Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch { return null; }
}

/**
 * Build memberships map from JWT claims array.
 * Each claim: { productId, organizationId, role }
 */
function buildMembershipsFromJwt(jwtMems, globalRole, globalOrgId) {
  const memberships = {};
  // First fill every portal with the global role as fallback
  for (const [productId, matrix] of Object.entries(PORTAL_ACCESS)) {
    memberships[productId] = portalEntry(globalRole, matrix, globalOrgId);
  }
  // Override with explicit JWT membership claims
  for (const mem of jwtMems) {
    const { productId, organizationId, role } = mem;
    const matrix = PORTAL_ACCESS[productId];
    if (!matrix) continue;
    memberships[productId] = portalEntry(role, matrix, organizationId || globalOrgId);
  }
  return memberships;
}

/* ── Action: identity ────────────────────────────────────────────── */
async function handleIdentity(req, scope, jwtClaims) {
  const body = req.body || {};
  const role = jwtClaims?.perfil ? normalizeRole(jwtClaims.perfil) : jwtClaims?.role ? normalizeRole(jwtClaims.role) : scope.role;
  const userId  = jwtClaims?.sub || jwtClaims?.userId || String(req.headers['x-user-id'] || body.userId || '').trim() || null;
  const email   = jwtClaims?.email || String(req.headers['x-user-email'] || body.email || '').trim() || null;
  const name    = jwtClaims?.nome || jwtClaims?.name || String(req.headers['x-user-name'] || body.name || '').trim() || null;
  const orgId   = scope.schoolId !== 'school-demo' ? scope.schoolId : null;

  // Priority 1: JWT memberships array (fastest, no DB round-trip)
  const jwtMems = Array.isArray(jwtClaims?.memberships) ? jwtClaims.memberships : null;

  let memberships;
  let dataSource;

  if (jwtMems) {
    memberships = buildMembershipsFromJwt(jwtMems, role, orgId);
    dataSource = 'jwt-memberships';
  } else {
    // Priority 2: live DB query; Priority 3: fallback
    const { memberships: dbMem, source } = await resolveMembershipsFromDB(userId || 'unknown', role, orgId);
    memberships = dbMem;
    dataSource = source;
  }

  const accessiblePortals = Object.entries(memberships)
    .filter(([, v]) => v.canOpen)
    .map(([id, v]) => ({ id, role: v.role, roleLabel: v.roleLabel, organizationId: v.organizationId }));

  return {
    identity: {
      userId, email, name, role,
      roleLabel: ROLE_LABELS[role] || role,
      organizationId: orgId,
      tenantId: scope.tenantId !== 'school-demo' ? scope.tenantId : null,
      sessionValid: jwtClaims?.exp ? (jwtClaims.exp * 1000 > Date.now()) : null,
    },
    memberships,
    accessiblePortals,
    permissions: buildPermissionsByRole(role),
    meta: {
      resolvedAt: new Date().toISOString(),
      source: dataSource,
      coreVersion: '1.3',
      dbConnected: !!getSupabase(),
    },
  };
}

/* ── Action: context ─────────────────────────────────────────────── */
function handleContext(req, scope, jwtClaims) {
  const body = req.body || {};
  const productId = String(body.productId || req.query?.product || '').trim();
  if (!productId) return { _error: 400, message: 'Field "productId" is required.' };

  const userId = jwtClaims?.sub || String(req.headers['x-user-id'] || body.userId || '').trim() || null;
  const globalRole = jwtClaims?.perfil ? normalizeRole(jwtClaims.perfil) : jwtClaims?.role ? normalizeRole(jwtClaims.role) : scope.role;
  const orgId = scope.schoolId !== 'school-demo' ? scope.schoolId : null;

  const memberships = resolveMemberships(userId || 'unknown', globalRole, orgId);
  const mem = memberships[productId] || { access: 'none', canOpen: false, role: null, organizationId: null };
  const effectiveRole = mem.role || globalRole;

  return {
    productId, userId,
    access: mem.access,
    canOpen: mem.canOpen,
    role: effectiveRole,
    roleLabel: ROLE_LABELS[effectiveRole] || effectiveRole,
    organizationId: mem.organizationId || orgId,
    permissions: buildPermissionsByRole(effectiveRole),
    resolvedAt: new Date().toISOString(),
  };
}

/* ── Action: audit ───────────────────────────────────────────────── */
function handleAudit(req, scope) {
  const body = req.body || {};
  const action = String(body.action || '').trim();
  if (!action) return { _error: 400, message: 'Field "action" is required.' };
  const event = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
    action, portal: String(body.portal || 'unknown').trim(),
    userId: String(body.userId || req.headers['x-user-id'] || '').trim() || null,
    role: scope.role, productId: body.productId || null,
    organizationId: scope.schoolId !== 'school-demo' ? scope.schoolId : null,
    resourceType: body.resourceType || null, resourceId: body.resourceId || null,
    metadata: typeof body.metadata === 'object' ? body.metadata : {},
    timestamp: new Date().toISOString(),
  };
  console.log('[AUDIT]', JSON.stringify(event));
  return { id: event.id, message: 'Evento de auditoria registado', timestamp: event.timestamp };
}

/* ── Action: tenant ──────────────────────────────────────────────── */
function handleTenant(req, scope) {
  const body = req.body || {};
  const tenantId = body.tenantId || body.organizationId || scope.tenantId || scope.schoolId || 'school-demo';
  return {
    tenant: {
      id: tenantId,
      name: tenantId === 'school-demo' ? 'Escola Demonstração' : tenantId,
      type: 'organization', country: 'MZ',
      activePortals: ['enterprise', 'analytics', 'security', 'literature'],
      tier: 'standard', logoUrl: null, primaryColor: '#10b981',
    },
    resolvedAt: new Date().toISOString(), source: 'fallback',
  };
}

/* ── Action: notify ──────────────────────────────────────────────── */
function handleNotify(req, scope) {
  const body = req.body || {};
  const channel = String(body.channel || 'in_app').trim();
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  const warnings = [];
  if (channel === 'sms')  warnings.push('SMS via Twilio not yet configured');
  if (channel === 'push') warnings.push('Push notifications not yet configured');
  console.log('[NOTIFY]', JSON.stringify({ id, channel, to: body.to, portal: body.portal }));
  return {
    id, status: 'queued', channel,
    message: warnings.length ? 'Queued with warnings' : 'Notificação colocada na fila',
    warnings: warnings.length ? warnings : undefined,
    queuedAt: new Date().toISOString(),
  };
}

/* ── Action: memberships-list ────────────────────────────────────── */
function handleMembershipsList(req, scope, jwtClaims) {
  const body = req.body || {};
  const userId = jwtClaims?.sub || String(req.headers['x-user-id'] || body.userId || '').trim() || null;
  const globalRole = jwtClaims?.perfil ? normalizeRole(jwtClaims.perfil) : jwtClaims?.role ? normalizeRole(jwtClaims.role) : scope.role;
  const orgId = scope.schoolId !== 'school-demo' ? scope.schoolId : null;

  const jwtMems = Array.isArray(jwtClaims?.memberships) ? jwtClaims.memberships : null;
  const memberships = jwtMems
    ? buildMembershipsFromJwt(jwtMems, globalRole, orgId)
    : resolveMemberships(userId || 'unknown', globalRole, orgId);

  const list = Object.entries(memberships)
    .map(([productId, mem]) => ({
      productId,
      role: mem.role,
      roleLabel: mem.roleLabel,
      organizationId: mem.organizationId,
      access: mem.access,
      canOpen: mem.canOpen,
    }));

  return { userId, memberships: list, total: list.length, resolvedAt: new Date().toISOString() };
}

/* ── Action: memberships-add ─────────────────────────────────────── */
async function handleMembershipsAdd(req, scope) {
  const body = req.body || {};
  const { userId, productId, organizationId, role } = body;

  if (!userId || !productId || !organizationId || !role) {
    return { _error: 400, message: 'Required: userId, productId, organizationId, role' };
  }
  if (!PORTAL_ACCESS[productId]) {
    return { _error: 400, message: `Unknown productId: ${productId}. Valid: ${Object.keys(PORTAL_ACCESS).join(', ')}` };
  }

  const normalizedRole = normalizeRole(role);
  const matrix = PORTAL_ACCESS[productId];
  const inFull = matrix.full.includes(normalizedRole);
  const inRestricted = matrix.restricted.includes(normalizedRole);
  if (!inFull && !inRestricted) {
    return { _error: 400, message: `Role '${role}' not valid for '${productId}'`, validRoles: [...matrix.full, ...matrix.restricted] };
  }

  const sb = getSupabase();
  let dbId = null;
  let dbNote = 'Logged only. Set SUPABASE_SERVICE_ROLE_KEY env var to persist.';

  if (sb) {
    try {
      const { data, error } = await sb
        .from('core_memberships')
        .upsert(
          {
            user_id: userId,
            product_id: productId,
            organization_id: organizationId,
            role: normalizedRole,
            status: 'active',
            accepted_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,product_id,organization_id' }
        )
        .select('id')
        .single();

      if (!error && data?.id) {
        dbId = data.id;
        dbNote = 'Persisted to core_memberships. Re-issue JWT to activate in token.';
      } else if (error) {
        dbNote = `DB write failed: ${error.message}. Logged only.`;
      }
    } catch (err) {
      dbNote = `DB error: ${err?.message}. Logged only.`;
    }
  }

  console.log('[MEMBERSHIP-ADD]', JSON.stringify({ userId, productId, organizationId, role: normalizedRole, by: scope.role }));

  return {
    id: dbId || `mem-${Date.now()}-${Math.random().toString(36).slice(2,9)}`,
    message: 'Membro adicionado ao produto com sucesso',
    membership: { userId, productId, organizationId, role: normalizedRole, roleLabel: ROLE_LABELS[normalizedRole] || normalizedRole, status: 'active', createdAt: new Date().toISOString() },
    note: dbNote,
  };
}

/* ── Action: memberships-remove ──────────────────────────────────── */
async function handleMembershipsRemove(req, scope) {
  const body = req.body || {};
  const { userId, productId, organizationId } = body;

  if (!userId || !productId) {
    return { _error: 400, message: 'Required: userId, productId' };
  }

  const sb = getSupabase();
  let dbNote = 'Logged only. Set SUPABASE_SERVICE_ROLE_KEY env var to persist.';

  if (sb) {
    try {
      let query = sb
        .from('core_memberships')
        .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: scope.role })
        .eq('user_id', userId)
        .eq('product_id', productId);
      if (organizationId) query = query.eq('organization_id', organizationId);

      const { error } = await query;
      dbNote = error ? `DB update failed: ${error.message}` : 'Revoked in core_memberships. Re-issue JWT to deactivate in token.';
    } catch (err) {
      dbNote = `DB error: ${err?.message}`;
    }
  }

  console.log('[MEMBERSHIP-REMOVE]', JSON.stringify({ userId, productId, organizationId, by: scope.role }));

  return {
    message: 'Acesso ao produto revogado com sucesso',
    userId, productId, organizationId: organizationId || null,
    revokedAt: new Date().toISOString(), note: dbNote,
  };
}

/* ── Main handler ─────────────────────────────────────────────────── */
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const action = String(req.query?.action || req.body?.action || 'identity').trim();

  let jwtClaims = null;
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) jwtClaims = decodeJwtPayload(auth.slice(7));

  const scope = resolveScope(req);
  let result;
  let status = 200;

  switch (action) {
    case 'identity':
      result = await handleIdentity(req, scope, jwtClaims);
      break;
    case 'context':
      result = handleContext(req, scope, jwtClaims);
      if (result._error) { status = result._error; delete result._error; }
      break;
    case 'audit':
      result = handleAudit(req, scope);
      if (result._error) { status = result._error; delete result._error; }
      else status = 201;
      break;
    case 'tenant':
      result = handleTenant(req, scope);
      break;
    case 'notify':
      result = handleNotify(req, scope);
      status = 202;
      break;
    case 'memberships-list':
      result = await handleMembershipsList(req, scope, jwtClaims);
      break;
    case 'memberships-add':
      result = await handleMembershipsAdd(req, scope);
      if (result._error) { status = result._error; delete result._error; }
      else status = 201;
      break;
    case 'memberships-remove':
      result = await handleMembershipsRemove(req, scope);
      if (result._error) { status = result._error; delete result._error; }
      break;
    default:
      result = { error: 'unknown-action', supported: ['identity', 'context', 'audit', 'tenant', 'notify', 'memberships-list', 'memberships-add', 'memberships-remove'] };
      status = 400;
  }

  res.status(status).json(result);
}
