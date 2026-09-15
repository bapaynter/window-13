export function parseJsonObject<TParsed>(rawText: string): TParsed | null {
  const firstBrace = rawText.indexOf('{')
  const lastBrace = rawText.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null
  }
  try {
    return JSON.parse(rawText.slice(firstBrace, lastBrace + 1)) as TParsed
  } catch {
    return null
  }
}
