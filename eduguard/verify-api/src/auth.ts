import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';

export type BillingCycle = 'monthly' | 'quarterly' | 'annual';
export type CompanyStatus = 'pending' | 'active' | 'suspended' | 'expired';
export type CompanyTier = 'public' | 'business' | 'enterprise';
export type CompanyPlan = 'payg' | 'subscription' | 'enterprise';
export type SubscriptionPlanCode = 'starter' | 'business' | 'enterprise' | 'annual';
export type UserRole = 'owner' | 'manager' | 'analyst' | 'billing' | 'admin' | 'user';

interface Company {
  id: string;
  name: string;
  billingCycle: BillingCycle;
  status: CompanyStatus;
  tier: CompanyTier;
  plan: CompanyPlan;
  subscriptionPlan: SubscriptionPlanCode;
  monthlyQuota: number;
  pricePerVerificationCredits: number;
  creditBalance: number;
  consumedThisPeriod: number;
  validUntil: string;
  createdAt: string;
}

interface Credential {
  id: string;
  companyId: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  isActive: boolean;
  createdAt: string;
}

interface RefreshTokenRecord {
  id: string;
  credentialId: string;
  companyId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: string;
  revokedAt?: string;
}

interface MfaChallenge {
  id: string;
  credentialId: string;
  companyId: string;
  expiresAt: number;
  usedAt?: string;
  createdAt: string;
}

interface ApiKey {
  id: string;
  companyId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

interface EntityRequest {
  id: string;
  companyName: string;
  institutionType: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  country?: string;
  notes?: string;
  selectedPlan: SubscriptionPlanCode;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

interface LedgerEntry {
  id: string;
  companyId: string;
  type: 'credit_grant' | 'verification_debit' | 'refund' | 'adjustment';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId?: string;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  companyId: string;
  provider: 'stripe' | 'flutterwave' | 'mpesa' | 'mock';
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  externalReference?: string;
  checkoutUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface AuditEvent {
  id: string;
  actorType: 'admin' | 'user' | 'api-key' | 'system' | 'public';
  actorId: string;
  companyId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface Store {
  companies: Company[];
  credentials: Credential[];
  apiKeys: ApiKey[];
  entityRequests: EntityRequest[];
  ledger: LedgerEntry[];
  auditLogs: AuditEvent[];
  refreshTokens: RefreshTokenRecord[];
  mfaChallenges: MfaChallenge[];
  payments: PaymentRecord[];
}

interface Session {
  token: string;
  credentialId: string;
  companyId: string;
  username: string;
  role: UserRole;
  expiresAt: number;
}

export interface AuthContext {
  principalType: 'user' | 'api-key';
  companyId: string;
  username: string;
  role: UserRole;
}

const DATA_DIR = path.join(__dirname, '..', '..', 'eduguard_auth');
const STORE_FILE = path.join(DATA_DIR, 'companies.json');
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const sessions = new Map<string, Session>();
const ACCESS_TOKEN_TTL = 60 * 15;
const REFRESH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const MFA_CHALLENGE_TTL_MS = 1000 * 60 * 10;

const DEFAULT_PRICE_PER_VERIFICATION = 1;
const DEFAULT_MONTHLY_QUOTA = 150;
const FREE_TRIAL_QUERIES = 10;
const FREE_TRIAL_DAYS = 30;
const INTERNAL_ADMIN_EMAIL = 'admin@eduguard360.co.mz';
const INTERNAL_ADMIN_PASSWORD = 'Admin@123';
const UNLIMITED_QUOTA = 1000000000;

const SUBSCRIPTION_PLANS: Record<SubscriptionPlanCode, {
  code: SubscriptionPlanCode;
  name: string;
  durationDays: number;
  verificationLimit: number | 'unlimited';
  priceUsd: number;
}> = {
  starter: {
    code: 'starter',
    name: 'Starter',
    durationDays: 7,
    verificationLimit: 50,
    priceUsd: 25
  },
  business: {
    code: 'business',
    name: 'Business',
    durationDays: 30,
    verificationLimit: 300,
    priceUsd: 80
  },
  enterprise: {
    code: 'enterprise',
    name: 'Enterprise',
    durationDays: 90,
    verificationLimit: 1000,
    priceUsd: 200
  },
  annual: {
    code: 'annual',
    name: 'Annual',
    durationDays: 365,
    verificationLimit: 'unlimited',
    priceUsd: 600
  }
};

function parseSubscriptionPlan(raw: unknown): SubscriptionPlanCode {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'starter' || value === 'business' || value === 'enterprise' || value === 'annual') {
    return value;
  }
  return 'business';
}

function planAsCompanyPlan(plan: SubscriptionPlanCode): CompanyPlan {
  return plan === 'enterprise' ? 'enterprise' : 'subscription';
}

function planAsTier(plan: SubscriptionPlanCode): CompanyTier {
  if (plan === 'enterprise' || plan === 'annual') return 'enterprise';
  return 'business';
}

function billingCycleForPlan(plan: SubscriptionPlanCode): BillingCycle {
  if (plan === 'starter' || plan === 'business') return 'monthly';
  if (plan === 'enterprise') return 'quarterly';
  return 'annual';
}

function validUntilFromPlan(plan: SubscriptionPlanCode) {
  const d = new Date();
  d.setDate(d.getDate() + SUBSCRIPTION_PLANS[plan].durationDays);
  return d.toISOString();
}

function quotaFromPlan(plan: SubscriptionPlanCode) {
  const definition = SUBSCRIPTION_PLANS[plan];
  if (definition.verificationLimit === 'unlimited') return 1000000000;
  return definition.verificationLimit;
}

function addDays(dateIso: string, days: number) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function applySubscriptionPlan(company: Company, plan: SubscriptionPlanCode) {
  const nowIso = new Date().toISOString();
  const currentValidUntilMs = new Date(company.validUntil).getTime();
  const baseIso = Number.isFinite(currentValidUntilMs) && currentValidUntilMs > Date.now()
    ? company.validUntil
    : nowIso;

  company.subscriptionPlan = plan;
  company.plan = planAsCompanyPlan(plan);
  company.tier = planAsTier(plan);
  company.billingCycle = billingCycleForPlan(plan);
  company.status = 'active';
  company.monthlyQuota = quotaFromPlan(plan);
  company.consumedThisPeriod = 0;
  company.validUntil = addDays(baseIso, SUBSCRIPTION_PLANS[plan].durationDays);
}

function ensureStore(): Store {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(STORE_FILE)) {
    const now = new Date();
    const valid = new Date(now);
    valid.setMonth(valid.getMonth() + 12);

    const companyId = crypto.randomUUID();
    const adminCredential: Credential = {
      id: crypto.randomUUID(),
      companyId,
      username: INTERNAL_ADMIN_EMAIL,
      passwordHash: hashPassword(INTERNAL_ADMIN_PASSWORD),
      role: 'owner',
      isActive: true,
      createdAt: now.toISOString()
    };

    const store: Store = {
      companies: [{
        id: companyId,
        name: 'EduGuard360 Internal',
        billingCycle: 'annual',
        status: 'active',
        tier: 'enterprise',
        plan: 'enterprise',
        subscriptionPlan: 'annual',
        monthlyQuota: UNLIMITED_QUOTA,
        pricePerVerificationCredits: DEFAULT_PRICE_PER_VERIFICATION,
        creditBalance: 100000000,
        consumedThisPeriod: 0,
        validUntil: addDays(now.toISOString(), 3650),
        createdAt: now.toISOString()
      }],
      credentials: [adminCredential],
      apiKeys: [],
      entityRequests: [],
      ledger: [],
      auditLogs: [],
      refreshTokens: [],
      mfaChallenges: [],
      payments: []
    };

    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
    return store;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')) as Partial<Store>;
    const normalized: Store = {
      companies: (parsed.companies || []).map((company) => ({
        ...company,
        status: company.status || 'active',
        tier: company.tier || 'business',
        plan: company.plan || 'subscription',
        subscriptionPlan: company.subscriptionPlan || (company.plan === 'enterprise' ? 'enterprise' : 'business'),
        monthlyQuota: typeof company.monthlyQuota === 'number' ? company.monthlyQuota : DEFAULT_MONTHLY_QUOTA,
        pricePerVerificationCredits: typeof company.pricePerVerificationCredits === 'number' ? company.pricePerVerificationCredits : DEFAULT_PRICE_PER_VERIFICATION,
        creditBalance: typeof company.creditBalance === 'number' ? company.creditBalance : 0,
        consumedThisPeriod: typeof company.consumedThisPeriod === 'number' ? company.consumedThisPeriod : 0
      })),
      credentials: parsed.credentials || [],
      apiKeys: parsed.apiKeys || [],
      entityRequests: parsed.entityRequests || [],
      ledger: parsed.ledger || [],
      auditLogs: parsed.auditLogs || [],
      refreshTokens: parsed.refreshTokens || [],
      mfaChallenges: parsed.mfaChallenges || [],
      payments: parsed.payments || []
    };

    // Keep internal admin account always active and unlimited.
    let internalCompany = normalized.companies.find((c) => c.name === 'EduGuard360 Internal');
    if (!internalCompany) {
      internalCompany = {
        id: crypto.randomUUID(),
        name: 'EduGuard360 Internal',
        billingCycle: 'annual',
        status: 'active',
        tier: 'enterprise',
        plan: 'enterprise',
        subscriptionPlan: 'annual',
        monthlyQuota: UNLIMITED_QUOTA,
        pricePerVerificationCredits: DEFAULT_PRICE_PER_VERIFICATION,
        creditBalance: 100000000,
        consumedThisPeriod: 0,
        validUntil: addDays(new Date().toISOString(), 3650),
        createdAt: new Date().toISOString()
      };
      normalized.companies.push(internalCompany);
    } else {
      internalCompany.status = 'active';
      internalCompany.tier = 'enterprise';
      internalCompany.plan = 'enterprise';
      internalCompany.subscriptionPlan = 'annual';
      internalCompany.monthlyQuota = UNLIMITED_QUOTA;
      internalCompany.creditBalance = Math.max(internalCompany.creditBalance, 1000000);
      internalCompany.validUntil = addDays(new Date().toISOString(), 3650);
    }

    let internalAdmin = normalized.credentials.find((c) => c.username.toLowerCase() === INTERNAL_ADMIN_EMAIL);
    if (!internalAdmin) {
      internalAdmin = {
        id: crypto.randomUUID(),
        companyId: internalCompany.id,
        username: INTERNAL_ADMIN_EMAIL,
        passwordHash: hashPassword(INTERNAL_ADMIN_PASSWORD),
        role: 'owner',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      normalized.credentials.push(internalAdmin);
    } else {
      internalAdmin.companyId = internalCompany.id;
      internalAdmin.passwordHash = hashPassword(INTERNAL_ADMIN_PASSWORD);
      internalAdmin.role = 'owner';
      internalAdmin.isActive = true;
    }

    saveStore(normalized);
    return normalized;
  } catch {
    return {
      companies: [],
      credentials: [],
      apiKeys: [],
      entityRequests: [],
      ledger: [],
      auditLogs: [],
      refreshTokens: [],
      mfaChallenges: [],
      payments: []
    };
  }
}

function isInternalUnlimitedCompany(company: Company) {
  return company.name === 'EduGuard360 Internal';
}

function saveStore(store: Store) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function encodeBase64Url(value: string | Buffer) {
  const base64 = (typeof value === 'string' ? Buffer.from(value, 'utf8') : value).toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

function createSignedToken(payload: Record<string, unknown>, expiresInSec: number) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSec = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: nowSec, exp: nowSec + expiresInSec };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedBody = encodeBase64Url(JSON.stringify(body));
  const signature = crypto.createHmac('sha256', getJwtSecret()).update(`${encodedHeader}.${encodedBody}`).digest();
  return `${encodedHeader}.${encodedBody}.${encodeBase64Url(signature)}`;
}

function verifySignedToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedBody, encodedSignature] = parts;

