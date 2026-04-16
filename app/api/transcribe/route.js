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

    const { image, mimeType } = await request.json()

    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: image,
        },
      },
      `Transcribe this handwritten document exactly as written.
Preserve structure, line breaks, and layout in plain text.
If there are tables or lists, format them clearly.
Do not add any commentary or explanation.`,
    ])

    const text = result.response.text()

    return Response.json({ text })

  } catch (error) {
    console.error("transcribe error:", error)
    return Response.json(
      { error: error.message || "Unexpected error during transcription" },
      { status: 500 }
    )
  }
}
