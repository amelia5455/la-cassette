"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchedTrack, Playlist, Service, SourceTrack, Tape, IconKey } from "@/lib/types";
import { PLATFORMS } from "@/lib/types";
import { DEMO_PLAYLISTS, demoTracksFor } from "@/lib/demo";
import { ICON_KEYS } from "@/lib/icons";
import { Cassette } from "./Cassette";
import { ShellIcon } from "./ShellIcon";
import { authorizeApple, appleLibraryPlaylists, applePlaylistTracks } from "@/lib/musickit";

type Screen = "connect" | "pick" | "convert" | "compose" | "sent";

const SWATCHES = ["#e26a48", "#34539f", "#2f7c86", "#e7c044", "#256a4f"];
const ICON_CHOICES: IconKey[] = ["starfish2", "scallop", "conch", "wave", "oyster", "scallop2", "oyster2", "starfish"];

interface Status {
  spotifyEnabled: boolean;
  spotifyConnected: boolean;
  spotifyName: string | null;
  appleEnabled: boolean;
}

interface ManifestLine {
  ok: boolean;
  title: string;
}

export function SenderFlow({
  onTapeCreated,
  onPreviewReceiver,
}: {
  onTapeCreated: (tape: Tape) => void;
  onPreviewReceiver: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("connect");
  const [source, setSource] = useState<Service>("spotify");
  const target: Service = source === "spotify" ? "apple" : "spotify";

  const [status, setStatus] = useState<Status>({
    spotifyEnabled: false,
    spotifyConnected: false,
    spotifyName: null,
    appleEnabled: false,
  });
  // Apple has no server session — track its authorization client-side.
  const [appleConnected, setAppleConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playlistError, setPlaylistError] = useState<string | null>(null);
  const [matched, setMatched] = useState<MatchedTrack[]>([]);

  // convert animation
  const [manifestLines, setManifestLines] = useState<ManifestLine[]>([]);
  const [matchPct, setMatchPct] = useState(0);
  const [matchLabel, setMatchLabel] = useState("matching...");
  const convIv = useRef<ReturnType<typeof setInterval> | null>(null);

  // compose fields
  const [title, setTitle] = useState("songs i'd play you");
  const [note, setNote] = useState("");
  const [color, setColor] = useState(SWATCHES[0]);
  const [icon, setIcon] = useState<IconKey>("starfish2");

  const [shareUrl, setShareUrl] = useState("");
  const [tapeId, setTapeId] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const S = PLATFORMS[source];
  const T = PLATFORMS[target];

  // ── status + OAuth resume ──────────────────────────────────
  const refreshStatus = useCallback(async () => {
    try {
      const s = await (await fetch("/api/status")).json();
      setStatus({
        spotifyEnabled: s.spotify.enabled,
        spotifyConnected: s.spotify.connected,
        spotifyName: s.spotify.name ?? null,
        appleEnabled: s.apple.enabled,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "sender") {
      setSource("spotify");
      setScreen("pick");
      void loadPlaylists("spotify");
      window.history.replaceState({}, "", "/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearConv() {
    if (convIv.current) {
      clearInterval(convIv.current);
      convIv.current = null;
    }
  }
  useEffect(() => () => clearConv(), []);

  // ── playlist loading ───────────────────────────────────────
  const loadPlaylists = useCallback(
    async (svc: Service) => {
      setLoadingPlaylists(true);
      setPlaylistError(null);
      try {
        if (svc === "spotify") {
          const res = await fetch("/api/spotify/playlists");
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            sessionStorage.removeItem("lc_reauth");
            setPlaylists(data.playlists ?? []);
          } else if (!status.spotifyEnabled) {
            // Genuine demo mode (no credentials configured).
            setPlaylists(DEMO_PLAYLISTS);
          } else if (res.status === 401) {
            // Session expired/missing. Re-auth silently (Spotify remembers the
            // approval, so no popup). Guard against an infinite loop.
            if (!sessionStorage.getItem("lc_reauth")) {
              sessionStorage.setItem("lc_reauth", "1");
              window.location.href = `/api/spotify/login?role=sender&returnTo=${encodeURIComponent(
                "/?connected=sender",
              )}`;
              return;
            }
            sessionStorage.removeItem("lc_reauth");
            setPlaylists([]);
            setPlaylistError("Your Spotify session expired. Please reconnect.");
          } else {
            setPlaylists([]);
            setPlaylistError("Spotify wouldn't return your playlists. Please reconnect and try again.");
          }
        } else {
          // Apple
          if (status.appleEnabled) {
            setPlaylists(await appleLibraryPlaylists());
          } else {
            setPlaylists(DEMO_PLAYLISTS);
          }
        }
      } catch {
        if ((svc === "spotify" && status.spotifyEnabled) || (svc === "apple" && status.appleEnabled)) {
          setPlaylists([]);
          setPlaylistError("Couldn't load your playlists. Please try again.");
        } else {
          setPlaylists(DEMO_PLAYLISTS);
        }
      } finally {
        setLoadingPlaylists(false);
      }
    },
    [status.spotifyEnabled, status.appleEnabled],
  );

  // ── connect ────────────────────────────────────────────────
  async function connect() {
    if (source === "spotify") {
      if (status.spotifyEnabled && !status.spotifyConnected) {
        window.location.href = `/api/spotify/login?role=sender&returnTo=${encodeURIComponent("/?connected=sender")}`;
        return;
      }
      setScreen("pick");
      void loadPlaylists("spotify");
    } else {
      if (status.appleEnabled && !appleConnected) {
        try {
          await authorizeApple();
          setAppleConnected(true);
        } catch {
          /* fall through to whatever playlists we can load */
        }
      }
      setScreen("pick");
      void loadPlaylists("apple");
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      if (source === "spotify") {
        await fetch("/api/spotify/logout", { method: "POST" });
        await refreshStatus();
      } else {
        setAppleConnected(false);
      }
    } finally {
      setDisconnecting(false);
    }
  }

  // Connection state for the current source.
  const sourceEnabled = source === "spotify" ? status.spotifyEnabled : status.appleEnabled;
  const sourceConnected = source === "spotify" ? status.spotifyConnected : appleConnected;
  const connectLabel = !sourceEnabled
    ? `Connect ${S.name}`
    : sourceConnected
      ? "Choose a playlist"
      : `Connect ${S.name}`;

  // ── source tracks ──────────────────────────────────────────
  async function getSourceTracks(pl: Playlist): Promise<SourceTrack[]> {
    try {
      if (source === "spotify") {
        const res = await fetch(`/api/spotify/tracks?playlistId=${encodeURIComponent(pl.id)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.tracks?.length) return data.tracks;
        }
        return demoTracksFor(pl.id);
      }
      if (status.appleEnabled) {
        const tracks = await applePlaylistTracks(pl.id);
        if (tracks.length) return tracks;
      }
      return demoTracksFor(pl.id);
    } catch {
      return demoTracksFor(pl.id);
    }
  }

  // ── convert (match + animate) ──────────────────────────────
  async function convert(pl: Playlist) {
    clearConv();
    setTitle(pl.name);
    setManifestLines([]);
    setMatchPct(0);
    setMatchLabel("matching...");
    setScreen("convert");

    const tracks = await getSourceTracks(pl);
    let result: MatchedTrack[];
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks, target }),
      });
      const data = await res.json();
      result = data.tracks ?? [];
    } catch {
      result = tracks.map((t) => ({ ...t, matched: Boolean(t.isrc), targetId: null }));
    }
    setMatched(result);

    // Reveal the manifest line-by-line, just like the prototype.
    let i = 0;
    let matchedCount = 0;
    const lines: ManifestLine[] = [];
    convIv.current = setInterval(() => {
      if (i >= result.length) {
        clearConv();
        setMatchLabel(`matched ${matchedCount}/${result.length}`);
        setTimeout(() => setScreen("compose"), 850);
        return;
      }
      const tk = result[i];
      lines.push({ ok: tk.matched, title: tk.title });
      if (tk.matched) matchedCount++;
      setManifestLines(lines.slice(-9));
      i++;
      const pct = Math.round((i / result.length) * 100);
      setMatchPct(pct);
    }, 360);
  }

  // ── send ───────────────────────────────────────────────────
  async function sendIt() {
    setSending(true);
    const finalTitle = title.trim() || "untitled tape";
    const matchedCount = matched.filter((t) => t.matched).length;
    try {
      const res = await fetch("/api/tape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          note,
          color,
          icon,
          source,
          from: "winoman",
          tracks: matched,
        }),
      });
      const data = await res.json();
      const tape: Tape = {
        id: data.id,
        title: finalTitle,
        note,
        color,
        icon,
        source,
        target,
        from: "winoman",
        tracks: matched,
        matchedCount,
        totalCount: matched.length,
        createdAt: Date.now(),
      };
      setShareUrl(data.url);
      setTapeId(data.id);
      onTapeCreated(tape);
      setScreen("sent");
    } finally {
      setSending(false);
    }
  }

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }

  const sharePath = shareUrl ? shareUrl.replace(/^https?:\/\//, "") : `lacassette.app/t/${tapeId}`;

  return (
    <>
      {/* ── connect ─────────────────────────────────────────── */}
      <section className={`screen${screen === "connect" ? " show" : ""}`}>
        <div className="cluster">
          <span className="shell-md">
            <ShellIcon icon="scallop" />
          </span>
          <span className="shell-sm">
            <ShellIcon icon="starfish" />
          </span>
          <span className="shell-sm">
            <ShellIcon icon="conch" />
          </span>
        </div>
        <h1>
          Let&apos;s make
          <br />a mixtape
        </h1>
        <p className="sub">
          Pick where you&apos;re pulling music from. La Cassette converts it to the other so your friend can play it on
          theirs.
        </p>
        <div className="picker">
          <div className="pl-label">fetch from</div>
          <div className="seg">
            <button className={source === "spotify" ? "seg-on" : ""} onClick={() => setSource("spotify")}>
              Spotify
            </button>
            <button className={source === "apple" ? "seg-on" : ""} onClick={() => setSource("apple")}>
              Apple Music
            </button>
          </div>
          <div className="dir">
            converts to <b>{T.name}</b>
          </div>
        </div>
        <div className="stack">
          <button className="btn" onClick={connect}>
            {connectLabel}
          </button>
        </div>
        <div className="brandrow">
          <span className={source === "apple" ? "dot dotA" : "dot"} />{" "}
          {!sourceEnabled ? (
            <>demo · sample {S.low} playlists</>
          ) : sourceConnected ? (
            <>
              connected
              {source === "spotify" && status.spotifyName ? <> as {status.spotifyName}</> : null}
              {" · "}
              <button
                onClick={disconnect}
                disabled={disconnecting}
                style={{
                  font: "inherit",
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "var(--coral)",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {disconnecting ? "disconnecting…" : "disconnect"}
              </button>
            </>
          ) : (
            <>reading from {S.low}</>
          )}
        </div>
      </section>

      {/* ── pick ────────────────────────────────────────────── */}
      <section className={`screen${screen === "pick" ? " show" : ""}`}>
        <button className="back" onClick={() => setScreen("connect")}>
          <span className="ar">←</span> back
        </button>
        <h1>Pick a playlist.</h1>
        <p className="sub">Your {S.name} playlists.</p>
        <div className="plist">
          {loadingPlaylists && playlists.length === 0 ? (
            <p className="tiny">loading…</p>
          ) : playlistError ? (
            <>
              <p className="tiny" style={{ color: "var(--coral)", textAlign: "left", margin: "4px 0 12px" }}>
                {playlistError}
              </p>
              <button className="btn ghost" onClick={() => setScreen("connect")}>
                ← Back to connect
              </button>
            </>
          ) : playlists.length === 0 ? (
            <p className="tiny">No playlists found in your {S.name} library.</p>
          ) : (
            playlists.map((pl) => (
              <button className="pl" key={pl.id} onClick={() => convert(pl)}>
                <span className="art">
                  <ShellIcon icon={pl.icon} />
                </span>
                <span>
                  <div className="nm">{pl.name}</div>
                  <div className="ct">
                    {pl.trackCount} tracks{pl.durationLabel ? ` · ${pl.durationLabel}` : ""}
                  </div>
                </span>
                <span className="arrow">→</span>
              </button>
            ))
          )}
        </div>
      </section>

      {/* ── convert ─────────────────────────────────────────── */}
      <section className={`screen${screen === "convert" ? " show" : ""}`}>
        <button
          className="back"
          onClick={() => {
            clearConv();
            setScreen("pick");
          }}
        >
          <span className="ar">←</span> back
        </button>
        <h1>
          Matching to
          <br />
          <span>{T.name}</span>
        </h1>
        <p className="sub">
          Each track is matched by its ISRC, the recording&apos;s unique ID, so the same recording lands in {T.name}, not
          just the same title.
        </p>
        <div className="manifest">
          <div className="mh">
            <span>matching</span>
            <span>
              {S.low} → {T.low}
            </span>
          </div>
          {manifestLines.map((ln, idx) => (
            <div className="ln" key={idx}>
              <span className={`stamp ${ln.ok ? "ok" : "no"}`}>{ln.ok ? "match" : "no match"}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{ln.title}</span>
            </div>
          ))}
        </div>
        <div className="meter">
          <div className="track">
            <div className="fill" style={{ width: `${matchPct}%` }} />
          </div>
          <div className="lbl">
            <span>{matchLabel}</span>
            <span>{matchPct}%</span>
          </div>
        </div>
      </section>

      {/* ── compose ─────────────────────────────────────────── */}
      <section className={`screen${screen === "compose" ? " show" : ""}`}>
        <button className="back" onClick={() => setScreen("pick")}>
          <span className="ar">←</span> back
        </button>
        <h1>Label the tape.</h1>
        <div className="field">
          <label>tape title</label>
          <input value={title} maxLength={28} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label>add a note</label>
          <textarea
            rows={2}
            maxLength={160}
            placeholder="write a little note on the tape"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="field">
          <label>stripe color</label>
          <div className="swatches">
            {SWATCHES.map((c) => (
              <div
                key={c}
                className={`sw${color === c ? " on" : ""}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label>tape icon</label>
          <div className="iconrow">
            {ICON_CHOICES.map((ic) => (
              <button key={ic} className={`iconsw${icon === ic ? " on" : ""}`} onClick={() => setIcon(ic)}>
                <ShellIcon icon={ic} />
              </button>
            ))}
          </div>
        </div>
        <div className="stack">
          <button className="btn coral" onClick={sendIt} disabled={sending}>
            {sending ? "Sealing…" : "Send"}
          </button>
        </div>
      </section>

      {/* ── sent ────────────────────────────────────────────── */}
      <section className={`screen center${screen === "sent" ? " show" : ""}`}>
        <div className="hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero.jpg" alt="La Cassette" />
        </div>
        <h1>{title}</h1>
        <p className="sub">Your tape is ready. Send the link and it stays sealed until they tap it open.</p>
        <div className="ticket">
          your sealed link
          <span className="link" onClick={copyLink} style={{ cursor: "pointer" }}>
            {sharePath}
          </span>
          <button className="btn ghost" style={{ marginTop: 10 }} onClick={copyLink}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
        <div className="stack">
          <button className="btn ghost" onClick={onPreviewReceiver}>
            Open as receiver →
          </button>
        </div>
      </section>
    </>
  );
}
