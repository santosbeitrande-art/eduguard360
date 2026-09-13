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
 * POST /api/v1/core?action=workspace-catalog  — profile workspace metadata and module catalog
 * POST /api/v1/core?action=workspace-authorize — backend route authorization check by role
 */

import { cors, resolveScope, requireEnterpriseScope, buildPermissionsByRole, normalizeRole } from '../_lib/businessApiProxy.js';
import { getRoleWorkspaceCatalog, getSupportedWorkspaceProfiles } from '../_lib/workspaceCatalog.js';
import {
  getBuilding360WorkspaceCatalog,
  getBuilding360SupportedProfiles,
  normalizeBuilding360Profile,
} from '../_lib/building360WorkspaceCatalog.js';
import { handleBuilding360Route } from '../_lib/building360ProxyRoute.js';
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
  security:    { full: ['seguranca'], restricted: ['super_admin','admin','director','administrator','secretaria','coordenador','professor','financeiro','rh','parent','guardian','student'] },
  building360: { full: ['super_admin','admin','director','administrator','organization_admin','building_manager','finance_manager','maintenance_manager','security_manager','community_manager','document_manager','parking_manager','auditor','resident','occupant'], restricted: ['secretaria'] },
  edumarket:   { full: ['super_admin','admin','professor','teacher','administrator'], restricted: ['student','parent'] },
  'verify-ai': { full: ['super_admin','admin','administrator'], restricted: [] },
  literature:  { full: ['super_admin','admin','director','professor','secretaria','financeiro','administrator','student','parent'], restricted: [] },
  enterprise:  { full: ['super_admin','admin'], restricted: ['director','administrator','secretaria','coordenador','professor','financeiro','rh','seguranca','parent','guardian','student'] },
  analytics:   { full: ['super_admin','admin','director','administrator'], restricted: ['financeiro','secretaria'] },
};

const BUILDING360_DASHBOARD_ALLOWED_PROFILES = new Set([
  'platform_admin',
  'organization_admin',
  'building_manager',
  'finance_manager',
  'maintenance_manager',
  'security_manager',
  'community_manager',
  'document_manager',
  'parking_manager',
  'auditor',
]);

const BUILDING360_REGISTRY_USER_ID = 'building360_registry';
const BUILDING360_SITE_PRODUCT_ID = 'building360_site';
const BUILDING360_BUILDING_PRODUCT_ID = 'building360_building';

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
    security:    { role: 'seguranca',      organizationId: 'escola-demo' },
    building360: { role: 'administrator', organizationId: 'condo-alpha' },
    edumarket:   { role: 'teacher',       organizationId: 'edumarket-global' },
    'verify-ai': null,
    literature:  { role: 'student',       organizationId: 'public' },
    enterprise:  { role: 'director',      organizationId: 'escola-demo' },
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
    canOpen: inFull,
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

