'use client';

import type { VetKindId } from './phone';

// Browser side of the vets feature.
//
//   * A farm's own vets are cached on the phone, so the call and WhatsApp buttons work with no signal.
//     Signed in to a real account they are also saved on the server (so they follow the farmer to another
//     phone). In the demo, or where accounts are not set up, they live on this phone only.
//   * The shared directory and suggestions always need the server.

export interface MyVetEntry {
  id: string;
  name: string;
  kind: VetKindId;
  phone: string;
  notes?: string | null;
}

export interface DirectoryEntry extends Omit<MyVetEntry, 'notes'> {
  county: string;
  areas: string | null;
  whatsapp: boolean;
  emergency: boolean;
  hours: string | null;
  kvb_reg_no: string | null;
  notes: string | null;
  confirmed_on: string;
}

export interface VetSuggestionForm {
  name: string;
  kind: VetKindId;
  county: string;
  areas?: string;
  phone: string;
  whatsapp?: boolean;
  emergency?: boolean;
  hours?: string;
  kvbRegNo?: string;
  notes?: string;
}

const cacheKey = (farmId: string) => `mylkio_my_vets_v1_${farmId}`;

export function readCachedVets(farmId: string): MyVetEntry[] {
  try {
    const raw = localStorage.getItem(cacheKey(farmId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(farmId: string, vets: MyVetEntry[]) {
  try { localStorage.setItem(cacheKey(farmId), JSON.stringify(vets)); } catch { /* A full or blocked store only loses the offline copy. */ }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, cache: 'no-store' });
  } catch {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((result as { error?: string }).error || 'That did not work. Please try again.');
  return result as T;
}

type MineResponse = { vets: MyVetEntry[] };

/** The latest list from the account, also refreshing the offline copy. */
export async function loadMyVets(farmId: string, serverBacked: boolean): Promise<MyVetEntry[]> {
  if (!serverBacked) return readCachedVets(farmId);
  const { vets } = await request<MineResponse>(`/api/farms/${farmId}/vets`);
  writeCache(farmId, vets);
  return vets;
}

export async function saveMyVet(farmId: string, serverBacked: boolean, vet: Omit<MyVetEntry, 'id'>): Promise<MyVetEntry[]> {
  if (serverBacked) {
    const { vets } = await request<MineResponse>(`/api/farms/${farmId}/vets`, { method: 'POST', body: JSON.stringify({ name: vet.name, kind: vet.kind, phone: vet.phone, notes: vet.notes || undefined }) });
    writeCache(farmId, vets);
    return vets;
  }
  const current = readCachedVets(farmId);
  if (current.length >= 10) throw new Error('You can save up to 10 vets.');
  const next = [...current, { ...vet, id: crypto.randomUUID() }];
  writeCache(farmId, next);
  return next;
}

export async function deleteMyVet(farmId: string, serverBacked: boolean, id: string): Promise<MyVetEntry[]> {
  if (serverBacked) {
    const { vets } = await request<MineResponse>(`/api/farms/${farmId}/vets`, { method: 'DELETE', body: JSON.stringify({ id }) });
    writeCache(farmId, vets);
    return vets;
  }
  const next = readCachedVets(farmId).filter((v) => v.id !== id);
  writeCache(farmId, next);
  return next;
}

export async function loadDirectory(county: string): Promise<DirectoryEntry[]> {
  const { vets } = await request<{ vets: DirectoryEntry[] }>(`/api/vets?county=${encodeURIComponent(county)}`);
  return vets;
}

export async function suggestVetToDirectory(form: VetSuggestionForm): Promise<void> {
  await request('/api/vets', { method: 'POST', body: JSON.stringify(form) });
}
