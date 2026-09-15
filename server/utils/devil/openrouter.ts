import type { ChatMessage } from './prompts'

const OPENROUTER_COMPLETION_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_TEMPERATURE = 0.9
// Reasoning models spend part of this budget on hidden reasoning, so the ceiling is generous.
const DEFAULT_MAXIMUM_OUTPUT_TOKENS = 4000

export interface CompletionParameters {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maximumOutputTokens?: number
  jsonMode?: boolean
}

interface OpenRouterChoice {
  message?: {
    content?: unknown
  }
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[]
  error?: {
    message?: string
  }
}

export async function requestCompletion(parameters: CompletionParameters): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('requestCompletion: OPENROUTER_API_KEY is not set')
  }

  const requestBody: Record<string, unknown> = {
    model: parameters.model,
    messages: parameters.messages,
    temperature: parameters.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: parameters.maximumOutputTokens ?? DEFAULT_MAXIMUM_OUTPUT_TOKENS
  }
  if (parameters.jsonMode) {
    requestBody.response_format = { type: 'json_object' }
  }

  const response = await fetch(OPENROUTER_COMPLETION_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const failureDetail = await response.text()
    throw new Error(`requestCompletion: OpenRouter returned ${response.status}: ${failureDetail.slice(0, 300)}`)
  }

  const payload = (await response.json()) as OpenRouterResponse
  if (payload.error?.message) {
    throw new Error(`requestCompletion: OpenRouter error: ${payload.error.message}`)
  }

  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('requestCompletion: OpenRouter returned no text content')
  }
  return content
}
