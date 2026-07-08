import OpenAI from 'openai';
import { env, hasOpenAI } from '../config/env.js';
import { logger } from '../lib/logger.js';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!hasOpenAI) return null;
  if (!client) client = new OpenAI({ apiKey: env.openaiApiKey });
  return client;
}

export interface ChatJsonOptions {
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Ask the model for a strict JSON object. Returns null when no key is
 * configured or the call fails, so callers can fall back gracefully.
 */
export async function chatJson<T>(options: ChatJsonOptions): Promise<T | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.create({
      model: env.openaiModel,
      temperature: options.temperature ?? 0.85,
      max_tokens: options.maxTokens ?? 1800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn('OpenAI request failed, using local fallback', {
      message: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export const openaiStatus = () => ({
  configured: hasOpenAI,
  model: env.openaiModel,
});
