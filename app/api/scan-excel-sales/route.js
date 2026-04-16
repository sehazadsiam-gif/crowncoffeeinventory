import { GoogleGenerativeAI } from "@google/generative-ai"
import * as XLSX from "xlsx"

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
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })
    const text = rows
      .filter(row => row.some(cell => cell !== null && cell !== ""))
      .map(row => row.join(", "))
      .join("\n")

    if (!text || text.trim().length === 0) {
      return Response.json(
        { error: "Could not extract data from file" },
        { status: 400 }
      )
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const result = await model.generateContent(
      `You are a data extraction assistant for Crown Coffee cafe.
Extract each sold menu item and its quantity from this spreadsheet.
Return ONLY a valid JSON array with no explanation, no markdown, no code blocks.
Format: [{"name": "item name", "quantity": number}]
Rules:
- quantity must be a number
- ignore headers, totals, dates, and non-item rows
- do not return anything outside the JSON array

Spreadsheet data:
${text}`
    )

    const raw = result.response.text().trim()
    console.log("Gemini Excel response:", raw)

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
    console.error("scan-excel-sales error:", error)
    return Response.json(
      { error: error.message || "Unexpected error processing file" },
      { status: 500 }
    )
  }
}
