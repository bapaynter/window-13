import type { ChatMessage } from './prompts'

const OPENROUTER_COMPLETION_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_TEMPERATURE = 0.9
const DEFAULT_MAXIMUM_OUTPUT_TOKENS = 4000

export interface CompletionParameters {
  model: string
  messages: ChatMessage[]
  temperature?: number
  maximumOutputTokens?: number
  jsonMode?: boolean
}

export interface CompletionResult {
  content: string
  finishReason: string | null
}

interface OpenRouterChoice {
  finish_reason?: unknown
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

// Returns the raw completion, including finish_reason, so callers can tell a
// truncated response apart from a complete one. Empty content is returned as an
// empty string; use requestCompletion when you want that treated as an error.
export async function requestCompletionDetailed(
  parameters: CompletionParameters
): Promise<CompletionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('requestCompletionDetailed: OPENROUTER_API_KEY is not set')
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
    throw new Error(
      `requestCompletionDetailed: OpenRouter returned ${response.status}: ${failureDetail.slice(0, 300)}`
    )
  }

  const payload = (await response.json()) as OpenRouterResponse
  if (payload.error?.message) {
    throw new Error(`requestCompletionDetailed: OpenRouter error: ${payload.error.message}`)
  }

  const choice = payload.choices?.[0]
  const content = typeof choice?.message?.content === 'string' ? choice.message.content : ''
  const finishReason = typeof choice?.finish_reason === 'string' ? choice.finish_reason : null

  return { content, finishReason }
}

export async function requestCompletion(parameters: CompletionParameters): Promise<string> {
  const result = await requestCompletionDetailed(parameters)
  if (result.content.trim().length === 0) {
    throw new Error('requestCompletion: OpenRouter returned no text content')
  }
  return result.content
}
