import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  MessageSquare,
  Paperclip,
  Loader2,
  FileText,
  Lock,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/Misc";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  subscribeThreads,
  subscribeMessages,
  sendMessage,
  markThreadRead,
} from "@/lib/chat";
import { uploadFile, optimized } from "@/lib/cloudinary";
import { listAppointmentsFor } from "@/lib/api";
import {
  appointmentWindow,
  isAppointmentLive,
  appointmentEnded,
} from "@/utils/appointment";
import { relativeTime, formatDate, formatTime } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { Appointment, ChatMessage, ChatThread } from "@/types";

/** Whether messaging is open for a conversation, and why if it isn't. */
type WindowState =
  | { kind: "open" }
  | { kind: "before"; at: Date }
  | { kind: "over" }
  | { kind: "none" };

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Full two-pane chat. Works for both patient and doctor — pass the current
 * user's id and role field. When `enforceWindow` is set, messaging is only
 * enabled during a live (paid, in-progress) appointment slot.
 */
export function ChatPanel({
  userId,
  field,
  enforceWindow = false,
}: {
  userId: string;
  field: "patientId" | "doctorId";
  enforceWindow?: boolean;
}) {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const now = useNow();

  useEffect(() => subscribeThreads(field, userId, setThreads), [field, userId]);

  useEffect(() => {
    if (!enforceWindow) return;
    let alive = true;
    const load = () =>
      listAppointmentsFor(field, userId).then((a) => alive && setAppointments(a));
    load();
    // Re-pull periodically so a just-started slot unlocks chat without a reload.
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [enforceWindow, field, userId]);

  // Auto-select first thread on desktop.
  useEffect(() => {
    if (!activeId && threads.length) setActiveId(threads[0].id);
  }, [threads, activeId]);

  const active = threads.find((t) => t.id === activeId) ?? null;
  const counterpartName = (t: ChatThread) =>
    field === "patientId" ? t.doctorName : t.patientName;
  const counterpartPhoto = (t: ChatThread) =>
    field === "patientId" ? t.doctorPhotoURL : t.patientPhotoURL;
  const counterpartId = (t: ChatThread) =>
    field === "patientId" ? t.doctorId : t.patientId;

  /** Work out whether messaging is open for a given counterpart right now. */
  function windowFor(otherId: string): WindowState {
    if (!enforceWindow) return { kind: "open" };
    const mine = appointments.filter((a) =>
      field === "patientId" ? a.doctorId === otherId : a.patientId === otherId,
    );
    if (mine.some((a) => isAppointmentLive(a, now))) return { kind: "open" };
    // Soonest upcoming (paid, not cancelled) appointment → "opens at".
    const upcoming = mine
      .filter(
        (a) =>
          a.status !== "cancelled" &&
          !appointmentEnded(a, now) &&
          (a.paymentStatus === "verified" ||
            a.paymentStatus === "free" ||
            a.isFree),
      )
      .map((a) => appointmentWindow(a).start)
      .sort((x, y) => x.getTime() - y.getTime());
    if (upcoming.length) return { kind: "before", at: upcoming[0] };
    if (mine.some((a) => appointmentEnded(a, now))) return { kind: "over" };
    return { kind: "none" };
  }

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
          recipientId={counterpartId(active)}
          counterpartName={counterpartName(active)}
          counterpartPhoto={counterpartPhoto(active)}
          windowState={windowFor(counterpartId(active))}
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
  windowState,
  onBack,
}: {
  thread: ChatThread;
  userId: string;
  recipientId: string;
  counterpartName: string;
  counterpartPhoto?: string;
  windowState: WindowState;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [overPopup, setOverPopup] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  const canSend = windowState.kind === "open";

  useEffect(() => subscribeMessages(thread.id, setMessages), [thread.id]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    markThreadRead(thread.id, userId);
  }, [messages, thread.id, userId]);

  // When a live conversation crosses its end time, alert the user once.
  useEffect(() => {
    if (windowState.kind === "open") {
      wasOpen.current = true;
    } else if (windowState.kind === "over" && wasOpen.current) {
      wasOpen.current = false;
      setOverPopup(true);
    }
  }, [windowState.kind]);

  // Reset the per-thread "was open" tracker when switching conversations.
  useEffect(() => {
    wasOpen.current = windowState.kind === "open";
    setOverPopup(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    const value = text;
    setText("");
    await sendMessage(thread.id, userId, recipientId, value);
  }

  async function handleFile(file: File) {
    if (!canSend) return;
    setUploading(true);
    try {
      const res = await uploadFile(file, "reports");
      await sendMessage(thread.id, userId, recipientId, "", res);
      toast.success("Report shared");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not share the file");
    } finally {
      setUploading(false);
    }
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
        <div className="flex-1">
          <p className="font-semibold text-ink">{counterpartName}</p>
          <p className="text-xs text-ink-muted">Secure in-app chat</p>
        </div>
        {windowState.kind === "open" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live now
          </span>
        )}
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
                {m.attachmentUrl && (
                  <Attachment message={m} mine={mine} />
                )}
                {m.text && (
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                )}
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

      {canSend ? (
        <form
          onSubmit={submit}
          className="flex items-center gap-2 border-t border-surface-muted bg-surface px-3 py-3"
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Share a report (image or PDF)"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-ink-soft transition hover:bg-surface-muted disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </button>
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
      ) : (
        <LockedComposer windowState={windowState} />
      )}

      <Modal
        open={overPopup}
        onClose={() => setOverPopup(false)}
        title="Appointment time is over"
        description="Your consultation slot has ended, so messaging is now closed for this appointment."
        footer={
          <Button fullWidth onClick={() => setOverPopup(false)}>
            Got it
          </Button>
        }
      >
        <div className="flex items-center gap-3 rounded-xl bg-surface-subtle p-4 text-sm text-ink-soft">
          <Clock className="h-5 w-5 text-amber-500" />
          Book a new appointment to chat with {counterpartName} again.
        </div>
      </Modal>
    </div>
  );
}

function LockedComposer({ windowState }: { windowState: WindowState }) {
  let message = "Messaging is available only during your appointment slot.";
  if (windowState.kind === "before") {
    message = `Messaging opens during your appointment on ${formatDate(
      windowState.at,
    )} at ${formatTime(
      `${String(windowState.at.getHours()).padStart(2, "0")}:${String(
        windowState.at.getMinutes(),
      ).padStart(2, "0")}`,
    )}.`;
  } else if (windowState.kind === "over") {
    message = "This appointment has ended. Messaging is closed.";
  }
  return (
    <div className="flex items-center gap-3 border-t border-surface-muted bg-surface px-4 py-4 text-sm text-ink-muted">
      <Lock className="h-4 w-4 shrink-0 text-ink-soft" />
      <span>{message}</span>
    </div>
  );
}

function Attachment({
  message,
  mine,
}: {
  message: ChatMessage;
  mine: boolean;
}) {
  if (message.attachmentType === "image") {
    return (
      <a
        href={message.attachmentUrl}
        target="_blank"
        rel="noreferrer"
        className="mb-1.5 block"
      >
        <img
          src={optimized(message.attachmentUrl!, 320)}
          alt={message.attachmentName ?? "Shared report"}
          className="max-h-56 w-full rounded-lg object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={message.attachmentUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "mb-1.5 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
        mine
          ? "bg-white/15 text-white hover:bg-white/25"
          : "bg-surface-subtle text-ink hover:bg-surface-muted",
      )}
    >
      <FileText className="h-5 w-5 shrink-0" />
      <span className="truncate">{message.attachmentName ?? "Report"}</span>
    </a>
  );
}
