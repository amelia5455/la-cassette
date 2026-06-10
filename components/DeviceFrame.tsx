"use client";

import type { ReactNode } from "react";

type Role = "sender" | "receiver";

/** The ~430px device shell: logo bar, role toggle, stage, footer. */
export function DeviceFrame({
  role,
  onRole,
  children,
}: {
  role: Role;
  onRole?: (role: Role) => void;
  children: ReactNode;
}) {
  return (
    <div className="device">
      <div className="bar">
        <div className="logo">La Cassette</div>
        <div className="role">
          <button className={role === "sender" ? "on" : ""} onClick={() => onRole?.("sender")}>
            sender
          </button>
          <button className={role === "receiver" ? "on" : ""} onClick={() => onRole?.("receiver")}>
            receiver
          </button>
        </div>
      </div>
      <div className="stage">{children}</div>
      <div className="footer">
        <span>
          la cassette<b>.v0</b>
        </span>
        <span>
          <b>{role}</b> view
        </span>
      </div>
    </div>
  );
}
