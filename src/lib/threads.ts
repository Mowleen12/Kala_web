import { supabase as supabaseClient, isSupabaseConfigured } from './supabase';

// isDbReady() gates every live call; supabase.ts resolves the client at module
// load, so this non-null alias is safe even when the export itself is null.
const supabase = supabaseClient!;
import { AuthUser, Message, MessageSenderRole, Thread } from '../types';
import { USER_MONTHLY_BYTES, remaining } from './limits';

export interface SendMessageInput {
  threadId: string;
  sender: AuthUser;
  senderRole: MessageSenderRole;
  body?: string;
  media?: { url: string; publicId: string; type: 'image' | 'video'; bytes: number } | null;
  clientId: string;
}

export interface Budget {
  usedBytes: number;
  remainingBytes: number;
}

/* -------------------------------------------------------------------------- */
/* Row mapping — the only place snake_case is allowed                          */
/* -------------------------------------------------------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
const rowToThread = (r: any): Thread => ({
  id: r.id,
  opportunityId: r.opportunity_id,
  opportunityTitle: r.opportunity_title,
  artistId: r.artist_id,
  artistName: r.artist_name,
  artistAvatar: r.artist_avatar,
  organiserId: r.organiser_id,
  organiserName: r.organiser_name,
  organiserAvatar: r.organiser_avatar,
  artistLastReadAt: r.artist_last_read_at,
  organiserLastReadAt: r.organiser_last_read_at,
  lastMessageAt: r.last_message_at,
  createdAt: r.created_at,
});

const rowToMessage = (r: any): Message => ({
  id: r.id,
  threadId: r.thread_id,
  senderId: r.sender_id,
  senderRole: r.sender_role,
  body: r.body,
  mediaUrl: r.media_url,
  mediaPublicId: r.media_public_id,
  mediaType: r.media_type,
  mediaBytes: r.media_bytes,
  createdAt: r.created_at,
});

/** Spec §7: map raw Postgres errors onto copy the user can act on. */
function friendlyError(raw: string | undefined | null): string {
  const msg = raw || '';
  if (msg.includes('MONTHLY_BUDGET_EXCEEDED')) {
    return 'Monthly upload budget reached — you have used your 100 MB for this month.';
  }
  if (msg.includes('THREAD_MEDIA_CAP')) {
    return 'This thread already holds the maximum of 20 media items.';
  }
  if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return 'That message was already sent.';
  }
  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return "You can't send to this thread.";
  }
  if (msg.includes('paused') || msg.includes('PGRST301')) {
    return 'Project paused after inactivity — wake it in the Supabase dashboard.';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Network error — check your connection and try again.';
  }
  return 'Something went wrong sending that. Please try again.';
}

/* -------------------------------------------------------------------------- */
/* Capability probe (Global Constraints "Fallback mode")                        */
/* -------------------------------------------------------------------------- */

let tablesOk: boolean | null = null; // cached per page load; flip needs a reload

/** Live mode only when BOTH hold: a Supabase session (otherwise auth.uid() is
 *  NULL and RLS rejects every write) and the migrated tables exist. */
export async function isDbReady(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return false;
  if (tablesOk === null) {
    const { error } = await supabase.from('threads').select('id', { head: true });
    if (!error) tablesOk = true;
    else if (/does not exist|schema cache/i.test(error.message)) tablesOk = false;
    else return false; // transient (paused project, network): don't cache, retry next call
  }
  return tablesOk;
}

const localThreadById = (id: string): Thread | undefined =>
  [...localThreads.values()].find((t) => t.id === id);

const sameMonth = (iso: string): boolean => {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

/* -------------------------------------------------------------------------- */
/* Profile bootstrap (spec §4)                                                  */
/* -------------------------------------------------------------------------- */

export async function ensureProfile(user: AuthUser): Promise<void> {
  if (!(await isDbReady())) return;
  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    role: user.role === 'organiser' ? 'organiser' : 'artist',
    display_name: user.name,
    avatar_url: user.avatarUrl || user.avatar || null,
    updated_at: new Date().toISOString(),
  });
  if (error) console.warn('[threads] ensureProfile:', error.message);
}

/* -------------------------------------------------------------------------- */
/* Budget queries (spec §5 "What the meters can actually show")                */
/* -------------------------------------------------------------------------- */

const monthStartIso = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};

export async function getStorageUsage(): Promise<{ storageBytes: number; monthBytes: number }> {
  if (!(await isDbReady())) {
    const all = [...localMessages.values()].flat();
    const monthBytes = all
      .filter((m) => sameMonth(m.createdAt))
      .reduce((s, m) => s + (m.mediaBytes || 0), 0);
    return { storageBytes: all.reduce((s, m) => s + (m.mediaBytes || 0), 0), monthBytes };
  }

  const sum = async (from: string | null): Promise<number> => {
    let query = supabase.from('messages').select('media_bytes').not('media_bytes', 'is', null);
    if (from) query = query.gte('created_at', from);
    const { data, error } = await query;
    if (error || !data) {
      console.warn('[threads]', 'getStorageUsage', error);
      return 0;
    }
    return data.reduce((s, r) => s + (r.media_bytes || 0), 0);
  };

  const [storageBytes, monthBytes] = await Promise.all([sum(null), sum(monthStartIso())]);
  return { storageBytes, monthBytes };
}

