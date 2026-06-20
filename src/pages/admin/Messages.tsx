import { PageHeader } from "@/components/shared/PageHeader";
import { AdminChatMonitor } from "@/components/shared/AdminChatMonitor";

export default function AdminMessages() {
  return (
    <div>
      <PageHeader
        title="Conversations"
        subtitle="Oversight of every doctor–patient conversation on the platform (read-only)."
      />
      <AdminChatMonitor />
    </div>
  );
}
