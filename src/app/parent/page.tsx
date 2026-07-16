import { ParentDashboard } from "@/components/parent/ParentDashboard";
import { getGuardianSession } from "@/lib/auth/guardianSession";

export default async function ParentPage() {
  const guardian = await getGuardianSession();
  return <ParentDashboard onlineAccountConnected={Boolean(guardian)} />;
}
