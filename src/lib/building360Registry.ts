export type Building360SiteRecord = {
  id: string;
  name: string;
  city: string;
  type: string;
  tenantId?: string;
  schoolId?: string | null;
  organizationId?: string;
  portfolioId?: string | null;
  code?: string | null;
  status?: string;
  source?: string;
};

export type Building360BuildingRecord = {
  id: string;
  siteId: string;
  name: string;
  floors: number;
  tenantId?: string;
  schoolId?: string | null;
  organizationId?: string;
  portfolioId?: string | null;
  code?: string | null;
  status?: string;
  source?: string;
};

const BUILDING360_SITES_CACHE_KEY = 'building360.sites.cache.v1';
const BUILDING360_BUILDINGS_CACHE_KEY = 'building360.buildings.cache.v1';
const GLOBAL_SYNC_KEY = 'eduguard_global_sync_event';

const emitGlobalSync = (reason: string) => {
  try {
    localStorage.setItem(GLOBAL_SYNC_KEY, JSON.stringify({ reason, at: new Date().toISOString() }));
  } catch {
    // Ignore localStorage failures in private/offline mode.
  }
};

const readArray = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const map = new Map<string, T>();
  for (const item of items) {
    const id = String(item?.id || '').trim();
    if (!id) continue;
    map.set(id, { ...map.get(id), ...item });
  }
  return Array.from(map.values());
};

export const readBuilding360SitesCache = (): Building360SiteRecord[] => {
  return readArray<Building360SiteRecord>(BUILDING360_SITES_CACHE_KEY);
};

export const writeBuilding360SitesCache = (items: Building360SiteRecord[]) => {
  localStorage.setItem(BUILDING360_SITES_CACHE_KEY, JSON.stringify(uniqueById(items)));
  emitGlobalSync('building360-sites-updated');
};

export const readBuilding360BuildingsCache = (): Building360BuildingRecord[] => {
  return readArray<Building360BuildingRecord>(BUILDING360_BUILDINGS_CACHE_KEY);
};

export const writeBuilding360BuildingsCache = (items: Building360BuildingRecord[]) => {
  localStorage.setItem(BUILDING360_BUILDINGS_CACHE_KEY, JSON.stringify(uniqueById(items)));
  emitGlobalSync('building360-buildings-updated');
};

export const mergeBuilding360Sites = (incoming: Building360SiteRecord[]): Building360SiteRecord[] => {
  const merged = uniqueById([...incoming, ...readBuilding360SitesCache()])
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt'));
  writeBuilding360SitesCache(merged);
  return merged;
};

export const mergeBuilding360Buildings = (incoming: Building360BuildingRecord[]): Building360BuildingRecord[] => {
  const merged = uniqueById([...incoming, ...readBuilding360BuildingsCache()])
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt'));
  writeBuilding360BuildingsCache(merged);
  return merged;
};

export const getBuildingsForSite = (siteId: string, buildings?: Building360BuildingRecord[]): Building360BuildingRecord[] => {
  const all = Array.isArray(buildings) ? buildings : readBuilding360BuildingsCache();
  const normalizedSiteId = String(siteId || '').trim();
  if (!normalizedSiteId) return all;
  return all.filter((item) => String(item?.siteId || '').trim() === normalizedSiteId);
};