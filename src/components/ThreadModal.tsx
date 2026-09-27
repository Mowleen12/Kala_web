import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { X, Send, AlertCircle, RotateCcw, MessageSquare, Video, Image as ImageIcon } from 'lucide-react';
import { AuthUser, Message, Thread } from '../types';
import {
  fetchMessages, sendMessage, subscribeThread, getBudget, isDbReady, SendMessageInput,
} from '../lib/threads';
import { USER_MONTHLY_BYTES, formatMB, maxBytesFor } from '../lib/limits';
import { isCloudinaryConfigured, getOptimizedCloudinaryUrl } from '../lib/cloudinary';
import { MediaUploader } from './MediaUploader';

const mergeWithLocal = (prev: Message[], fresh: Message[]): Message[] => {
  const fetchedIds = new Set(fresh.map((m) => m.id));
  const localOnly = prev.filter((m) => (m.pending || m.failed) && !fetchedIds.has(m.id));
  return [...fresh, ...localOnly];
};

export interface ThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  thread: Thread | null;
  currentUser: AuthUser;
}

export const ThreadModal: React.FC<ThreadModalProps> = ({
  isOpen, onClose, thread, currentUser,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaBytes, setMediaBytes] = useState(0);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaPublicId, setMediaPublicId] = useState('');
  const [budgetBytes, setBudgetBytes] = useState(USER_MONTHLY_BYTES);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [channelDown, setChannelDown] = useState(false);
  const [retryable, setRetryable] = useState<Message | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const senderRole = currentUser.role === 'organiser' ? 'organiser' : 'artist';

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  /* Load + subscribe while open. Unsubscribe on close (spec Â§6). */
  useEffect(() => {
    if (!isOpen || !thread) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const applyFetched = ({
      messages: fresh,
      error: loadError,
    }: Awaited<ReturnType<typeof fetchMessages>>) => {
      if (cancelled) return;
      if (loadError) {
        setError(loadError);
        return;
      }
      setError(null);
      setMessages((prev) => mergeWithLocal(prev, fresh));
      scrollToEnd();
    };

    const onFocus = () => {
      fetchMessages(thread.id).then(applyFetched);
    };
    window.addEventListener('focus', onFocus);

    (async () => {
      const [initial, budget, live] = await Promise.all([
        fetchMessages(thread.id),
        getBudget(currentUser),
        isDbReady(),
      ]);
      if (cancelled) return;
      if (initial.error) {
        setMessages([]);
        setError(initial.error);
      } else {
        setMessages(initial.messages);
        setError(null);
      }
      setBudgetBytes(budget.remainingBytes);
      scrollToEnd();
      if (!live) return; // local mode: no realtime (subscribeThread's contract)

      unsubscribe = subscribeThread(
        thread.id,
        (m) => {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          scrollToEnd();
        },
        (status) => {
          setChannelDown(status === 'CHANNEL_ERROR' || status === 'CLOSED');
          if (status === 'SUBSCRIBED') {
            fetchMessages(thread.id).then(applyFetched);
          }
        }
      );
      if (cancelled) {
        unsubscribe();
        unsubscribe = null;
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener('focus', onFocus);
      // mark-read is App's job (Task 7): it must finish before the thread list
      // is refetched on close, or the unread pill races the write and stays lit.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, thread?.id]);

  const handleSend = async () => {
    if (!thread) return;
    const body = draft.trim();
    if (!body && !mediaUrl) return;

    setSending(true);
    setError(null);

    // Budget was gated BEFORE upload via MediaUploader's beforeUpload prop â€”
    // a rejected insert must never orphan a Cloudinary asset that unsigned
    // presets cannot delete (spec Â§6 send path, step 1).
    let media: SendMessageInput['media'] = null;
    if (mediaUrl) {
      media = {
        url: mediaUrl,
        publicId: mediaPublicId || mediaUrl,
        type: mediaType || 'image',
        bytes: mediaBytes,
      };
    }

    const clientId = crypto.randomUUID();
    const optimistic: Message = {
      id: clientId,
      threadId: thread.id,
      senderId: currentUser.id,
      senderRole,
      body: body || null,
      mediaUrl: media?.url || null,
      mediaPublicId: media?.publicId || null,
      mediaType: media?.type || null,
      mediaBytes: media?.bytes || null,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setMediaUrl('');
    setMediaBytes(0);
    setMediaType(null);
    setMediaPublicId('');
    scrollToEnd();

    const { error: sendError } = await sendMessage({
      threadId: thread.id,
      sender: currentUser,
      senderRole,
      body,
      media,
      clientId,
    });

    setSending(false);

    if (sendError) {
      setError(sendError);
      setMessages((prev) =>
        prev.map((m) => (m.id === clientId ? { ...m, pending: false, failed: true } : m))
      );
      setRetryable(optimistic);
      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === clientId ? { ...m, pending: false, failed: false } : m))
    );
    setBudgetBytes((b) => Math.max(0, b - (media?.bytes || 0)));
  };

  const handleRetry = async () => {
    if (!retryable || !thread) return;
    setMessages((prev) => prev.filter((m) => m.id !== retryable.id));
    setDraft(retryable.body || '');
    if (retryable.mediaUrl) {
      setMediaUrl(retryable.mediaUrl);
      setMediaBytes(retryable.mediaBytes || 0);
      setMediaType(retryable.mediaType);
      setMediaPublicId(retryable.mediaPublicId || '');
    }
    setRetryable(null);
  };

  if (!isOpen || !thread) return null;

  const isArtist = currentUser.role === 'artist';
  const counterpartyName = isArtist
    ? thread.organiserName || 'Organiser'
    : thread.artistName || 'Artist';
  const counterpartyAvatar = isArtist ? thread.organiserAvatar : thread.artistAvatar;
  const previewMode = !isCloudinaryConfigured;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-[#EDE7DE] my-auto flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#FAF7F2] border-b border-[#EDE7DE] flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {counterpartyAvatar ? (
              <img
                src={counterpartyAvatar}
                alt={counterpartyName}
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FCEEE3] shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#FDEEE7] text-[#E45826] flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-zinc-900 truncate">{counterpartyName}</p>
              <p className="text-[11px] text-zinc-500 truncate">{thread.opportunityTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close conversation"
            className="w-8 h-8 rounded-full bg-white hover:bg-zinc-100 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview-mode banner (spec Â§6) */}
        {previewMode && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-[11px] font-semibold text-amber-800 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Preview mode â€” media won't reach the other person until Cloudinary is configured.</span>
          </div>
        )}

        {/* Realtime degraded */}
        {channelDown && (
          <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 text-[11px] font-semibold text-red-700 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Reconnecting â€” new messages will appear once the connection is back.</span>
          </div>
        )}

        {/* Message list */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-[220px]">
          {messages.length === 0 && !error && (
            <div className="text-center py-10 text-zinc-400 text-xs">
              No messages yet. Say hello, or send a photo or reel.
            </div>
          )}
          {messages.map((m) => {
            const mine = m.senderId === currentUser.id;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10, x: mine ? 14 : -14 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed break-words ${
                    mine
                      ? 'bg-[#E45826] text-white rounded-br-md'
                      : 'bg-zinc-100 text-zinc-800 rounded-bl-md'
                  }`}
                >
                  {m.mediaUrl && m.mediaType === 'video' && (
                    <video
                      src={getOptimizedCloudinaryUrl(m.mediaUrl, { width: 1280, quality: 'auto' })}
                      controls
                      preload="none"
                      className="w-full max-w-xs rounded-xl mb-2 bg-black"
                    />
                  )}
                  {m.mediaUrl && m.mediaType === 'image' && (
                    <img
                      src={getOptimizedCloudinaryUrl(m.mediaUrl, { width: 800, quality: 'auto' })}
                      alt=""
                      loading="lazy"
                      className="w-full max-w-xs rounded-xl mb-2"
                    />
                  )}
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}

                  <div className="flex items-center justify-end gap-2 mt-1 text-[10px] opacity-70">
                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {m.pending && <span>Sendingâ€¦</span>}
                    {m.failed && (
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-1 font-bold underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2.5 bg-red-50 border-t border-red-200 text-red-700 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Composer */}
        <div className="p-3 sm:p-4 border-t border-[#EDE7DE] bg-white shrink-0">
          <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-500 mb-2">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3 h-3" /> Image up to {formatMB(maxBytesFor(new File([], 'a.jpg', { type: 'image/jpeg' })))}
              <span className="text-zinc-300">Â·</span>
              <Video className="w-3 h-3" /> Video up to {formatMB(maxBytesFor(new File([], 'a.mp4', { type: 'video/mp4' })))}
            </span>
            <span className={budgetBytes < 20 * 1024 * 1024 ? 'text-amber-600' : 'text-emerald-600'}>
              {formatMB(budgetBytes)} left this month
            </span>
          </div>

          {/* One uploader serves both states: value empty â†’ drop zone,
              value set â†’ preview + Change/Remove (MediaUploader's own logic). */}
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0">
              <MediaUploader
                label=""
                description="Attach a photo or reel to this conversation"
                folder="kala-thread"
                resourceType="auto"
                value={mediaUrl}
                beforeUpload={(file) =>
                  file.size > budgetBytes
                    ? `Monthly upload budget reached â€” ${formatMB(budgetBytes)} of ${formatMB(USER_MONTHLY_BYTES)} left.`
                    : null
                }
                onChange={(url, res) => {
                  setMediaUrl(url);
                  setMediaBytes(res?.bytes || 0);
                  setMediaType(res?.resourceType === 'video' ? 'video' : 'image');
                  setMediaPublicId(res?.publicId || url);
                }}
                onRemove={() => {
                  setMediaUrl('');
                  setMediaBytes(0);
                  setMediaType(null);
                  setMediaPublicId('');
                }}
              />
            </div>
          </div>

          <div className="flex items-end gap-2 mt-2">
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Write a messageâ€¦"
              className="flex-1 min-w-0 bg-[#FAF8F5] border border-[#E5E0D6] focus:border-[#E45826] focus:bg-white rounded-xl px-3 py-2 text-xs text-zinc-900 outline-none transition-all resize-none"
            />
            <button
              onClick={handleSend}
              disabled={sending || (!draft.trim() && !mediaUrl)}
              aria-label="Send message"
              className="w-10 h-10 rounded-xl bg-[#E45826] hover:bg-[#D44716] text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