  const expectedSignature = crypto.createHmac('sha256', getJwtSecret()).update(`${encodedHeader}.${encodedBody}`).digest();
  const incomingSignature = decodeBase64Url(encodedSignature);

  if (incomingSignature.length !== expectedSignature.length) return null;
  if (!crypto.timingSafeEqual(expectedSignature, incomingSignature)) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encodedBody).toString('utf8')) as {
      exp?: number;
      [key: string]: unknown;
    };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function decodeBase32(base32: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = base32.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
  let bits = '';

  for (const char of normalized) {
    const index = alphabet.indexOf(char);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function encodeBase32(raw: Buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const value of raw) bits += value.toString(2).padStart(8, '0');

  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    out += alphabet[parseInt(chunk, 2)];
  }
  return out;
}

function createTotpSecret() {
  return encodeBase32(crypto.randomBytes(20));
}

function generateTotp(secretBase32: string, unixTimeMs = Date.now(), stepSec = 30) {
  const key = decodeBase32(secretBase32);
  const counter = Math.floor(unixTimeMs / 1000 / stepSec);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBytes.writeUInt32BE(counter >>> 0, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBytes).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(code % 1000000).padStart(6, '0');
}

function verifyTotpCode(secretBase32: string, code: string, window = 1) {
  const now = Date.now();
  for (let w = -window; w <= window; w += 1) {
    const generated = generateTotp(secretBase32, now + w * 30 * 1000);
    if (crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(code))) {
      return true;
    }
  }
  return false;
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
}

function issueAccessToken(credential: Credential) {
  return createSignedToken(
    {
      sub: credential.id,
      companyId: credential.companyId,
      username: credential.username,
      role: roleForLegacyUser(credential.role),
      type: 'access'
    },
    ACCESS_TOKEN_TTL
  );
}

function issueRefreshToken(store: Store, credential: Credential) {
  const plain = `egv_refresh_${crypto.randomBytes(40).toString('hex')}`;
  const record: RefreshTokenRecord = {
    id: crypto.randomUUID(),
    credentialId: credential.id,
    companyId: credential.companyId,
    tokenHash: sha256(plain),
    expiresAt: Date.now() + REFRESH_TOKEN_TTL_MS,
    createdAt: new Date().toISOString()
  };
  store.refreshTokens.push(record);
  return plain;
}

function revokeRefreshToken(store: Store, plainToken: string) {
  const record = store.refreshTokens.find((token) => token.tokenHash === sha256(plainToken) && !token.revokedAt);
  if (!record) return false;
  record.revokedAt = new Date().toISOString();
  return true;
}

function parseAuthorizationBearer(req: Request) {
  const auth = String(req.header('authorization') || '').trim();
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

function createMfaChallenge(store: Store, credential: Credential) {
  const challenge: MfaChallenge = {
    id: crypto.randomUUID(),
    credentialId: credential.id,
    companyId: credential.companyId,
    expiresAt: Date.now() + MFA_CHALLENGE_TTL_MS,
    createdAt: new Date().toISOString()
  };
  store.mfaChallenges.push(challenge);
  return challenge;
}

function resolveMfaChallenge(store: Store, challengeId: string) {
  const challenge = store.mfaChallenges.find((item) => item.id === challengeId);
  if (!challenge) return { ok: false as const, error: 'challenge-not-found' as const };
  if (challenge.usedAt) return { ok: false as const, error: 'challenge-used' as const };
  if (challenge.expiresAt < Date.now()) return { ok: false as const, error: 'challenge-expired' as const };
  return { ok: true as const, challenge };
}

async function createExternalPayment(provider: PaymentRecord['provider'], amount: number, currency: string, company: Company) {
  const normalizedCurrency = currency.toUpperCase();
  const successUrl = process.env.PAYMENT_SUCCESS_URL || 'http://localhost:4000/public';
  const cancelUrl = process.env.PAYMENT_CANCEL_URL || 'http://localhost:4000/public';

  if (provider === 'mock') {
    return {
      status: 'succeeded' as const,
      externalReference: `mock_${crypto.randomBytes(8).toString('hex')}`,
      checkoutUrl: null
    };
  }

  if (provider === 'stripe') {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return { status: 'failed' as const, externalReference: null, checkoutUrl: null, error: 'stripe-not-configured' };
    }

    const body = new URLSearchParams({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'line_items[0][price_data][currency]': normalizedCurrency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)),
      'line_items[0][price_data][product_data][name]': `EduGuard Credits - ${company.name}`,
      'line_items[0][quantity]': '1'
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    const payload = await response.json() as { id?: string; url?: string; error?: { message?: string } };
    if (!response.ok || !payload.id) {
      return { status: 'failed' as const, externalReference: null, checkoutUrl: null, error: payload.error?.message || 'stripe-checkout-failed' };
    }

    return {
      status: 'pending' as const,
      externalReference: payload.id,
      checkoutUrl: payload.url || null
    };
  }

  if (provider === 'flutterwave') {
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey) {
      return { status: 'failed' as const, externalReference: null, checkoutUrl: null, error: 'flutterwave-not-configured' };
    }

    const txRef = `egv_${crypto.randomBytes(8).toString('hex')}`;
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount,
        currency: normalizedCurrency,
        redirect_url: successUrl,
        customer: {
          email: `billing+${company.id}@eduguard.local`,
          name: company.name
        },
        customizations: {
          title: 'EduGuard Verify AI',
          description: 'Credit top-up'
        }
      })
    });

    const payload = await response.json() as { status?: string; data?: { link?: string } };
    if (!response.ok || payload.status !== 'success') {
      return { status: 'failed' as const, externalReference: txRef, checkoutUrl: null, error: 'flutterwave-checkout-failed' };
    }

    return {
      status: 'pending' as const,
      externalReference: txRef,
      checkoutUrl: payload.data?.link || null
    };
  }

  if (provider === 'mpesa') {
    // M-Pesa integration starts pending and expects webhook confirmation.
    const reference = `mpesa_${crypto.randomBytes(8).toString('hex')}`;
    return {
      status: 'pending' as const,
      externalReference: reference,
      checkoutUrl: null
    };
  }

  return { status: 'failed' as const, externalReference: null, checkoutUrl: null, error: 'unsupported-provider' };
}