export async function getBudget(user: AuthUser): Promise<Budget> {
  if (!(await isDbReady())) {
    const usedBytes = [...localMessages.values()]
      .flat()
      .filter((m) => m.senderId === user.id && sameMonth(m.createdAt))
      .reduce((s, m) => s + (m.mediaBytes || 0), 0);
    return { usedBytes, remainingBytes: remaining(usedBytes) };
  }
  const { data, error } = await supabase
    .from('messages')
    .select('media_bytes')
    .eq('sender_id', user.id)
    .gte('created_at', monthStartIso())
    .not('media_bytes', 'is', null);

  if (error || !data) {
    console.warn('[threads]', 'getBudget', error);
    return { usedBytes: 0, remainingBytes: USER_MONTHLY_BYTES };
  }
  const usedBytes = data.reduce((sum, r) => sum + (r.media_bytes || 0), 0);
  return { usedBytes, remainingBytes: remaining(usedBytes) };
}

/* -------------------------------------------------------------------------- */
/* Local fallback store (spec §6 "Fallback")                                    */
/* -------------------------------------------------------------------------- */

const localThreads = new Map<string, Thread>();
const localMessages = new Map<string, Message[]>();

const localThreadKey = (opportunityId: string, artistId: string) =>
  `${opportunityId}::${artistId}`;

/* -------------------------------------------------------------------------- */
/* Thread lifecycle                                                             */
/* -------------------------------------------------------------------------- */

