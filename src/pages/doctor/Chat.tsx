import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChatPanel } from "@/components/shared/ChatPanel";

export default function DoctorChat() {
  const { user } = useAuth();
  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <PageHeader
        title="Messages"
        subtitle="Communicate securely with your patients inside the platform."
      />
      <div className="min-h-0 flex-1">
        <ChatPanel userId={user!.uid} field="doctorId" enforceWindow />
      </div>
    </div>
  );
}
