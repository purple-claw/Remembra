// Clean, working AI service that ONLY uses real APIs.
// No fallback demo responses. Shows clear errors when APIs fail.

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const MAX_CHARS = 16000;
const DEFAULT_TEMPERATURE = 0.5;
const DEFAULT_MAX_TOKENS = 2000;
const TIMEOUT_MS = 30000;

interface AIRequestOptions {
  maxTokens?: number;
  temperature?: number;
}

// Check which provider is available
function getProviderStatus(): { hasKeys: boolean; provider: string } {
  if (OPENROUTER_API_KEY) return { hasKeys: true, provider: 'OpenRouter' };
  if (GROQ_API_KEY) return { hasKeys: true, provider: 'Groq' };
  return { hasKeys: false, provider: 'None' };
}

// Clamp input to safe size
function clampInput(text: string, limit: number = MAX_CHARS): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '\n...[truncated]...';
}

// Simple timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Request timeout')), ms)),
  ]);
}

// Call Groq API
async function callGroq(prompt: string, systemPrompt: string, options: AIRequestOptions): Promise<string> {
  if (!GROQ_API_KEY) throw new Error('Groq API key not configured');

  const response = await withTimeout(
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: clampInput(prompt) },
        ],
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
    }),
    TIMEOUT_MS,
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  if (!content) throw new Error('Empty response from Groq');
  return content;
}

// Call OpenRouter API
async function callOpenRouter(prompt: string, systemPrompt: string, options: AIRequestOptions): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured');

  const response = await withTimeout(
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Remembra',
      },
      body: JSON.stringify({
        model: 'qwen/qwq-32b:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: clampInput(prompt) },
        ],
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      }),
    }),
    TIMEOUT_MS,
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  if (!content) throw new Error('Empty response from OpenRouter');
  return content;
}

// Call the best available provider
async function callAI(prompt: string, systemPrompt: string, options: AIRequestOptions = {}): Promise<string> {
  // Try OpenRouter first if available
  if (OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter(prompt, systemPrompt, options);
    } catch (error) {
      console.warn('OpenRouter failed, trying Groq:', error);
    }
  }

  // Fall back to Groq
  if (GROQ_API_KEY) {
    return await callGroq(prompt, systemPrompt, options);
  }

  throw new Error('No AI provider configured. Add VITE_GROQ_API_KEY or VITE_OPENROUTER_API_KEY to .env.local');
}

// Export the public interface
export const aiService = {
  getProviderStatus,

  async generateSummary(content: string, title: string): Promise<string> {
    return callAI(content, `You write concise, study-friendly summaries.

Title: "${title}"

Create a focused summary with:
- Core idea (1-2 sentences)
- 3-5 key takeaways (bullet points)
- One practical example
- One recall question

Keep it scannable. Avoid jargon.`, {
      maxTokens: 600,
      temperature: 0.5,
    });
  },

  async generateBulletPoints(content: string, title: string): Promise<string[]> {
    const text = await callAI(content, `Extract the 5-8 most important bullet points from this material.

Title: "${title}"

Format: ONE bullet per line. Be specific and actionable. Each bullet should be something to remember.`, {
      maxTokens: 500,
      temperature: 0.4,
    });
    return text
      .split('\n')
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter((line) => line.length > 0 && line.length < 200);
  },

  async generateFlowchart(content: string, title: string): Promise<string> {
    return callAI(content, `Create a Mermaid flowchart showing the core concepts and how they connect.

Title: "${title}"

Format your response as:
\`\`\`mermaid
graph TD
A[Start Node] --> B[Process]
B --> C[Outcome]
\`\`\`

Use 4-6 nodes max. Labels under 30 chars. Use --> for flow, --> |condition| for branches.
Focus on the key progression or relationships.`, {
      maxTokens: 800,
      temperature: 0.5,
    });
  },

  async generateQuizQuestions(content: string, title: string, count: number): Promise<Array<{ question: string; answer: string }>> {
    const text = await callAI(content, `Generate ${count} active-recall study questions based on this material.

Title: "${title}"

For each question:
1. Make it testable and specific
2. Answer should be 1-3 sentences

Format as JSON array:
[
  {"question": "What is...?", "answer": "..."},
  {"question": "How does...?", "answer": "..."}
]

ONLY output valid JSON, nothing else.`, {
      maxTokens: 800,
      temperature: 0.4,
    });

    try {
      return JSON.parse(text);
    } catch {
      // If parsing fails, return empty array - UI will show error
      return [];
    }
  },

  async generateMnemonics(content: string, title: string): Promise<string> {
    return callAI(content, `Create memory hooks and mnemonics for retaining this material.

Title: "${title}"

Include:
- A memorable acronym or story method
- 2-3 vivid mental images to associate with key concepts
- A sequence or chain to link ideas together

Make it creative and personal-sounding, like advice from a study friend.`, {
      maxTokens: 600,
      temperature: 0.7,
    });
  },

  async chat(contextContent: string, contextTitle: string, userMessage: string): Promise<string> {
    return callAI(userMessage, `You are a study tutor helping someone learn.

Context: "${contextTitle}"
${contextContent ? `Material: ${contextContent.slice(0, 1000)}` : ''}

Help them understand better. Use the Socratic method: ask clarifying questions, encourage them to explain concepts, suggest active recall techniques.
Keep answers concise (2-3 sentences unless they ask else-wise).`, {
      maxTokens: 500,
      temperature: 0.6,
    });
  },
};
