'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { COMMUNITY_LIMITS, GROUP_KIND_LABEL, groupLink, type AdminGroup, type AdminGroupMember, type AdminInvite, type GroupKind, type GroupRole } from '@/lib/community';

async function call<T>(url: string, init?: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown }): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? 'GET', cache: 'no-store',
    headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((result as { error?: string }).error || 'That did not work.');
  return result as T;
}

const emptyForm = { id: '' as string, name: '', kind: 'sacco' as GroupKind, county: 'Nairobi', description: '', archived: false };
const day = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'short', year: 'numeric' });

interface Made { code: string; link: string; message: string; days: number; maxUses: number; role: GroupRole }

/**
 * Community groups for Mylkio staff: create a group for a real SACCO or area, make an invitation link, and see who has
 * joined. Staff see names and counts only; they cannot read what members write.
 */
export function CommunityAdmin() {
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ invites: AdminInvite[]; members: AdminGroupMember[] } | null>(null);
  const [invite, setInvite] = useState<{ role: GroupRole; label: string; maxUses: number; days: number }>({ role: 'member', label: '', maxUses: 50, days: 30 });
  const [made, setMade] = useState<Made | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try { setGroups((await call<{ groups: AdminGroup[] }>('/api/admin/community/groups')).groups); setError(''); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const loadDetail = useCallback(async (groupId: string) => {
    try { setDetail(await call(`/api/admin/community/groups/${groupId}`)); setError(''); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { if (open) void loadDetail(open); else setDetail(null); }, [open, loadDetail]);

  const act = async (work: () => Promise<unknown>) => {
    setBusy(true);
    try { await work(); await load(); if (open) await loadDetail(open); setError(''); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    const { id, ...rest } = form;
    void act(async () => { await call('/api/admin/community/groups', { method: 'POST', body: { ...rest, id: id || null } }); setForm(null); });
  };

  const makeInvite = (group: AdminGroup) => void act(async () => {
    const result = await call<{ code: string; days: number; maxUses: number; role: GroupRole }>(`/api/admin/community/groups/${group.id}`, { method: 'POST', body: invite });
    const link = groupLink(window.location.origin, result.code);
    setMade({
      ...result, link,
      message: `Hello! You are invited to join "${group.name}" on Mylkio Community. Open this link, sign in, and your farm joins: ${link}\nInvitation code: ${result.code}\nIt works for ${result.days} days${result.maxUses > 1 ? `, for up to ${result.maxUses} farms` : ''}.`,
    });
    setCopied(false);
  });

  const withdraw = (inviteId: string, groupId: string) => {
    if (!window.confirm('Withdraw this invitation? Nobody will be able to use it.')) return;
    void act(() => call(`/api/admin/community/groups/${groupId}`, { method: 'DELETE', body: { inviteId } }));
  };
  const takeOut = (farmId: string, name: string, groupId: string) => {
    if (!window.confirm(`Take ${name} out of this group? They lose access at once and need a new invitation to return.`)) return;
    void act(() => call(`/api/admin/community/groups/${groupId}`, { method: 'DELETE', body: { farmId } }));
  };

  const live = groups.filter((g) => !g.archived);

  return (
    <section aria-labelledby="community-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="community-heading" className="font-display text-2xl font-bold">Community groups ({live.length})</h2>
          <p className="mt-1 max-w-2xl text-sm text-charcoal-light">
            Create a group for a real SACCO or area, then send its members an invitation link. Only Farm Pro and Custom farms can join. You see group names, counts and which farms joined, never what members write.
          </p>
        </div>
        <button type="button" onClick={() => setForm({ ...emptyForm })} className="btn btn-primary"><Plus className="h-4 w-4" />Create a group</button>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {form && (
        <form onSubmit={save} className="card space-y-4 p-4 sm:p-5">
          <h3 className="text-lg font-semibold">{form.id ? 'Edit group' : 'Create a group'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="cg-name" className="field-label">Name</label><input id="cg-name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={3} maxLength={80} placeholder="Rongai Dairy SACCO" /></div>
            <div><label htmlFor="cg-kind" className="field-label">Kind</label>
              <select id="cg-kind" className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as GroupKind })}>
                {(['sacco', 'area'] as const).map((k) => <option key={k} value={k}>{GROUP_KIND_LABEL[k].en}</option>)}</select></div>
            <div><label htmlFor="cg-county" className="field-label">County</label><input id="cg-county" className="field" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} required minLength={2} maxLength={80} />
              <p className="mt-1 text-xs text-charcoal-muted">Official alerts (a later step) go to every group in a county, so spell it as the farms do.</p></div>
            <div><label htmlFor="cg-desc" className="field-label">About this group (optional)</label><input id="cg-desc" className="field" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={COMMUNITY_LIMITS.descriptionChars} /></div>
          </div>
          {form.id && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5 accent-[#345C4A]" checked={form.archived} onChange={(e) => setForm({ ...form, archived: e.target.checked })} />Archived (hidden from members; nothing is deleted)</label>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary">{form.id ? 'Save changes' : 'Create group'}</button>
            <button type="button" onClick={() => setForm(null)} className="btn btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {groups.length === 0 && !error && <p className="text-sm text-charcoal-muted">No groups yet. Create the first one.</p>}

      {groups.map((g) => (
        <article key={g.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{g.name}</h3>
                {g.archived && <span className="rounded-full bg-ivory-muted px-2.5 py-0.5 text-xs font-bold text-charcoal">Archived</span>}
              </div>
              <p className="text-sm text-charcoal-light">{GROUP_KIND_LABEL[g.kind].en} · {g.county} · {g.members} {g.members === 1 ? 'farm' : 'farms'} · {g.openInvites} open {g.openInvites === 1 ? 'invitation' : 'invitations'}</p>
              {g.description && <p className="mt-1 text-sm text-charcoal-light">{g.description}</p>}
              <p className="mt-1 text-xs text-charcoal-muted">Created {day(g.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary" aria-expanded={open === g.id} onClick={() => { setOpen(open === g.id ? null : g.id); setMade(null); }}>{open === g.id ? 'Hide' : 'Invitations and farms'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => setForm({ id: g.id, name: g.name, kind: g.kind, county: g.county, description: g.description ?? '', archived: g.archived })}>Edit</button>
            </div>
          </div>

          {open === g.id && (
            <div className="mt-4 space-y-4 border-t border-ivory-border pt-4">
              {!g.archived && !made && (
                <div className="space-y-3 rounded-xl border border-ivory-border bg-ivory p-4">
                  <h4 className="text-sm font-bold">New invitation link</h4>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <label className="block"><span className="field-label">For</span>
                      <select className="field" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as GroupRole })}>
                        <option value="member">Members</option><option value="admin">Group admin (looks after the group)</option></select></label>
                    <label className="block"><span className="field-label">Farms who can use it</span>
                      <input className="field" type="number" min={1} max={COMMUNITY_LIMITS.inviteMaxUses} value={invite.maxUses} onChange={(e) => setInvite({ ...invite, maxUses: Math.max(1, Math.min(COMMUNITY_LIMITS.inviteMaxUses, Number(e.target.value) || 1)) })} /></label>
                    <label className="block"><span className="field-label">Valid for (days)</span>
                      <input className="field" type="number" min={1} max={COMMUNITY_LIMITS.inviteMaxDays} value={invite.days} onChange={(e) => setInvite({ ...invite, days: Math.max(1, Math.min(COMMUNITY_LIMITS.inviteMaxDays, Number(e.target.value) || 1)) })} /></label>
                    <label className="block"><span className="field-label">Note (optional)</span>
                      <input className="field" value={invite.label} maxLength={80} onChange={(e) => setInvite({ ...invite, label: e.target.value })} placeholder="March members" /></label>
                  </div>
                  <button type="button" disabled={busy} className="btn btn-primary" onClick={() => makeInvite(g)}><Plus className="h-4 w-4" />Create invitation</button>
                </div>
              )}

              {made && (
                <div role="status" className="space-y-3 rounded-xl border border-sage-300 bg-sage/10 p-4">
                  <h4 className="text-sm font-bold">Invitation ready</h4>
                  <p className="text-sm text-charcoal-light">Share it now. For safety the code is shown only this once: after you close this, only a scrambled copy is kept.</p>
                  <p className="select-all font-display text-3xl tracking-widest">{made.code}</p>
                  <p className="select-all break-all rounded-lg bg-white p-2 text-xs text-charcoal-muted">{made.link}</p>
                  <div className="flex flex-wrap gap-2">
                    <a className="btn btn-primary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(made.message)}`}><MessageCircle className="h-4 w-4" />Share on WhatsApp</a>
                    <button type="button" className="btn btn-secondary" onClick={() => { void navigator.clipboard?.writeText(made.message).then(() => setCopied(true)).catch(() => undefined); }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy message'}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setMade(null)}>Done</button>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold">Open invitations</h4>
                {!detail ? <p className="mt-1 text-sm text-charcoal-muted">Loading…</p> : detail.invites.length === 0 ? <p className="mt-1 text-sm text-charcoal-muted">None open.</p> : (
                  <ul className="mt-2 divide-y divide-ivory-border rounded-xl border border-ivory-border">
                    {detail.invites.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                        <div className="min-w-0 text-sm">
                          <p className="font-semibold">{i.label || 'Invitation'} · {i.role === 'admin' ? 'group admin' : 'members'}</p>
                          <p className="text-xs text-charcoal-muted">Used by {i.uses} of {i.maxUses} · expires {day(i.expiresAt)}</p>
                        </div>
                        <button type="button" disabled={busy} className="btn btn-ghost !min-h-10" onClick={() => withdraw(i.id, g.id)}>Withdraw</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold">Farms in this group ({detail?.members.length ?? g.members})</h4>
                {detail && detail.members.length === 0 && <p className="mt-1 text-sm text-charcoal-muted">No farm has joined yet.</p>}
                {detail && detail.members.length > 0 && (
                  <ul className="mt-2 divide-y divide-ivory-border rounded-xl border border-ivory-border">
                    {detail.members.map((m) => (
                      <li key={m.farmId} className="flex flex-wrap items-center justify-between gap-3 p-3">
                        <div className="min-w-0 text-sm">
                          <p className="truncate font-semibold">{m.farmName || 'A farm'}{m.role === 'admin' ? ' · group admin' : ''}</p>
                          <p className="text-xs text-charcoal-muted">{[m.subCounty, m.county].filter(Boolean).join(', ')} · joined {day(m.joinedAt)}</p>
                        </div>
                        <button type="button" disabled={busy} className="btn btn-ghost !min-h-10 !text-red-700" onClick={() => takeOut(m.farmId, m.farmName || 'this farm', g.id)}><Trash2 className="h-4 w-4" />Take out</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