function roleForLegacyUser(role: UserRole): UserRole {
  if (role === 'admin') return 'owner';
  if (role === 'user') return 'analyst';
  return role;
}

function appendAuditEvent(
  store: Store,
  actorType: AuditEvent['actorType'],
  actorId: string,
  action: string,
  companyId?: string,
  metadata?: Record<string, unknown>
) {
  store.auditLogs.push({
    id: crypto.randomUUID(),
    actorType,
    actorId,
    action,
    companyId,
    metadata,
    createdAt: new Date().toISOString()
  });
}

function canManageBilling(role: UserRole) {
  const normalized = roleForLegacyUser(role);
  return normalized === 'owner' || normalized === 'billing' || normalized === 'manager';
}

function canManageSecurity(role: UserRole) {
  const normalized = roleForLegacyUser(role);
  return normalized === 'owner' || normalized === 'manager';
}

function generateApiKeyPair() {
  const rawKey = `egv_live_${crypto.randomBytes(24).toString('hex')}`;
  return {
    key: rawKey,
    keyHash: sha256(rawKey),
    keyPrefix: rawKey.slice(0, 12)
  };
}

function toCsvCell(value: unknown) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function signAuditPayload(payload: string) {
  const secret = process.env.AUDIT_EXPORT_SECRET || process.env.JWT_SECRET || 'dev-audit-signature-secret';
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function runSecurityHousekeeping(store: Store, staleApiKeyDays: number, revokeStaleApiKeys: boolean) {
  const nowMs = Date.now();
  const staleMs = Math.max(staleApiKeyDays, 1) * 24 * 60 * 60 * 1000;

  const beforeRefresh = store.refreshTokens.length;
  store.refreshTokens = store.refreshTokens.filter((token) => {
    if (token.revokedAt) return false;
    return token.expiresAt > nowMs;
  });
  const removedRefreshTokens = beforeRefresh - store.refreshTokens.length;

  const beforeChallenges = store.mfaChallenges.length;
  store.mfaChallenges = store.mfaChallenges.filter((challenge) => (
    !challenge.usedAt && challenge.expiresAt > nowMs
  ));
  const removedMfaChallenges = beforeChallenges - store.mfaChallenges.length;

  let revokedApiKeys = 0;
  if (revokeStaleApiKeys) {
    for (const apiKey of store.apiKeys) {
      if (!apiKey.isActive) continue;
      const lastActivityIso = apiKey.lastUsedAt || apiKey.createdAt;
      const lastActivityMs = new Date(lastActivityIso).getTime();
      if (Number.isFinite(lastActivityMs) && nowMs - lastActivityMs > staleMs) {
        apiKey.isActive = false;
        revokedApiKeys += 1;
      }
    }
  }

  return {
    removedRefreshTokens,
    removedMfaChallenges,
    revokedApiKeys
  };
}

function appendLedgerEntry(
  store: Store,
  company: Company,
  type: LedgerEntry['type'],
  amount: number,
  description: string,
  referenceId?: string
) {
  company.creditBalance += amount;
  if (type === 'verification_debit') {
    company.consumedThisPeriod += Math.abs(amount);
  }
  const entry: LedgerEntry = {
    id: crypto.randomUUID(),
    companyId: company.id,
    type,
    amount,
    balanceAfter: company.creditBalance,
    description,
    referenceId,
    createdAt: new Date().toISOString()
  };
  store.ledger.push(entry);
  return entry;
}

export function consumeVerificationCredits(companyId: string, jobId: string, units = 1) {
  const store = ensureStore();
  const company = store.companies.find((c) => c.id === companyId);
  if (!company) return { ok: false, error: 'company-not-found' as const };

  if (isInternalUnlimitedCompany(company)) {
    return { ok: true as const, debit: 0, balance: company.creditBalance, entry: null };
  }

  if (!isSubscriptionActive(company)) {
    return { ok: false, error: 'subscription-inactive' as const };
  }

  if (company.consumedThisPeriod + units > company.monthlyQuota) {
    return {
      ok: false,
      error: 'verification-limit-reached' as const,
      limit: company.monthlyQuota,
      used: company.consumedThisPeriod
    };
  }

  // Subscription-based companies (including free trial and paid plans) consume quota only.
  if (company.plan === 'subscription' || company.plan === 'enterprise') {
    company.consumedThisPeriod += Math.max(units, 1);
    appendAuditEvent(store, 'system', 'billing-engine', 'billing.verification.subscription-consumed', company.id, {
      jobId,
      units,
      consumedThisPeriod: company.consumedThisPeriod,
      monthlyQuota: company.monthlyQuota,
      subscriptionPlan: company.subscriptionPlan
    });
    saveStore(store);
    return { ok: true as const, debit: 0, balance: company.creditBalance, entry: null };
  }

  const debit = Math.max(units, 1) * Math.max(company.pricePerVerificationCredits || DEFAULT_PRICE_PER_VERIFICATION, 1);
  if (company.creditBalance < debit) {
    return { ok: false, error: 'insufficient-credits' as const, required: debit, available: company.creditBalance };
  }

  const entry = appendLedgerEntry(store, company, 'verification_debit', -debit, `Debito automatico de verificacao: ${jobId}`, jobId);
  appendAuditEvent(store, 'system', 'billing-engine', 'billing.verification.debit', company.id, { jobId, debit });
  saveStore(store);

  return { ok: true as const, debit, balance: company.creditBalance, entry };
}

export function refundVerificationCredits(companyId: string, jobId: string, reason = 'job-failed') {
  const store = ensureStore();
  const company = store.companies.find((c) => c.id === companyId);
  if (!company) return { ok: false, error: 'company-not-found' as const };

  const debitEntry = [...store.ledger].reverse().find((entry) => (
    entry.companyId === companyId
    && entry.referenceId === jobId
    && entry.type === 'verification_debit'
  ));

  if (!debitEntry) return { ok: false, error: 'debit-not-found' as const };

  const refundAmount = Math.abs(debitEntry.amount);
  const entry = appendLedgerEntry(store, company, 'refund', refundAmount, `Reembolso automatico (${reason}) para verificacao: ${jobId}`, jobId);
  appendAuditEvent(store, 'system', 'billing-engine', 'billing.verification.refund', company.id, { jobId, refundAmount, reason });
  saveStore(store);
  return { ok: true as const, refundAmount, balance: company.creditBalance, entry };
}

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(':');
  if (!salt || !hash) return false;
  const check = crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(check));
}

function parseCookies(cookieHeader?: string) {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  for (const part of cookieHeader.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('='));
  }
  return out;
}

function isSubscriptionActive(company: Company) {
  if (company.status !== 'active') return false;
  const now = Date.now();
  const validUntil = new Date(company.validUntil).getTime();
  return Number.isFinite(validUntil) && validUntil > now;
}

function getActiveCompany(store: Store, companyId: string) {
  const company = store.companies.find((item) => item.id === companyId);
  if (!company) return null;
  if (!isSubscriptionActive(company)) return null;
  return company;
}

function issueSession(credential: Credential): Session {
  const token = crypto.randomUUID();
  const session: Session = {
    token,
    credentialId: credential.id,
    companyId: credential.companyId,
    username: credential.username,
    role: credential.role,
    expiresAt: Date.now() + SESSION_TTL_MS
  };
  sessions.set(token, session);
  return session;
}

