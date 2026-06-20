import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Search, Eye, Stethoscope, User } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Misc";
import { subscribeAllThreads, subscribeMessages } from "@/lib/chat";
import { relativeTime } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { ChatMessage, ChatThread } from "@/types";

/**
 * Admin oversight view: lists every doctor↔patient conversation and shows the
 * full transcript. Strictly READ-ONLY — admins observe, they don't send.
 */
export function AdminChatMonitor() {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => subscribeAllThreads(setThreads), []);

  const filtered = useMemo(
    () =>
      threads.filter(
        (t) =>
          !q ||
          t.doctorName.toLowerCase().includes(q.toLowerCase()) ||
          t.patientName.toLowerCase().includes(q.toLowerCase()),
      ),
    [threads, q],
  );

  useEffect(() => {
    if (!activeId && filtered.length) setActiveId(filtered[0].id);
  }, [filtered, activeId]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  return (
    <div className="grid h-[calc(100vh-15rem)] grid-cols-1 overflow-hidden rounded-2xl border border-surface-muted bg-surface shadow-card md:grid-cols-[320px_1fr]">
      {/* Threads list */}
      <div className={cn("flex flex-col border-r border-surface-muted", active && "hidden md:flex")}>
        <div className="border-b border-surface-muted p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by doctor or patient…"
              className="input-base pl-9 text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={<MessageSquare className="h-5 w-5" />}
                title="No conversations"
                description="Doctor–patient chats will appear here."
                className="border-0 bg-transparent"
              />
            </div>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b border-surface-muted px-4 py-3 text-left transition hover:bg-surface-subtle",
                  activeId === t.id && "bg-brand-50/60",
                )}
              >
                <div className="flex -space-x-2">
                  <Avatar name={t.doctorName} src={t.doctorPhotoURL} size="sm" ring />
                  <Avatar name={t.patientName} src={t.patientPhotoURL} size="sm" ring />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {t.doctorName}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    with {t.patientName}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-ink-muted">
                  {relativeTime(t.updatedAt ?? null)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Transcript */}
      {active ? (
        <Transcript thread={active} onBack={() => setActiveId(null)} />
      ) : (
        <div className="hidden place-items-center md:grid">
          <EmptyState
            icon={<Eye className="h-6 w-6" />}
            title="Select a conversation"
            description="Pick a chat on the left to review the full transcript."
            className="border-0 bg-transparent"
          />
        </div>
      )}
    </div>
  );
}

function Transcript({
  thread,
  onBack,
}: {
  thread: ChatThread;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeMessages(thread.id, setMessages), [thread.id]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-surface-muted px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-sm font-medium text-brand-600 md:hidden">
            ← Back
          </button>
          <div className="flex -space-x-2">
            <Avatar name={thread.doctorName} src={thread.doctorPhotoURL} size="sm" ring />
            <Avatar name={thread.patientName} src={thread.patientPhotoURL} size="sm" ring />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">
              {thread.doctorName} <span className="text-ink-muted">↔</span>{" "}
              {thread.patientName}
            </p>
            <p className="text-xs text-ink-muted">{messages.length} messages</p>
          </div>
        </div>
        <Badge tone="purple" dot>
          <Eye className="mr-0.5 h-3 w-3" /> Read-only
        </Badge>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-b border-surface-muted bg-surface-subtle px-4 py-2 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
          <Stethoscope className="h-3.5 w-3.5" /> Doctor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <User className="h-3.5 w-3.5" /> Patient
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-surface-subtle px-4 py-4">
        {messages.map((m) => {
          const isDoctor = m.senderId === thread.doctorId;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", isDoctor ? "justify-start" : "justify-end")}
            >
              <div className="max-w-[78%]">
                <p
                  className={cn(
                    "mb-0.5 text-[11px] font-medium",
                    isDoctor ? "text-brand-600" : "text-right text-ink-muted",
                  )}
                >
                  {isDoctor ? thread.doctorName : thread.patientName}
                </p>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm shadow-soft",
                    isDoctor
                      ? "rounded-bl-md bg-brand-gradient text-white"
                      : "rounded-br-md bg-surface text-ink",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p
                    className={cn(
                      "mt-1 text-[10px]",
                      isDoctor ? "text-brand-100" : "text-ink-muted",
                    )}
                  >
                    {relativeTime(m.createdAt ?? null)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-muted">
            No messages in this conversation yet.
          </p>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
