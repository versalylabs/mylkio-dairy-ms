'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Info, LogOut, MessageSquare, RefreshCw, ShieldCheck, Trash2, WifiOff } from 'lucide-react';
import type { UserAccount } from '@/types';
import {
  COMMUNITY_LIMITS, GROUP_KIND_LABEL, REFRESH_SECONDS, agoLabel, charsLeft, cleanText,
  type GroupFeed, type GroupSummary, type PostItem, type PostThread,
} from '@/lib/community';
import { COMMUNITY_COPY, type Lang } from '@/lib/community-copy';
import { CommunityError, communityCall, describeError, forget, keep, readKept } from '@/lib/community-client';
import { OutbreakAlerts } from './OutbreakAlerts';
import { AdminReports } from './AdminReports';
import { AdminMembers } from './AdminMembers';
import { ItemActions } from './ItemActions';

/** The newest page replaces what is shown at the top; older posts already loaded stay below it. */
function merge(fresh: PostItem[], existing: PostItem[]): PostItem[] {
  const ids = new Set(fresh.map((p) => p.id));
  const oldest = fresh.length ? fresh[fresh.length - 1].createdAt : '';
  return [...fresh, ...existing.filter((p) => !ids.has(p.id) && p.createdAt < oldest)];
}

const errorText = (e: unknown, lang: Lang, fallback: string) => describeError(e, COMMUNITY_COPY[lang], fallback);

/**
 * One group: a safety note, the discussion (newest first), a box to write, and a thread view for replies. The open group
 * looks for new posts every minute and when the app comes back to the front (there is no live connection). What was read
 * last is kept on the phone and shown when there is no signal; writing needs a connection and says so.
 */
