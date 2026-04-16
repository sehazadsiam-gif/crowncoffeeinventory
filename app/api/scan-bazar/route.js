import { NextResponse } from "next/server";
import anthropic from "../../../lib/anthropic";

export async function POST(req) {
  try {
    const { image, mimeType, textData, fileType } = await req.json();

    if (!image && !textData) {
      return NextResponse.json({ error: "No document content provided" }, { status: 400 });
    }

    const userMessage = {
      role: "user",
      content: [
        {
          type: "text",
          text: `You are helping a cafe called Crown Coffee read a ${fileType || 'handwritten'} bazar (shopping/purchase) list.
          
Analyze this ${fileType === 'excel' ? 'spreadsheet data' : 'document'} and extract each item.
          
Return ONLY a valid JSON array, no explanation, no markdown:
[
  {
    "name": "ingredient name as written",
    "quantity": number only,
    "unit": "gm or ml or pcs or kg or liter",
    "cost_per_unit": number or null,
    "notes": "any extra notes or null"
  }
]
          
Rules:
- quantity must be a number, not a string
- unit should be your best guess based on the item
- if cost is not written, set cost_per_unit to null
- if unsure about a value, make a reasonable guess
- do not include any text outside the JSON array
${textData ? `\n\nContent to analyze:\n${textData}` : ''}`,
        }
      ]
    };

    if (image) {
      userMessage.content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType,
          data: image,
        },
      });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [userMessage],
    });

    const text = response.content[0].text;
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error("Failed to parse Claude response:", text);
      return NextResponse.json({ error: "Could not read the document" }, { status: 500 });
    }
  } catch (error) {
    console.error("Scan Bazar Error:", error);
    return NextResponse.json({ error: "Could not read the document" }, { status: 500 });
  }
}
