import { NextResponse } from "next/server";
import anthropic from "../../../lib/anthropic";

export async function POST(req) {
  try {
    const { image, mimeType, menuItems } = await req.json();

    if (!image || !mimeType) {
      return NextResponse.json({ error: "Image and mimeType are required" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are helping a cafe called Crown Coffee read a handwritten daily sales record.
   
Known menu items at Crown Coffee: ${menuItems ? menuItems.join(", ") : "Not provided"}
   
Look at this handwritten note and extract each sold item with its quantity and price per unit if written.
   
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
- do not include any text outside the JSON array`,
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
