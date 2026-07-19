import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      posImages = [],
      staffImages = [],
      foodpandaImages = [],
      pathaoImages = [],
      bazarImages = [],
      manualForm = {}
    } = body

    const geminiKey = process.env.GEMINI_API_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY

    if (!geminiKey && !anthropicKey) {
      return NextResponse.json(
        { error: 'Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured in environment variables. Please add GEMINI_API_KEY (free from https://aistudio.google.com) to your Vercel / environment settings.' },
        { status: 500 }
      )
    }

    const systemPrompt = `You are an expert financial auditor for Crown Coffee cafe. 
Your task is to analyze uploaded operational screenshots & receipts and extract precise numerical financial data into a JSON object.

Extract values into the following JSON schema:
{
  "pos_total_sales": number,
  "pos_cash_sales": number,
  "pos_card_sales": number,
  "staff_declared_cash": number,
  "staff_declared_card": number,
  "foodpanda_declared": number,
  "foodpanda_portal_total": number,
  "pathao_declared": number,
  "pathao_portal_total": number,
  "bazar_receipts": [
    {
      "vendor": string,
      "total": number,
      "items": string[]
    }
  ],
  "raw_notes": string
}

Instructions:
1. "pos_total_sales", "pos_cash_sales", "pos_card_sales" come from POS sales report screenshots.
2. "staff_declared_cash", "staff_declared_card", "foodpanda_declared", "pathao_declared" come from staff shift closing reports.
3. "foodpanda_portal_total" comes from Foodpanda merchant portal income/payout screenshots.
4. "pathao_portal_total" comes from Pathao merchant portal screenshots.
5. "bazar_receipts" comes from photos of bazaar purchase vouchers, memos, or receipts. Extract vendor name, line items, and total amount spent for each receipt photo.
6. If a specific screenshot is missing or unreadable, default its numerical value to 0. All currency values are in BDT (Bangladeshi Taka).
7. Respond ONLY with valid JSON.`

    let extractedData = {
      pos_total_sales: 0,
      pos_cash_sales: 0,
      pos_card_sales: 0,
      staff_declared_cash: 0,
      staff_declared_card: 0,
      foodpanda_declared: 0,
      foodpanda_portal_total: 0,
      pathao_declared: 0,
      pathao_portal_total: 0,
      bazar_receipts: [],
      raw_notes: ''
    }

    let aiSuccess = false

    // 1. Try Gemini Vision AI first
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { responseMimeType: 'application/json' }
        })

        const parts = [{ text: systemPrompt }]

        const appendImages = (imgList, label) => {
          imgList.forEach((base64Data, idx) => {
            const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
            parts.push({ text: `[IMAGE CATEGORY: ${label} #${idx + 1}]` })
            parts.push({
              inlineData: {
                data: cleanBase64,
                mimeType: 'image/jpeg'
              }
            })
          })
        }

        appendImages(posImages, 'POS_REPORT')
        appendImages(staffImages, 'STAFF_REPORT')
        appendImages(foodpandaImages, 'FOODPANDA_PORTAL')
        appendImages(pathaoImages, 'PATHAO_PORTAL')
        appendImages(bazarImages, 'BAZAAR_RECEIPT')

        const aiResult = await model.generateContent({ contents: [{ role: 'user', parts }] })
        const text = aiResult.response.text()
        const parsed = JSON.parse(text)
        extractedData = { ...extractedData, ...parsed }
        aiSuccess = true
      } catch (geminiErr) {
        console.warn('Gemini extraction failed, attempting Anthropic fallback:', geminiErr.message)
      }
    }

    // 2. Fallback to Anthropic Claude 3.5 Sonnet Vision if Gemini failed or key missing
    if (!aiSuccess && anthropicKey) {
      try {
        const contentBlocks = []

        const appendAnthropicImages = (imgList, label) => {
          imgList.forEach((base64Data, idx) => {
            const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
            contentBlocks.push({ type: 'text', text: `[IMAGE CATEGORY: ${label} #${idx + 1}]` })
            contentBlocks.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: cleanBase64
              }
            })
          })
        }

        appendAnthropicImages(posImages, 'POS_REPORT')
        appendAnthropicImages(staffImages, 'STAFF_REPORT')
        appendAnthropicImages(foodpandaImages, 'FOODPANDA_PORTAL')
        appendAnthropicImages(pathaoImages, 'PATHAO_PORTAL')
        appendAnthropicImages(bazarImages, 'BAZAAR_RECEIPT')

        contentBlocks.push({ type: 'text', text: systemPrompt })

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-latest',
            max_tokens: 4000,
            messages: [{ role: 'user', content: contentBlocks }]
          })
        })

        const data = await anthropicRes.json()
        if (anthropicRes.ok && data.content && data.content[0]?.text) {
          let text = data.content[0].text.trim()
          if (text.startsWith('```json')) text = text.slice(7)
          if (text.startsWith('```')) text = text.slice(3)
          if (text.endsWith('```')) text = text.slice(0, -3)
          const parsed = JSON.parse(text.trim())
          extractedData = { ...extractedData, ...parsed }
          aiSuccess = true
        } else {
          throw new Error(data.error?.message || 'Anthropic API failed')
        }
      } catch (anthropicErr) {
        console.error('Anthropic extraction error:', anthropicErr.message)
        extractedData.raw_notes = 'AI extraction encountered an issue: ' + anthropicErr.message
      }
    }

    // Merge manual form inputs if provided
    const openingCash = Number(manualForm.openingCash || 0)
    const actualCashSubmitted = Number(manualForm.actualCashSubmitted ?? extractedData.staff_declared_cash ?? 0)
    const posTotalSales = Number(manualForm.posTotalSales ?? extractedData.pos_total_sales ?? 0)
    const posCashSales = Number(manualForm.posCashSales ?? extractedData.pos_cash_sales ?? 0)
    const posCardSales = Number(manualForm.posCardSales ?? extractedData.pos_card_sales ?? 0)
    const foodpandaDeclared = Number(manualForm.foodpandaDeclared ?? extractedData.foodpanda_declared ?? 0)
    const foodpandaPortalTotal = Number(manualForm.foodpandaPortalTotal ?? extractedData.foodpanda_portal_total ?? 0)
    const pathaoDeclared = Number(manualForm.pathaoDeclared ?? extractedData.pathao_declared ?? 0)
    const pathaoPortalTotal = Number(manualForm.pathaoPortalTotal ?? extractedData.pathao_portal_total ?? 0)

    // Calculate Bazaar Receipts Total
    const bazarReceiptsList = Array.isArray(extractedData.bazar_receipts) ? extractedData.bazar_receipts : []
    const bazarExpenseTotal = bazarReceiptsList.reduce((sum, r) => sum + Number(r.total || 0), 0)

    // Cash Audit Formula (Zero Tolerance)
    const expectedCash = openingCash + posCashSales - bazarExpenseTotal
    const cashShortage = actualCashSubmitted - expectedCash

    // Check zero-tolerance discrepancies
    const fpDiff = foodpandaDeclared - foodpandaPortalTotal
    const pathaoDiff = pathaoDeclared - pathaoPortalTotal
    
    // Status: ANY non-zero variance triggers DISCREPANCY
    const isDiscrepancy = (cashShortage !== 0) || (fpDiff !== 0) || (pathaoDiff !== 0)
    const status = isDiscrepancy ? 'DISCREPANCY' : 'MATCHED'

    const auditSummary = {
      openingCash,
      posTotalSales,
      posCashSales,
      posCardSales,
      foodpandaDeclared,
      foodpandaPortalTotal,
      foodpandaDiff: fpDiff,
      pathaoDeclared,
      pathaoPortalTotal,
      pathaoDiff: pathaoDiff,
      bazarExpenseTotal,
      bazarReceiptsCount: bazarReceiptsList.length,
      bazarReceipts: bazarReceiptsList,
      actualCashSubmitted,
      expectedCash,
      cashShortage,
      status,
      extractedRawJson: extractedData,
      rawNotes: extractedData.raw_notes || ''
    }

    return NextResponse.json({
      success: true,
      data: auditSummary
    })
  } catch (err) {
    console.error('Reconcile AI Route error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to process AI reconciliation.' },
      { status: 500 }
    )
  }
}
