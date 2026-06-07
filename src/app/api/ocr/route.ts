import { NextRequest, NextResponse } from "next/server";
import { anthropic, HAIKU } from "@/lib/claude";
import { OCR_SYSTEM, OCR_PROMPT } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("image") as File;
  if (!file) return NextResponse.json({ error: "image required" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp";

  const message = await anthropic.messages.create({
    model: HAIKU,
    max_tokens: 256,
    system: OCR_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: OCR_PROMPT },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(text);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "failed to parse label", raw: text }, { status: 422 });
  }
}
