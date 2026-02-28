// AI service tuned for free-tier providers with quality guards and deterministic fallbacks.

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MAX_PROMPT_CHARS = 48000;
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.35;
const DEFAULT_TOP_P = 0.92;
const DEFAULT_PRESENCE_PENALTY = 0.15;
const DEFAULT_FREQUENCY_PENALTY = 0.2;
const AI_TIMEOUT_MS = 60000;
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

  // Extract richer context from the prompt for better fallbacks
  const titleMatch = prompt.match(/Title:\s*(.+?)(?:\n|$)/i);
  const title = titleMatch?.[1]?.trim() || 'this topic';
  const sentences = firstSentences(prompt, 5);
  const keywords = pickKeywords(prompt, 8);
  const topKw = keywords.slice(0, 4);
  const extraKw = keywords.slice(4);

  if (systemPrompt.includes('summary') || systemPrompt.includes('Core Idea')) {
    const kwDefs = topKw.length > 0
      ? topKw.map((k, i) => `- **${k}**: A ${i % 2 === 0 ? 'foundational' : 'supporting'} concept in ${title} that shapes how the topic is applied and understood`).join('\n')
      : '- Identify the central concepts\n- Map how ideas depend on each other';
    const deepDive = topKw.length >= 2
      ? `The relationship between **${topKw[0]}** and **${topKw[1]}** is central to understanding ${title}. ${topKw[0]} provides the foundation, while ${topKw[1]} extends it into practical application. A common misconception is treating them independently — they are deeply interconnected.`
      : `The core ideas in ${title} form an interconnected system. Understanding any single concept in isolation misses the bigger picture.`;
    return [
      '### Core Idea',
      sentences,
      '',
      '### Key Concepts',
      kwDefs,
      ...(extraKw.length > 0 ? extraKw.map(k => `- **${k}**: Plays a specific role in the broader framework`) : []),
      '',
      '### Deep Dive',
      deepDive,
      '',
      '### How It Connects',
      `The concepts in ${title} form a progression: ${topKw.join(' → ') || 'foundation → application → mastery'}. Each builds on the previous, and understanding this chain is key to retention.`,
      '',
      '### Recall Cues',
      `- Explain **${topKw[0] || 'the core concept'}** in your own words without looking at the material`,
      `- How does **${topKw[1] || 'the second concept'}** depend on **${topKw[0] || 'the first'}**?`,
      `- Give a real-world example where ${title} concepts apply`,
      '- What would break if you removed one key concept from the chain?',
      `- Teach **${topKw[2] || 'one concept'}** to someone with no background — what would you say?`,
    ].join('\n');
  }

  if (systemPrompt.includes('bullet') || systemPrompt.includes('JSON array')) {
    const bullets: string[] = [];
    topKw.forEach((k, i) => {
      bullets.push(`${k} is a core building block — defines the ${i % 2 === 0 ? 'structure' : 'behavior'} of the system`);
      if (i < topKw.length - 1) {
        bullets.push(`${k} directly influences ${topKw[i + 1]} through a dependent relationship`);
      }
    });
    extraKw.forEach(k => bullets.push(`${k} extends the model with specialized functionality`));
    bullets.push(`Understanding ${title} requires connecting all concepts, not memorizing them individually`);
    return JSON.stringify(bullets.slice(0, 12));
  }

  if (systemPrompt.includes('Mermaid') || systemPrompt.includes('flowchart') || systemPrompt.includes('mermaid')) {
    const nodes = keywords.length >= 3
      ? keywords.slice(0, 6)
      : ['Input', 'Process', 'Transform', 'Validate', 'Output'];
    const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/[^a-zA-Z0-9 ]/g, '');
    const lines = ['graph TD'];
    // Build a richer graph with branching
    lines.push(`${ids[0]}[${cap(nodes[0])}] --> ${ids[1]}[${cap(nodes[1] || 'Analyze')}]`);
    if (nodes.length >= 3) {
      lines.push(`${ids[1]} --> ${ids[2]}[${cap(nodes[2])}]`);
      lines.push(`${ids[2]} --> ${ids[3]}{Review?}`);
      lines.push(`${ids[3]} -->|Yes| ${ids[4]}[${cap(nodes[3] || 'Apply')}]`);
      lines.push(`${ids[3]} -->|No| ${ids[1]}`);
      if (nodes.length >= 5) {
        lines.push(`${ids[4]} --> ${ids[5]}[${cap(nodes[4])}]`);
        lines.push(`${ids[5]} --> ${ids[6]}[Mastered]`);
      } else {
        lines.push(`${ids[4]} --> ${ids[5]}[Mastered]`);
      }
    } else {
      lines.push(`${ids[1]} --> ${ids[2]}{Understood?}`);
      lines.push(`${ids[2]} -->|Yes| ${ids[3]}[Mastered]`);
      lines.push(`${ids[2]} -->|No| ${ids[0]}`);
    }
    return lines.join('\n');
  }

  if (systemPrompt.includes('mnemonic') || systemPrompt.includes('memory')) {
    const acronym = topKw.map(k => k.charAt(0).toUpperCase()).join('');
    return [
      '### Acronym / First-Letter Mnemonics',
      topKw.length >= 2
        ? `**${acronym}** — ${topKw.map((k) => `${k.charAt(0).toUpperCase()} = ${k}`).join(', ')}`
        : `Create an acronym from the first letters of key terms in ${title}`,
      '',
      '### Visual Memory Hooks',
      ...topKw.map((k, i) => `- Picture **${k}** as a ${['glowing crystal', 'spinning gear', 'flowing river', 'towering lighthouse'][i % 4]} — each time you see it, it ${['pulses with energy', 'clicks into the next piece', 'carries data downstream', 'illuminates everything around it'][i % 4]}`),
      '',
      '### Story Link',
      `You open a door labeled "${title}". Inside, ${topKw[0] || 'the first concept'} greets you as a guide and walks you through a series of rooms. In the second room, ${topKw[1] || 'the next concept'} is solving a puzzle that ${topKw[2] || 'the third idea'} created. By the final room, everything connects — ${topKw[3] || 'the conclusion'} hands you a key that unlocks total understanding.`,
      '',
      '### Analogy Bridge',
      topKw.length >= 2
        ? `Think of **${topKw[0]}** like the foundation of a house and **${topKw[1]}** like the walls. Without ${topKw[0]}, nothing stands, and ${topKw[1]} gives it structure and shape.`
        : `Connect each concept to a building: foundation, walls, roof, windows — each has a role.`,
      '',
      '### Rhythm & Rhyme',
      topKw.length >= 3
        ? `"${topKw[0]} starts the show, ${topKw[1]} makes it grow, ${topKw[2]} is what you need to know."`
        : `Create a short rhyme linking the key terms together.`,
      '',
      '### 10-Second Rapid Recall',
      `${keywords.join(' → ')} → Complete Understanding`,
    ].join('\n');
  }

  if (systemPrompt.includes('quiz') || systemPrompt.includes('question')) {
    const qa: { question: string; answer: string }[] = [];
    if (topKw.length >= 1) {
      qa.push({
        question: `What is ${topKw[0]} and what role does it play in ${title}?`,
        answer: `${topKw[0]} is a foundational concept in ${title}. It establishes the baseline for understanding how the system works and connects to other components.`,
      });
    }
    if (topKw.length >= 2) {
      qa.push({
        question: `How do ${topKw[0]} and ${topKw[1]} relate to each other?`,
        answer: `${topKw[0]} provides the foundation that ${topKw[1]} builds upon. They work together to form the core mechanism described in the material.`,
      });
    }
    if (topKw.length >= 3) {
      qa.push({
        question: `If you had to explain ${topKw[2]} to a beginner, what analogy would you use?`,
        answer: `${topKw[2]} can be compared to a key component in an everyday system. The important thing is understanding its specific function within ${title}.`,
      });
    }
    extraKw.forEach(k => {
      qa.push({
        question: `Why is ${k} important in the context of ${title}?`,
        answer: `${k} extends the core concepts by adding a specific capability. Without it, the system described in ${title} would be incomplete.`,
      });
    });
    if (qa.length === 0) {
      qa.push({
        question: `What is the central idea of ${title}?`,
        answer: 'Explain the main idea, its components, and one concrete example of how it applies.',
      });
    }
    return JSON.stringify(qa.slice(0, 8));
  }

  return `### Key Takeaway\n${sentences}\n\n### Key Terms\n${topKw.map(k => `- **${k}**`).join('\n') || '- Review the material for key terms'}\n\n### Recall Check\n- Can you explain ${title} in your own words?\n- What are the relationships between the main ideas?\n- Give one practical application of these concepts`;
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
        // If first answer is too short/noisy, retry with larger budget and lower temperature.
        maxTokens: attempt === 0
          ? effectiveOptions.maxTokens
          : Math.min(6000, Math.round((effectiveOptions.maxTokens || DEFAULT_MAX_TOKENS) * 1.5)),
        temperature: attempt === 0
          ? effectiveOptions.temperature
          : Math.max(0.15, (effectiveOptions.temperature || DEFAULT_TEMPERATURE) - 0.1),
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
      'You are Remembra AI, an expert memory-retention and learning coach.',
      'You MUST read and deeply analyze the FULL content provided below.',
      'Your summary must be SPECIFIC to the actual material — reference exact concepts, terms, definitions, code patterns, or facts from the content.',
      'DO NOT produce generic study advice. Every sentence must directly relate to the provided content.',
      'AVOID repetitive sentence structures. Vary your language, sentence length, and explanation style.',
      '',
      'Return well-structured markdown with these sections:',
      '',
      '### Core Idea',
      'Explain the central concept or thesis from the content in 3-5 sentences. Name specific terms, theories, or patterns. Why does this topic matter?',
      '',
      '### Key Concepts',
      'List 4-8 specific concepts, definitions, or patterns found in the material. Use bullet points. Each bullet should include: the term/concept name, a precise definition, and how it relates to the broader topic.',
      '',
      '### Deep Dive',
      'Expand on the 2-3 most complex or nuanced ideas from the content. Explain edge cases, common misconceptions, or subtle distinctions that are easy to overlook.',
      '',
      '### How It Connects',
      'Explain how the concepts relate to each other and to broader knowledge. Draw specific parallels, dependencies, or contrasts between concepts in the material.',
      '',
      '### Recall Cues',
      'Create 4-6 targeted recall prompts derived from the actual content that test understanding at different levels (definition, application, analysis).',
      '',
      'Rules: No fluff. No generic advice. Every point must reference actual content. Do not mention you are an AI. Aim for thoroughness — a reader should fully understand the material from your summary alone.',
    ].join('\n');
    const prompt = `Title: ${title}\n\n--- FULL CONTENT START ---\n${clampText(content)}\n--- FULL CONTENT END ---\n\nAnalyze the above content thoroughly and produce a detailed, content-specific study summary.`;
    return callAI(prompt, systemPrompt, {
      maxTokens: 3200,
      temperature: 0.35,
      topP: 0.92,
      minLength: 350,
    });
  },

  async generateBulletPoints(content: string, title: string): Promise<string[]> {
    const systemPrompt = [
      'You are an expert learning assistant specialized in extracting key points for memory retention.',
      'Read the FULL content below carefully. Extract the most important and specific facts, concepts, and takeaways.',
      'Each bullet point MUST reference specific information from the content — not generic study tips.',
      '',
      'Return ONLY a valid JSON array with 6-12 concise bullet strings.',
      'Each bullet should capture a distinct fact, definition, pattern, or insight from the material.',
      'Each bullet should be 10-25 words and specific enough to serve as a recall trigger.',
      'VARY the structure of bullets — mix definitions, relationships, examples, and key distinctions.',
      'Cover different aspects of the content, not just the introduction.',
      'No markdown fences. No explanations outside the JSON array.',
    ].join('\n');
    const prompt = `Title: ${title}\n\n--- FULL CONTENT ---\n${clampText(content)}\n--- END ---\n\nExtract the most important factual points from the above content as a JSON array of strings.`;
    const response = await callAI(prompt, systemPrompt, {
      maxTokens: 1600,
      temperature: 0.25,
      topP: 0.88,
      minLength: 60,
    });
    return parseJsonArraySafely(response).slice(0, 12);
  },

  async generateFlowchart(content: string, title: string): Promise<string> {
    const systemPrompt = [
      'You are a Mermaid.js diagram expert. Generate ONLY valid Mermaid flowchart syntax.',
      '',
      'STRICT RULES — violating any will cause rendering failure:',
      '1. The FIRST line must be exactly: graph TD',
      '2. Use ONLY single-letter or short alphanumeric IDs: A, B, C, D1, E2, etc.',
      '3. Node labels use square brackets ONLY: A[My Label]',
      '4. Arrows use --> only (no other arrow types)',
      '5. For decision nodes use curly braces: D{Decision?}',
      '6. Keep all labels under 25 characters — NO special characters like quotes, parentheses, colons, or semicolons inside labels',
      '7. Use 5-12 nodes maximum',
      '8. Every node ID must be unique',
      '9. Every arrow must connect two defined nodes',
      '10. NO markdown fences (no ```), NO comments, NO explanations — output ONLY the diagram code',
      '11. Each connection must be on its own line',
      '12. Do NOT use subgraph unless absolutely necessary',
      '',
      'VALID EXAMPLE:',
      'graph TD',
      'A[Read Topic] --> B[Extract Ideas]',
      'B --> C{Understood?}',
      'C -->|Yes| D[Practice]',
      'C -->|No| E[Review Again]',
      'E --> A',
      'D --> F[Mastered]',
    ].join('\n');
    const prompt = `Topic: ${title}\n\nContent:\n${clampText(content, 6000)}\n\nCreate a Mermaid flowchart showing the key concepts and their relationships from the content above. Output ONLY valid Mermaid code, no explanations.`;
    const result = await callAI(prompt, systemPrompt, {
      maxTokens: 1400,
      temperature: 0.15,
      topP: 0.85,
      minLength: 60,
    });
    
    let normalized = normalizeMermaid(result);
    
    // Sanitize: remove any problematic characters from node labels
    normalized = normalized
      .replace(/["'`]/g, '')
      .replace(/\(\(/g, '[')
      .replace(/\)\)/g, ']')
      .replace(/\[\[/g, '[')
      .replace(/\]\]/g, ']');
    
    // Validate the generated chart
    const firstLine = normalized.split('\n')[0]?.trim().toLowerCase() || '';
    if (!firstLine.startsWith('graph') && !firstLine.startsWith('flowchart')) {
      // Check if it contains arrow syntax — add header
      if (normalized.includes('-->') || normalized.includes('---')) {
        normalized = 'graph TD\n' + normalized;
      } else {
        console.warn('[AI] Flowchart invalid, using fallback');
        const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 20);
        return `graph TD\nA[${safeTitle}] --> B[Core Concept]\nB --> C[Application]\nC --> D[Review]\nD --> E[Mastery]`;
      }
    }
    
    return normalized;
  },

  async explainCode(code: string, language?: string): Promise<string> {
    const systemPrompt = [
      'You are an expert programming tutor. Analyze the provided code thoroughly.',
      'Read EVERY line carefully. Your explanation must be SPECIFIC to this exact code.',
      'NEVER use generic descriptions. Reference actual variable names, function names, and logic from the code.',
      '',
      'Respond in well-structured markdown:',
      '',
      '### What It Does',
      'Explain the purpose and functionality in 3-5 sentences. Reference specific functions, variables, classes, and the overall architecture.',
      '',
      '### Step-by-Step Flow',
      'Walk through the execution flow in detail. Explain each major block of logic, what triggers it, and what it produces. Use numbered steps.',
      '',
      '### Key Patterns & Techniques',
      'Identify design patterns, algorithms, data structures, or techniques used in the code. Explain WHY they are used here (not just what they are).',
      '',
      '### Dependencies & Side Effects',
      'List external dependencies, state mutations, API calls, or side effects. Explain what the code reads from and writes to.',
      '',
      '### Risks and Edge Cases',
      'Point out specific bugs, missing error handling, edge cases, race conditions, or performance issues. Be precise about what could go wrong.',
      '',
      '### Improvement Suggestions',
      'Suggest 2-4 concrete improvements with brief code snippets or pseudocode where helpful.',
      '',
      '### Quick Recall Checklist',
      'Create 4-6 specific recall questions about this code that test understanding of its logic, not just syntax.',
      '',
      'Be precise, technical, and reference actual code elements throughout.',
    ].join('\n');
    const prompt = `${language ? `Language: ${language}\n\n` : ''}Code:\n\`\`\`\n${clampText(code)}\n\`\`\`\n\nProvide a thorough, code-specific explanation.`;
    return callAI(prompt, systemPrompt, {
      maxTokens: 3500,
      temperature: 0.3,
      topP: 0.92,
      minLength: 400,
    });
  },

  async generateQuizQuestions(content: string, title: string, count: number = 5): Promise<{ question: string; answer: string }[]> {
    const safeCount = Math.max(1, Math.min(12, count));
    const systemPrompt = [
      'You are an expert educator creating active recall quiz questions.',
      'Read the FULL content below. Every question MUST test knowledge of specific facts, concepts, or details from the content.',
      'DO NOT create generic questions. Each question should test a different aspect of the material.',
      'VARY question types: include definitional, comparative, application-based, and analytical questions.',
      '',
      `Generate exactly ${safeCount} quiz pairs.`,
      'Return ONLY a valid JSON array. Each object must have "question" and "answer" string keys.',
      'Questions should require understanding, not just keyword matching.',
      'Include at least one question that requires applying the concept to a new scenario.',
      'Include at least one question that tests understanding of relationships between concepts.',
      'Answers should be concise but complete (1-4 sentences).',
      'No markdown fences or extra text outside the JSON array.',
    ].join('\n');
    const prompt = `Title: ${title}\n\n--- FULL CONTENT ---\n${clampText(content)}\n--- END ---\n\nGenerate ${safeCount} content-specific quiz questions as a JSON array.`;
    const response = await callAI(prompt, systemPrompt, {
      maxTokens: 2800,
      temperature: 0.45,
      topP: 0.93,
      minLength: 150,
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
      'You are a world-class memory coach and mnemonic expert.',
      'Read the FULL content below. Create memory aids SPECIFICALLY tied to the actual concepts, terms, and facts in the material.',
      'DO NOT create generic mnemonics. Every hook must reference real content from the material.',
      'Be creative and vivid — the stranger and more visual the mnemonic, the better it sticks.',
      '',
      'Return well-structured markdown:',
      '',
      '### Acronym / First-Letter Mnemonics',
      'Create 2-3 memorable acronyms using the first letters of key terms or steps from the content. Explain what each letter represents.',
      '',
      '### Visual Memory Hooks',
      'Create 3-5 vivid, bizarre, or humorous mental images that link key concepts together. Use sensory details (sight, sound, touch) to make them sticky.',
      '',
      '### Story Link',
      'Weave the main concepts into a short, dramatic, memorable narrative (4-6 sentences). Use the actual terms and facts from the content as characters or plot points.',
      '',
      '### Analogy Bridge',
      'Connect 2-3 main concepts to everyday familiar experiences using unexpected but logical parallels.',
      '',
      '### Rhythm & Rhyme',
      'Create a short rhyme, jingle, or rhythmic phrase that encodes the most critical facts.',
      '',
      '### 10-Second Rapid Recall',
      'A rapid-fire bullet sequence that captures ALL key points — designed to be read aloud in under 10 seconds.',
    ].join('\n');
    const prompt = `Title: ${title}\n\n--- FULL CONTENT ---\n${clampText(content)}\n--- END ---\n\nCreate content-specific memory aids and mnemonics based on the actual material above.`;
    return callAI(prompt, systemPrompt, {
      maxTokens: 3000,
      temperature: 0.6,
      topP: 0.95,
      minLength: 300,
    });
  },

  async chat(content: string, title: string, userMessage: string): Promise<string> {
    const systemPrompt = [
      'You are an expert AI study tutor with deep knowledge across all subjects.',
      'You have access to the student\'s full study material below. Use it as your knowledge base to give precise, context-aware answers.',
      '',
      'CRITICAL RULES:',
      '- If the material contains the answer, reference specific facts and concepts FROM the material with direct quotes or paraphrases.',
      '- If the question is about the material, analyze the actual content deeply to formulate your response.',
      '- If the question is beyond the material scope, use your general knowledge but clearly note the distinction.',
      '- Never give vague or generic advice when specific content-based answers are possible.',
      '- VARY your response format based on the question type — use code blocks for code questions, tables for comparisons, numbered steps for processes.',
      '- Think step by step for complex questions.',
      '',
      'Response format (markdown, adapt sections based on what is appropriate):',
      '',
      '### Direct Answer',
      'Give a clear, specific answer in 2-5 sentences. Reference content facts when applicable. Include examples.',
      '',
      '### Deeper Explanation',
      'Provide thorough context, additional examples, edge cases, or reasoning that deepens understanding. Go beyond surface-level explanations.',
      '',
      '### Practical Application',
      'If applicable, show how the concept applies in real-world scenarios or give a worked example.',
      '',
      '### Recall Check',
      'End with 1-2 targeted questions the student can use to verify their understanding.',
    ].join('\n');
    const prompt = content
      ? `--- STUDY MATERIAL ---\nTitle: ${title}\n\n${clampText(content)}\n--- END MATERIAL ---\n\nStudent Question: ${userMessage}`
      : `Student Question: ${userMessage}`;
    const answer = await callAI(prompt, systemPrompt, {
      maxTokens: 4000,
      temperature: 0.45,
      topP: 0.92,
      minLength: 200,
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
