import OpenAI from "openai";

let _client: OpenAI | null = null;

export function openaiClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!_client) _client = new OpenAI({ apiKey: key });
  return _client;
}
