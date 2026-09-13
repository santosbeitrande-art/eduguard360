import { supabase } from '@/lib/supabase';

export type LibraryReadingState = 'want_to_read' | 'reading' | 'completed';

export type LibraryEntry = {
  id: string;
  title: string;
  authors?: string;
  source?: string;
  source_id?: string;
  license?: string;
  access_status?: string;
  file_url?: string;
  download_url?: string | null;
  cover_image_url?: string;
  favorite?: boolean;
  summary?: string;
  notes?: string;
  reading_state?: LibraryReadingState;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
};

export const resolveLibraryStorageKey = (userId?: string | null) => {
  const safeUserId = String(userId || 'guest').trim();
  return `eduguard-literature-library-${safeUserId}`;
};

export const buildLibrarySummary = (book: Partial<LibraryEntry>) => {
  const title = String(book.title || 'Obra sem título').trim();
  const authors = String(book.authors || 'Autor não informado').trim();
  const source = String(book.source || 'Fonte desconhecida').trim();

  return `"${title}" de ${authors}. Fonte: ${source}. Obra marcada para leitura e acompanhamento na biblioteca pessoal.`;
};

export const normalizeLibraryEntry = (book: Partial<LibraryEntry>, userId?: string | null): LibraryEntry => {
  const now = new Date().toISOString();
  const normalized: LibraryEntry = {
    id: String(book.id || `${book.title || 'book'}-${Date.now()}`),
    title: String(book.title || 'Obra sem título'),
    authors: book.authors || 'Autor não informado',
    source: book.source || 'Open Literature',
    source_id: book.source_id || 'unknown',
    license: book.license || 'Licença informada pela fonte',
    access_status: book.access_status || 'Acesso aberto',
    file_url: book.file_url,
    download_url: book.download_url ?? null,
    cover_image_url: book.cover_image_url,
    favorite: Boolean(book.favorite),
    summary: book.summary || buildLibrarySummary(book),
    notes: book.notes || '',
    reading_state: book.reading_state || 'want_to_read',
    user_id: userId || book.user_id || 'guest',
    created_at: book.created_at || now,
    updated_at: book.updated_at || now,
  };

  return normalized;
};

export const readLibraryEntries = (userId?: string | null): LibraryEntry[] => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(resolveLibraryStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((entry) => normalizeLibraryEntry(entry, userId)) : [];
  } catch {
    return [];
  }
};

export const writeLibraryEntries = (entries: LibraryEntry[], userId?: string | null) => {
  if (typeof window === 'undefined') return;

  const normalized = entries.map((entry) => normalizeLibraryEntry(entry, userId));
  localStorage.setItem(resolveLibraryStorageKey(userId), JSON.stringify(normalized));
};

export const syncLibraryEntriesToSupabase = async (userId?: string | null, entries: LibraryEntry[] = []) => {
  if (!userId || userId === 'guest') return { synced: false, entries };

  try {
    const payload = entries.map((entry) => ({
      user_id: userId,
      id: String(entry.id),
      title: entry.title,
      authors: entry.authors || '',
      source: entry.source || 'Open Literature',
      source_id: entry.source_id || 'unknown',
      license: entry.license || '',
      access_status: entry.access_status || '',
      file_url: entry.file_url || '',
      download_url: entry.download_url || null,
      cover_image_url: entry.cover_image_url || '',
      favorite: Boolean(entry.favorite),
      summary: entry.summary || buildLibrarySummary(entry),
      notes: entry.notes || '',
      reading_state: entry.reading_state || 'want_to_read',
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('user_literature_library')
      .upsert(payload, { onConflict: 'user_id,id' });

    return { synced: !error, entries, error };
  } catch (error) {
    return { synced: false, entries, error };
  }
};

export const loadLibraryEntriesForUser = async (userId?: string | null): Promise<LibraryEntry[]> => {
  const localEntries = readLibraryEntries(userId);
  if (!userId || userId === 'guest') return localEntries;

  try {
    const { data, error } = await supabase
      .from('user_literature_library')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error || !Array.isArray(data) || data.length === 0) {
      return localEntries;
    }

    const normalized = data.map((entry) => normalizeLibraryEntry({
      id: entry.id,
      title: entry.title,
      authors: entry.authors,
      source: entry.source,
      source_id: entry.source_id,
      license: entry.license,
      access_status: entry.access_status,
      file_url: entry.file_url,
      download_url: entry.download_url,
      cover_image_url: entry.cover_image_url,
      favorite: entry.favorite,
      summary: entry.summary,
      notes: entry.notes,
      reading_state: entry.reading_state,
      user_id: entry.user_id,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    }, userId));

    writeLibraryEntries(normalized, userId);
    return normalized;
  } catch {
    return localEntries;
  }
};

export const upsertLibraryEntry = async (book: Partial<LibraryEntry>, userId?: string | null) => {
  const current = readLibraryEntries(userId);
  const nextEntry = normalizeLibraryEntry(book, userId);
  const filtered = current.filter((entry) => !(entry.id === nextEntry.id && entry.source === nextEntry.source));
  const merged = [nextEntry, ...filtered];
  writeLibraryEntries(merged, userId);

  const syncResult = await syncLibraryEntriesToSupabase(userId, merged);
  return { entries: merged, syncResult };
};

export const toggleLibraryFavorite = async (book: Partial<LibraryEntry>, userId?: string | null) => {
  const current = readLibraryEntries(userId);
  const index = current.findIndex((entry) => entry.id === book.id && entry.source === book.source);

  let merged: LibraryEntry[];
  if (index >= 0) {
    merged = current.map((entry, i) => i === index ? { ...entry, favorite: !entry.favorite, updated_at: new Date().toISOString() } : entry);
  } else {
    const freshEntry = normalizeLibraryEntry({ ...book, favorite: true }, userId);
    merged = [freshEntry, ...current];
  }

  writeLibraryEntries(merged, userId);

  const syncResult = await syncLibraryEntriesToSupabase(userId, merged);
  return { entries: merged, syncResult };
};

export const updateLibraryReadingState = async (book: Partial<LibraryEntry>, readingState: LibraryReadingState, userId?: string | null) => {
  const current = readLibraryEntries(userId);
  const index = current.findIndex((entry) => entry.id === book.id && entry.source === book.source);

  const merged = index >= 0
    ? current.map((entry, i) => i === index ? { ...entry, reading_state: readingState, updated_at: new Date().toISOString() } : entry)
    : [normalizeLibraryEntry({ ...book, reading_state: readingState }, userId), ...current];

  writeLibraryEntries(merged, userId);

  const syncResult = await syncLibraryEntriesToSupabase(userId, merged);
  return { entries: merged, syncResult };
};
