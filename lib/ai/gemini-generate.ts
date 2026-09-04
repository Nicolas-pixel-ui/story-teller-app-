type GeminiRestResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
};

function uniqueModelNames(names: Array<string | undefined>): string[] {
  return names.filter(
    (name, index, all): name is string => Boolean(name) && all.indexOf(name) === index
  );
}

function isRetiredGeminiModel(name: string): boolean {
  return /^gemini-1\.(0|5)($|-)/.test(name);
}

export function geminiModelCandidates(
  ...preferred: Array<string | undefined>
): string[] {
  const preferredFresh = uniqueModelNames(preferred).filter((name) => !isRetiredGeminiModel(name));
  const fallbacks = uniqueModelNames([
    process.env.GEMINI_SCENE_MODEL,
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-2.0-flash",
  ]).filter((name) => !isRetiredGeminiModel(name));

  return uniqueModelNames([...preferredFresh, ...fallbacks]);
}

export function geminiApiKey(): string {
  return (process.env.GEMINI_API_KEY || "").trim();
}

export function userFriendlyAiError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("gemini_api_key") || lower.includes("api key")) {
    return "AI is not configured on the server. Please try again later.";
  }
  if (lower.includes("429") || lower.includes("quota") || lower.includes("resource exhausted")) {
    return "AI is busy right now. Please wait a moment and try again.";
  }
  if (lower.includes("timed out") || lower.includes("aborted") || lower.includes("timeout")) {
    return "AI generation took too long. Please try again.";
  }
  if (
    lower.includes("404") ||
    lower.includes("not found") ||
    lower.includes("not supported") ||
    lower.includes("unknown model")
  ) {
    return "The AI model is unavailable right now. Please try again.";
  }
  return "Failed to generate AI content. Please try again.";
}

async function generateWithGeminiRest(
  modelName: string,
  prompt: string,
  apiKey: string,
  options: { timeoutMs: number; json?: boolean }
): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}` +
    `:generateContent?key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  const requestBody = (includeThinking: boolean) =>
    JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        ...(options.json ? { responseMimeType: "application/json" } : {}),
        ...(includeThinking && modelName.startsWith("gemini-3")
          ? { thinkingConfig: { thinkingLevel: "LOW" } }
          : {}),
      },
    });

  async function postOnce(includeThinking: boolean): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      return await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: requestBody(includeThinking),
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(`Model ${modelName} timed out`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  response = await postOnce(true);
  if (!response.ok && modelName.startsWith("gemini-3") && response.status === 400) {
    response = await postOnce(false);
  }

  const payload = (await response.json()) as GeminiRestResponse;
  if (!response.ok) {
    throw new Error(
      `Gemini ${modelName} ${response.status}: ${payload.error?.message ?? "request failed"}`
    );
  }

  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? "";
  if (!text) {
    throw new Error(`Gemini ${modelName} returned an empty response`);
  }
  return text;
}

export async function generateGeminiText(
  prompt: string,
  options?: {
    timeoutMs?: number;
    json?: boolean;
    models?: string[];
  }
): Promise<string> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const models = (options?.models?.length ? options.models : geminiModelCandidates()).slice(0, 3);
  const timeoutMs = options?.timeoutMs ?? 20_000;
  const startedAt = Date.now();
  let lastError: unknown = null;

  for (const modelName of models) {
    const remainingMs = timeoutMs - (Date.now() - startedAt);
    if (remainingMs < 1500) {
      lastError = lastError ?? new Error("AI generation timed out");
      break;
    }
    try {
      const text = await generateWithGeminiRest(modelName, prompt, apiKey, {
        timeoutMs: remainingMs,
        json: options?.json,
      });
      console.info(`[gemini_generate] Used model ${modelName}`);
      return text.replace(/^```(?:html|json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
    } catch (error) {
      lastError = error;
      console.warn(`[gemini_generate] Model ${modelName} failed, trying fallback:`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No available Gemini model could generate content.");
}
