import { NextResponse } from "next/server";
import { ogConfigured, OG_MODEL } from "@/lib/og";
import { storageConfigured, burnerAddress } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    og: ogConfigured(),
    model: OG_MODEL,
    network: "0G Galileo Testnet",
    storage: storageConfigured(),
    burner: burnerAddress(),
  });
}
