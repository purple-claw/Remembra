// AI service tuned for free-tier providers with quality guards and deterministic fallbacks.

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MAX_PROMPT_CHARS = 24000;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_TOP_P = 0.9;
const DEFAULT_PRESENCE_PENALTY = 0.05;
const DEFAULT_FREQUENCY_PENALTY = 0.1;
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

interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  skipCache?: boolean;
  minLength?: number;
}

function toPlainText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`]/g, ' ')
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
  const stop = new Set([
    'the', 'and', 'for', 'that', 'with', 'from', 'this', 'your', 'have', 'will', 'about', 'into',
    'when', 'then', 'than', 'what', 'where', 'which', 'while', 'were', 'been', 'their', 'there',
    'also', 'just', 'using', 'used', 'use', 'how', 'each', 'should', 'them', 'they', 'only',
  ]);
  const words = toPlainText(input)
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3 && !stop.has(w));

  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }

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

function normalizeAIOutput(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function cleanSingleLine(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function makeCacheKey(systemPrompt: string, prompt: string, options: AIRequestOptions): string {
  const optionFingerprint = [
    options.maxTokens ?? DEFAULT_MAX_TOKENS,
    options.temperature ?? DEFAULT_TEMPERATURE,
    options.topP ?? DEFAULT_TOP_P,
    options.presencePenalty ?? DEFAULT_PRESENCE_PENALTY,
    options.frequencyPenalty ?? DEFAULT_FREQUENCY_PENALTY,
    options.minLength ?? 30,
  ].join('|');
  return `${systemPrompt.slice(0, 140)}::${prompt.slice(0, 1000)}::${optionFingerprint}`;
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

function lowQuality(content: string, minLength: number): boolean {
  const normalized = normalizeAIOutput(content);
  if (!normalized) return true;
  if (normalized.length < minLength) return true;
  if (/AI response placeholder/i.test(normalized)) return true;
  return false;
}

async function callGroq(prompt: string, systemPrompt: string, options: AIRequestOptions): Promise<AIResponse> {
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
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          top_p: options.topP ?? DEFAULT_TOP_P,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          presence_penalty: options.presencePenalty ?? DEFAULT_PRESENCE_PENALTY,
          frequency_penalty: options.frequencyPenalty ?? DEFAULT_FREQUENCY_PENALTY,
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

async function callOpenRouter(prompt: string, systemPrompt: string, options: AIRequestOptions): Promise<AIResponse> {
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
          temperature: options.temperature ?? DEFAULT_TEMPERATURE,
          top_p: options.topP ?? DEFAULT_TOP_P,
          max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
          presence_penalty: options.presencePenalty ?? DEFAULT_PRESENCE_PENALTY,
          frequency_penalty: options.frequencyPenalty ?? DEFAULT_FREQUENCY_PENALTY,
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

async function callLiveProvider(prompt: string, systemPrompt: string, options: AIRequestOptions): Promise<string> {
  if (OPENROUTER_API_KEY) {
    try {
      const result = await callOpenRouter(prompt, systemPrompt, options);
      return result.content;
    } catch (error) {
      console.warn('OpenRouter API failed, trying Groq:', error);
    }
  }

  if (GROQ_API_KEY) {
    const result = await callGroq(prompt, systemPrompt, options);
    return result.content;
  }

  throw new Error('No live provider configured');
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
    return [
      '### Core Idea',
      `This topic focuses on ${summary}.`,
      '',
      '### Why It Matters',
      'Use active recall and connect each concept to one real example.',
      '',
      '### Recall Cues',
      '- Explain it in your own words',
      '- Test one practical scenario',
      '- Revisit weak points in the next review',
    ].join('\n');
  }

  if (systemPrompt.includes('bullet')) {
    const keywords = pickKeywords(prompt, 5);
    return JSON.stringify([
      ...keywords.map((k) => `Define and explain ${k} in one sentence`),
      'Connect each point with a practical example',
      'Review using short active recall prompts',
    ]);
  }

  if (systemPrompt.includes('flowchart') || systemPrompt.includes('mermaid')) {
    return `graph TD
