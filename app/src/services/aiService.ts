// AI Service using free APIs
// Primary: Groq (free tier with generous limits)
// Fallback: OpenRouter free models, HuggingFace

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

interface AIResponse {
  content: string;
  error?: string;
}

// Groq API (primary - fast and free)
async function callGroq(prompt: string, systemPrompt: string): Promise<AIResponse> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API key not configured');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  return { content: data.choices[0].message.content };
}

// OpenRouter API (fallback - has free models)
async function callOpenRouter(prompt: string, systemPrompt: string): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Remembra Learning App',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.2-3b-instruct:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return { content: data.choices[0].message.content };
}

// Main AI call function with fallback
async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  // Try Groq first
  if (GROQ_API_KEY) {
    try {
      const result = await callGroq(prompt, systemPrompt);
      return result.content;
    } catch (error) {
      console.warn('Groq API failed, trying fallback:', error);
    }
  }

  // Fallback to OpenRouter
  if (OPENROUTER_API_KEY) {
    try {
      const result = await callOpenRouter(prompt, systemPrompt);
      return result.content;
    } catch (error) {
      console.warn('OpenRouter API failed:', error);
    }
  }

  // If no API keys configured, use demo responses
  return generateDemoResponse(prompt, systemPrompt);
}

// Demo responses when no API is configured
function generateDemoResponse(_prompt: string, systemPrompt: string): string {
  if (systemPrompt.includes('summary')) {
    return `This content covers key concepts that are important for understanding the topic. The main ideas include the core principles, practical applications, and related concepts that build upon each other. Focus on understanding the relationships between concepts for better retention.`;
  }
  
  if (systemPrompt.includes('bullet')) {
    return JSON.stringify([
      "Key concept 1: The fundamental principle underlying this topic",
      "Key concept 2: Practical application and use cases",
      "Key concept 3: Common patterns and best practices",
      "Key concept 4: Related topics for deeper understanding",
      "Key concept 5: Tips for memorization and recall"
    ]);
  }
  
  if (systemPrompt.includes('flowchart')) {
    return `
┌─────────────────┐
│     START       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Core Concept   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│Step 1 │ │Step 2 │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         ▼
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│      END        │
└─────────────────┘
    `;
  }
  
  return 'AI response placeholder - configure API keys for real responses';
}

export const aiService = {
  // Check if AI is configured
  isConfigured(): boolean {
    return !!(GROQ_API_KEY || OPENROUTER_API_KEY);
  },

  // Generate a concise summary
  async generateSummary(content: string, title: string): Promise<string> {
    const systemPrompt = `You are a learning assistant helping users with spaced repetition studying. Generate a concise summary (2-3 sentences max) that captures the key points for memorization. Focus on what's most important to remember.`;
    
    const prompt = `Title: ${title}\n\nContent:\n${content}\n\nProvide a brief, memorable summary:`;
    
    return callAI(prompt, systemPrompt);
  },

  // Generate bullet points for key concepts
  async generateBulletPoints(content: string, title: string): Promise<string[]> {
    const systemPrompt = `You are a learning assistant. Extract the key points from the content as a JSON array of strings. Return ONLY a valid JSON array with 3-6 bullet points. Each point should be concise and memorable. Format: ["point 1", "point 2", ...]`;
    
    const prompt = `Title: ${title}\n\nContent:\n${content}\n\nExtract key bullet points as JSON array:`;
    
    const response = await callAI(prompt, systemPrompt);
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // If not valid JSON, split by newlines and clean up
      return response
        .split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 6);
    }
    
    return [];
  },

  // Generate an ASCII flowchart
  async generateFlowchart(content: string, title: string): Promise<string> {
    const systemPrompt = `You are a learning assistant. Create a simple ASCII flowchart or diagram that visualizes the concept or process described. Use box characters like ┌ ─ ┐ │ └ ┘ and arrows ▼ ▲ → ←. Keep it simple and readable.`;
    
    const prompt = `Title: ${title}\n\nContent:\n${content}\n\nCreate a visual ASCII flowchart:`;
    
    return callAI(prompt, systemPrompt);
  },

  // Generate explanation for code
  async explainCode(code: string, language?: string): Promise<string> {
    const systemPrompt = `You are a programming tutor. Explain the code clearly and concisely. Focus on what the code does, key concepts used, and anything important for understanding and remembering.`;
    
    const prompt = `${language ? `Language: ${language}\n\n` : ''}Code:\n\`\`\`\n${code}\n\`\`\`\n\nExplain this code:`;
    
    return callAI(prompt, systemPrompt);
  },

  // Generate quiz questions
  async generateQuizQuestions(content: string, title: string, count: number = 3): Promise<{ question: string; answer: string }[]> {
    const systemPrompt = `You are a learning assistant. Generate ${count} quiz questions to test understanding. Return as a JSON array with objects containing "question" and "answer" fields. Format: [{"question": "...", "answer": "..."}]`;
    
    const prompt = `Title: ${title}\n\nContent:\n${content}\n\nGenerate ${count} quiz questions as JSON:`;
    
    const response = await callAI(prompt, systemPrompt);
    
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Return empty if parsing fails
    }
    
    return [];
  },

  // Generate mnemonics or memory tricks
  async generateMnemonics(content: string, title: string): Promise<string> {
    const systemPrompt = `You are a memory expert. Create memorable mnemonics, acronyms, or memory tricks to help remember the key concepts. Be creative and make them easy to recall.`;
    
    const prompt = `Title: ${title}\n\nContent:\n${content}\n\nCreate memorable mnemonics or memory tricks:`;
    
    return callAI(prompt, systemPrompt);
  },

  // Chat with AI about the content
  async chat(content: string, title: string, userMessage: string): Promise<string> {
    const systemPrompt = `You are a helpful learning assistant. The user is studying a topic and has questions. Answer based on the provided content, but you can also provide additional helpful context. Be concise and educational.`;
    
    const prompt = `Study Material:\nTitle: ${title}\nContent: ${content}\n\nUser Question: ${userMessage}`;
    
    return callAI(prompt, systemPrompt);
  },
};
