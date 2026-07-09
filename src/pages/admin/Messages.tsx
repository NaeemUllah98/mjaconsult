import { PageHeader } from "@/components/shared/PageHeader";
import { AdminChatMonitor } from "@/components/shared/AdminChatMonitor";

export default function AdminMessages() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <PageHeader
        title="Conversations"
        subtitle="Oversight of every doctor–patient conversation on the platform (read-only)."
      />
      <div className="min-h-0 flex-1">
        <AdminChatMonitor />
      </div>
    </div>
  );
}
