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

    const { image, mimeType, menuItems } = await request.json()

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const menuList = menuItems && menuItems.length > 0
      ? `Known menu items at Crown Coffee: ${menuItems.join(", ")}`
      : ""

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: image,
        },
      },
      `You are a data extraction assistant for Crown Coffee cafe.
${menuList}

Extract each sold menu item and its quantity from this image.
Return ONLY a valid JSON array with no explanation, no markdown, no code blocks.
Format: [{"name": "item name", "quantity": number, "price": number or null}]
Rules:
- Match names to the known menu items list as closely as possible
- quantity must be a number
- price should be the amount per unit if written, otherwise null
- do not return anything outside the JSON array`,
    ])

    const raw = result.response.text().trim()
    console.log("Gemini scan-sales response:", raw)

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
    console.error("scan-sales error:", error)
    return Response.json(
      { error: error.message || "Unexpected error scanning image" },
      { status: 500 }
    )
  }
}
