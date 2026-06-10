"use client";

import { useEffect, useState } from "react";
import type { Tape } from "@/lib/types";
import { DeviceFrame } from "@/components/DeviceFrame";
import { SenderFlow } from "@/components/SenderFlow";
import { ReceiverFlow } from "@/components/ReceiverFlow";

type Role = "sender" | "receiver";

export default function Home() {
  const [role, setRole] = useState<Role>("sender");
  const [previewTape, setPreviewTape] = useState<Tape | null>(null);
  const [status, setStatus] = useState({ spotifyEnabled: false, spotifyConnected: false, appleEnabled: false });

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) =>
        setStatus({
          spotifyEnabled: s.spotify.enabled,
          spotifyConnected: s.spotify.connected,
          appleEnabled: s.apple.enabled,
        }),
      )
      .catch(() => {});
  }, []);

  function changeRole(next: Role) {
    // The receiver view only makes sense once a tape exists.
    if (next === "receiver" && !previewTape) return;
    setRole(next);
  }

  return (
    <DeviceFrame role={role} onRole={changeRole}>
      {role === "sender" || !previewTape ? (
        <SenderFlow
          onTapeCreated={setPreviewTape}
          onPreviewReceiver={() => setRole("receiver")}
        />
      ) : (
        <ReceiverFlow
          tape={previewTape}
          spotifyEnabled={status.spotifyEnabled}
          spotifyConnected={status.spotifyConnected}
          appleEnabled={status.appleEnabled}
        />
      )}
    </DeviceFrame>
  );
}
