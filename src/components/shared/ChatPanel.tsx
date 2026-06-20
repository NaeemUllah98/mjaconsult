import { useEffect, useRef, useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/Misc";
import {
  subscribeThreads,
  subscribeMessages,
  sendMessage,
  markThreadRead,
} from "@/lib/chat";
import { relativeTime } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { ChatMessage, ChatThread } from "@/types";

/**
 * Full two-pane chat. Works for both patient and doctor — pass the current
 * user's id, role field and the counterpart label.
 */
export function ChatPanel({
  userId,
  field,
}: {
  userId: string;
  field: "patientId" | "doctorId";
}) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => subscribeThreads(field, userId, setThreads), [field, userId]);

  // Auto-select first thread on desktop.
  useEffect(() => {
    if (!activeId && threads.length) setActiveId(threads[0].id);
  }, [threads, activeId]);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const counterpartName = (t: ChatThread) =>
    field === "patientId" ? t.doctorName : t.patientName;
  const counterpartPhoto = (t: ChatThread) =>
    field === "patientId" ? t.doctorPhotoURL : t.patientPhotoURL;

  return (
    <div className="grid h-[calc(100vh-12rem)] grid-cols-1 overflow-hidden rounded-2xl border border-surface-muted bg-surface shadow-card md:grid-cols-[300px_1fr]">
      {/* Threads list */}
      <div
        className={cn(
          "flex flex-col border-r border-surface-muted",
          active && "hidden md:flex",
        )}
      >
        <div className="border-b border-surface-muted px-4 py-3.5">
          <h2 className="font-display font-bold text-ink">Conversations</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<MessageSquare className="h-5 w-5" />}
                title="No conversations yet"
                description="Messages with your contacts will appear here."
                className="border-0 bg-transparent"
              />
            </div>
          ) : (
            threads.map((t) => {
              const unread = t.unread?.[userId] ?? 0;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveId(t.id);
                    markThreadRead(t.id, userId);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-surface-muted px-4 py-3 text-left transition hover:bg-surface-subtle",
                    activeId === t.id && "bg-brand-50/60",
                  )}
                >
                  <Avatar name={counterpartName(t)} src={counterpartPhoto(t)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">
                      {counterpartName(t)}
                    </p>
                    <p className="truncate text-xs text-ink-muted">
                      {t.lastMessage ?? "Say hello 👋"}
                    </p>
                  </div>
                  {unread > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Conversation */}
      {active ? (
        <Conversation
          thread={active}
          userId={userId}
          recipientId={
            field === "patientId" ? active.doctorId : active.patientId
          }
          counterpartName={counterpartName(active)}
          counterpartPhoto={counterpartPhoto(active)}
          onBack={() => setActiveId(null)}
        />
      ) : (
        <div className="hidden place-items-center md:grid">
          <EmptyState
            icon={<MessageSquare className="h-6 w-6" />}
            title="Select a conversation"
            description="Choose a contact on the left to start chatting."
            className="border-0 bg-transparent"
          />
        </div>
      )}
    </div>
  );
}

function Conversation({
  thread,
  userId,
  recipientId,
  counterpartName,
  counterpartPhoto,
  onBack,
}: {
  thread: ChatThread;
  userId: string;
  recipientId: string;
  counterpartName: string;
  counterpartPhoto?: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeMessages(thread.id, setMessages), [thread.id]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    markThreadRead(thread.id, userId);
  }, [messages, thread.id, userId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text;
    setText("");
    await sendMessage(thread.id, userId, recipientId, value);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-surface-muted px-4 py-3">
        <button
          onClick={onBack}
          className="text-sm font-medium text-brand-600 md:hidden"
        >
          ← Back
        </button>
        <Avatar name={counterpartName} src={counterpartPhoto} size="sm" />
        <div>
          <p className="font-semibold text-ink">{counterpartName}</p>
          <p className="text-xs text-ink-muted">Secure in-app chat</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-surface-subtle px-4 py-4">
        {messages.map((m) => {
          const mine = m.senderId === userId;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-soft",
                  mine
                    ? "rounded-br-md bg-brand-gradient text-white"
                    : "rounded-bl-md bg-surface text-ink",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    mine ? "text-brand-100" : "text-ink-muted",
                  )}
                >
                  {relativeTime(m.createdAt ?? null)}
                </p>
              </div>
            </motion.div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-surface-muted bg-surface px-3 py-3"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="input-base flex-1"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow transition active:scale-95 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
