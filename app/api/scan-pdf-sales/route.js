import { NextResponse } from "next/server";
import anthropic from "../../../lib/anthropic";
const pdfParse = require("pdf-parse");

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let text;
    try {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } catch (parseError) {
      console.error("PDF Parsing Error:", parseError);
      return NextResponse.json({ error: "Could not read the PDF" }, { status: 500 });
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "The PDF document appears to be empty" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "You are a data extraction assistant for Crown Coffee, a cafe inventory system.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `The following text was extracted from a PDF document containing daily sales records for Crown Coffee cafe.
   
Extract each sold menu item and its quantity.
   
Return ONLY a valid JSON array, no explanation, no markdown, no code blocks:
[
  {
    "name": "item name as written in the document",
    "quantity": number
  }
]
   
Rules:
- quantity must be a number, never a string
- if quantity is unclear, default to 1
- ignore any rows that are clearly headers or totals
- do not include revenue or price data
- do not return anything outside the JSON array
   
Document text:
${text}`,
            },
          ],
        },
      ],
    });

    const aiResponse = response.content[0].text;
    try {
      const data = JSON.parse(aiResponse);
      return NextResponse.json(data);
    } catch (jsonError) {
      console.error("Failed to parse Claude response:", aiResponse);
      return NextResponse.json({ error: "Could not read the PDF" }, { status: 500 });
    }
  } catch (error) {
    console.error("Scan PDF Sales Error:", error);
    return NextResponse.json({ error: "Could not read the PDF" }, { status: 500 });
  }
}
