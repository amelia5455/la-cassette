import { ImageResponse } from "next/og";
import { getTape } from "@/lib/store";

export const runtime = "nodejs";
export const alt = "A mixtape for you — La Cassette";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Per-tape share image: a cassette with the tape's title, stripe and sender. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tape = await getTape(id);
  const title = tape?.title ?? "A mixtape for you";
  const from = tape?.from ?? "a friend";
  const color = tape?.color ?? "#e26a48";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(168deg,#d6e3df 0%, #e9dcc1 58%, #efe3c9 100%)",
          fontFamily: "Georgia, serif",
          padding: 64,
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#34539f",
            marginBottom: 28,
          }}
        >
          [ a mixtape for you ]
        </div>

        {/* Cassette */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 720,
            height: 456,
            borderRadius: 26,
            background: "linear-gradient(160deg,#f4ecd9,#e6d8be)",
            border: "2px solid #cdbd9c",
            boxShadow: "0 40px 80px -30px #4a3a2088",
            padding: 44,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#fdfaf2",
              border: "2px solid #d8c8a6",
              borderRadius: 12,
              height: 188,
              padding: "0 28px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 22, background: color }} />
            <div
              style={{
                marginTop: 44,
                fontSize: 52,
                color: "#34539f",
                fontStyle: "italic",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {title}
            </div>
            <div style={{ marginTop: 18, fontSize: 22, letterSpacing: 4, color: "#a3906e", textTransform: "uppercase" }}>
              for you · {from}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "auto",
              height: 150,
              borderRadius: 16,
              background: "linear-gradient(#241d14,#15100b)",
              alignItems: "center",
              justifyContent: "space-around",
              padding: "0 80px",
            }}
          >
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: "50%",
                  background: "#3d3424",
                  border: "26px solid #241d14",
                  display: "flex",
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ marginTop: 36, fontSize: 30, letterSpacing: 6, color: "#8a8aa0", textTransform: "uppercase" }}>
          la cassette
        </div>
      </div>
    ),
    { ...size },
  );
}