export function getSession(req: Request): Session | null {
  const token = parseCookies(req.headers.cookie).eduguard_session;
  if (!token) return null;

  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function requireUserSession(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'auth-required' });
  (req as any).user = session;
  return next();
}

function getApiKeyAuth(req: Request): AuthContext | null {
  const rawKey = String(req.header('x-enterprise-token') || req.header('x-api-key') || '').trim();
  if (!rawKey) return null;

  const keyHash = sha256(rawKey);
  const store = ensureStore();
  const apiKey = store.apiKeys.find((k) => k.keyHash === keyHash && k.isActive);
  if (!apiKey) return null;

  const company = getActiveCompany(store, apiKey.companyId);
  if (!company) return null;

  apiKey.lastUsedAt = new Date().toISOString();
  appendAuditEvent(store, 'api-key', apiKey.id, 'auth.api-key.used', apiKey.companyId, { keyPrefix: apiKey.keyPrefix });
  saveStore(store);

  return {
    principalType: 'api-key',
    companyId: apiKey.companyId,
    username: `api-key:${apiKey.name}`,
    role: 'analyst'
  };
}

export function getAuthContext(req: Request): AuthContext | null {
  const store = ensureStore();

  const bearerToken = parseAuthorizationBearer(req);
  if (bearerToken) {
    const payload = verifySignedToken(bearerToken) as {
      sub?: string;
      companyId?: string;
      username?: string;
      role?: UserRole;
      type?: string;
    } | null;

    if (payload?.type === 'access' && payload.companyId && payload.username && getActiveCompany(store, payload.companyId)) {
      return {
        principalType: 'user',
        companyId: payload.companyId,
        username: payload.username,
        role: roleForLegacyUser(payload.role || 'analyst')
      };
    }
  }

  const session = getSession(req);
  if (session && getActiveCompany(store, session.companyId)) {
    return {
      principalType: 'user',
      companyId: session.companyId,
      username: session.username,
      role: roleForLegacyUser(session.role)
    };
  }
  return getApiKeyAuth(req);
}

export function requireCompanyAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuthContext(req);
  if (!auth) return res.status(401).json({ error: 'auth-required' });
  (req as any).auth = auth;
  return next();
}

function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const token = req.header('x-admin-token');
  const expected = process.env.VERIFY_ADMIN_TOKEN || 'change-me-now';
  if (!token || token !== expected) {
    return res.status(403).json({ error: 'admin-token-required' });
  }
  return next();
}

