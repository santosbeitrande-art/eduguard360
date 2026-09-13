const ROLE_ALIASES: Record<string, string> = {
  super_admin: 'platform_admin',
  admin: 'platform_admin',
  administrator: 'organization_admin',
  director: 'organization_admin',
  diretor: 'organization_admin',
  finance: 'finance_manager',
  financeiro: 'finance_manager',
  maintenance: 'maintenance_manager',
  community_manager: 'community_manager',
  document_manager: 'document_manager',
  parking_manager: 'parking_manager',
  seguranca: 'security_officer',
  security: 'security_officer',
  scanner: 'security_officer',
};

const ROOT_ADMIN_EMAIL = 'admin@eduguard360.co.mz';
const LOCAL_APPROVED_USERS_KEY = 'eduguard_locally_approved_users';

const MANAGEMENT_PROFILES = new Set([
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

const RESIDENT_PROFILES = new Set(['resident', 'occupant']);

export const resolveBuilding360Profile = (value: unknown): string => {
  const normalized = String(value || '').trim().toLowerCase();
  return ROLE_ALIASES[normalized] || normalized;
};

export const isBuilding360ResidentProfile = (value: unknown): boolean => {
  const profile = resolveBuilding360Profile(value);
  return RESIDENT_PROFILES.has(profile);
};

export const isBuilding360ManagementProfile = (value: unknown): boolean => {
  const profile = resolveBuilding360Profile(value);
  return MANAGEMENT_PROFILES.has(profile);
};

const readLocalApprovedUsers = (): any[] => {
  try {
    const raw = localStorage.getItem(LOCAL_APPROVED_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const isApprovedByAdmin = (user: any): boolean => {
  const email = String(user?.email || '').trim().toLowerCase();
  if (!email) return false;
  if (email === ROOT_ADMIN_EMAIL) return true;

  const status = String(user?.status || '').trim().toLowerCase();
  const isActive = user?.is_active;

  if (status && ['pending', 'inactive', 'rejected', 'blocked', 'suspended'].includes(status)) {
    return false;
  }

  if (isActive === false) {
    return false;
  }

  if (status === 'active' || status === 'approved') {
    return true;
  }

  if (isActive === true) {
    return true;
  }

  const approved = readLocalApprovedUsers();
  const found = approved.find((entry) => String(entry?.email || '').trim().toLowerCase() === email);
  if (!found) return false;

  const entryStatus = String(found?.status || '').trim().toLowerCase();
  if (entryStatus && ['pending', 'inactive', 'rejected', 'blocked', 'suspended'].includes(entryStatus)) {
    return false;
  }

  if (found?.is_active === false) {
    return false;
  }

  return entryStatus === 'active' || entryStatus === 'approved' || found?.is_active === true;
};