function parseRegistryMetadata(rawValue) {
  try {
    const parsed = JSON.parse(String(rawValue || '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeRegistryRow(row) {
  const meta = parseRegistryMetadata(row?.invited_by);
  const productId = String(row?.product_id || '').trim();
  if (productId === BUILDING360_SITE_PRODUCT_ID) {
    return {
      id: String(row?.organization_id || '').trim(),
      name: String(meta.name || '').trim(),
      city: String(meta.city || 'N/A').trim(),
      type: String(meta.type || 'residential').trim(),
      tenantId: meta.tenantId || null,
      schoolId: meta.schoolId || null,
      organizationId: meta.organizationId || null,
      portfolioId: meta.portfolioId || null,
      code: meta.code || null,
      status: meta.status || 'active',
      source: 'core-registry',
    };
  }

  return {
    id: String(row?.organization_id || '').trim(),
    siteId: String(meta.siteId || '').trim(),
    name: String(meta.name || '').trim(),
    floors: Number(meta.floors || 1),
    tenantId: meta.tenantId || null,
    schoolId: meta.schoolId || null,
    organizationId: meta.organizationId || null,
    portfolioId: meta.portfolioId || null,
    code: meta.code || null,
    status: meta.status || 'active',
    source: 'core-registry',
  };
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

async function handleBuilding360RegistryList(_req) {
  const sb = getSupabase();
  if (!sb) {
    return { sites: [], buildings: [], source: 'registry-unavailable' };
  }

  try {
    const { data, error } = await sb
      .from('core_memberships')
    .select('product_id, organization_id, role, invited_by, status, updated_at')
      .eq('user_id', BUILDING360_REGISTRY_USER_ID)
      .in('product_id', [BUILDING360_SITE_PRODUCT_ID, BUILDING360_BUILDING_PRODUCT_ID])
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) {
      return { sites: [], buildings: [], source: 'registry-error', error: error.message };
    }

    const rows = Array.isArray(data) ? data : [];
    const sites = rows
      .filter((row) => row.product_id === BUILDING360_SITE_PRODUCT_ID)
      .map(normalizeRegistryRow);
    const buildings = rows
      .filter((row) => row.product_id === BUILDING360_BUILDING_PRODUCT_ID)
      .map(normalizeRegistryRow);

    return { sites, buildings, source: 'core-registry' };
  } catch (err) {
    return { sites: [], buildings: [], source: 'registry-error', error: String(err?.message || err) };
  }
}

async function handleBuilding360RegistryUpsert(req, scope) {
  let effectiveScope = scope;
  const sb = getSupabase();

  if (!effectiveScope?.isAuthenticated && sb) {
    const authHeader = String(req.headers.authorization || '').trim();
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (bearer) {
      try {
        const userResult = await sb.auth.getUser(bearer);
        const verifiedUser = userResult?.data?.user || null;
        if (verifiedUser?.id) {
          const verifiedEmail = String(verifiedUser.email || '').trim().toLowerCase();
          let verifiedRole = normalizeRole(req.headers['x-enterprise-role'] || req.body?.role || req.query?.role);

          if (verifiedEmail === 'admin@eduguard360.co.mz') {
            verifiedRole = 'super_admin';
          } else {
            try {
              const { data: domainUser } = await sb
                .from('utilizadores')
                .select('perfil,role,escola_id')
                .or(`auth_id.eq.${verifiedUser.id},email.eq.${verifiedEmail}`)
                .maybeSingle();
              if (domainUser) {
                verifiedRole = normalizeRole(domainUser?.perfil || domainUser?.role || verifiedRole);
              }
            } catch {
              // Keep header-derived role only after auth token verification.
            }
          }

          effectiveScope = {
            ...effectiveScope,
            role: verifiedRole,
            userId: verifiedUser.id,
            userName: verifiedUser.user_metadata?.full_name || verifiedUser.email || effectiveScope.userName,
            schoolId: effectiveScope.schoolId || null,
            tenantId: effectiveScope.tenantId || effectiveScope.schoolId || null,
            isAuthenticated: true,
            authSource: 'supabase-jwt',
          };
        }
      } catch {
        // Keep original unauthenticated scope.
      }
    }
  }

  const guard = requireEnterpriseScope(effectiveScope);
  if (!guard.ok) return { _error: guard.status, ...guard.body };

  const allowedRoles = new Set(['super_admin', 'admin', 'platform_admin', 'organization_admin']);
  const normalizedRole = normalizeRole(effectiveScope.role);
  if (!allowedRoles.has(normalizedRole)) {
    return { _error: 403, message: 'Somente administradores podem gerir o registry Building360.' };
  }

  if (!sb) {
    return { _error: 503, message: 'Supabase service role indisponivel para persistencia global.' };
  }

  const body = req.body || {};
  const entity = String(body.entity || '').trim().toLowerCase();
  if (entity !== 'site' && entity !== 'building') {
    return { _error: 400, message: 'entity deve ser site ou building.' };
  }

  const id = String(body.id || `${entity}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).trim();
  const name = String(body.name || '').trim();
  if (!name) {
    return { _error: 400, message: 'name e obrigatorio.' };
  }

  const metadata = entity === 'site'
    ? {
        name,
        city: String(body.city || 'N/A').trim(),
        type: String(body.type || 'residential').trim(),
        tenantId: String(body.tenantId || scope.tenantId || scope.schoolId || '').trim() || null,
        schoolId: String(body.schoolId || scope.schoolId || '').trim() || null,
        organizationId: String(body.organizationId || '').trim() || null,
        portfolioId: String(body.portfolioId || '').trim() || null,
        code: String(body.code || '').trim() || null,
        status: String(body.status || 'active').trim(),
      }
    : {
        name,
        siteId: String(body.siteId || '').trim(),
        floors: Number(body.floors || 1),
        tenantId: String(body.tenantId || scope.tenantId || scope.schoolId || '').trim() || null,
        schoolId: String(body.schoolId || scope.schoolId || '').trim() || null,
        organizationId: String(body.organizationId || '').trim() || null,
        portfolioId: String(body.portfolioId || '').trim() || null,
        code: String(body.code || '').trim() || null,
        status: String(body.status || 'active').trim(),
      };

  if (entity === 'building' && !metadata.siteId) {
    return { _error: 400, message: 'siteId e obrigatorio para building.' };
  }

  const productId = entity === 'site' ? BUILDING360_SITE_PRODUCT_ID : BUILDING360_BUILDING_PRODUCT_ID;

  try {
    const { data, error } = await sb
      .from('core_memberships')
      .upsert(
        {
          user_id: BUILDING360_REGISTRY_USER_ID,
          product_id: productId,
          organization_id: id,
          role: entity,
          invited_by: JSON.stringify(metadata),
          status: 'active',
          accepted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,product_id,organization_id' }
      )
      .select('product_id, organization_id, role, invited_by, status, updated_at')
      .single();

    if (error) {
      return { _error: 500, message: error.message };
    }

    return {
      entity,
      item: normalizeRegistryRow(data),
      source: 'core-registry',
      persistedAt: new Date().toISOString(),
      authSource: effectiveScope.authSource || 'unknown',
    };
  } catch (err) {
    return { _error: 500, message: String(err?.message || err) };
  }
}

/* ── Action: workspace-catalog ───────────────────────────────────── */
function handleWorkspaceCatalog(req, scope, jwtClaims) {
  const body = req.body || {};
  const requesterRole = jwtClaims?.perfil ? normalizeRole(jwtClaims.perfil) : jwtClaims?.role ? normalizeRole(jwtClaims.role) : scope.role;
  const requestedProfileRaw = String(body.profile || req.query?.profile || requesterRole || '').trim();
  const requestedProfile = normalizeRole(requestedProfileRaw);

  const catalog = getRoleWorkspaceCatalog(requestedProfile);
  if (!catalog) {
    return {
      _error: 400,
      message: `Perfil sem catalogo de workspace: ${requestedProfileRaw || 'desconhecido'}`,
      supportedProfiles: getSupportedWorkspaceProfiles(),
    };
  }

  if (requesterRole !== requestedProfile && requesterRole !== 'super_admin' && requesterRole !== 'admin') {
    return {
      _error: 403,
      message: 'Nao autorizado para consultar catalogo de outro perfil.',
    };
  }

  return {
    profile: catalog.profile,
    label: catalog.label,
    route: catalog.route,
    portal: catalog.portal,
    title: catalog.title,
    description: catalog.description,
    modules: catalog.modules,
    permissions: catalog.permissions,
    allowedRoutePrefixes: catalog.allowedRoutePrefixes,
    resolvedAt: new Date().toISOString(),
    source: 'core-workspace-catalog',
  };
}

/* ── Action: workspace-authorize ─────────────────────────────────── */
function handleWorkspaceAuthorize(req, scope, jwtClaims) {
  const body = req.body || {};
  const role = jwtClaims?.perfil ? normalizeRole(jwtClaims.perfil) : jwtClaims?.role ? normalizeRole(jwtClaims.role) : scope.role;
  const requestedRoute = String(body.route || req.query?.route || '').trim();

  if (!requestedRoute || !requestedRoute.startsWith('/')) {
    return { _error: 400, message: 'Required: route (absolute path)' };
  }

  if (role === 'super_admin' || role === 'admin') {
    const allowed = requestedRoute.startsWith('/sistema/admin') || requestedRoute.startsWith('/sistema/enterprise') || requestedRoute.startsWith('/enterprise');
    return {
      role,
      requestedRoute,
      allowed,
      reason: allowed ? 'admin-route-allowed' : 'admin-route-denied',
      source: 'core-workspace-authorize',
      resolvedAt: new Date().toISOString(),
    };
  }

  const catalog = getRoleWorkspaceCatalog(role);
  if (!catalog) {
    return {
      role,
      requestedRoute,
      allowed: false,
      reason: 'profile-without-workspace-catalog',
      source: 'core-workspace-authorize',
      resolvedAt: new Date().toISOString(),
    };
  }

  const allowed = (catalog.allowedRoutePrefixes || []).some((prefix) => requestedRoute.startsWith(prefix));
  return {
    role,
    requestedRoute,
    allowed,
    allowedRoutePrefixes: catalog.allowedRoutePrefixes,
    canonicalRoute: catalog.route,
    portal: catalog.portal,
    reason: allowed ? 'workspace-route-allowed' : 'workspace-route-denied',
    source: 'core-workspace-authorize',
    resolvedAt: new Date().toISOString(),
  };
}

/* ── Action: building360-workspace-catalog ──────────────────────── */
function handleBuilding360WorkspaceCatalog(req, scope, jwtClaims) {
  const body = req.body || {};
  const requesterRole = jwtClaims?.perfil ? normalizeRole(jwtClaims.perfil) : jwtClaims?.role ? normalizeRole(jwtClaims.role) : scope.role;
  const requestedProfileRaw = String(body.profile || req.query?.profile || requesterRole || '').trim();
  const requestedProfile = normalizeBuilding360Profile(requestedProfileRaw);

  const catalog = getBuilding360WorkspaceCatalog(requestedProfile);
  if (!catalog) {
    return {
      _error: 400,
      message: `Perfil Building360 sem catalogo: ${requestedProfileRaw || 'desconhecido'}`,
      supportedProfiles: getBuilding360SupportedProfiles(),
    };
  }

  const normalizedRequester = normalizeBuilding360Profile(requesterRole);
  if (!BUILDING360_DASHBOARD_ALLOWED_PROFILES.has(normalizedRequester)) {
    return {
      _error: 403,
      message: 'Perfil sem acesso ao dashboard Building360. Use o frontend de morador.',
    };
  }

  if (normalizedRequester !== requestedProfile && normalizedRequester !== 'platform_admin') {
    return {
      _error: 403,
      message: 'Nao autorizado para consultar catalogo Building360 de outro perfil.',
    };
  }

  return {
    profile: catalog.profile,
    label: catalog.label,
    route: catalog.route,
    portal: catalog.portal,
    modules: catalog.modules,
    permissions: catalog.permissions,
    allowedRoutePrefixes: catalog.allowedRoutePrefixes,
    resolvedAt: new Date().toISOString(),
    source: 'core-building360-workspace-catalog',
  };
}

/* ── Action: building360-workspace-authorize ────────────────────── */
function handleBuilding360WorkspaceAuthorize(req, scope, jwtClaims) {
  const body = req.body || {};
  const requesterRole = jwtClaims?.perfil ? normalizeRole(jwtClaims.perfil) : jwtClaims?.role ? normalizeRole(jwtClaims.role) : scope.role;
  const role = normalizeBuilding360Profile(requesterRole);
  const requestedRoute = String(body.route || req.query?.route || '').trim();

  if (!requestedRoute || !requestedRoute.startsWith('/')) {
    return { _error: 400, message: 'Required: route (absolute path)' };
  }

  if (!BUILDING360_DASHBOARD_ALLOWED_PROFILES.has(role)) {
    return {
      role,
      requestedRoute,
      allowed: false,
      reason: 'building360-resident-frontend-only',
      source: 'core-building360-workspace-authorize',
      resolvedAt: new Date().toISOString(),
    };
  }

  const catalog = getBuilding360WorkspaceCatalog(role);
  if (!catalog) {
    return {
      role,
      requestedRoute,
      allowed: false,
      reason: 'building360-profile-without-catalog',
      source: 'core-building360-workspace-authorize',
      resolvedAt: new Date().toISOString(),
    };
  }

  const allowed = (catalog.allowedRoutePrefixes || []).some((prefix) => requestedRoute.startsWith(prefix));
  return {
    role,
    requestedRoute,
    allowed,
    allowedRoutePrefixes: catalog.allowedRoutePrefixes,
    canonicalRoute: catalog.route,
    portal: catalog.portal,
    reason: allowed ? 'building360-route-allowed' : 'building360-route-denied',
    source: 'core-building360-workspace-authorize',
    resolvedAt: new Date().toISOString(),
  };
}

/* ── Action: building360-proxy ──────────────────────────────────── */
async function handleBuilding360Proxy(req, res) {
  const rawPath = String(req.query?.path || req.body?.path || '').trim();
  const normalized = rawPath.replace(/^\/+/, '');
  if (!normalized) {
    res.status(400).json({ error: 'missing-building360-path' });
    return;
  }

  if (normalized.includes('..')) {
    res.status(400).json({ error: 'invalid-building360-path' });
    return;
  }

  await handleBuilding360Route(req, res, `/${normalized}`);
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
  const workspaceCatalogActions = new Set([
    'workspace-catalog',
    'workspace-authorize',
    'building360-workspace-catalog',
    'building360-workspace-authorize',
    'building360-proxy',
    'building360-registry-list',
    'building360-registry-upsert',
  ]);

  let jwtClaims = null;
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) jwtClaims = decodeJwtPayload(auth.slice(7));

  const scope = resolveScope(req);
  if (!workspaceCatalogActions.has(action)) {
    const guard = requireEnterpriseScope(scope);
    if (!guard.ok) {
      res.status(guard.status).json(guard.body);
      return;
    }
  }

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
    case 'workspace-catalog':
      result = handleWorkspaceCatalog(req, scope, jwtClaims);
      if (result._error) { status = result._error; delete result._error; }
      break;
    case 'workspace-authorize':
      result = handleWorkspaceAuthorize(req, scope, jwtClaims);
      if (result._error) { status = result._error; delete result._error; }
      break;
    case 'building360-workspace-catalog':
      result = handleBuilding360WorkspaceCatalog(req, scope, jwtClaims);
      if (result._error) { status = result._error; delete result._error; }
      break;
    case 'building360-workspace-authorize':
      result = handleBuilding360WorkspaceAuthorize(req, scope, jwtClaims);
      if (result._error) { status = result._error; delete result._error; }
      break;
    case 'building360-proxy':
      await handleBuilding360Proxy(req, res);
      return;
    case 'building360-registry-list':
      result = await handleBuilding360RegistryList(req);
      break;
    case 'building360-registry-upsert':
      result = await handleBuilding360RegistryUpsert(req, scope);
      if (result._error) { status = result._error; delete result._error; }
      else status = 201;
      break;
    default:
      result = {
        error: 'unknown-action',
        supported: [
          'identity',
          'context',
          'audit',
          'tenant',
          'notify',
          'memberships-list',
          'memberships-add',
          'memberships-remove',
          'workspace-catalog',
          'workspace-authorize',
          'building360-workspace-catalog',
          'building360-workspace-authorize',
          'building360-proxy',
          'building360-registry-list',
          'building360-registry-upsert',
        ],
      };
      status = 400;
  }

  res.status(status).json(result);
}
