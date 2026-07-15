import { OnlineRoomClient } from "@/components/room/OnlineRoomClient";
import { getGuardianSession } from "@/lib/auth/guardianSession";

export default async function RoomPage() {
  const guardian = await getGuardianSession();
  return <OnlineRoomClient accountConnected={Boolean(guardian)} />;
}