export function GroupScreen({ user, lang, group, canPost, farmCounty, onBack, onLeft }: {
  user: UserAccount; lang: Lang; group: GroupSummary; canPost: boolean; farmCounty: string; onBack: () => void; onLeft: () => void;
}) {
  const t = COMMUNITY_COPY[lang];
  const part = `feed_${group.id}`;
  const isAdmin = canPost && group.role === 'admin';
  const [feed, setFeed] = useState<GroupFeed | null>(() => readKept<GroupFeed>(user.id, part));
  const [posts, setPosts] = useState<PostItem[]>(() => readKept<GroupFeed>(user.id, part)?.posts ?? []);
  const [more, setMore] = useState(() => readKept<GroupFeed>(user.id, part)?.more ?? false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [text, setText] = useState('');
  const [thread, setThread] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [alsoDelete, setAlsoDelete] = useState(false);
  const postsRef = useRef(posts);
  postsRef.current = posts;

  const load = useCallback(async () => {
    try {
      const result = await communityCall<GroupFeed>(`/api/community/groups/${group.id}`);
      const merged = merge(result.posts, postsRef.current);
      setFeed(result); setPosts(merged); setMore((prev) => (postsRef.current.length > result.posts.length ? prev : result.more));
      keep(user.id, part, { ...result, posts: merged.slice(0, 30) });
      setOffline(false); setError(''); setUpdatedAt(Date.now());
    } catch (e) {
      if (e instanceof CommunityError && e.offline) setOffline(true);
      else setError(errorText(e, lang, t.loadError));
    }
  }, [group.id, user.id, part, lang, t.loadError]);

  useEffect(() => {
    communityCall(`/api/community/groups/${group.id}/read`, { method: 'POST' }).catch(() => { /* the count just stays */ });
  }, [group.id]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_SECONDS * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);

  const act = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); }
    catch (e) { setError(errorText(e, lang, t.actionError)); }
    finally { setBusy(false); }
  };

  const post = () => act(async () => {
    await communityCall(`/api/community/groups/${group.id}/posts`, { method: 'POST', body: { body: cleanText(text) } });
    setText(''); await load();
  });

  const remove = (item: PostItem) => {
    if (!window.confirm(t.removePostConfirm)) return;
    void act(async () => { await communityCall(`/api/community/posts/${item.id}`, { method: 'DELETE' }); setPosts((p) => p.filter((x) => x.id !== item.id)); await load(); });
  };

  const older = async () => {
    const last = posts[posts.length - 1];
    if (!last) return;
    setLoadingOlder(true);
    try {
      const result = await communityCall<GroupFeed>(`/api/community/groups/${group.id}?before=${encodeURIComponent(last.createdAt)}`);
      setPosts((prev) => [...prev, ...result.posts.filter((p) => !prev.some((x) => x.id === p.id))]); setMore(result.more);
    } catch (e) { setError(errorText(e, lang, t.loadError)); }
    finally { setLoadingOlder(false); }
  };

  const leave = () => act(async () => {
    if (!window.confirm(t.leaveConfirm(group.name))) return;
    await communityCall(`/api/community/groups/${group.id}`, { method: 'DELETE', body: { deletePosts: alsoDelete } });
    // What this phone kept of the group goes too.
    forget(user.id, part);
    forget(user.id, `alerts_${group.id}`);
    posts.forEach((p) => forget(user.id, `thread_${p.id}`));
    onLeft();
  });

  if (thread) {
    return <ThreadScreen user={user} lang={lang} postId={thread} canPost={canPost} groupId={group.id} isAdmin={isAdmin} onBack={() => { setThread(null); void load(); }}
      onDeleted={() => { setThread(null); void load(); }} />;
  }

  const left = charsLeft(text, COMMUNITY_LIMITS.postChars);
  const now = Date.now();

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="btn btn-ghost !min-h-10 !px-2"><ArrowLeft className="h-4 w-4" />{t.allGroups}</button>
      <div>
        <h1 className="page-title">{group.name}</h1>
        <p className="page-sub">{GROUP_KIND_LABEL[group.kind][lang]} · {group.county} · {t.members(feed?.group.members ?? group.members)}</p>
        {group.description && <p className="mt-2 max-w-2xl text-sm text-charcoal-light">{group.description}</p>}
        {group.role === 'admin' && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sage"><ShieldCheck className="h-3.5 w-3.5" />{t.groupAdmin}</p>}
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-gold-border bg-gold-subtle p-3 text-sm text-charcoal"><Info className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" aria-hidden="true" />{t.rules}</p>

      {/* Outbreak alerts sit above the discussion: counts by area, never a farm (docs/community-groups-design.md). */}
      <OutbreakAlerts user={user} lang={lang} groupId={group.id} canPost={canPost} farmCounty={farmCounty} />

      {offline && <p role="status" className="flex items-center gap-2 rounded-xl bg-ivory-muted p-3 text-sm text-charcoal-light"><WifiOff className="h-4 w-4 shrink-0" />{t.offlineShowing}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {canPost ? (
        <section aria-labelledby="write-heading" className="card space-y-3 p-4">
          <h2 id="write-heading" className="text-base font-bold text-charcoal">{t.writeTitle}</h2>
          <textarea className="field min-h-24" rows={3} value={text} maxLength={COMMUNITY_LIMITS.postChars} placeholder={t.postPlaceholder} aria-label={t.writeTitle} onChange={(e) => setText(e.target.value)} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={`text-xs ${left < 40 ? 'font-semibold text-gold-600' : 'text-charcoal-muted'}`}>{t.charsLeft(left)}</span>
            <button type="button" className="btn btn-primary" disabled={busy || cleanText(text).length === 0 || left < 0} onClick={() => void post()}>{busy ? t.posting : t.post}</button>
          </div>
        </section>
      ) : <p className="rounded-xl bg-ivory p-3 text-sm text-charcoal-light">{t.readOnly}</p>}

      <section aria-labelledby="discussion-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="discussion-heading" className="font-display text-xl font-bold text-charcoal">{t.discussion}</h2>
          <div className="flex items-center gap-2 text-xs text-charcoal-muted">
            {updatedAt && <span>{t.updated(agoLabel(new Date(updatedAt).toISOString(), now, lang))}</span>}
            <button type="button" className="btn btn-ghost !min-h-10" onClick={() => void load()}><RefreshCw className="h-4 w-4" />{t.refresh}</button>
          </div>
        </div>
        {posts.length === 0 && !error && (feed || offline) && <p className="text-sm text-charcoal-muted">{t.noPosts}</p>}
        {!feed && !error && !offline && <p className="text-sm text-charcoal-muted">{t.loading}</p>}
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-charcoal">{p.authorName}{p.mine ? ` (${t.you})` : ''}</p>
                  <p className="text-xs text-charcoal-muted">{p.farmName ? `${p.farmName} · ` : ''}{agoLabel(p.createdAt, now, lang)}</p>
                </div>
                {p.mine && canPost && <button type="button" className="btn btn-ghost !min-h-10 !text-red-700" disabled={busy} onClick={() => remove(p)}><Trash2 className="h-4 w-4" />{t.remove}</button>}
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-base text-charcoal">{p.body}</p>
              <button type="button" className="btn btn-secondary mt-3 !min-h-10" onClick={() => setThread(p.id)}><MessageSquare className="h-4 w-4" />{t.replies(p.replyCount)}</button>
              <ItemActions lang={lang} groupId={group.id} item={{ postId: p.id }} mine={p.mine} isAdmin={isAdmin}
                onRemoved={() => { setPosts((list) => list.filter((x) => x.id !== p.id)); void load(); }} />
            </li>
          ))}
        </ul>
        {more && <button type="button" className="btn btn-secondary" disabled={loadingOlder} onClick={() => void older()}>{loadingOlder ? t.loadingOlder : t.olderPosts}</button>}
      </section>

      {isAdmin && <AdminReports lang={lang} groupId={group.id} />}
      {isAdmin && <AdminMembers lang={lang} groupId={group.id} />}

      {canPost && (
        <section className="space-y-2 border-t border-ivory-border pt-4">
          <label className="flex min-h-11 items-center gap-2 text-sm text-charcoal-light"><input type="checkbox" className="h-5 w-5 accent-[#345C4A]" checked={alsoDelete} onChange={(e) => setAlsoDelete(e.target.checked)} />{t.leaveDelete}</label>
          <button type="button" className="btn btn-ghost !text-red-700" disabled={busy || leaving} onClick={() => { setLeaving(true); void leave().finally(() => setLeaving(false)); }}><LogOut className="h-4 w-4" />{leaving ? t.leaving : t.leave}</button>
        </section>
      )}
    </div>
  );
}

