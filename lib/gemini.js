import { GoogleGenerativeAI } from '@google/generative-ai'
import * as xlsx from 'xlsx'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * Parses a document using Anthropic Claude as a fallback.
 */
async function parseDocumentWithAnthropic(fileBuffer, mimeType, prompt, responseSchema = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Anthropic API key is not configured.')
  }

  let content = []
  if (mimeType === 'application/pdf') {
    content.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: Buffer.from(fileBuffer).toString('base64')
      }
    })
  } else if (mimeType.startsWith('image/')) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mimeType,
        data: Buffer.from(fileBuffer).toString('base64')
      }
    })
  } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const textContent = xlsx.utils.sheet_to_csv(worksheet)
      content.push({
        type: 'text',
        text: `Document Content (Excel/CSV):\n\n${textContent}`
      })
    } catch (e) {
      console.error('Error parsing excel', e)
      throw new Error('Failed to extract text from Excel file.')
    }
  } else {
    const textContent = Buffer.from(fileBuffer).toString('utf-8')
    content.push({
      type: 'text',
      text: `Document Content:\n\n${textContent}`
    })
  }

  content.push({
    type: 'text',
    text: prompt + (responseSchema ? `\n\nYou MUST respond with valid JSON matching this schema: ${JSON.stringify(responseSchema)}. Only return the JSON, nothing else. Do not wrap it in markdown formatting unless necessary, but if you do, use \`\`\`json.` : '')
  })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 4000,
      messages: [{ role: 'user', content }]
    })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Anthropic API request failed')
  }

  const responseText = data.content[0]?.text || ''
  let cleanText = responseText.trim()
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.substring(7)
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.substring(3)
  }
  if (cleanText.endsWith('```')) {
    cleanText = cleanText.substring(0, cleanText.length - 3)
  }
  cleanText = cleanText.trim()

  try {
    return JSON.parse(cleanText)
  } catch (e) {
    console.error('Failed to parse Anthropic response as JSON. Response text:', responseText)
    throw new Error('AI returned an invalid JSON structure. Please try again.')
  }
}

/**
 * Parses a document (PDF or text/CSV) using Gemini 2.5 Flash.
 * Falls back to Anthropic Claude if Gemini fails.
 * @param {Buffer | ArrayBuffer} fileBuffer - The file contents.
 * @param {string} mimeType - The mime type of the file.
 * @param {string} prompt - Detailed instructions for what to extract.
 * @param {object} [responseSchema] - Optional JSON schema for structured output.
 */
export async function parseDocumentWithGemini(fileBuffer, mimeType, prompt, responseSchema = null) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables.')
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      ...(responseSchema ? {
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      } : {
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    })

    // Format file data for Gemini
    let filePart
    if (mimeType === 'application/pdf') {
      filePart = {
        inlineData: {
          data: Buffer.from(fileBuffer).toString('base64'),
          mimeType: 'application/pdf'
        }
      }
    } else if (mimeType.startsWith('image/')) {
      filePart = {
        inlineData: {
          data: Buffer.from(fileBuffer).toString('base64'),
          mimeType: mimeType
        }
      }
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const textContent = xlsx.utils.sheet_to_csv(worksheet)
      filePart = `Document Content (Excel/CSV):\n\n${textContent}`
    } else {
      // Treat CSV or text files as text content
      const textContent = Buffer.from(fileBuffer).toString('utf-8')
      filePart = `Document Content:\n\n${textContent}`
    }

    const result = await model.generateContent([prompt, filePart])
    const responseText = result.response.text()

    try {
      return JSON.parse(responseText)
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON. Response text:', responseText)
      throw new Error('AI returned an invalid JSON structure. Please try again.')
    }
  } catch (error) {
    console.warn('Gemini parser failed, trying Anthropic Claude fallback...', error.message)
    if (process.env.ANTHROPIC_API_KEY) {
      return await parseDocumentWithAnthropic(fileBuffer, mimeType, prompt, responseSchema)
    }
    throw error;
  }
}

