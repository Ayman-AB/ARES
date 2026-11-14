import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Saving to a file only works locally (npm run dev)." },
      { status: 403 }
    );
  }
  const data = await req.json();
  const file = path.join(process.cwd(), "app", "data", "place-info.json");
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
  return NextResponse.json({ ok: true });
}