import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTape } from "@/lib/store";
import { spotifyConfig, appleConfig } from "@/lib/config";
import { readSpotifySession } from "@/lib/session";
import { ReceiverShell } from "@/components/ReceiverShell";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tape = await getTape(id);
  if (!tape) return { title: "La Cassette" };
  return {
    title: `${tape.title} — a mixtape for you`,
    description: tape.note || `A mixtape from ${tape.from}.`,
    openGraph: {
      title: `${tape.title}`,
      description: tape.note || `A mixtape from ${tape.from}.`,
    },
  };
}

export default async function TapePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ add?: string }>;
}) {
  const { id } = await params;
  const { add } = await searchParams;
  const tape = await getTape(id);
  if (!tape) notFound();

  const session = await readSpotifySession();

  return (
    <ReceiverShell
      tape={tape}
      spotifyEnabled={spotifyConfig.enabled}
      spotifyConnected={Boolean(session)}
      appleEnabled={appleConfig.enabled}
      resumeAdd={add === "1"}
    />
  );
}
