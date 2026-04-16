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

    const formData = await request.formData()
    const file = formData.get("file")
    if (!file) {
      return Response.json({ error: "No file received" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString("base64")

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64,
        },
      },
      `You are a data extraction assistant for Crown Coffee cafe.
Extract each sold menu item and its quantity from this document.
Return ONLY a valid JSON array with no explanation, no markdown, no code blocks.
Format: [{"name": "item name", "quantity": number}]
Rules:
- quantity must be a number
- ignore headers, totals, dates, and non-item rows
- do not return anything outside the JSON array`,
    ])

    const raw = result.response.text().trim()
    console.log("Gemini PDF response:", raw)

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

    return Response.json({ items: data })

  } catch (error) {
    console.error("scan-pdf-sales error:", error)
    return Response.json(
      { error: error.message || "Unexpected error processing PDF" },
      { status: 500 }
    )
  }
}