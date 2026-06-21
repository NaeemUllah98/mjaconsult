import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChatPanel } from "@/components/shared/ChatPanel";

export default function DoctorChat() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Communicate securely with your patients inside the platform."
      />
      <ChatPanel userId={user!.uid} field="doctorId" enforceWindow />
    </div>
  );
}
