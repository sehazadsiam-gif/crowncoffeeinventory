import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "GEMINI_API_KEY is not set in .env.local" },
        { status: 500 }
      )
    }

    const { image, mimeType, textData } = await request.json()

    if (!image && !textData) {
      return Response.json({ error: "No document content provided" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `You are a data extraction assistant for Crown Coffee cafe.
Extract each purchased ingredient and its details from this bazar (shopping) list.
Return ONLY a valid JSON array with no explanation, no markdown, no code blocks.
Format: [{"name": "ingredient name", "quantity": number, "unit": "gm or ml or pcs or kg or ltr", "cost_per_unit": number or null, "notes": "string or null"}]
Rules:
- quantity must be a number
- unit should be your best guess based on the item type
- if cost is not written, set cost_per_unit to null
- do not return anything outside the JSON array
${textData ? `\n\nContent to analyze:\n${textData}` : ""}`

    let result
    if (image) {
      result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: image,
          },
        },
        prompt,
      ])
    } else {
      result = await model.generateContent(prompt)
    }

    const raw = result.response.text().trim()
    console.log("Gemini scan-bazar response:", raw)

    const cleaned = raw
      .replace(/^```json\n?/, "")
      .replace(/^```\n?/, "")
      .replace(/\n?```$/, "")
      .trim()

    let data
    try {
      data = JSON.parse(cleaned)
    } catch (e) {
      console.error("JSON parse failed:", cleaned)
      return Response.json(
        { error: "AI returned unexpected format. Please try again." },
        { status: 500 }
      )
    }

    return Response.json(data)

  } catch (error) {
    console.error("scan-bazar error:", error)
    return Response.json(
      { error: error.message || "Unexpected error scanning document" },
      { status: 500 }
    )
  }
}
