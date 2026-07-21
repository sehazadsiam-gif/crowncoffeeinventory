import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request) {
  try {
    const { messages, system, attachment } = await request.json()
    
    // 1. Try Gemini first (fully verified and working)
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        
        let finalSystemPrompt = "You are the AI Assistant for Crown Coffee, an advanced cafe inventory and management system. Help the user understand their data, find features, and manage their coffee shop efficiently. Keep answers concise, actionable, and formatted in markdown."
        if (system) {
          finalSystemPrompt = system + "\n\n" + finalSystemPrompt;
        }

        const model = genAI.getGenerativeModel({
          model: 'gemini-3.5-flash',
          systemInstruction: finalSystemPrompt
        })

        // Map Anthropic style messages to Gemini style
        const contents = messages.map((m, idx) => {
          const parts = [{ text: m.content || '' }]
          
          // Append the attachment to the last message if role matches user
          if (idx === messages.length - 1 && attachment && m.role === 'user') {
            parts.push({
              inlineData: {
                data: attachment.base64,
                mimeType: attachment.type
              }
            })
          }
          
          return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts
          }
        })

        const result = await model.generateContent({ contents })
        const responseText = result.response.text()

        // Return mimicking Anthropic response structure for compatibility with AIAssistant.js
        return NextResponse.json({
          content: [
            {
              type: 'text',
              text: responseText
            }
          ]
        })
      } catch (geminiError) {
        console.error('Gemini chat helper failed, falling back to Anthropic if available...', geminiError)
      }
    }

    // 2. Fall back to Anthropic
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json(
        { error: 'Neither Gemini nor Anthropic API keys are configured correctly' },
        { status: 500 }
      )
    }

    // Filter messages for Anthropic (first message must have role 'user')
    let anthropicMessages = messages.map((m, idx) => {
      let content = m.content
      
      if (idx === messages.length - 1 && attachment && m.role === 'user') {
        const contentBlocks = [{ type: 'text', text: m.content || '' }]
        if (attachment.type.startsWith('image/')) {
          contentBlocks.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: attachment.type,
              data: attachment.base64
            }
          })
        } else if (attachment.type === 'application/pdf') {
          contentBlocks.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: attachment.base64
            }
          })
        } else {
          // Append raw text content if not media file
          const decodedText = Buffer.from(attachment.base64, 'base64').toString('utf-8')
          contentBlocks[0].text += `\n\nAttached File Context (${attachment.name}):\n${decodedText}`
        }
        content = contentBlocks
      }
      
      return {
        role: m.role,
        content
      }
    })

    if (anthropicMessages.length > 0 && anthropicMessages[0].role === 'assistant') {
      anthropicMessages = anthropicMessages.slice(1)
    }

    const body = {
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 4000,
      messages: anthropicMessages
    }

    let finalSystemPrompt = "You are the AI Assistant for Crown Coffee, an advanced cafe inventory and management system. Help the user understand their data, find features, and manage their coffee shop efficiently. Keep answers concise, actionable, and formatted in markdown."
    if (system) {
      finalSystemPrompt = system + "\n\n" + finalSystemPrompt;
    }
    
    body.system = finalSystemPrompt;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Anthropic API request failed' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