export async function ensureArtistThread(input: {
  opportunityId: string;
  opportunityTitle: string;
  user: AuthUser;
  organiserName?: string;
  organiserAvatar?: string;
}): Promise<{ thread: Thread | null; error: string | null }> {
  const key = localThreadKey(input.opportunityId, input.user.id);

  if (!(await isDbReady())) {
    let thread = localThreads.get(key);
    if (!thread) {
      thread = {
        id: `local-${key}`,
        opportunityId: input.opportunityId,
        opportunityTitle: input.opportunityTitle,
        artistId: input.user.id,
        artistName: input.user.name,
        artistAvatar: input.user.avatarUrl || input.user.avatar || null,
        organiserId: null,
        organiserName: input.organiserName || null,
        organiserAvatar: input.organiserAvatar || null,
        artistLastReadAt: new Date().toISOString(),
        organiserLastReadAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      localThreads.set(key, thread);
      localMessages.set(thread.id, []);
    }
    return { thread, error: null };
  }

  const { data: existing, error: findError } = await supabase
    .from('threads')
    .select('*')
    .eq('opportunity_id', input.opportunityId)
    .eq('artist_id', input.user.id)
    .maybeSingle();

  if (findError) return { thread: null, error: friendlyError(findError.message) };
  if (existing) return { thread: rowToThread(existing), error: null };

  const { data: created, error: insertError } = await supabase
    .from('threads')
    .insert({
      opportunity_id: input.opportunityId,
      opportunity_title: input.opportunityTitle,
      artist_id: input.user.id,
      artist_name: input.user.name,
      artist_avatar: input.user.avatarUrl || input.user.avatar || null,
      organiser_name: input.organiserName || null,
      organiser_avatar: input.organiserAvatar || null,
    })
    .select()
    .single();

  if (insertError) {
    // unique (opportunity_id, artist_id) — another tab won the race.
    if (insertError.code === '23505') {
      const { data: raced } = await supabase
        .from('threads')
        .select('*')
        .eq('opportunity_id', input.opportunityId)
        .eq('artist_id', input.user.id)
        .maybeSingle();
      return { thread: raced ? rowToThread(raced) : null, error: null };
    }
    console.warn('[threads] ensureArtistThread:', insertError.message);
    return { thread: null, error: friendlyError(insertError.message) };
  }
  return { thread: rowToThread(created), error: null };
}

export async function findThread(opportunityId: string, artistId: string): Promise<Thread | null> {
  if (!(await isDbReady())) {
    return localThreads.get(localThreadKey(opportunityId, artistId)) || null;
  }
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('opportunity_id', opportunityId)
    .eq('artist_id', artistId)
    .maybeSingle();
  if (error || !data) {
    console.warn('[threads]', 'findThread', error);
    return null;
  }
  return rowToThread(data);
}

/** Every thread the caller can see; RLS scopes it (participant, or organiser
 *  viewing an unclaimed thread). Drives both list views' unread pills — without
 *  this the pills would have nothing to read. */
export async function fetchThreads(): Promise<Thread[]> {
  if (!(await isDbReady())) {
    return [...localThreads.values()];
  }
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .order('last_message_at', { ascending: false });
  if (error || !data) {
    console.warn('[threads]', 'fetchThreads', error);
    return [];
  }
  return data.map(rowToThread);
}

export async function claimThread(threadId: string, user: AuthUser): Promise<void> {
  if (!(await isDbReady())) {
    const t = localThreadById(threadId);
    if (t && !t.organiserId) {
      t.organiserId = user.id;
      t.organiserName = user.name;
      t.organiserAvatar = user.avatarUrl || user.avatar || null;
    }
    return;
  }
  const { error } = await supabase
    .from('threads')
    .update({ organiser_id: user.id, organiser_name: user.name, organiser_avatar: user.avatarUrl || user.avatar || null })
    .eq('id', threadId)
    .is('organiser_id', null);
  if (error) console.warn('[threads] claimThread:', error.message);
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                     */
/* -------------------------------------------------------------------------- */

export async function fetchMessages(
  threadId: string
): Promise<{ messages: Message[]; error: string | null }> {
  if (!(await isDbReady())) {
    return { messages: [...(localMessages.get(threadId) || [])], error: null };
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error || !data) {
    console.warn('[threads]', 'fetchMessages', error);
    return { messages: [], error: friendlyError(error?.message) };
  }
  return { messages: data.map(rowToMessage), error: null };
}

export async function sendMessage(
  input: SendMessageInput
): Promise<{ message: Message | null; error: string | null }> {
  const { threadId, sender, senderRole, body, media, clientId } = input;
  const trimmed = (body || '').trim();
  if (!trimmed && !media) return { message: null, error: 'Add a message or attach media.' };

  const row = {
    id: clientId, // client-generated: retry upserts instead of duplicating
    thread_id: threadId,
    sender_id: sender.id,
    sender_role: senderRole,
    body: trimmed || null,
    media_url: media?.url || null,
    media_public_id: media?.publicId || null,
    media_type: media?.type || null,
    media_bytes: media?.bytes || null,
    created_at: new Date().toISOString(),
  };

  if (!(await isDbReady())) {
    const message: Message = {
      id: row.id,
      threadId,
      senderId: sender.id,
      senderRole,
      body: row.body,
      mediaUrl: row.media_url,
      mediaPublicId: row.media_public_id,
      mediaType: row.media_type,
      mediaBytes: row.media_bytes,
      createdAt: row.created_at,
    };
    const list = localMessages.get(threadId) || [];
    list.push(message);
    localMessages.set(threadId, list);
    // No Postgres trigger here, so bump the thread by hand — without this the
    // unread pill would never light up in local mode.
    const t = localThreadById(threadId);
    if (t) t.lastMessageAt = message.createdAt;
    return { message, error: null };
  }

  const { data, error } = await supabase
    .from('messages')
    .upsert(row, { onConflict: 'id', ignoreDuplicates: true })
    .select()
    .maybeSingle();

  if (error) return { message: null, error: friendlyError(error.message) };
  if (!data) {
    // ignoreDuplicates swallowed it: the row already exists from a prior retry.
    return { message: rowToMessage(row), error: null };
  }
  return { message: rowToMessage(data), error: null };
}

export function subscribeThread(
  threadId: string,
  onMessage: (m: Message) => void,
  onStatus: (s: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'CLOSED') => void
): () => void {
  // Contract: callers gate on isDbReady() first — local mode has no realtime
  // (one browser, no server), so there is nothing to subscribe to here.

  if (!supabaseClient) {
    onStatus('CHANNEL_ERROR');
    return () => {};
  }

  const channel = supabase
    .channel(`thread:${threadId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
      (payload) => onMessage(rowToMessage(payload.new))
    )
    .subscribe((status) => {
      // TIMED_OUT is a dead socket with no event — surfacing it as an error is
      // what stops the chat looking fine while nothing arrives (spec §7).
      if (status === 'TIMED_OUT') onStatus('CHANNEL_ERROR');
      else if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        onStatus(status);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markRead(threadId: string, role: MessageSenderRole): Promise<void> {
  const column = role === 'artist' ? 'artist_last_read_at' : 'organiser_last_read_at';
  if (!(await isDbReady())) {
    const t = localThreadById(threadId);
    if (t) {
      if (role === 'artist') t.artistLastReadAt = new Date().toISOString();
      else t.organiserLastReadAt = new Date().toISOString();
    }
    return;
  }
  const { error } = await supabase
    .from('threads')
    .update({ [column]: new Date().toISOString() })
    .eq('id', threadId);
  if (error) console.warn('[threads] markRead:', error.message);
}

/** Boolean unread: thread has activity the caller has not seen. A count would
 *  need one grouped query per thread; the row already carries both timestamps. */
export function isUnread(thread: Thread, role: MessageSenderRole): boolean {
  const lastRead = role === 'artist' ? thread.artistLastReadAt : thread.organiserLastReadAt;
  return new Date(thread.lastMessageAt).getTime() > new Date(lastRead).getTime();
}
