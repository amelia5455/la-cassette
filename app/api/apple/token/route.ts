import { NextResponse } from "next/server";
import { appleConfig } from "@/lib/config";
import { developerToken } from "@/lib/apple";

/** MusicKit JS developer token. Returns enabled:false when Apple isn't configured. */
export async function GET() {
  if (!appleConfig.enabled) {
    return NextResponse.json({ enabled: false });
  }
  try {
    const token = await developerToken();
    return NextResponse.json({ enabled: true, token, storefront: appleConfig.storefront });
  } catch (err) {
    return NextResponse.json(
      { enabled: false, error: (err as Error).message },
      { status: 500 },
    );
  }
}
