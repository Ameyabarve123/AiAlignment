import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ video: string }> }
) {
  const { video } = await params;
  const range = request.headers.get("range") ?? "";

  let upstream: Response;
  try {
    upstream = await fetch(`http://127.0.0.1:8000/videos/${video}`, {
      headers: range ? { Range: range } : {},
    });
  } catch (err) {
    console.error("Failed to reach backend:", err);
    return new NextResponse("Backend unreachable", { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    const body = await upstream.text();
    console.error(`Backend returned ${upstream.status}:`, body);
    return new NextResponse("Video not found", { status: 404 });
  }

  const headers = new Headers();
  for (const key of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const val = upstream.headers.get(key);
    if (val) headers.set(key, val);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}