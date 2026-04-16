import { NextResponse } from "next/server";
import anthropic from "../../../lib/anthropic";

export async function POST(req) {
  try {
    const { image, mimeType } = await req.json();

    if (!image || !mimeType) {
      return NextResponse.json({ error: "Image and mimeType are required" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Transcribe this handwritten document exactly as written.
   Preserve the structure, line breaks, and layout as much as possible in plain text.
   If there are tables or lists, format them clearly.
   Do not add any commentary or explanation.`,
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: image,
              },
            },
          ],
        },
      ],
    });

    const text = response.content[0].text;
    return NextResponse.json({ transcription: text });
  } catch (error) {
    console.error("Transcribe Error:", error);
    return NextResponse.json({ error: "Could not read the document" }, { status: 500 });
  }
}
