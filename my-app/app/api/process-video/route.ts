import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("video") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const result = await fetch('http://127.0.0.1:8000/process', {
    method: "POST",
    body: formData,
  });

  const data = await result.json();

  return NextResponse.json({ result: data });
}