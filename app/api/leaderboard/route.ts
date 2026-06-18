import { NextResponse } from "next/server";
import { loadBoard, storageConfigured } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const { board, source } = await loadBoard();
  return NextResponse.json({
    entries: board.entries,
    updated: board.updated,
    source,
    storage: storageConfigured(),
  });
}
