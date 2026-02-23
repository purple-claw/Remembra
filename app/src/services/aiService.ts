// AI service tuned for free-tier providers with quality guards and deterministic fallbacks.

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MAX_PROMPT_CHARS = 48000;
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.35;
const DEFAULT_TOP_P = 0.92;
const DEFAULT_PRESENCE_PENALTY = 0.05;
const DEFAULT_FREQUENCY_PENALTY = 0.1;
const AI_TIMEOUT_MS = 45000;
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

  if (systemPrompt.includes('summary') || systemPrompt.includes('Core Idea')) {
    const summary = firstSentences(prompt, 3);
    const keywords = pickKeywords(prompt, 4);
    const keywordBullets = keywords.length > 0
      ? keywords.map(k => `- **${k}**: Understand its role and how it connects to the topic`).join('\n')
      : '- Identify the central concepts\n- Understand the relationships between ideas';
    return [
      '### Core Idea',
      `${summary}`,
      '',
      '### Key Concepts',
      keywordBullets,
      '',
      '### How It Connects',
      'Each concept builds on the previous one. Understanding the relationships between these elements is key to lasting retention.',
      '',
      '### Recall Cues',
      '- Can you explain each key concept in your own words?',
      '- What are the relationships between the main ideas?',
      '- Give one practical example for the most important concept',
      '- What would change if a key assumption were different?',
    ].join('\n');
  }

  if (systemPrompt.includes('bullet') || systemPrompt.includes('JSON array')) {
    const keywords = pickKeywords(prompt, 6);
    return JSON.stringify([
      ...keywords.map((k) => `Understand and define ${k} with a concrete example`),
      'Identify the relationships between the main concepts',
      'Test each concept with an active recall question',
    ]);
  }

  if (systemPrompt.includes('Mermaid') || systemPrompt.includes('flowchart') || systemPrompt.includes('mermaid')) {
    const keywords = pickKeywords(prompt, 5);
    const nodes = keywords.length >= 3
      ? keywords.slice(0, 5)
      : ['Concept', 'Analysis', 'Application', 'Practice', 'Mastery'];
    const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const lines = ['graph TD'];
    for (let i = 0; i < nodes.length; i++) {
      const label = nodes[i].charAt(0).toUpperCase() + nodes[i].slice(1);
      if (i === 0) {
        lines.push(`${ids[i]}[${label}] --> ${ids[i + 1]}[${nodes[i + 1] ? nodes[i + 1].charAt(0).toUpperCase() + nodes[i + 1].slice(1) : 'Next'}]`);
      } else if (i < nodes.length - 1) {
        lines.push(`${ids[i]} --> ${ids[i + 1]}[${nodes[i + 1] ? nodes[i + 1].charAt(0).toUpperCase() + nodes[i + 1].slice(1) : 'End'}]`);
      }
    }
    lines.push(`${ids[nodes.length - 1]} --> ${ids[nodes.length]}{Understood?}`);
    lines.push(`${ids[nodes.length]} -->|Yes| ${ids[nodes.length + 1]}[Mastered]`);
    lines.push(`${ids[nodes.length]} -->|No| ${ids[0]}`);
    return lines.join('\n');
  }

  if (systemPrompt.includes('mnemonic') || systemPrompt.includes('memory')) {
    const keywords = pickKeywords(prompt, 4);
    const kwList = keywords.length > 0
      ? keywords.map(k => `**${k}**`).join(', ')
      : 'the main concepts';
    return [
      '### Mnemonic Hooks',
      `Create a vivid mental image connecting ${kwList} in a chain.`,
      `- Visualize each concept as a distinct object in a familiar room`,
      `- Associate each with a strong sensory detail (color, sound, texture)`,
      '',
      '### Story Link',
      `Imagine walking through a building where each room contains one of these concepts: ${kwList}. In each room, the concept comes alive as a character that teaches you something.`,
      '',
      '### Analogy Bridge',
      'Connect each concept to something you already know well from daily life.',
      '',
      '### 10-Second Recall Script',
      `Rapid-fire: ${keywords.join(' → ')} → Understanding → Application`,
    ].join('\n');
  }

  if (systemPrompt.includes('quiz') || systemPrompt.includes('question')) {
    const keywords = pickKeywords(prompt, 4);
    const qa = keywords.map(k => ({
      question: `Explain the concept of ${k} and why it matters in this context.`,
      answer: `${k} is a key concept that relates to the core ideas. Understanding it helps build a complete picture of the topic.`,
    }));
    if (qa.length === 0) {
      qa.push({
        question: 'What is the core concept in this topic?',
        answer: 'Explain the main idea, why it matters, and one practical example.',
      });
    }
    return JSON.stringify(qa);
  }

  const summary = firstSentences(prompt, 2);
  return `### Key Takeaway\n${summary}\n\n### Recall Check\n- Can you explain this concept in your own words?\n- What is one practical application?`;
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
      'You are Remembra AI, an expert memory-retention and learning coach.',
      'You MUST read and deeply analyze the FULL content provided below.',
      'Your summary must be SPECIFIC to the actual material — reference exact concepts, terms, definitions, code patterns, or facts from the content.',
      'DO NOT produce generic study advice. Every sentence must directly relate to the provided content.',
      '',
      'Return well-structured markdown with these sections:',
      '',
      '### Core Idea',
      'Explain the central concept or thesis from the content in 2-4 sentences. Name specific terms.',
      '',
      '### Key Concepts',
      'List 3-6 specific concepts, definitions, or patterns found in the material. Use bullet points.',
      '',
      '### How It Connects',
      'Explain how the concepts relate to each other and to broader knowledge. Be specific.',
      '',
      '### Recall Cues',
      'Create 3-5 targeted recall prompts derived from the actual content that test understanding.',
      '',
      'Rules: No fluff. No generic advice. Every point must reference actual content. Do not mention you are an AI.',
    ].join('\n');
    const prompt = `Title: ${title}\n\n--- FULL CONTENT START ---\n${clampText(content)}\n--- FULL CONTENT END ---\n\nAnalyze the above content thoroughly and produce a detailed, content-specific study summary.`;
    return callAI(prompt, systemPrompt, {
      maxTokens: 1400,
      temperature: 0.3,
      topP: 0.9,
      minLength: 200,
    });
  },

  async generateBulletPoints(content: string, title: string): Promise<string[]> {
    const systemPrompt = [
      'You are an expert learning assistant specialized in extracting key points for memory retention.',
      'Read the FULL content below carefully. Extract the most important and specific facts, concepts, and takeaways.',
      'Each bullet point MUST reference specific information from the content — not generic study tips.',
      '',
      'Return ONLY a valid JSON array with 5-10 concise bullet strings.',
      'Each bullet should capture a distinct fact, definition, pattern, or insight from the material.',
      'Each bullet should be 8-20 words and specific enough to serve as a recall trigger.',
      'No markdown fences. No explanations outside the JSON array.',
    ].join('\n');
    const prompt = `Title: ${title}\n\n--- FULL CONTENT ---\n${clampText(content)}\n--- END ---\n\nExtract the most important factual points from the above content as a JSON array of strings.`;
    const response = await callAI(prompt, systemPrompt, {
      maxTokens: 800,
      temperature: 0.2,
      topP: 0.85,
      minLength: 40,
    });
    return parseJsonArraySafely(response).slice(0, 10);
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
      maxTokens: 900,
      temperature: 0.1,
      topP: 0.8,
      minLength: 40,
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
      '',
      'Respond in well-structured markdown:',
      '',
      '### What It Does',
      'Explain the purpose and functionality. Reference specific functions, variables, and patterns used.',
      '',
      '### Step-by-Step Flow',
      'Walk through the execution flow. Reference specific line logic and control flow.',
      '',
      '### Key Patterns & Techniques',
      'Identify design patterns, algorithms, or techniques used in the code.',
      '',
      '### Risks and Edge Cases',
      'Point out specific bugs, missing error handling, edge cases, or performance issues.',
      '',
      '### Quick Recall Checklist',
      'Create 3-5 specific recall questions about this code.',
      '',
      'Be precise, technical, and reference actual code elements.',
    ].join('\n');
    const prompt = `${language ? `Language: ${language}\n\n` : ''}Code:\n\`\`\`\n${clampText(code)}\n\`\`\`\n\nProvide a thorough, code-specific explanation.`;
    return callAI(prompt, systemPrompt, {
      maxTokens: 1800,
      temperature: 0.25,
      topP: 0.9,
      minLength: 250,
    });
  },

  async generateQuizQuestions(content: string, title: string, count: number = 5): Promise<{ question: string; answer: string }[]> {
    const safeCount = Math.max(1, Math.min(10, count));
    const systemPrompt = [
      'You are an expert educator creating active recall quiz questions.',
      'Read the FULL content below. Every question MUST test knowledge of specific facts, concepts, or details from the content.',
      'DO NOT create generic questions. Each question should test a different aspect of the material.',
      '',
      `Generate exactly ${safeCount} quiz pairs.`,
      'Return ONLY a valid JSON array. Each object must have "question" and "answer" string keys.',
      'Questions should require understanding, not just keyword matching.',
      'Answers should be concise but complete (1-3 sentences).',
      'No markdown fences or extra text outside the JSON array.',
    ].join('\n');
    const prompt = `Title: ${title}\n\n--- FULL CONTENT ---\n${clampText(content)}\n--- END ---\n\nGenerate ${safeCount} content-specific quiz questions as a JSON array.`;
    const response = await callAI(prompt, systemPrompt, {
      maxTokens: 1600,
      temperature: 0.4,
      topP: 0.92,
      minLength: 100,
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
      '',
      'Return well-structured markdown:',
      '',
      '### Mnemonic Hooks',
      'Create 3-5 vivid, memorable associations for key terms and concepts from the content.',
      'Use acronyms, visual imagery, rhymes, or method of loci techniques.',
      '',
      '### Story Link',
      'Weave the main concepts into a short memorable narrative (3-5 sentences).',
      'Use the actual terms and facts from the content in the story.',
      '',
      '### Analogy Bridge',
      'Connect the main concepts to everyday familiar experiences.',
      '',
      '### 10-Second Recall Script',
      'A rapid-fire sequence that captures the essence of all key points in under 10 seconds of reading.',
    ].join('\n');
    const prompt = `Title: ${title}\n\n--- FULL CONTENT ---\n${clampText(content)}\n--- END ---\n\nCreate content-specific memory aids and mnemonics based on the actual material above.`;
    return callAI(prompt, systemPrompt, {
      maxTokens: 1400,
      temperature: 0.65,
      topP: 0.95,
      minLength: 200,
    });
  },

  async chat(content: string, title: string, userMessage: string): Promise<string> {
    const systemPrompt = [
      'You are an expert AI study tutor with deep knowledge across all subjects.',
      'You have access to the student\'s full study material below. Use it as your knowledge base to give precise, context-aware answers.',
      '',
      'CRITICAL RULES:',
      '- If the material contains the answer, reference specific facts and concepts FROM the material.',
      '- If the question is about the material, analyze the actual content to formulate your response.',
      '- If the question is beyond the material scope, use your general knowledge but note the distinction.',
      '- Never give vague or generic advice when specific content-based answers are possible.',
      '',
      'Response format (markdown):',
      '### Direct Answer',
      'Give a clear, specific answer. Reference content facts when applicable.',
      '',
      '### Deeper Explanation',
      'Provide context, examples, or reasoning that helps understanding.',
      '',
      '### Recall Check',
      'End with one targeted question the student can use to verify their understanding.',
    ].join('\n');
    const prompt = content
      ? `--- STUDY MATERIAL ---\nTitle: ${title}\n\n${clampText(content)}\n--- END MATERIAL ---\n\nStudent Question: ${userMessage}`
      : `Student Question: ${userMessage}`;
    const answer = await callAI(prompt, systemPrompt, {
      maxTokens: 2000,
      temperature: 0.4,
      topP: 0.9,
      minLength: 150,
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
