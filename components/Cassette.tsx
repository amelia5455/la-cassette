import type { IconKey } from "@/lib/types";
import { ShellIcon } from "./ShellIcon";

interface CassetteProps {
  title: string;
  color: string;
  /** Shown on the label as "for you · <from>". */
  from: string;
  side?: string;
  playing?: boolean;
  /** Render the peelable sealed wrapper over the cassette. */
  sealed?: boolean;
  /** When true (with sealed), the wrapper peels away. */
  peeled?: boolean;
  onPeel?: () => void;
  /** Icon shown on the wrapper's sticker. */
  stickerIcon?: IconKey;
}

/** The cassette object — pure CSS, matching the prototype exactly. */
export function Cassette({
  title,
  color,
  from,
  side = "A",
  playing = false,
  sealed = false,
  peeled = false,
  onPeel,
  stickerIcon = "starfish2",
}: CassetteProps) {
  return (
    <div className={`cassette-wrap${sealed && peeled ? " peeled" : ""}`}>
      <div className={`cassette${playing ? " playing" : ""}`}>
        <div className="screws">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="lab">
          <div className="stripe" style={{ background: color }} />
          <div className="ttl">{title}</div>
          <div className="frm">for you · {from}</div>
          <div className="side">{side}</div>
        </div>
        <div className="bridge" />
        <div className="win">
          <div className="reel" />
          <div className="reel" />
        </div>
        {sealed && (
          <div className="wrap" onClick={onPeel} role="button" tabIndex={0} aria-label="Peel to open">
            <div className="sticker">
              <ShellIcon icon={stickerIcon} style={{ display: "block", width: "100%", height: "100%" }} />
            </div>
            <span className="seal">peel to open</span>
          </div>
        )}
      </div>
    </div>
  );
}
