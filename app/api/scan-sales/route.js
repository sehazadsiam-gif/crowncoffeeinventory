import { NextResponse } from "next/server";
import anthropic from "../../../lib/anthropic";

export async function POST(req) {
  try {
    const { image, mimeType, textData, fileType, menuItems } = await req.json();

    if (!image && !textData) {
      return NextResponse.json({ error: "No document content provided" }, { status: 400 });
    }

    const userMessage = {
      role: "user",
      content: [
        {
          type: "text",
          text: `You are helping a cafe called Crown Coffee read a ${fileType || 'handwritten'} daily sales record.
          
Known menu items at Crown Coffee: ${menuItems ? menuItems.join(", ") : "Not provided"}
          
Analyze this ${fileType === 'excel' ? 'spreadsheet data' : 'document'} and extract each sold item with its quantity and price per unit.
          
Return ONLY a valid JSON array, no explanation, no markdown:
[
  {
    "name": "item name matched to known menu items if possible",
    "quantity": number only,
    "price": number or null
  }
]
          
Rules:
- Match names to the known menu items list as closely as possible
- quantity must be a number
- price should be the amount per unit if specifically written, otherwise null
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
    console.error("Scan Sales Error:", error);
    return NextResponse.json({ error: "Could not read the document" }, { status: 500 });
  }
}
