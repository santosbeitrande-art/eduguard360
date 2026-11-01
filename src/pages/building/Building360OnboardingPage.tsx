import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react';
import { isApprovedByAdmin, isBuilding360ManagementProfile, resolveBuilding360Profile } from '@/lib/building360Access';

type Row = Record<string, unknown>;
type Organization = Row & { id: string; name: string; code?: string };
type Site = Row & { id: string; organizationId: string; name: string; city?: string; type?: string };
type Building = Row & { id: string; organizationId: string; siteId: string; name: string; code?: string };
type Unit = Row & { id: string; buildingId: string; number: string; code?: string; type?: string };
type Person = Row & { id: string; fullName: string; email?: string; unitId?: string };
type CsvUnit = { number: string; type: string; status: string; areaM2: number };
type Draft = { organizationId: string; siteId: string; buildingId: string };

const STEPS = ['Organização', 'Edifício', 'Unidades', 'Pessoas', 'Financeiro'];
const UNIT_TYPES = ['apartment', 'office', 'shop', 'room', 'warehouse', 'parking'];
const UNIT_STATUSES = ['occupied', 'vacant', 'maintenance'];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' && quoted && input[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('O ficheiro CSV contém aspas sem par correspondente.');
  row.push(field.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

const Building360OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<Row | null>(null);
  const [token, setToken] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [draft, setDraft] = useState<Draft>({ organizationId: '', siteId: '', buildingId: '' });
  const [organizationName, setOrganizationName] = useState('');
  const [siteName, setSiteName] = useState('');
  const [city, setCity] = useState('');
  const [siteType, setSiteType] = useState('residential');
  const [buildingName, setBuildingName] = useState('');
  const [buildingCode, setBuildingCode] = useState('');
  const [floors, setFloors] = useState('1');
  const [unitNumber, setUnitNumber] = useState('');
  const [unitType, setUnitType] = useState('apartment');
  const [unitStatus, setUnitStatus] = useState('vacant');
  const [csvRows, setCsvRows] = useState<CsvUnit[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [personUnitId, setPersonUnitId] = useState('');
  const [contractUnitId, setContractUnitId] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [startsAt, setStartsAt] = useState(new Date().toISOString().slice(0, 10));

  const headers = useMemo(() => {
    const profile = String(user?.building360_role || user?.perfil || user?.role || '');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-enterprise-role': profile,
      'x-user-id': String(user?.id || user?.user_id || ''),
      'x-school-id': String(user?.escola_id || user?.school_id || tenantId),
      'x-tenant-id': tenantId,
    };
  }, [tenantId, token, user]);

  const request = async (path: string, method = 'GET', body?: unknown) => {
    const response = await fetch(path, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = result && typeof result === 'object' && 'message' in result
        ? (result as { message: unknown }).message
        : `Pedido recusado (HTTP ${response.status}).`;
      throw new Error(Array.isArray(message) ? message.join('; ') : String(message));
    }
    return result;
  };

  const loadSetup = async (activeTenant: string, activeToken: string, activeUser: Row) => {
    setLoading(true);
    setError('');
    const profile = String(activeUser.building360_role || activeUser.perfil || activeUser.role || '');
    const commonHeaders = {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
      'x-enterprise-role': profile,
      'x-user-id': String(activeUser.id || activeUser.user_id || ''),
      'x-school-id': String(activeUser.escola_id || activeUser.school_id || activeTenant),
      'x-tenant-id': activeTenant,
    };
    const fetchRows = async <T,>(path: string): Promise<T[]> => {
      const response = await fetch(path, { headers: commonHeaders });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`Não foi possível carregar ${path} (HTTP ${response.status}).`);
      if (Array.isArray(result)) return result as T[];
      if (result && typeof result === 'object' && Array.isArray((result as { data?: unknown }).data)) {
        return (result as { data: T[] }).data;
      }
      return [];
    };

    try {
      const orgs = await fetchRows<Organization>('/api/v1/building360/core/organizations');
      setOrganizations(orgs);
      const savedDraft = (() => {
        try {
          const raw = localStorage.getItem(`building360.setup.${activeTenant}`);
          return raw ? JSON.parse(raw) as Partial<Draft> : {};
        } catch {
          return {};
        }
      })();
      const orgId = orgs.some((org) => org.id === savedDraft.organizationId)
        ? String(savedDraft.organizationId)
        : orgs[0]?.id || '';
      setDraft((current) => ({ ...current, ...savedDraft, organizationId: orgId }));
      if (orgId) {
        const [availableSites, availableBuildings, availableUnits, availablePeople] = await Promise.all([
          fetchRows<Site>(`/api/v1/building360/sites?organizationId=${encodeURIComponent(orgId)}`),
          fetchRows<Building>('/api/v1/building360/buildings'),
          fetchRows<Unit>('/api/v1/building360/units'),
          fetchRows<Person>('/api/v1/building360/core/people?organizationId=' + encodeURIComponent(orgId)),
        ]);
        setSites(availableSites);
        setBuildings(availableBuildings.filter((building) => building.organizationId === orgId));
        setUnits(availableUnits);
        setPeople(availablePeople);
        const siteId = availableSites.some((site) => site.id === savedDraft.siteId)
          ? String(savedDraft.siteId)
          : availableSites[0]?.id || '';
        const buildingId = availableBuildings.some((building) => building.id === savedDraft.buildingId)
          ? String(savedDraft.buildingId)
          : availableBuildings.find((building) => building.siteId === siteId)?.id || '';
        const nextDraft = { organizationId: orgId, siteId, buildingId };
        setDraft(nextDraft);
        if (siteId) setSiteName(availableSites.find((site) => site.id === siteId)?.name || '');
        if (buildingId) setBuildingName(availableBuildings.find((building) => building.id === buildingId)?.name || '');
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let activeUser: Row | null = null;
    for (const key of ['currentUser', 'eduguard_user', 'user']) {
      try {
        const raw = localStorage.getItem(key);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          activeUser = parsed as Row;
          break;
        }
      } catch {
        continue;
      }
    }
    const activeToken = String(localStorage.getItem('eduguard_token') || localStorage.getItem('token') || '').trim();
    if (!activeUser || !activeToken || !isApprovedByAdmin(activeUser)) {
      navigate('/building360/login?returnTo=%2Fbuilding360%2Fonboarding', { replace: true });
      return;
    }
    if (!isBuilding360ManagementProfile(activeUser.building360_role || activeUser.perfil || activeUser.role)) {
      navigate('/portais', { replace: true });
      return;
    }
    const role = resolveBuilding360Profile(activeUser.building360_role || activeUser.perfil || activeUser.role);
    if (role === 'platform_admin') {
      navigate('/sistema/admin', { replace: true });
      return;
    }
    if (!['organization_admin', 'building_manager'].includes(role)) {
      navigate('/building360/dashboard', { replace: true });
      return;
    }
    const activeTenant = String(activeUser.tenant_id || activeUser.escola_id || activeUser.school_id || '').trim();
    if (!activeTenant) {
      setError('A conta não tem organização/tenant atribuída pelo servidor. Contacte o administrador da plataforma; não é seguro criar dados sem um âmbito de organização autenticado.');
      return;
    }
    setUser(activeUser);
    setToken(activeToken);
    setTenantId(activeTenant);
    void loadSetup(activeTenant, activeToken, activeUser);
  }, [navigate]);

  const saveDraft = (next: Draft) => {
    setDraft(next);
    localStorage.setItem(`building360.setup.${tenantId}`, JSON.stringify(next));
  };

  const handleCreateOrganization = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await request('/api/v1/building360/core/organizations', 'POST', { name: organizationName });
      if (!result || typeof result !== 'object' || !('id' in result)) throw new Error('A API não devolveu o identificador da organização criada.');
      const organization = result as Organization;
      setOrganizations((current) => [organization, ...current]);
      saveDraft({ organizationId: organization.id, siteId: '', buildingId: '' });
      setStep(1);
      setNotice('Organização guardada.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBuilding = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.organizationId) {
      setError('Crie ou seleccione uma organização primeiro.');
      setStep(0);
      return;
    }
    setSaving(true);
    setError('');
    try {
      let selectedSite = sites.find((item) => item.id === draft.siteId);
      if (!selectedSite) {
        selectedSite = await request('/api/v1/building360/core/sites', 'POST', {
          organizationId: draft.organizationId,
          name: siteName,
          city,
          type: siteType,
        }) as Site;
        if (!selectedSite?.id) throw new Error('A API não devolveu o identificador do condomínio/site.');
        setSites((current) => [selectedSite as Site, ...current]);
        const siteDraft = { ...draft, siteId: selectedSite.id, buildingId: '' };
        saveDraft(siteDraft);
      }
      const createdBuilding = await request('/api/v1/building360/core/buildings', 'POST', {
        organizationId: draft.organizationId,
        siteId: selectedSite.id,
        name: buildingName,
        code: buildingCode || undefined,
        floors: Number(floors),
      }) as Building;
      if (!createdBuilding?.id) throw new Error('O site foi guardado, mas a API não devolveu o identificador do edifício. Retome em Edifícios e unidades.');
      const next = { ...draft, siteId: selectedSite.id, buildingId: createdBuilding.id };
      setBuildings((current) => [createdBuilding, ...current]);
      saveDraft(next);
      setStep(2);
      setNotice('Condomínio e edifício guardados.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const addUnits = async (items: CsvUnit[]) => {
    if (!draft.buildingId) throw new Error('Crie ou seleccione um edifício antes de registar unidades.');
    const normalized = items.map((item) => item.number.trim().toLowerCase());
    if (normalized.some((number) => !number) || new Set(normalized).size !== normalized.length) {
      throw new Error('A lista contém números de unidade vazios ou duplicados.');
    }
    const existing = new Set(
      units.filter((unit) => unit.buildingId === draft.buildingId)
        .flatMap((unit) => [unit.number, unit.code].filter(Boolean).map((value) => String(value).toLowerCase())),
    );
    const duplicate = items.find((item) => existing.has(item.number.trim().toLowerCase()));
    if (duplicate) throw new Error(`A unidade ${duplicate.number} já existe neste edifício.`);

    for (const item of items) {
      const result = await request('/api/v1/building360/core/units', 'POST', {
        buildingId: draft.buildingId,
        siteId: draft.siteId,
        number: item.number,
        code: item.number,
        type: item.type,
        status: item.status,
        areaM2: item.areaM2,
      }) as Unit;
      if (!result?.id) throw new Error(`Unidade ${item.number}: a API não confirmou o registo.`);
      setUnits((current) => [result, ...current]);
    }
  };

  const handleAddSingleUnit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await addUnits([{ number: unitNumber, type: unitType, status: unitStatus, areaM2: 0 }]);
      setUnitNumber('');
      setNotice('Unidade guardada.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCsvFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setCsvRows([]);
    setCsvErrors([]);
    setError('');
    if (!file) return;
    try {
      const rows = parseCsv(await file.text());
      if (rows.length < 2) throw new Error('O CSV precisa de um cabeçalho e pelo menos uma unidade.');
      const headersRow = rows[0].map((header) => header.trim().toLowerCase());
      const numberIndex = headersRow.indexOf('number');
      const typeIndex = headersRow.indexOf('type');
      const statusIndex = headersRow.indexOf('status');
      const areaIndex = headersRow.indexOf('aream2');
      if (numberIndex < 0) throw new Error('Cabeçalho obrigatório em CSV: number. Também pode incluir type, status e areaM2.');
      const parsed: CsvUnit[] = [];
      const errors: string[] = [];
      rows.slice(1).forEach((row, index) => {
        const number = row[numberIndex]?.trim() || '';
        const type = row[typeIndex]?.trim() || 'apartment';
        const status = row[statusIndex]?.trim() || 'vacant';
        const rawArea = areaIndex >= 0 ? row[areaIndex]?.trim() : '';
        const areaM2 = rawArea ? Number(rawArea) : 0;
        if (!number) errors.push(`Linha ${index + 2}: número da unidade vazio.`);
        else if (!UNIT_TYPES.includes(type)) errors.push(`Linha ${index + 2}: tipo "${type}" não suportado.`);
        else if (!UNIT_STATUSES.includes(status)) errors.push(`Linha ${index + 2}: estado "${status}" não suportado.`);
        else if (!Number.isFinite(areaM2) || areaM2 < 0 || areaM2 > 100000) errors.push(`Linha ${index + 2}: área inválida.`);
        else parsed.push({ number, type, status, areaM2 });
      });
      const numbers = parsed.map((item) => item.number.toLowerCase());
      if (new Set(numbers).size !== numbers.length) errors.push('O ficheiro tem números de unidade duplicados.');
      setCsvRows(parsed);
      setCsvErrors(errors);
      if (errors.length) setError('Corrija os problemas indicados antes de guardar o ficheiro.');
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : String(parseError));
    } finally {
      event.target.value = '';
    }
  };

  const handleCsvImport = async () => {
    setSaving(true);
    setError('');
    try {
      await addUnits(csvRows);
      setCsvRows([]);
      setNotice('Importação concluída; as unidades foram gravadas no sistema.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleAddPerson = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await request('/api/v1/building360/core/people', 'POST', {
        organizationId: draft.organizationId,
        unitId: personUnitId || undefined,
        fullName,
        email: email || undefined,
        phone: phone || undefined,
      }) as Person;
      if (!result?.id) throw new Error('A API não confirmou o registo da pessoa.');
      setPeople((current) => [result, ...current]);
      setFullName('');
      setEmail('');
      setPhone('');
      setNotice('Ficha da pessoa guardada. Isto não envia um convite nem cria credenciais de acesso.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateContract = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await request('/api/v1/building360/finance/contracts', 'POST', {
        organizationId: draft.organizationId,
        siteId: draft.siteId,
        buildingId: draft.buildingId,
        unitId: contractUnitId || undefined,
        title: `Quota mensal · ${contractUnitId ? units.find((unit) => unit.id === contractUnitId)?.number || 'unidade' : buildingName || 'edifício'}`,
        amount: Number(monthlyAmount),
        currency: 'MZN',
        billingCycle: 'monthly',
        startsAt,
      });
      if (!result || typeof result !== 'object' || !('id' in result)) throw new Error('A API não confirmou o contrato mensal.');
      setNotice('Contrato mensal guardado. Este passo não emite automaticamente faturas nem importa dívidas ou saldo de abertura.');
      setStep(STEPS.length);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setSaving(false);
    }
  };

  const currentUnits = units.filter((unit) => unit.buildingId === draft.buildingId);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />A carregar a configuração da organização…</div>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link to="/building360/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Voltar ao dashboard</Link>
        <header className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Primeira entrada</p>
          <h1 className="mt-2 text-3xl font-black text-white">Configurar o seu Building360</h1>
          <p className="mt-2 text-sm text-slate-400">Os registos são guardados na organização autenticada. Pode retomar seleccionando os registos já existentes.</p>
          <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {STEPS.map((label, index) => (
              <li key={label} className={`rounded-lg px-3 py-2 text-xs font-semibold ${index === step ? 'bg-emerald-400 text-slate-950' : index < step ? 'bg-emerald-950 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>
                {index < step ? '✓ ' : `${index + 1}. `}{label}
              </li>
            ))}
          </ol>
        </header>

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-700/50 bg-rose-950/30 p-4 text-sm text-rose-100">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4 text-sm text-emerald-100">{notice}</p>}

        {step === 0 && (
          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-bold">1. Organização</h2>
            <p className="mt-2 text-sm text-slate-400">Comece pela organização que administra o edifício. Os dados ficam limitados ao tenant autenticado.</p>
            {organizations.length > 0 && (
              <label className="mt-5 block text-sm text-slate-300">Organização existente
                <select value={draft.organizationId} onChange={(event) => {
                  const selected = organizations.find((item) => item.id === event.target.value);
                  const next = { organizationId: event.target.value, siteId: '', buildingId: '' };
                  saveDraft(next);
                  if (selected) {
                    setSiteName('');
                    setBuildingName('');
                    setSites([]);
                    setBuildings([]);
                    setUnits([]);
                    setPeople([]);
                    const loadSelected = async () => {
                      setLoading(true);
                      try {
                        const [nextSites, nextBuildings, nextUnits, nextPeople] = await Promise.all([
                          request(`/api/v1/building360/sites?organizationId=${encodeURIComponent(selected.id)}`),
                          request('/api/v1/building360/buildings'),
                          request('/api/v1/building360/units'),
                          request(`/api/v1/building360/core/people?organizationId=${encodeURIComponent(selected.id)}`),
                        ]);
                        const siteRows = Array.isArray(nextSites) ? nextSites as Site[] : [];
                        const buildingRows = Array.isArray(nextBuildings) ? nextBuildings as Building[] : [];
                        setSites(siteRows);
                        setBuildings(buildingRows.filter((item) => item.organizationId === selected.id));
                        setUnits(Array.isArray(nextUnits) ? nextUnits as Unit[] : []);
                        setPeople(Array.isArray(nextPeople) ? nextPeople as Person[] : []);
                      } catch (loadError) {
                        setError(loadError instanceof Error ? loadError.message : String(loadError));
                      } finally {
                        setLoading(false);
                      }
                    };
                    void loadSelected();
                  }
                }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3">
                  {organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            )}
            <form onSubmit={handleCreateOrganization} className="mt-5 space-y-4">
              <label className="block text-sm text-slate-300">Nome da organização
                <input required minLength={2} maxLength={160} value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white" placeholder="Ex.: Administração do Condomínio Central" />
              </label>
              <div className="flex flex-wrap gap-3">
                <button disabled={saving} className="rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{saving ? 'A guardar…' : 'Criar organização'}</button>
                {draft.organizationId && <button type="button" onClick={() => setStep(1)} className="rounded-lg border border-slate-700 px-5 py-3 font-semibold">Continuar com organização seleccionada</button>}
              </div>
            </form>
            <p className="mt-4 text-xs text-slate-500">O backend actual guarda nome e código da organização; contacto e dados fiscais ainda não fazem parte deste formulário.</p>
          </section>
        )}

        {step === 1 && (
          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-bold">2. Edifício</h2>
            <p className="mt-2 text-sm text-slate-400">O edifício é ligado a um condomínio/site da organização. Nesta primeira configuração, são criados os dois registos necessários.</p>
            {sites.length > 0 && <label className="mt-5 block text-sm text-slate-300">Condomínio/site existente
              <select value={draft.siteId} onChange={(event) => {
                const siteId = event.target.value;
                const building = buildings.find((item) => item.siteId === siteId);
                saveDraft({ ...draft, siteId, buildingId: building?.id || '' });
              }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3">
                <option value="">Criar novo condomínio/site</option>
                {sites.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>}
            {draft.siteId && <label className="mt-4 block text-sm text-slate-300">Edifício existente
              <select value={draft.buildingId} onChange={(event) => saveDraft({ ...draft, buildingId: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3">
                <option value="">Criar novo edifício</option>
                {buildings.filter((item) => item.siteId === draft.siteId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>}
            {!draft.buildingId && <form onSubmit={handleCreateBuilding} className="mt-5 grid gap-4 sm:grid-cols-2">
              {!draft.siteId && <>
                <label className="text-sm text-slate-300">Nome do condomínio/site<input required minLength={2} value={siteName} onChange={(event) => setSiteName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
                <label className="text-sm text-slate-300">Cidade<input required minLength={2} value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
                <label className="text-sm text-slate-300">Tipo<select value={siteType} onChange={(event) => setSiteType(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"><option value="residential">Residencial</option><option value="commercial">Comercial</option><option value="hospitality">Hotelaria</option><option value="campus">Campus</option></select></label>
              </>}
              <label className="text-sm text-slate-300">Nome do edifício<input required minLength={2} value={buildingName} onChange={(event) => setBuildingName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
              <label className="text-sm text-slate-300">Código do edifício (opcional)<input value={buildingCode} onChange={(event) => setBuildingCode(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
              <label className="text-sm text-slate-300">Pisos<input type="number" required min="1" max="500" value={floors} onChange={(event) => setFloors(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
              <button disabled={saving} className="rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50 sm:col-span-2">{saving ? 'A guardar…' : 'Guardar condomínio e edifício'}</button>
            </form>}
            {draft.buildingId && <button onClick={() => setStep(2)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950">Continuar <ArrowRight className="h-4 w-4" /></button>}
          </section>
        )}

        {step === 2 && (
          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-bold">3. Unidades</h2>
            <p className="mt-2 text-sm text-slate-400">{currentUnits.length} unidade(s) já registada(s) neste edifício.</p>
            <form onSubmit={handleAddSingleUnit} className="mt-5 grid gap-3 sm:grid-cols-3">
              <label className="text-sm text-slate-300">Número<input required value={unitNumber} onChange={(event) => setUnitNumber(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" placeholder="A-01" /></label>
              <label className="text-sm text-slate-300">Tipo<select value={unitType} onChange={(event) => setUnitType(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3">{UNIT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <label className="text-sm text-slate-300">Estado<select value={unitStatus} onChange={(event) => setUnitStatus(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3">{UNIT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              <button disabled={saving} className="rounded-lg border border-slate-700 px-4 py-3 font-semibold sm:col-span-3">{saving ? 'A guardar…' : 'Adicionar unidade'}</button>
            </form>
            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <label className="block text-sm font-semibold text-white">Importar unidades de CSV</label>
              <p className="mt-1 text-xs text-slate-400">Colunas: number (obrigatória), type, status, areaM2. Os números duplicados são verificados contra o ficheiro e as unidades já carregadas.</p>
              <input type="file" accept=".csv,text/csv" onChange={handleCsvFile} className="mt-3 block w-full text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-slate-100" />
              {csvErrors.length > 0 && <ul className="mt-3 list-disc pl-5 text-xs text-rose-200">{csvErrors.map((item) => <li key={item}>{item}</li>)}</ul>}
              {csvRows.length > 0 && <div className="mt-3">
                <p className="text-sm text-emerald-200">Pré-visualização: {csvRows.length} unidade(s)</p>
                <div className="mt-2 max-h-40 overflow-auto text-xs text-slate-300">{csvRows.slice(0, 8).map((item) => <p key={item.number}>{item.number} · {item.type} · {item.status} · {item.areaM2} m²</p>)}</div>
                <button type="button" disabled={saving || csvErrors.length > 0} onClick={() => void handleCsvImport()} className="mt-3 rounded-lg bg-sky-400 px-4 py-2 font-bold text-slate-950 disabled:opacity-50">{saving ? 'A importar…' : 'Confirmar importação'}</button>
              </div>}
            </div>
            <button onClick={() => setStep(3)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950">Continuar com {currentUnits.length} unidade(s) <ArrowRight className="h-4 w-4" /></button>
          </section>
        )}

        {step === 3 && (
          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-bold">4. Pessoas</h2>
            <p className="mt-2 text-sm text-slate-400">Adicione fichas de proprietários ou inquilinos e associe uma unidade, quando aplicável.</p>
            <form onSubmit={handleAddPerson} className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">Nome completo<input required minLength={2} value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
              <label className="text-sm text-slate-300">Email (opcional)<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
              <label className="text-sm text-slate-300">Telefone (opcional)<input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
              <label className="text-sm text-slate-300">Unidade<select value={personUnitId} onChange={(event) => setPersonUnitId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"><option value="">Sem unidade associada</option>{currentUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.number}</option>)}</select></label>
              <button disabled={saving} className="rounded-lg border border-slate-700 px-4 py-3 font-semibold sm:col-span-2">{saving ? 'A guardar…' : 'Adicionar pessoa'}</button>
            </form>
            {people.length > 0 && <p className="mt-4 text-xs text-slate-400">{people.length} ficha(s) de pessoa(s) registada(s).</p>}
            <p className="mt-4 rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-100">O backend actual guarda fichas de pessoas, mas não foi localizado um endpoint de convite/activação de utilizadores. Adicionar uma pessoa não cria uma conta nem envia email.</p>
            <button onClick={() => setStep(4)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950">Continuar <ArrowRight className="h-4 w-4" /></button>
          </section>
        )}

        {step === 4 && (
          <section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-bold">5. Financeiro</h2>
            <p className="mt-2 text-sm text-slate-400">Registe um contrato mensal para o edifício ou para uma unidade. A emissão de cobranças, pagamentos e recibos é feita no módulo Financeiro.</p>
            <form onSubmit={handleCreateContract} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-300">Unidade (opcional)<select value={contractUnitId} onChange={(event) => setContractUnitId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"><option value="">Contrato associado ao edifício</option>{currentUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.number}</option>)}</select></label>
              <label className="text-sm text-slate-300">Mensalidade (MZN)<input required type="number" min="0.01" step="0.01" value={monthlyAmount} onChange={(event) => setMonthlyAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
              <label className="text-sm text-slate-300">Início do contrato<input required type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3" /></label>
              <button disabled={saving} className="rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950 sm:col-span-2">{saving ? 'A guardar…' : 'Guardar contrato mensal'}</button>
            </form>
            <p className="mt-4 text-xs leading-relaxed text-amber-100">A API actual não expõe fluxo para despesas, dívida anterior, saldo de abertura, convite por email ou importação de pagamentos históricos. Não introduza esses valores como se estivessem registados.</p>
            <button onClick={() => setStep(STEPS.length)} className="mt-5 rounded-lg border border-slate-700 px-5 py-3 font-semibold">Continuar sem contrato</button>
          </section>
        )}

        {step >= STEPS.length && (
          <section className="mt-5 rounded-2xl border border-emerald-700/40 bg-emerald-950/20 p-6">
            <Check className="h-8 w-8 text-emerald-300" />
            <h2 className="mt-3 text-2xl font-black text-white">Configuração inicial concluída</h2>
            <p className="mt-2 text-sm text-slate-300">Os registos guardados estão associados à organização autenticada. Pode abrir o dashboard e continuar a gestão.</p>
            <Link to="/building360/dashboard" onClick={() => localStorage.removeItem(`building360.setup.${tenantId}`)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 font-bold text-slate-950">Concluir configuração e abrir o dashboard <ArrowRight className="h-4 w-4" /></Link>
          </section>
        )}
      </div>
    </main>
  );
};

export default Building360OnboardingPage;
