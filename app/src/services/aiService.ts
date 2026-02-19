// AI Service using free-tier models with fallback and lightweight caching.

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MAX_PROMPT_CHARS = 24000;
const DEFAULT_MAX_TOKENS = 1024;
const AI_TIMEOUT_MS = 20000;
const CACHE_LIMIT = 100;
const GROQ_MODELS = [
  'deepseek-r1-distill-llama-70b',
  'llama-3.3-70b-versatile',
] as const;
const OPENROUTER_FREE_MODELS = [
  'deepseek/deepseek-r1:free',
  'qwen/qwq-32b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
] as const;

const responseCache = new Map<string, string>();

interface AIResponse {
  content: string;
}

function toPlainText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_\-`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstSentences(input: string, maxSentences: number = 3): string {
  const plain = toPlainText(input);
  const parts = plain.split(/(?<=[.!?])\s+/).filter(Boolean);
  const selected = parts.slice(0, maxSentences);
  if (selected.length > 0) return selected.join(' ');
  return plain.slice(0, 260);
}

function pickKeywords(input: string, max: number = 6): string[] {
  const stop = new Set(['the', 'and', 'for', 'that', 'with', 'from', 'this', 'your', 'have', 'will', 'about', 'into', 'when', 'then', 'than', 'what', 'where', 'which', 'while', 'were', 'been', 'their', 'there', 'also', 'just', 'into', 'using', 'used', 'use', 'how']);
  const words = toPlainText(input)
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !stop.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

function clampText(input: string, limit: number = MAX_PROMPT_CHARS): string {
  if (input.length <= limit) return input;
  const head = input.slice(0, Math.floor(limit * 0.65));
  const tail = input.slice(-Math.floor(limit * 0.25));
  return `${head}\n\n...[content trimmed for token safety]...\n\n${tail}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('AI request timeout')), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function makeCacheKey(systemPrompt: string, prompt: string): string {
  return `${systemPrompt.slice(0, 120)}::${prompt.slice(0, 1000)}`;
}

function writeCache(key: string, value: string): void {
  if (responseCache.size >= CACHE_LIMIT) {
    const firstKey = responseCache.keys().next().value;
    if (firstKey) {
      responseCache.delete(firstKey);
    }
  }
  responseCache.set(key, value);
}

async function callGroq(prompt: string, systemPrompt: string, maxTokens: number = DEFAULT_MAX_TOKENS): Promise<AIResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  let lastError: Error | null = null;
  for (const model of GROQ_MODELS) {
    try {
      const response = await withTimeout(fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: clampText(prompt) },
          ],
          temperature: 0.55,
          max_tokens: maxTokens,
        }),
      }), AI_TIMEOUT_MS);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq(${model}) error: ${error}`);
      }

      const data = await response.json();
      return { content: data.choices?.[0]?.message?.content || '' };
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw new Error(lastError?.message || 'All Groq free model attempts failed');
}

async function callOpenRouter(prompt: string, systemPrompt: string, maxTokens: number = DEFAULT_MAX_TOKENS): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  let lastError: Error | null = null;
  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      const response = await withTimeout(fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Remembra Learning App',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: clampText(prompt) },
          ],
          temperature: 0.55,
          max_tokens: maxTokens,
        }),
      }), AI_TIMEOUT_MS);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter(${model}) error: ${error}`);
      }

      const data = await response.json();
      return { content: data.choices?.[0]?.message?.content || '' };
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw new Error(lastError?.message || 'All OpenRouter free model attempts failed');
}

function generateDemoResponse(prompt: string, systemPrompt: string): string {
  if (systemPrompt.includes('daily reminder')) {
    return 'Small steps win memory. Review your due cards now and lock in today\'s recall.';
  }

  if (systemPrompt.includes('review reminder')) {
    return 'Quick reminder: this card is due in your 1-4-7 schedule. A short review now keeps it durable.';
  }

  if (systemPrompt.includes('summary')) {
    const summary = firstSentences(prompt, 2);
    return `This topic focuses on ${summary}. Use active recall to explain it in your own words, then connect each idea to one practical example.`;
  }

  if (systemPrompt.includes('bullet')) {
    const keywords = pickKeywords(prompt, 5);
    return JSON.stringify([
      ...keywords.map((k) => `Define and explain ${k} in one sentence`),
      'Connect each key point with one real-world example',
      'Review using short active recall prompts',
      'Track weak areas and revise again quickly',
    ]);
  }

  if (systemPrompt.includes('flowchart') || systemPrompt.includes('mermaid')) {
    return `graph TD
A[Read Content] --> B[Extract Core Ideas]
B --> C[Generate Prompts]
C --> D[Review on Day 1]
D --> E[Review on Day 4]
E --> F[Review on Day 7]
F --> G{Stable Recall?}
G -->|Yes| H[Mastered]
G -->|No| I[Reset to Day 1]\nI --> D`;
  }

  return `AI response placeholder for prompt: ${prompt.slice(0, 80)}...`;
}

async function callAI(
  prompt: string,
  systemPrompt: string,
  options?: { maxTokens?: number; skipCache?: boolean },
): Promise<string> {
  const maxTokens = options?.maxTokens ?? DEFAULT_MAX_TOKENS;
  const key = makeCacheKey(systemPrompt, prompt);

  if (!options?.skipCache && responseCache.has(key)) {
    return responseCache.get(key) || '';
  }

  if (OPENROUTER_API_KEY) {
    try {
      const result = await callOpenRouter(prompt, systemPrompt, maxTokens);
      writeCache(key, result.content);
      return result.content;
    } catch (error) {
      console.warn('OpenRouter API failed, trying fallback:', error);
    }
  }

  if (GROQ_API_KEY) {
    try {
      const result = await callGroq(prompt, systemPrompt, maxTokens);
      writeCache(key, result.content);
      return result.content;
    } catch (error) {
      console.warn('Groq API failed:', error);
    }
  }

  const demo = generateDemoResponse(prompt, systemPrompt);
  writeCache(key, demo);
  return demo;
}

