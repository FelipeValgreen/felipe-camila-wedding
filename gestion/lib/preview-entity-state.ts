export type PreviewEntityState<T extends { id: string }> = {
  overrides: Record<string, T>;
  created: T[];
  deleted: string[];
};

export function emptyPreviewEntityState<T extends { id: string }>(): PreviewEntityState<T> {
  return { overrides: {}, created: [], deleted: [] };
}

function isDraftId(id: string) {
  return /^(preview|copilot)-/i.test(String(id || ''));
}

export function normalizePreviewEntityState<T extends { id: string }>(value: unknown): PreviewEntityState<T> {
  if (Array.isArray(value)) {
    const state = emptyPreviewEntityState<T>();
    for (const item of value as T[]) {
      if (!item?.id) continue;
      if (isDraftId(item.id)) state.created.push(item);
      else state.overrides[item.id] = item;
    }
    return state;
  }

  const parsed = value as Partial<PreviewEntityState<T>> | null;
  if (!parsed || typeof parsed !== 'object') return emptyPreviewEntityState<T>();
  return {
    overrides: parsed.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
    created: Array.isArray(parsed.created) ? parsed.created : [],
    deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
  };
}

export function readPreviewEntityState<T extends { id: string }>(key: string): PreviewEntityState<T> {
  if (typeof window === 'undefined') return emptyPreviewEntityState<T>();
  try {
    return normalizePreviewEntityState<T>(JSON.parse(window.localStorage.getItem(key) || 'null'));
  } catch {
    return emptyPreviewEntityState<T>();
  }
}

export function writePreviewEntityState<T extends { id: string }>(key: string, state: PreviewEntityState<T>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(state));
}

export function mergePreviewEntities<T extends { id: string }>(base: T[], state: PreviewEntityState<T>): T[] {
  const map = new Map(base.filter((item) => !state.deleted.includes(item.id)).map((item) => [item.id, item]));
  for (const item of Object.values(state.overrides)) if (!state.deleted.includes(item.id)) map.set(item.id, item);
  for (const item of state.created) if (!state.deleted.includes(item.id)) map.set(item.id, item);
  return Array.from(map.values());
}

export function upsertPreviewEntity<T extends { id: string }>(state: PreviewEntityState<T>, item: T): PreviewEntityState<T> {
  const next: PreviewEntityState<T> = {
    overrides: { ...state.overrides },
    created: state.created.map((current) => ({ ...current })),
    deleted: state.deleted.filter((id) => id !== item.id),
  };
  const createdIndex = next.created.findIndex((current) => current.id === item.id);
  if (createdIndex >= 0) next.created[createdIndex] = item;
  else if (isDraftId(item.id)) next.created.push(item);
  else next.overrides[item.id] = item;
  return next;
}

export function removePreviewEntity<T extends { id: string }>(state: PreviewEntityState<T>, id: string): PreviewEntityState<T> {
  const created = state.created.filter((item) => item.id !== id);
  const overrides = { ...state.overrides };
  delete overrides[id];
  const existedOnlyAsDraft = created.length !== state.created.length;
  return {
    overrides,
    created,
    deleted: existedOnlyAsDraft ? state.deleted.filter((value) => value !== id) : Array.from(new Set([...state.deleted, id])),
  };
}
