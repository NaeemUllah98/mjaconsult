import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChatPanel } from "@/components/shared/ChatPanel";

export default function PatientChat() {
  const { user } = useAuth();
  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle="Chat securely with your doctors — no phone numbers shared."
      />
      <ChatPanel userId={user!.uid} field="patientId" />
    </div>
  );
}