function ThreadScreen({ user, lang, postId, canPost, groupId, isAdmin, onBack, onDeleted }: {
  user: UserAccount; lang: Lang; postId: string; canPost: boolean; groupId: string; isAdmin: boolean; onBack: () => void; onDeleted: () => void;
}) {
  const t = COMMUNITY_COPY[lang];
  const part = `thread_${postId}`;
  const [thread, setThread] = useState<PostThread | null>(() => readKept<PostThread>(user.id, part));
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await communityCall<PostThread>(`/api/community/posts/${postId}`);
      setThread(result); keep(user.id, part, result); setOffline(false); setError('');
    } catch (e) {
      if (e instanceof CommunityError && e.offline) setOffline(true);
      else setError(errorText(e, lang, t.loadError));
    }
  }, [postId, user.id, part, lang, t.loadError]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, REFRESH_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [load]);

  const act = async (work: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await work(); } catch (e) { setError(errorText(e, lang, t.actionError)); } finally { setBusy(false); }
  };

  const now = Date.now();
  const left = charsLeft(reply, COMMUNITY_LIMITS.replyChars);

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="btn btn-ghost !min-h-10 !px-2"><ArrowLeft className="h-4 w-4" />{t.backToGroup}</button>
      {offline && <p role="status" className="flex items-center gap-2 rounded-xl bg-ivory-muted p-3 text-sm text-charcoal-light"><WifiOff className="h-4 w-4 shrink-0" />{t.offlineShowing}</p>}
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!thread && !error && !offline && <p className="text-sm text-charcoal-muted">{t.loading}</p>}

      {thread && (
        <>
          <article className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal">{thread.post.authorName}{thread.post.mine ? ` (${t.you})` : ''}</p>
                <p className="text-xs text-charcoal-muted">{thread.post.farmName ? `${thread.post.farmName} · ` : ''}{agoLabel(thread.post.createdAt, now, lang)}</p>
              </div>
              {thread.post.mine && canPost && (
                <button type="button" className="btn btn-ghost !min-h-10 !text-red-700" disabled={busy}
                  onClick={() => { if (window.confirm(t.removePostConfirm)) void act(async () => { await communityCall(`/api/community/posts/${postId}`, { method: 'DELETE' }); forget(user.id, part); onDeleted(); }); }}>
                  <Trash2 className="h-4 w-4" />{t.remove}
                </button>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-base text-charcoal">{thread.post.body}</p>
            <ItemActions lang={lang} groupId={groupId} item={{ postId }} mine={thread.post.mine} isAdmin={isAdmin} onRemoved={() => { forget(user.id, part); onDeleted(); }} />
          </article>

          <section aria-label={t.replies(thread.replies.length)} className="space-y-3">
            {thread.replies.length === 0 && <p className="text-sm text-charcoal-muted">{t.noReplies}</p>}
            <ul className="space-y-3">
              {thread.replies.map((r) => (
                <li key={r.id} className="rounded-2xl border border-ivory-border bg-ivory p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-charcoal">{r.authorName}{r.mine ? ` (${t.you})` : ''}</p>
                      <p className="text-xs text-charcoal-muted">{r.farmName ? `${r.farmName} · ` : ''}{agoLabel(r.createdAt, now, lang)}</p>
                    </div>
                    {r.mine && canPost && (
                      <button type="button" className="btn btn-ghost !min-h-10 !text-red-700" disabled={busy}
                        onClick={() => { if (window.confirm(t.removeReplyConfirm)) void act(async () => { await communityCall(`/api/community/replies/${r.id}`, { method: 'DELETE' }); await load(); }); }}>
                        <Trash2 className="h-4 w-4" />{t.remove}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-base text-charcoal">{r.body}</p>
                  <ItemActions lang={lang} groupId={groupId} item={{ replyId: r.id }} mine={r.mine} isAdmin={isAdmin} onRemoved={() => void load()} />
                </li>
              ))}
            </ul>
          </section>

          {canPost ? (
            <section className="card space-y-3 p-4">
              <label htmlFor="reply-box" className="field-label">{t.replyLabel}</label>
              <textarea id="reply-box" className="field min-h-20" rows={2} value={reply} maxLength={COMMUNITY_LIMITS.replyChars} placeholder={t.replyPlaceholder} onChange={(e) => setReply(e.target.value)} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`text-xs ${left < 40 ? 'font-semibold text-gold-600' : 'text-charcoal-muted'}`}>{t.charsLeft(left)}</span>
                <button type="button" className="btn btn-primary" disabled={busy || cleanText(reply).length === 0 || left < 0}
                  onClick={() => void act(async () => { await communityCall(`/api/community/posts/${postId}/replies`, { method: 'POST', body: { body: cleanText(reply) } }); setReply(''); await load(); })}>
                  {busy ? t.sending : t.send}
                </button>
              </div>
            </section>
          ) : <p className="rounded-xl bg-ivory p-3 text-sm text-charcoal-light">{t.readOnly}</p>}
        </>
      )}
    </div>
  );
}
