"use client";

import { useRouter } from "next/navigation";
import type { Tape } from "@/lib/types";
import { DeviceFrame } from "./DeviceFrame";
import { ReceiverFlow } from "./ReceiverFlow";

export function ReceiverShell({
  tape,
  spotifyEnabled,
  spotifyConnected,
  appleEnabled,
  resumeAdd,
}: {
  tape: Tape;
  spotifyEnabled: boolean;
  spotifyConnected: boolean;
  appleEnabled: boolean;
  resumeAdd: boolean;
}) {
  const router = useRouter();
  return (
    <DeviceFrame role="receiver" onRole={(r) => r === "sender" && router.push("/")}>
      <ReceiverFlow
        tape={tape}
        spotifyEnabled={spotifyEnabled}
        spotifyConnected={spotifyConnected}
        appleEnabled={appleEnabled}
        resumeAdd={resumeAdd}
      />
    </DeviceFrame>
  );
}