function parseJsonArraySafely(input: string): string[] {
  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => String(v)).filter(Boolean);
    }
  } catch {
    // no-op
  }

  return input
    .split('\n')
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

export const aiService = {
  isConfigured(): boolean {
    return !!(GROQ_API_KEY || OPENROUTER_API_KEY);
  },

  getProviderStatus(): {
    hasGroq: boolean;
    hasOpenRouter: boolean;
    preferredReasoningModel: string;
    mode: 'live' | 'fallback';
  } {
    const preferredReasoningModel = OPENROUTER_API_KEY
      ? OPENROUTER_FREE_MODELS[0]
      : GROQ_MODELS[0];

    return {
      hasGroq: !!GROQ_API_KEY,
      hasOpenRouter: !!OPENROUTER_API_KEY,
      preferredReasoningModel,
      mode: GROQ_API_KEY || OPENROUTER_API_KEY ? 'live' : 'fallback',
    };
  },

  async generateSummary(content: string, title: string): Promise<string> {
    const systemPrompt = 'You are a learning assistant helping users with 1-4-7 spaced review. Produce a concise 2-3 sentence memory-focused summary.';
    const prompt = `Title: ${title}\n\nContent:\n${clampText(content)}\n\nProvide a brief memorable summary.`;
    return callAI(prompt, systemPrompt);
  },

  async generateBulletPoints(content: string, title: string): Promise<string[]> {
    const systemPrompt = 'You are a learning assistant. Return ONLY a JSON array with 3-8 concise bullet points for memorization.';
    const prompt = `Title: ${title}\n\nContent:\n${clampText(content)}\n\nReturn a JSON string array.`;
    const response = await callAI(prompt, systemPrompt);
    return parseJsonArraySafely(response).slice(0, 8);
  },

  async generateFlowchart(content: string, title: string): Promise<string> {
    const systemPrompt = 'Create valid Mermaid syntax only (graph TD or graph LR), no code fences, 5-12 nodes, clean labels.';
    const prompt = `Title: ${title}\n\nContent:\n${clampText(content)}\n\nCreate Mermaid flowchart.`;
    const result = await callAI(prompt, systemPrompt);
    return result.trim();
  },

  async explainCode(code: string, language?: string): Promise<string> {
    const systemPrompt = 'You are a concise programming tutor. Explain behavior, key structures, and likely pitfalls.';
    const prompt = `${language ? `Language: ${language}\n\n` : ''}Code:\n\`\`\`\n${clampText(code)}\n\`\`\`\n\nExplain this code.`;
    return callAI(prompt, systemPrompt);
  },

  async generateQuizQuestions(content: string, title: string, count: number = 3): Promise<{ question: string; answer: string }[]> {
    const systemPrompt = `Generate ${count} quiz Q&A pairs. Return ONLY valid JSON array with objects containing question and answer.`;
    const prompt = `Title: ${title}\n\nContent:\n${clampText(content)}\n\nReturn JSON.`;
    const response = await callAI(prompt, systemPrompt);

    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed
          .map((q) => ({ question: String(q.question || ''), answer: String(q.answer || '') }))
          .filter((q) => q.question && q.answer)
          .slice(0, count);
      }
    } catch {
      // no-op
    }

    const keywords = pickKeywords(`${title} ${content}`, count);
    if (keywords.length === 0) {
      return [{ question: 'What is the core concept in this topic?', answer: 'Explain the main idea and why it matters.' }];
    }
    return keywords.map((k) => ({
      question: `What is ${k}, and how is it used in this topic?`,
      answer: `Define ${k} clearly and give one practical example.`,
    }));
  },

  async generateMnemonics(content: string, title: string): Promise<string> {
    const systemPrompt = 'You are a memory expert. Create mnemonic hooks, analogies, and short recall cues.';
    const prompt = `Title: ${title}\n\nContent:\n${clampText(content)}\n\nCreate memory aids.`;
    return callAI(prompt, systemPrompt);
  },

  async chat(content: string, title: string, userMessage: string): Promise<string> {
    const systemPrompt = 'You are a helpful learning assistant. Answer clearly and practically in 3-8 sentences.';
    const prompt = `Study Material:\nTitle: ${title}\nContent: ${clampText(content)}\n\nUser Question: ${userMessage}`;
    const answer = await callAI(prompt, systemPrompt);
    return answer.trim();
  },

  async generateReviewReminderMessage(title: string, stage: number): Promise<string> {
    const systemPrompt = 'Write one short review reminder (max 18 words) for a 1-4-7 schedule. Mention momentum and recall.';
    const prompt = `Item title: ${title}\nCurrent stage: ${stage}\nReturn one sentence.`;
    const response = await callAI(prompt, systemPrompt, { maxTokens: 60 });
    return response.replace(/\s+/g, ' ').trim().slice(0, 180);
  },

  async generateDailyReminderSummary(itemTitles: string[], dueCount: number): Promise<string> {
    const joined = itemTitles.slice(0, 5).join(', ');
    const systemPrompt = 'Write one motivating daily reminder (max 22 words) for today\'s study queue with practical tone.';
    const prompt = `Due count: ${dueCount}\nItems: ${joined || 'none'}\nReturn one sentence daily reminder.`;
    const response = await callAI(prompt, systemPrompt, { maxTokens: 80 });
    return response.replace(/\s+/g, ' ').trim().slice(0, 200);
  },
};
