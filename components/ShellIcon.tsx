import type { CSSProperties } from "react";
import type { IconKey } from "@/lib/types";
import { iconSrc } from "@/lib/icons";

/** A seaside/shell icon, rendered to fill its container with a soft shadow. */
export function ShellIcon({ icon, className, style }: { icon: IconKey; className?: string; style?: CSSProperties }) {
  return (
    <span data-icon={icon} className={className} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={iconSrc(icon)}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          filter: "drop-shadow(0 3px 4px #3a2a1022)",
        }}
      />
    </span>
  );
}
