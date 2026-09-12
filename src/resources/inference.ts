import OpenAI from "openai";
import { config } from "../config.js";

let client: OpenAI | undefined;

function openai(): OpenAI {
  if (!client) {
    if (!config.openaiKey) throw new Error("OPENAI_API_KEY is not set, so inference cannot be sold.");
    client = new OpenAI({ apiKey: config.openaiKey });
  }
  return client;
}

export interface InferenceRequest {
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export interface InferenceResult {
  model: string;
  text: string;
  usage?: { prompt: number; completion: number };
}

/** The deliverable an agent actually bought. Paid for before this runs. */
export async function runInference(req: InferenceRequest): Promise<InferenceResult> {
  const model = req.model ?? "gpt-4o-mini";
  const completion = await openai().chat.completions.create({
    model,
    max_tokens: Math.min(req.maxTokens ?? 512, 2048),
    messages: [{ role: "user", content: req.prompt }],
  });
  return {
    model,
    text: completion.choices[0]?.message?.content ?? "",
    usage: completion.usage
      ? { prompt: completion.usage.prompt_tokens, completion: completion.usage.completion_tokens }
      : undefined,
  };
}