A[Read Topic] --> B[Extract Core Ideas]
B --> C[Create Recall Prompts]
C --> D[Review Day 1]
D --> E[Review Day 4]
E --> F[Review Day 7]
F --> G{Stable Recall?}
G -->|Yes| H[Mastered]
G -->|No| I[Reset to Day 1]
I --> D`;
  }

  return `Key takeaway: ${firstSentences(prompt, 1)}`;
}

async function callAI(prompt: string, systemPrompt: string, options: AIRequestOptions = {}): Promise<string> {
  const effectiveOptions: AIRequestOptions = {
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    topP: options.topP ?? DEFAULT_TOP_P,
    presencePenalty: options.presencePenalty ?? DEFAULT_PRESENCE_PENALTY,
    frequencyPenalty: options.frequencyPenalty ?? DEFAULT_FREQUENCY_PENALTY,
    minLength: options.minLength ?? 30,
    skipCache: options.skipCache ?? false,
  };

  const key = makeCacheKey(systemPrompt, prompt, effectiveOptions);
  if (!effectiveOptions.skipCache && responseCache.has(key)) {
    return responseCache.get(key) || '';
  }

  if (OPENROUTER_API_KEY || GROQ_API_KEY) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const attemptOptions: AIRequestOptions = {
        ...effectiveOptions,
        // If first answer is too short/noisy, retry with slightly larger budget and lower temperature.
        maxTokens: attempt === 0
          ? effectiveOptions.maxTokens
          : Math.min(2200, Math.round((effectiveOptions.maxTokens || DEFAULT_MAX_TOKENS) * 1.4)),
        temperature: attempt === 0
          ? effectiveOptions.temperature
          : Math.max(0.2, (effectiveOptions.temperature || DEFAULT_TEMPERATURE) - 0.1),
      };

      try {
        const live = normalizeAIOutput(await callLiveProvider(prompt, systemPrompt, attemptOptions));
        if (!lowQuality(live, effectiveOptions.minLength || 30)) {
          writeCache(key, live);
          return live;
        }
      } catch (error) {
        if (attempt === 1) {
          console.warn('Live AI generation failed, using fallback:', error);
        }
      }
    }
  }

  const demo = normalizeAIOutput(generateDemoResponse(prompt, systemPrompt));
  writeCache(key, demo);
  return demo;
}

function extractJsonArraySnippet(input: string): string | null {
  const fenced = input.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const start = input.indexOf('[');
  const end = input.lastIndexOf(']');
  if (start !== -1 && end !== -1 && end > start) {
    return input.slice(start, end + 1);
  }
  return null;
}

function parseJsonArraySafely(input: string): string[] {
  const snippet = extractJsonArraySnippet(input);
  if (snippet) {
    try {
      const parsed = JSON.parse(snippet);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v)).filter(Boolean);
      }
    } catch {
      // no-op
    }
  }

  return input
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.()]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeMermaid(input: string): string {
  return input
    .replace(/```mermaid/gi, '')
    .replace(/```/g, '')
    .trim();
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
    const systemPrompt = [
      'You are Remembra AI, a memory-retention coach.',
      'Return concise markdown with sections:',
      '### Core Idea',
      '### Why It Matters',
      '### Recall Cues',
      'No fluff. Use practical wording. Avoid mentioning you are an AI.',
    ].join(' ');
    const prompt = `Title: ${title}\n\nContent:\n${clampText(content)}\n\nCreate a concise study summary.`;
    return callAI(prompt, systemPrompt, {
      maxTokens: 520,
      temperature: 0.3,
      topP: 0.9,
      minLength: 140,
    });
  },

  async generateBulletPoints(content: string, title: string): Promise<string[]> {
    const systemPrompt = [
      'You are a learning assistant.',
      'Return ONLY a valid JSON array with 4-8 concise bullet strings.',
      'Each bullet must be actionable for recall and at most 14 words.',
      'No markdown fences.',
    ].join(' ');
    const prompt = `Title: ${title}\n\nContent:\n${clampText(content)}\n\nReturn JSON array only.`;
    const response = await callAI(prompt, systemPrompt, {
      maxTokens: 420,
      temperature: 0.2,
      topP: 0.85,
      minLength: 24,
    });
    return parseJsonArraySafely(response).slice(0, 8);
  },

  async generateFlowchart(content: string, title: string): Promise<string> {
    const systemPrompt = [
      'You are a Mermaid diagram generation expert.',
      'Generate ONLY valid Mermaid flowchart syntax.',
      'Rules:',
      '1. Start with exactly "graph TD" or "graph LR"',
      '2. Use square brackets for nodes: A[Label Text]',
      '3. Use arrows: --> or ---',
      '4. Keep labels under 20 characters',
      '5. Use 5-12 nodes total',
      '6. NO markdown fences, NO explanations, ONLY the diagram code',
      '7. Test all node IDs are unique (A, B, C, etc.)',
      '8. Ensure all arrows point to defined nodes',
      'Example: graph TD\\nA[Start] --> B[Process]\\nB --> C[End]',
    ].join(' ');
    const prompt = `Topic: ${title}\n\nContent:\n${clampText(content, 3000)}\n\nGenerate Mermaid flowchart code only (no markdown fences).`;
    const result = await callAI(prompt, systemPrompt, {
      maxTokens: 850,
      temperature: 0.15,
      topP: 0.8,
      minLength: 40,
    });
    
    const normalized = normalizeMermaid(result);
    
    // Validate the generated chart
    if (!normalized.trim().toLowerCase().startsWith('graph')) {
      console.warn('[AI] Flowchart missing graph header, adding fallback');
      return `graph TD\nA[${title}] --> B[Core Concept]\nB --> C[Application]\nC --> D[Review]\nD --> E[Mastery]`;
    }
    
    return normalized;
  },

  async explainCode(code: string, language?: string): Promise<string> {
    const systemPrompt = [
      'You are a precise programming tutor.',
      'Respond in markdown with sections:',
      '### What It Does',
      '### How It Flows',
      '### Risks and Edge Cases',
      '### Quick Recall Checklist',
      'Keep it practical and concise.',
    ].join(' ');
    const prompt = `${language ? `Language: ${language}\n\n` : ''}Code:\n\`\`\`\n${clampText(code)}\n\`\`\`\n\nExplain this code.`;
    return callAI(prompt, systemPrompt, {
      maxTokens: 980,
      temperature: 0.3,
      topP: 0.9,
      minLength: 180,
    });
  },

  async generateQuizQuestions(content: string, title: string, count: number = 3): Promise<{ question: string; answer: string }[]> {
    const safeCount = Math.max(1, Math.min(8, count));
    const systemPrompt = [
      `Generate exactly ${safeCount} quiz pairs for active recall.`,
      'Return ONLY valid JSON array.',
      'Each object must contain string keys: question, answer.',
      'No markdown fences or extra text.',
    ].join(' ');
    const prompt = `Title: ${title}\n\nContent:\n${clampText(content)}\n\nReturn JSON only.`;
    const response = await callAI(prompt, systemPrompt, {
      maxTokens: 900,
      temperature: 0.45,
      topP: 0.92,
      minLength: 80,
    });

    const snippet = extractJsonArraySnippet(response);
    if (snippet) {
      try {
        const parsed = JSON.parse(snippet);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((q) => ({
              question: String(q.question || '').trim(),
              answer: String(q.answer || '').trim(),
            }))
            .filter((q) => q.question && q.answer)
            .slice(0, safeCount);
          if (normalized.length > 0) {
            return normalized;
          }
        }
      } catch {
        // no-op
      }
    }

    const keywords = pickKeywords(`${title} ${content}`, safeCount);
    if (keywords.length === 0) {
      return [{
        question: 'What is the core concept in this topic?',
        answer: 'Explain the main idea, why it matters, and one practical example.',
      }];
    }
    return keywords.map((k) => ({
      question: `What is ${k}, and why is it important here?`,
      answer: `Define ${k} clearly and give one concrete example.`,
    }));
  },

  async generateMnemonics(content: string, title: string): Promise<string> {
    const systemPrompt = [
      'You are a memory expert.',
      'Create mnemonic hooks that are vivid and easy to recall.',
      'Return markdown with sections:',
      '### Mnemonic Hooks',
      '### Story Link',
      '### 10-Second Recall Script',
    ].join(' ');
    const prompt = `Title: ${title}\n\nContent:\n${clampText(content)}\n\nCreate memory aids.`;
    return callAI(prompt, systemPrompt, {
      maxTokens: 760,
      temperature: 0.7,
      topP: 0.95,
      minLength: 140,
    });
  },

  async chat(content: string, title: string, userMessage: string): Promise<string> {
    const systemPrompt = [
      'You are an advanced study tutor for spaced repetition.',
      'Answer with practical reasoning, not generic advice.',
      'Use markdown and include:',
      '1) Direct Answer',
      '2) Why This Works',
      '3) One Recall Question',
    ].join(' ');
    const prompt = `Study Material:\nTitle: ${title}\nContent: ${clampText(content)}\n\nUser Question: ${userMessage}`;
    const answer = await callAI(prompt, systemPrompt, {
      maxTokens: 1000,
      temperature: 0.45,
      topP: 0.9,
      minLength: 120,
      skipCache: true,
    });
    return answer.trim();
  },

  async generateReviewReminderMessage(title: string, stage: number): Promise<string> {
    const systemPrompt = 'Write one short review reminder (max 18 words) for a 1-4-7 schedule. Mention momentum and recall.';
    const prompt = `Item title: ${title}\nCurrent stage: ${stage}\nReturn one sentence.`;
    const response = await callAI(prompt, systemPrompt, {
      maxTokens: 60,
      temperature: 0.5,
      topP: 0.9,
      minLength: 14,
      skipCache: true,
    });
    return cleanSingleLine(response).slice(0, 180);
  },

  async generateDailyReminderSummary(itemTitles: string[], dueCount: number): Promise<string> {
    const joined = itemTitles.slice(0, 5).join(', ');
    const systemPrompt = 'Write one motivating daily reminder (max 22 words) for today\'s study queue with practical tone.';
    const prompt = `Due count: ${dueCount}\nItems: ${joined || 'none'}\nReturn one sentence daily reminder.`;
    const response = await callAI(prompt, systemPrompt, {
      maxTokens: 80,
      temperature: 0.55,
      topP: 0.9,
      minLength: 16,
      skipCache: true,
    });
    return cleanSingleLine(response).slice(0, 200);
  },
};