function addMonths(dateIso: string, months: number) {
  const d = new Date(dateIso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

function cycleMonths(cycle: BillingCycle) {
  if (cycle === 'monthly') return 1;
  if (cycle === 'quarterly') return 3;
  return 12;
}

export function registerAuthRoutes(app: any) {
  app.get('/auth/me', (req: Request, res: Response) => {
    const session = getSession(req);
    if (!session) return res.status(401).json({ authenticated: false });

    const store = ensureStore();
    const company = store.companies.find((c) => c.id === session.companyId);
    return res.json({
      authenticated: true,
      user: {
        username: session.username,
        role: roleForLegacyUser(session.role),
        companyId: session.companyId,
        companyName: company?.name || null
      },
      company: company ? {
        id: company.id,
        name: company.name,
        tier: company.tier,
        plan: company.plan,
        subscriptionPlan: company.subscriptionPlan,
        status: company.status,
        billingCycle: company.billingCycle,
        validUntil: company.validUntil,
        monthlyQuota: company.monthlyQuota,
        consumedThisPeriod: company.consumedThisPeriod,
        creditBalance: company.creditBalance,
        pricePerVerificationCredits: company.pricePerVerificationCredits
      } : null
    });
  });

  app.post('/auth/login', (req: Request, res: Response) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!username || !password) return res.status(400).json({ error: 'missing-credentials' });

    const store = ensureStore();
    const credential = store.credentials.find((c) => c.username.toLowerCase() === username && c.isActive);
    if (!credential || !verifyPassword(password, credential.passwordHash)) {
      return res.status(401).json({ error: 'invalid-credentials' });
    }

    const company = store.companies.find((c) => c.id === credential.companyId);
    if (!company) return res.status(401).json({ error: 'company-not-found' });
    if (!isInternalUnlimitedCompany(company) && !isSubscriptionActive(company)) {
      return res.status(403).json({ error: 'subscription-inactive', companyStatus: company.status, validUntil: company.validUntil });
    }

    credential.role = roleForLegacyUser(credential.role);
    const session = issueSession(credential);
    res.setHeader('Set-Cookie', `eduguard_session=${encodeURIComponent(session.token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`);

    appendAuditEvent(store, 'user', credential.id, 'auth.login.success', company.id, { username: credential.username });
    saveStore(store);

    return res.json({
      ok: true,
      user: {
        username: credential.username,
        role: credential.role,
        companyId: company.id,
        companyName: company.name,
        billingCycle: company.billingCycle,
        validUntil: company.validUntil,
        plan: company.plan,
        subscriptionPlan: company.subscriptionPlan,
        tier: company.tier,
        creditBalance: company.creditBalance
      }
    });
  });

  app.post('/auth/login/jwt', (req: Request, res: Response) => {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!username || !password) return res.status(400).json({ error: 'missing-credentials' });

    const store = ensureStore();
    const credential = store.credentials.find((c) => c.username.toLowerCase() === username && c.isActive);
    if (!credential || !verifyPassword(password, credential.passwordHash)) {
      return res.status(401).json({ error: 'invalid-credentials' });
    }

    const company = store.companies.find((c) => c.id === credential.companyId);
    if (!company) return res.status(401).json({ error: 'company-not-found' });
    if (!isInternalUnlimitedCompany(company) && !isSubscriptionActive(company)) {
      return res.status(403).json({ error: 'subscription-inactive', companyStatus: company.status, validUntil: company.validUntil });
    }

    credential.role = roleForLegacyUser(credential.role);

    if (credential.mfaEnabled && credential.mfaSecret) {
      const challenge = createMfaChallenge(store, credential);
      appendAuditEvent(store, 'user', credential.id, 'auth.jwt.mfa.challenge', company.id, { challengeId: challenge.id });
      saveStore(store);
      return res.json({
        ok: true,
        mfaRequired: true,
        challengeId: challenge.id,
        expiresAt: new Date(challenge.expiresAt).toISOString()
      });
    }

    const accessToken = issueAccessToken(credential);
    const refreshToken = issueRefreshToken(store, credential);
    appendAuditEvent(store, 'user', credential.id, 'auth.jwt.login.success', company.id, { username: credential.username });
    saveStore(store);

    return res.json({
      ok: true,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL,
      user: {
        username: credential.username,
        role: credential.role,
        companyId: company.id,
        companyName: company.name
      }
    });
  });

  app.post('/auth/mfa/verify', (req: Request, res: Response) => {
    const challengeId = String(req.body?.challengeId || '').trim();
    const code = String(req.body?.code || '').trim();
    if (!challengeId || !code) return res.status(400).json({ error: 'missing-mfa-fields' });

    const store = ensureStore();
    const challengeResult = resolveMfaChallenge(store, challengeId);
    if (!challengeResult.ok) return res.status(401).json({ error: challengeResult.error });

    const credential = store.credentials.find((cred) => cred.id === challengeResult.challenge.credentialId);
    if (!credential || !credential.mfaSecret) return res.status(401).json({ error: 'credential-not-found' });

    const verified = verifyTotpCode(credential.mfaSecret, code, 1);

    if (!verified) return res.status(401).json({ error: 'invalid-mfa-code' });

    challengeResult.challenge.usedAt = new Date().toISOString();
    const accessToken = issueAccessToken(credential);
    const refreshToken = issueRefreshToken(store, credential);
    appendAuditEvent(store, 'user', credential.id, 'auth.jwt.mfa.success', credential.companyId, { challengeId });
    saveStore(store);

    return res.json({
      ok: true,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL
    });
  });

  app.post('/auth/token/refresh', (req: Request, res: Response) => {
    const refreshToken = String(req.body?.refreshToken || '').trim();
    if (!refreshToken) return res.status(400).json({ error: 'missing-refresh-token' });

    const store = ensureStore();
    const record = store.refreshTokens.find((token) => token.tokenHash === sha256(refreshToken) && !token.revokedAt);
    if (!record || record.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'invalid-refresh-token' });
    }

    const credential = store.credentials.find((cred) => cred.id === record.credentialId && cred.isActive);
    if (!credential) return res.status(401).json({ error: 'credential-not-found' });

    record.revokedAt = new Date().toISOString();
    const nextAccessToken = issueAccessToken(credential);
    const nextRefreshToken = issueRefreshToken(store, credential);
    appendAuditEvent(store, 'user', credential.id, 'auth.jwt.refresh', credential.companyId, {});
    saveStore(store);

    return res.json({
      ok: true,
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL
    });
  });

  app.post('/auth/mfa/setup', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    const store = ensureStore();
    const credential = store.credentials.find((cred) => cred.companyId === auth.companyId && cred.username === auth.username && cred.isActive);
    if (!credential) return res.status(404).json({ error: 'credential-not-found' });

    const secretBase32 = createTotpSecret();
    const issuer = encodeURIComponent('EduGuard360');
    const label = encodeURIComponent(`EduGuard Verify AI:${credential.username}`);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secretBase32}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    credential.mfaSecret = secretBase32;
    credential.mfaEnabled = false;
    appendAuditEvent(store, 'user', credential.id, 'auth.mfa.setup.generated', credential.companyId, {});
    saveStore(store);

    return res.json({
      ok: true,
      secretBase32,
      otpauthUrl
    });
  });

  app.post('/auth/mfa/setup/confirm', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'missing-mfa-code' });

    const store = ensureStore();
    const credential = store.credentials.find((cred) => cred.companyId === auth.companyId && cred.username === auth.username && cred.isActive);
    if (!credential || !credential.mfaSecret) return res.status(404).json({ error: 'mfa-not-initialized' });

    const verified = verifyTotpCode(credential.mfaSecret, code, 1);

    if (!verified) return res.status(401).json({ error: 'invalid-mfa-code' });

    credential.mfaEnabled = true;
    appendAuditEvent(store, 'user', credential.id, 'auth.mfa.enabled', credential.companyId, {});
    saveStore(store);
    return res.json({ ok: true, mfaEnabled: true });
  });

  app.post('/auth/logout', (req: Request, res: Response) => {
    const token = parseCookies(req.headers.cookie).eduguard_session;
    if (token) sessions.delete(token);

    const refreshToken = String(req.body?.refreshToken || '').trim();
    if (refreshToken) {
      const store = ensureStore();
      revokeRefreshToken(store, refreshToken);
      saveStore(store);
    }

    res.setHeader('Set-Cookie', 'eduguard_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return res.json({ ok: true });
  });

  app.get('/auth/admin/token', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    if (auth.username.toLowerCase() !== INTERNAL_ADMIN_EMAIL) {
      return res.status(403).json({ error: 'admin-access-required' });
    }
    const token = process.env.VERIFY_ADMIN_TOKEN || 'change-me-now';
    return res.json({ ok: true, adminToken: token });
  });

  app.get('/public/plans', (_req: Request, res: Response) => {
    return res.json({
      freeTrial: {
        queries: FREE_TRIAL_QUERIES,
        durationDays: FREE_TRIAL_DAYS
      },
      plans: Object.values(SUBSCRIPTION_PLANS)
    });
  });

  app.post('/public/signup', (req: Request, res: Response) => {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    const companyWebsite = String(req.body?.companyWebsite || '').trim();
    const companyNameRaw = String(req.body?.companyName || '').trim();

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'missing-signup-fields' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'invalid-email' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'weak-password' });
    }

    const store = ensureStore();
    if (store.credentials.some((c) => c.username.toLowerCase() === email)) {
      return res.status(409).json({ error: 'email-already-registered' });
    }

    const domainPart = email.split('@')[1] || 'personal';
    const companyName = companyNameRaw || `${fullName} Workspace`;
    const nowIso = new Date().toISOString();
    const trialValidUntil = addDays(nowIso, FREE_TRIAL_DAYS);

    const company: Company = {
      id: crypto.randomUUID(),
      name: companyName,
      billingCycle: 'monthly',
      status: 'active',
      tier: 'public',
      plan: 'subscription',
      subscriptionPlan: 'starter',
      monthlyQuota: FREE_TRIAL_QUERIES,
      pricePerVerificationCredits: 0,
      creditBalance: 0,
      consumedThisPeriod: 0,
      validUntil: trialValidUntil,
      createdAt: nowIso
    };

    const credential: Credential = {
      id: crypto.randomUUID(),
      companyId: company.id,
      username: email,
      passwordHash: hashPassword(password),
      role: 'owner',
      isActive: true,
      createdAt: nowIso
    };

    store.companies.push(company);
    store.credentials.push(credential);
    appendAuditEvent(store, 'public', email, 'public.signup.created', company.id, {
      fullName,
      companyWebsite,
      domain: domainPart,
      trialQueries: FREE_TRIAL_QUERIES,
      trialValidUntil
    });
    saveStore(store);

    return res.status(201).json({
      ok: true,
      trial: {
        queries: FREE_TRIAL_QUERIES,
        used: 0,
        remaining: FREE_TRIAL_QUERIES,
        validUntil: trialValidUntil
      },
      company: {
        id: company.id,
        name: company.name,
        status: company.status,
        subscriptionPlan: company.subscriptionPlan
      },
      user: {
        username: credential.username,
        role: credential.role
      }
    });
  });

  app.post('/public/entity-requests', (req: Request, res: Response) => {
    const companyName = String(req.body?.companyName || '').trim();
    const institutionType = String(req.body?.institutionType || '').trim();
    const contactName = String(req.body?.contactName || '').trim();
    const contactEmail = String(req.body?.contactEmail || '').trim().toLowerCase();
    const selectedPlan = parseSubscriptionPlan(req.body?.selectedPlan);

    if (!companyName || !institutionType || !contactName || !contactEmail) {
      return res.status(400).json({ error: 'missing-required-fields' });
    }

    const store = ensureStore();
    const requestEntry: EntityRequest = {
      id: crypto.randomUUID(),
      companyName,
      institutionType,
      contactName,
      contactEmail,
      contactPhone: req.body?.contactPhone ? String(req.body.contactPhone) : undefined,
      country: req.body?.country ? String(req.body.country) : undefined,
      notes: req.body?.notes ? String(req.body.notes) : undefined,
      selectedPlan,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    store.entityRequests.push(requestEntry);
    appendAuditEvent(store, 'public', requestEntry.contactEmail, 'entity.request.created', undefined, {
      requestId: requestEntry.id,
      companyName,
      selectedPlan
    });
    saveStore(store);

    return res.json({ ok: true, request: requestEntry });
  });

  app.post('/admin/companies', requireAdminToken, (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim();
    const subscriptionPlan = parseSubscriptionPlan(req.body?.subscriptionPlan || req.body?.plan);
    const billingCycle = (req.body?.billingCycle as BillingCycle | undefined) || billingCycleForPlan(subscriptionPlan);
    const tier = (req.body?.tier as CompanyTier | undefined) || planAsTier(subscriptionPlan);
    const plan = (req.body?.plan as CompanyPlan | undefined) || planAsCompanyPlan(subscriptionPlan);
    const initialCredits = Number(req.body?.initialCredits ?? 100);
    const monthlyQuota = Number(req.body?.monthlyQuota ?? quotaFromPlan(subscriptionPlan));
    const pricePerVerificationCredits = Number(req.body?.pricePerVerificationCredits ?? DEFAULT_PRICE_PER_VERIFICATION);
    if (!name) return res.status(400).json({ error: 'missing-company-name' });
    if (!['monthly', 'quarterly', 'annual'].includes(billingCycle)) {
      return res.status(400).json({ error: 'invalid-billing-cycle' });
    }
    if (!['public', 'business', 'enterprise'].includes(tier)) {
      return res.status(400).json({ error: 'invalid-tier' });
    }
    if (!['payg', 'subscription', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'invalid-plan' });
    }

    const now = new Date().toISOString();
    const store = ensureStore();
    const company: Company = {
      id: crypto.randomUUID(),
      name,
      billingCycle,
      status: 'active',
      tier,
      plan,
      subscriptionPlan,
      monthlyQuota,
      pricePerVerificationCredits,
      creditBalance: Math.max(initialCredits, 0),
      consumedThisPeriod: 0,
      validUntil: req.body?.validUntil ? String(req.body.validUntil) : validUntilFromPlan(subscriptionPlan),
      createdAt: now
    };

    store.companies.push(company);
    appendLedgerEntry(store, company, 'credit_grant', Math.max(initialCredits, 0), 'Credito inicial no onboarding');
    appendAuditEvent(store, 'admin', 'admin-token', 'admin.company.created', company.id, { name, tier, plan });
    saveStore(store);
    return res.json({ ok: true, company });
  });

  app.get('/admin/entity-requests', requireAdminToken, (_req: Request, res: Response) => {
    const store = ensureStore();
    return res.json({ requests: store.entityRequests });
  });

  app.post('/admin/entity-requests/:id/approve', requireAdminToken, (req: Request, res: Response) => {
    const requestId = String(req.params.id || '');
    const ownerEmail = String(req.body?.ownerEmail || '').trim().toLowerCase();
    const ownerPassword = String(req.body?.ownerPassword || '').trim();
    if (!ownerEmail || !ownerPassword) {
      return res.status(400).json({ error: 'missing-owner-credentials' });
    }

    const store = ensureStore();
    const requestEntry = store.entityRequests.find((request) => request.id === requestId);
    if (!requestEntry) return res.status(404).json({ error: 'request-not-found' });
    if (requestEntry.status !== 'pending') return res.status(409).json({ error: 'request-already-processed' });

    const selectedPlan = parseSubscriptionPlan(req.body?.subscriptionPlan || requestEntry.selectedPlan);

    const now = new Date().toISOString();
    const company: Company = {
      id: crypto.randomUUID(),
      name: requestEntry.companyName,
      billingCycle: billingCycleForPlan(selectedPlan),
      status: 'active',
      tier: planAsTier(selectedPlan),
      plan: planAsCompanyPlan(selectedPlan),
      subscriptionPlan: selectedPlan,
      monthlyQuota: quotaFromPlan(selectedPlan),
      pricePerVerificationCredits: DEFAULT_PRICE_PER_VERIFICATION,
      creditBalance: Number(SUBSCRIPTION_PLANS[selectedPlan].priceUsd),
      consumedThisPeriod: 0,
      validUntil: validUntilFromPlan(selectedPlan),
      createdAt: now
    };

    const owner: Credential = {
      id: crypto.randomUUID(),
      companyId: company.id,
      username: ownerEmail,
      passwordHash: hashPassword(ownerPassword),
      role: 'owner',
      isActive: true,
      createdAt: now
    };

    store.companies.push(company);
    store.credentials.push(owner);
    requestEntry.status = 'approved';
    requestEntry.reviewedBy = 'admin-token';
    requestEntry.reviewedAt = now;

    appendLedgerEntry(store, company, 'credit_grant', 100, 'Credito de ativacao inicial', requestEntry.id);
    appendAuditEvent(store, 'admin', 'admin-token', 'entity.request.approved', company.id, {
      requestId: requestEntry.id,
      ownerEmail,
      selectedPlan
    });

    saveStore(store);
    return res.json({ ok: true, request: requestEntry, company, owner: { id: owner.id, username: owner.username, role: owner.role } });
  });

  app.get('/admin/companies', requireAdminToken, (_req: Request, res: Response) => {
    const store = ensureStore();
    return res.json({ companies: store.companies, credentials: store.credentials.map((c) => ({
      id: c.id,
      companyId: c.companyId,
      username: c.username,
      role: roleForLegacyUser(c.role),
      isActive: c.isActive,
      createdAt: c.createdAt
    })), apiKeys: store.apiKeys.map((key) => ({
      id: key.id,
      companyId: key.companyId,
      name: key.name,
      keyPrefix: key.keyPrefix,
      isActive: key.isActive,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt
    })) });
  });

  app.get('/admin/users', requireAdminToken, (_req: Request, res: Response) => {
    const store = ensureStore();
    const companiesById = new Map(store.companies.map((c) => [c.id, c]));
    const users = store.credentials.map((c) => ({
      id: c.id,
      companyId: c.companyId,
      companyName: companiesById.get(c.companyId)?.name || null,
      username: c.username,
      role: roleForLegacyUser(c.role),
      isActive: c.isActive,
      createdAt: c.createdAt
    }));
    return res.json({ users });
  });

  app.patch('/admin/users/:id/status', requireAdminToken, (req: Request, res: Response) => {
    const userId = String(req.params.id || '');
    const isActive = Boolean(req.body?.isActive);
    const store = ensureStore();
    const credential = store.credentials.find((c) => c.id === userId);
    if (!credential) return res.status(404).json({ error: 'user-not-found' });

    // Protect internal admin account from accidental disable.
    if (credential.username.toLowerCase() === INTERNAL_ADMIN_EMAIL && !isActive) {
      return res.status(400).json({ error: 'cannot-disable-internal-admin' });
    }

    credential.isActive = isActive;
    appendAuditEvent(store, 'admin', 'admin-token', 'admin.user.status.updated', credential.companyId, {
      userId,
      username: credential.username,
      isActive
    });
    saveStore(store);
    return res.json({ ok: true, user: { id: credential.id, username: credential.username, isActive: credential.isActive } });
  });

  app.get('/admin/payments', requireAdminToken, (_req: Request, res: Response) => {
    const store = ensureStore();
    const companiesById = new Map(store.companies.map((c) => [c.id, c]));
    const payments = store.payments
      .slice()
      .reverse()
      .map((payment) => ({
        ...payment,
        companyName: companiesById.get(payment.companyId)?.name || null
      }));
    return res.json({ payments });
  });

  app.post('/admin/companies/:companyId/credentials', requireAdminToken, (req: Request, res: Response) => {
    const companyId = String(req.params.companyId || '');
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    const roleRaw = String(req.body?.role || 'analyst').trim().toLowerCase();
    const role = (['owner', 'manager', 'analyst', 'billing', 'admin', 'user'].includes(roleRaw) ? roleRaw : 'analyst') as UserRole;

    if (!username || !password) return res.status(400).json({ error: 'missing-credential-fields' });

    const store = ensureStore();
    if (!store.companies.some((c) => c.id === companyId)) {
      return res.status(404).json({ error: 'company-not-found' });
    }

    if (store.credentials.some((c) => c.username.toLowerCase() === username)) {
      return res.status(409).json({ error: 'username-already-exists' });
    }

    const credential: Credential = {
      id: crypto.randomUUID(),
      companyId,
      username,
      passwordHash: hashPassword(password),
      role: roleForLegacyUser(role),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    store.credentials.push(credential);
    appendAuditEvent(store, 'admin', 'admin-token', 'admin.credential.created', companyId, {
      username,
      role: credential.role
    });
    saveStore(store);

    return res.json({ ok: true, credential: {
      id: credential.id,
      companyId: credential.companyId,
      username: credential.username,
      role: roleForLegacyUser(credential.role),
      isActive: credential.isActive,
      createdAt: credential.createdAt
    } });
  });

  app.patch('/admin/companies/:companyId/subscription', requireAdminToken, (req: Request, res: Response) => {
    const companyId = String(req.params.companyId || '');
    const status = req.body?.status as CompanyStatus | undefined;
    const billingCycle = req.body?.billingCycle as BillingCycle | undefined;
    const validUntil = req.body?.validUntil as string | undefined;

    const store = ensureStore();
    const company = store.companies.find((c) => c.id === companyId);
    if (!company) return res.status(404).json({ error: 'company-not-found' });

    if (status && ['pending', 'active', 'suspended', 'expired'].includes(status)) company.status = status;
    if (billingCycle && ['monthly', 'quarterly', 'annual'].includes(billingCycle)) company.billingCycle = billingCycle;
    if (validUntil) company.validUntil = validUntil;

    if (typeof req.body?.creditBalance === 'number') {
      const nextBalance = Math.max(0, Number(req.body.creditBalance));
      const delta = nextBalance - company.creditBalance;
      if (delta !== 0) {
        appendLedgerEntry(store, company, 'adjustment', delta, 'Ajuste manual de credito por admin');
      }
    }

    appendAuditEvent(store, 'admin', 'admin-token', 'admin.subscription.updated', company.id, {
      status,
      billingCycle,
      validUntil
    });
    saveStore(store);
    return res.json({ ok: true, company });
  });

  app.post('/admin/companies/:companyId/api-keys', requireAdminToken, (req: Request, res: Response) => {
    const companyId = String(req.params.companyId || '');
    const name = String(req.body?.name || 'default').trim();

    const store = ensureStore();
    const company = store.companies.find((c) => c.id === companyId);
    if (!company) return res.status(404).json({ error: 'company-not-found' });

    const rawKey = `egv_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = sha256(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const apiKey: ApiKey = {
      id: crypto.randomUUID(),
      companyId,
      name,
      keyPrefix,
      keyHash,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    store.apiKeys.push(apiKey);
    appendAuditEvent(store, 'admin', 'admin-token', 'admin.api-key.created', companyId, { name, keyPrefix });
    saveStore(store);

    return res.json({
      ok: true,
      apiKey: {
        id: apiKey.id,
        companyId: apiKey.companyId,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        key: rawKey,
        enterpriseToken: rawKey
      }
    });
  });

  app.get('/admin/companies/:companyId/api-keys', requireAdminToken, (req: Request, res: Response) => {
    const companyId = String(req.params.companyId || '');
    const store = ensureStore();
    const keys = store.apiKeys
      .filter((key) => key.companyId === companyId)
      .map((key) => ({
        id: key.id,
        companyId: key.companyId,
        name: key.name,
        keyPrefix: key.keyPrefix,
        isActive: key.isActive,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt
      }));

    return res.json({ apiKeys: keys });
  });

  app.delete('/admin/api-keys/:keyId', requireAdminToken, (req: Request, res: Response) => {
    const keyId = String(req.params.keyId || '');
    const store = ensureStore();
    const apiKey = store.apiKeys.find((key) => key.id === keyId);
    if (!apiKey) return res.status(404).json({ error: 'api-key-not-found' });
    apiKey.isActive = false;
    appendAuditEvent(store, 'admin', 'admin-token', 'admin.api-key.revoked', apiKey.companyId, { keyId, keyPrefix: apiKey.keyPrefix });
    saveStore(store);
    return res.json({ ok: true });
  });

  app.get('/company/api-keys', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    const store = ensureStore();
    const keys = store.apiKeys
      .filter((key) => key.companyId === auth.companyId)
      .map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        isActive: key.isActive,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt || null
      }));

    return res.json({ apiKeys: keys });
  });

  app.post('/company/api-keys', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    if (!canManageSecurity(auth.role)) {
      return res.status(403).json({ error: 'security-role-required' });
    }

    const name = String(req.body?.name || 'tenant-key').trim();
    const store = ensureStore();
    const company = store.companies.find((c) => c.id === auth.companyId);
    if (!company) return res.status(404).json({ error: 'company-not-found' });

    const generated = generateApiKeyPair();
    const apiKey: ApiKey = {
      id: crypto.randomUUID(),
      companyId: company.id,
      name,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    store.apiKeys.push(apiKey);
    appendAuditEvent(store, auth.principalType === 'api-key' ? 'api-key' : 'user', auth.username, 'company.api-key.created', company.id, {
      keyId: apiKey.id,
      keyPrefix: apiKey.keyPrefix,
      name: apiKey.name
    });
    saveStore(store);

    return res.json({
      ok: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        isActive: apiKey.isActive,
        createdAt: apiKey.createdAt,
        key: generated.key,
        enterpriseToken: generated.key
      }
    });
  });

  app.post('/company/api-keys/:keyId/rotate', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    if (!canManageSecurity(auth.role)) {
      return res.status(403).json({ error: 'security-role-required' });
    }

    const keyId = String(req.params.keyId || '');
    const store = ensureStore();
    const existing = store.apiKeys.find((key) => key.id === keyId && key.companyId === auth.companyId);
    if (!existing) return res.status(404).json({ error: 'api-key-not-found' });

    existing.isActive = false;
    const generated = generateApiKeyPair();
    const replacement: ApiKey = {
      id: crypto.randomUUID(),
      companyId: existing.companyId,
      name: existing.name,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    store.apiKeys.push(replacement);

    appendAuditEvent(store, auth.principalType === 'api-key' ? 'api-key' : 'user', auth.username, 'company.api-key.rotated', existing.companyId, {
      oldKeyId: existing.id,
      newKeyId: replacement.id,
      newKeyPrefix: replacement.keyPrefix
    });
    saveStore(store);

    return res.json({
      ok: true,
      apiKey: {
        id: replacement.id,
        name: replacement.name,
        keyPrefix: replacement.keyPrefix,
        isActive: replacement.isActive,
        createdAt: replacement.createdAt,
        key: generated.key,
        enterpriseToken: generated.key
      }
    });
  });

  app.delete('/company/api-keys/:keyId', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    if (!canManageSecurity(auth.role)) {
      return res.status(403).json({ error: 'security-role-required' });
    }

    const keyId = String(req.params.keyId || '');
    const store = ensureStore();
    const apiKey = store.apiKeys.find((key) => key.id === keyId && key.companyId === auth.companyId);
    if (!apiKey) return res.status(404).json({ error: 'api-key-not-found' });

    apiKey.isActive = false;
    appendAuditEvent(store, auth.principalType === 'api-key' ? 'api-key' : 'user', auth.username, 'company.api-key.revoked', apiKey.companyId, { keyId });
    saveStore(store);
    return res.json({ ok: true });
  });

  app.get('/company/wallet', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    const store = ensureStore();
    const company = store.companies.find((c) => c.id === auth.companyId);
    if (!company) return res.status(404).json({ error: 'company-not-found' });

    const entries = store.ledger
      .filter((entry) => entry.companyId === company.id)
      .slice(-100)
      .reverse();

    return res.json({
      company: {
        id: company.id,
        name: company.name,
        plan: company.plan,
        tier: company.tier,
        status: company.status,
        creditBalance: company.creditBalance,
        monthlyQuota: company.monthlyQuota,
        consumedThisPeriod: company.consumedThisPeriod,
        pricePerVerificationCredits: company.pricePerVerificationCredits
      },
      ledger: entries
    });
  });

  app.get('/company/subscription/status', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    const store = ensureStore();
    const company = store.companies.find((c) => c.id === auth.companyId);
    if (!company) return res.status(404).json({ error: 'company-not-found' });

    const remaining = Math.max(0, company.monthlyQuota - company.consumedThisPeriod);
    return res.json({
      company: {
        id: company.id,
        name: company.name,
        status: company.status,
        subscriptionPlan: company.subscriptionPlan,
        validUntil: company.validUntil,
        monthlyQuota: company.monthlyQuota,
        consumedThisPeriod: company.consumedThisPeriod,
        remainingQueries: remaining
      },
      requiresPayment: remaining <= 0 || !isSubscriptionActive(company),
      plans: Object.values(SUBSCRIPTION_PLANS)
    });
  });

  app.post('/company/subscription/checkout', requireCompanyAuth, async (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    if (!canManageBilling(auth.role)) {
      return res.status(403).json({ error: 'billing-role-required' });
    }

    const selectedPlan = parseSubscriptionPlan(req.body?.selectedPlan);
    const provider = String(req.body?.provider || 'mock').trim().toLowerCase() as PaymentRecord['provider'];
    const currency = String(req.body?.currency || 'USD').trim().toUpperCase();

    if (!['stripe', 'flutterwave', 'mpesa', 'mock'].includes(provider)) {
      return res.status(400).json({ error: 'invalid-provider' });
    }

    const store = ensureStore();
    const company = store.companies.find((c) => c.id === auth.companyId);
    if (!company) return res.status(404).json({ error: 'company-not-found' });

    const amount = SUBSCRIPTION_PLANS[selectedPlan].priceUsd;
    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
      companyId: company.id,
      provider,
      amount,
      currency,
      status: 'pending',
      metadata: {
        selectedPlan,
        purchaser: auth.username
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const checkout = await createExternalPayment(provider, amount, currency, company);
    if (checkout.externalReference) payment.externalReference = checkout.externalReference;
    if (checkout.checkoutUrl) payment.checkoutUrl = checkout.checkoutUrl;
    payment.status = checkout.status;
    payment.updatedAt = new Date().toISOString();
    store.payments.push(payment);

    if (checkout.status === 'succeeded') {
      applySubscriptionPlan(company, selectedPlan);
      appendAuditEvent(
        store,
        auth.principalType === 'api-key' ? 'api-key' : 'user',
        auth.username,
        'company.subscription.renewed',
        company.id,
        {
          paymentId: payment.id,
          selectedPlan,
          provider,
          amount,
          validUntil: company.validUntil
        }
      );
      saveStore(store);
      return res.json({
        ok: true,
        payment,
        subscription: {
          plan: company.subscriptionPlan,
          validUntil: company.validUntil,
          monthlyQuota: company.monthlyQuota,
          consumedThisPeriod: company.consumedThisPeriod,
          remainingQueries: Math.max(0, company.monthlyQuota - company.consumedThisPeriod)
        }
      });
    }

    saveStore(store);
    return res.json({
      ok: payment.status !== 'failed',
      payment,
      checkoutUrl: payment.checkoutUrl || null,
      message: payment.status === 'failed' ? 'checkout-init-failed' : 'checkout-created'
    });
  });

  app.post('/company/wallet/topup', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    if (!canManageBilling(auth.role)) {
      return res.status(403).json({ error: 'billing-role-required' });
    }

    const amount = Number(req.body?.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'invalid-amount' });
    }

    const store = ensureStore();
    const company = store.companies.find((c) => c.id === auth.companyId);
    if (!company) return res.status(404).json({ error: 'company-not-found' });

    const entry = appendLedgerEntry(store, company, 'credit_grant', amount, 'Topup manual de desenvolvimento');
    appendAuditEvent(store, auth.principalType === 'api-key' ? 'api-key' : 'user', auth.username, 'company.wallet.topup', company.id, { amount });
    saveStore(store);

    return res.json({ ok: true, balance: company.creditBalance, entry });
  });

  app.post('/company/payments/checkout', requireCompanyAuth, async (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    if (!canManageBilling(auth.role)) {
      return res.status(403).json({ error: 'billing-role-required' });
    }

    const provider = String(req.body?.provider || 'mock').trim().toLowerCase() as PaymentRecord['provider'];
    const amount = Number(req.body?.amount ?? 0);
    const currency = String(req.body?.currency || 'MZN').trim().toUpperCase();
    if (!['stripe', 'flutterwave', 'mpesa', 'mock'].includes(provider)) {
      return res.status(400).json({ error: 'invalid-provider' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'invalid-amount' });
    }

    const store = ensureStore();
    const company = store.companies.find((c) => c.id === auth.companyId);
    if (!company) return res.status(404).json({ error: 'company-not-found' });

    const payment: PaymentRecord = {
      id: crypto.randomUUID(),
      companyId: company.id,
      provider,
      amount,
      currency,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const checkout = await createExternalPayment(provider, amount, currency, company);
    if (checkout.externalReference) payment.externalReference = checkout.externalReference;
    if (checkout.checkoutUrl) payment.checkoutUrl = checkout.checkoutUrl;
    payment.status = checkout.status;
    payment.updatedAt = new Date().toISOString();

    store.payments.push(payment);

    if (checkout.status === 'succeeded') {
      const entry = appendLedgerEntry(store, company, 'credit_grant', amount, `Topup confirmado via ${provider}`, payment.id);
      appendAuditEvent(store, auth.principalType === 'api-key' ? 'api-key' : 'user', auth.username, 'payment.checkout.succeeded', company.id, {
        paymentId: payment.id,
        provider,
        amount,
        ledgerId: entry.id
      });
      saveStore(store);
      return res.json({ ok: true, payment, balance: company.creditBalance, autoCredited: true });
    }

    appendAuditEvent(store, auth.principalType === 'api-key' ? 'api-key' : 'user', auth.username, 'payment.checkout.created', company.id, {
      paymentId: payment.id,
      provider,
      amount,
      status: payment.status
    });
    saveStore(store);

    return res.json({
      ok: payment.status !== 'failed',
      payment,
      checkoutUrl: payment.checkoutUrl || null,
      message: payment.status === 'failed' ? 'checkout-init-failed' : 'checkout-created'
    });
  });

  app.post('/webhooks/payments/:provider', (req: Request, res: Response) => {
    const provider = String(req.params.provider || '').toLowerCase();
    const externalReference = String(req.body?.externalReference || req.body?.tx_ref || req.body?.id || '').trim();
    const statusRaw = String(req.body?.status || '').toLowerCase();
    const succeeded = Boolean(req.body?.succeeded === true || statusRaw === 'successful' || statusRaw === 'success');

    if (!externalReference) {
      return res.status(400).json({ error: 'missing-external-reference' });
    }

    const store = ensureStore();
    const payment = store.payments.find((item) => item.externalReference === externalReference && item.provider === provider);
    if (!payment) return res.status(404).json({ error: 'payment-not-found' });
    if (payment.status === 'succeeded') return res.json({ ok: true, alreadyProcessed: true });

    const company = store.companies.find((item) => item.id === payment.companyId);
    if (!company) return res.status(404).json({ error: 'company-not-found' });

    payment.status = succeeded ? 'succeeded' : 'failed';
    payment.updatedAt = new Date().toISOString();
    payment.metadata = req.body || {};

    if (payment.status === 'succeeded') {
      appendLedgerEntry(store, company, 'credit_grant', payment.amount, `Topup confirmado por webhook ${provider}`, payment.id);
      const selectedPlanRaw = payment.metadata?.selectedPlan;
      const selectedPlan = parseSubscriptionPlan(selectedPlanRaw);
      if (selectedPlanRaw) {
        applySubscriptionPlan(company, selectedPlan);
      }
    }

    appendAuditEvent(store, 'system', `webhook:${provider}`, 'payment.webhook.received', company.id, {
      paymentId: payment.id,
      status: payment.status,
      externalReference
    });
    saveStore(store);
    return res.json({ ok: true, paymentStatus: payment.status, balance: company.creditBalance });
  });

  app.get('/company/payments', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    const store = ensureStore();
    const payments = store.payments
      .filter((payment) => payment.companyId === auth.companyId)
      .slice(-100)
      .reverse();
    return res.json({ payments });
  });

  app.get('/company/audit/export', requireCompanyAuth, (req: Request, res: Response) => {
    const auth = (req as any).auth as AuthContext;
    const format = String(req.query.format || 'json').toLowerCase();
    const requestedLimit = Number(req.query.limit || 250);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 5000) : 250;

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: 'invalid-format', allowed: ['json', 'csv'] });
    }

    const store = ensureStore();
    const events = store.auditLogs
      .filter((event) => event.companyId === auth.companyId)
      .slice(-limit)
      .reverse();

    const generatedAt = new Date().toISOString();

    if (format === 'csv') {
      const header = ['id', 'createdAt', 'actorType', 'actorId', 'action', 'companyId', 'metadata'];
      const rows = events.map((event) => [
        event.id,
        event.createdAt,
        event.actorType,
        event.actorId,
        event.action,
        event.companyId || '',
        JSON.stringify(event.metadata || {})
      ].map(toCsvCell).join(','));

      const csv = [header.join(','), ...rows].join('\n');
      const signature = signAuditPayload(csv);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('X-Audit-Signature', signature);
      res.setHeader('X-Audit-Generated-At', generatedAt);
      return res.send(csv);
    }

    const payload = {
      companyId: auth.companyId,
      generatedAt,
      count: events.length,
      events
    };
    const body = JSON.stringify(payload);
    const signature = signAuditPayload(body);
    return res.json({ ...payload, signature });
  });

  app.post('/admin/security/housekeeping', requireAdminToken, (req: Request, res: Response) => {
    const staleApiKeyDays = Number(req.body?.staleApiKeyDays ?? 90);
    const revokeStaleApiKeys = Boolean(req.body?.revokeStaleApiKeys ?? true);
    const dryRun = Boolean(req.body?.dryRun ?? false);

    const store = ensureStore();

    if (dryRun) {
      const nowMs = Date.now();
      const staleMs = Math.max(staleApiKeyDays, 1) * 24 * 60 * 60 * 1000;
      const staleActiveApiKeys = store.apiKeys.filter((apiKey) => {
        if (!apiKey.isActive) return false;
        const lastActivity = new Date(apiKey.lastUsedAt || apiKey.createdAt).getTime();
        return Number.isFinite(lastActivity) && nowMs - lastActivity > staleMs;
      }).length;

      return res.json({
        ok: true,
        dryRun: true,
        staleApiKeyDays,
        candidates: {
          expiredOrRevokedRefreshTokens: store.refreshTokens.filter((token) => token.revokedAt || token.expiresAt <= nowMs).length,
          expiredOrUsedMfaChallenges: store.mfaChallenges.filter((challenge) => challenge.usedAt || challenge.expiresAt <= nowMs).length,
          staleActiveApiKeys
        }
      });
    }

    const stats = runSecurityHousekeeping(store, staleApiKeyDays, revokeStaleApiKeys);
    appendAuditEvent(store, 'admin', 'admin-token', 'admin.security.housekeeping', undefined, {
      staleApiKeyDays,
      revokeStaleApiKeys,
      ...stats
    });
    saveStore(store);

    return res.json({ ok: true, dryRun: false, staleApiKeyDays, revokeStaleApiKeys, stats });
  });

  app.get('/admin/audit', requireAdminToken, (_req: Request, res: Response) => {
    const store = ensureStore();
    return res.json({ audit: store.auditLogs.slice(-500).reverse() });
  });
}
