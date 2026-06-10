"use client";

import { useEffect, useRef, useState } from "react";
import type { Tape } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";
import { Cassette } from "./Cassette";
import { ShellIcon } from "./ShellIcon";
import { authorizeApple } from "@/lib/musickit";

type Screen = "wrapped" | "connect" | "done";

interface Props {
  tape: Tape;
  spotifyEnabled: boolean;
  spotifyConnected: boolean;
  appleEnabled: boolean;
  /** When true, the flow resumes after a Spotify receiver OAuth round-trip. */
  resumeAdd?: boolean;
}

export function ReceiverFlow({ tape, spotifyEnabled, spotifyConnected, appleEnabled, resumeAdd }: Props) {
  const [screen, setScreen] = useState<Screen>(resumeAdd ? "connect" : "wrapped");
  const [peeled, setPeeled] = useState(resumeAdd);
  const [filing, setFiling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const started = useRef(false);

  const target = PLATFORMS[tape.target];
  const targetEnabled = tape.target === "spotify" ? spotifyEnabled : appleEnabled;
  const added = tape.tracks.filter((t) => t.matched).length;
  const missed = tape.totalCount - added;

  function peel() {
    if (peeled) return;
    setPeeled(true);
    window.setTimeout(() => setScreen("connect"), 920);
  }

  async function fileTape() {
    setFiling(true);
    setErrorMsg(null);
    try {
      if (tape.target === "spotify") {
        if (spotifyEnabled && !spotifyConnected) {
          // Send the receiver through OAuth, then resume here.
          window.location.href = `/api/spotify/login?role=receiver&returnTo=${encodeURIComponent(
            `/t/${tape.id}?add=1`,
          )}`;
          return;
        }
        const res = await fetch("/api/spotify/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tapeId: tape.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "create_failed");
        if (data.url) setCreatedUrl(data.url);
      } else {
        let musicUserToken: string | undefined;
        if (appleEnabled) {
          musicUserToken = await authorizeApple();
        }
        const res = await fetch("/api/apple/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tapeId: tape.id, musicUserToken }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "create_failed");
        // Apple library playlists open in the native Music app library.
        if (appleEnabled) setCreatedUrl("https://music.apple.com/library/recently-added");
      }
      setScreen("done");
    } catch (err) {
      setErrorMsg("Couldn't file the tape. Please try again.");
    } finally {
      setFiling(false);
    }
  }

  // Resume after Spotify receiver OAuth.
  useEffect(() => {
    if (resumeAdd && !started.current) {
      started.current = true;
      void fileTape();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeAdd]);

  return (
    <>
      {/* ── wrapped ─────────────────────────────────────────── */}
      <section className={`screen${screen === "wrapped" ? " show" : ""}`}>
        <div className="cluster">
          <span className="shell-md">
            <ShellIcon icon="scallop2" />
          </span>
          <span className="shell-md">
            <ShellIcon icon="oyster2" />
          </span>
          <span className="shell-md">
            <ShellIcon icon="starfish2" />
          </span>
        </div>
        <div className="eyebrow">
          <span className="br">[</span> for you <span className="br">]</span>
        </div>
        <h1 style={{ marginBottom: 32 }}>
          A mixtape
          <br />
          for you.
        </h1>
        <Cassette
          title={tape.title}
          color={tape.color}
          from={tape.from}
          sealed
          peeled={peeled}
          onPeel={peel}
          stickerIcon={tape.icon}
        />
        <p className="tiny">tap the wrapper to peel it</p>
      </section>

      {/* ── connect ─────────────────────────────────────────── */}
      <section className={`screen${screen === "connect" ? " show" : ""}`}>
        <div className="eyebrow">
          <span className="br">[</span> for you <span className="br">]</span>
        </div>
        <h1>
          Add it to
          <br />
          <span>{target.name}</span>
        </h1>
        <p className="sub">Connect {target.name} and this gets added as a new playlist in your library.</p>
        {tape.note ? <div className="pcard">{tape.note}</div> : null}
        <div className="stack">
          <button className="btn coral" onClick={fileTape} disabled={filing}>
            {filing
              ? "Filing…"
              : tape.target === "spotify" && targetEnabled && spotifyConnected
                ? `Add to ${target.name}`
                : `Connect ${target.name}`}
          </button>
        </div>
        {errorMsg && <p className="tiny" style={{ color: "var(--coral)" }}>{errorMsg}</p>}
        <div className="brandrow">
          <span className={tape.target === "apple" ? "dot dotA" : "dot"} />{" "}
          {targetEnabled ? <>adding to {target.low}</> : <>demo · nothing leaves this screen</>}
        </div>
      </section>

      {/* ── done ────────────────────────────────────────────── */}
      <section className={`screen${screen === "done" ? " show" : ""}`}>
        <div className="eyebrow">
          <span className="br">[</span> side a <span className="br">]</span> now playing
        </div>
        <Cassette title={tape.title} color={tape.color} from={tape.from} playing />
        <div className="added">✓ added as a playlist</div>
        <div className="tracks">
          {tape.tracks.map((t, i) => (
            <div className="trk" key={i} style={{ animationDelay: `${i * 0.06}s` }}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <span className="info">
                <div className="t">{t.title}</div>
                <div className="a">{t.artist}</div>
              </span>
              {t.matched ? (
                <span className="badge ok">added</span>
              ) : (
                <span className="badge no">not on {tape.target === "apple" ? "apple" : "spotify"}</span>
              )}
            </div>
          ))}
        </div>
        <div className="tiny">
          {missed > 0 ? (
            <>
              {added} of {tape.totalCount} tracks added to the playlist. <b>{missed}</b> isn&apos;t on {target.name}.
            </>
          ) : (
            <>{added} tracks added to the playlist.</>
          )}
        </div>
        {createdUrl && (
          <div className="stack">
            <a
              className={`btn${tape.target === "apple" ? " coral" : ""}`}
              href={createdUrl}
              target="_blank"
              rel="noreferrer"
              style={{ textAlign: "center", textDecoration: "none", display: "block" }}
            >
              Open in {target.name} →
            </a>
          </div>
        )}
      </section>
    </>
  );
}
