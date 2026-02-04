// AI Service for Remembra - Groq & Cohere Integration
import type {
  SummaryContent,
  QuizContent,
  FlashcardContent,
  FlowchartContent,
  AIProvider,
} from '@/types'

// Groq API Provider
class GroqProvider implements AIProvider {
  name: 'groq' = 'groq'
  private apiKey: string
  private baseUrl = 'https://api.groq.com/openai/v1'
  private model = 'llama-3.3-70b-versatile'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async makeRequest(messages: Array<{ role: string; content: string }>) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Groq API error: ${error}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  async generateSummary(content: string): Promise<SummaryContent> {
    const prompt = `Summarize the following content into a concise summary with key points.
    
Content: ${content}

Respond in JSON format:
{
  "summary": "A concise 2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3"]
}`

    const result = await this.makeRequest([
      { role: 'system', content: 'You are a helpful learning assistant that creates concise summaries.' },
      { role: 'user', content: prompt },
    ])

    return JSON.parse(result)
  }

  async generateQuiz(content: string, questionCount: number = 5): Promise<QuizContent> {
    const prompt = `Create ${questionCount} multiple-choice quiz questions based on the following content.

Content: ${content}

Respond in JSON format:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }
  ]
}`

    const result = await this.makeRequest([
      { role: 'system', content: 'You are an expert at creating educational quizzes that test understanding.' },
      { role: 'user', content: prompt },
    ])

    return JSON.parse(result)
  }

  async generateFlashcards(content: string, cardCount: number = 10): Promise<FlashcardContent> {
    const prompt = `Create ${cardCount} flashcards from the following content.

Content: ${content}

Respond in JSON format:
{
  "cards": [
    {
      "front": "Question or term",
      "back": "Answer or definition"
    }
  ]
}`

    const result = await this.makeRequest([
      { role: 'system', content: 'You are an expert at creating effective flashcards for spaced repetition learning.' },
      { role: 'user', content: prompt },
    ])

    return JSON.parse(result)
  }

  async generateFlowchart(content: string): Promise<FlowchartContent> {
    const prompt = `Create a flowchart diagram from the following content using Mermaid syntax.

Content: ${content}

Respond in JSON format:
{
  "mermaidCode": "flowchart TD\\n  A[Start] --> B[Process]\\n  B --> C[End]",
  "nodes": [
    {"id": "A", "label": "Start", "type": "start"},
    {"id": "B", "label": "Process", "type": "process"},
    {"id": "C", "label": "End", "type": "end"}
  ],
  "edges": [
    {"from": "A", "to": "B"},
    {"from": "B", "to": "C"}
  ]
}`

    const result = await this.makeRequest([
      { role: 'system', content: 'You are an expert at creating clear flowcharts and diagrams.' },
      { role: 'user', content: prompt },
    ])

    return JSON.parse(result)
  }

  async studyAssist(question: string, context: string): Promise<string> {
    const prompt = `Based on the following context, answer the question.

Context: ${context}

Question: ${question}`

    return await this.makeRequest([
      { role: 'system', content: 'You are a helpful tutor that answers questions clearly and concisely.' },
      { role: 'user', content: prompt },
    ])
  }
}

// Cohere API Provider (Fallback)
class CohereProvider implements AIProvider {
  name: 'cohere' = 'cohere'
  private apiKey: string
  private baseUrl = 'https://api.cohere.ai/v1'
  private model = 'command-r'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async makeRequest(message: string) {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        message,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Cohere API error: ${error}`)
    }

    const data = await response.json()
    return data.text
  }

  async generateSummary(content: string): Promise<SummaryContent> {
    const prompt = `Summarize the following content into a concise summary with key points. Respond only with valid JSON.

Content: ${content}

JSON format:
{
  "summary": "A concise 2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3"]
}`

    const result = await this.makeRequest(prompt)
    return JSON.parse(result)
  }

  async generateQuiz(content: string, questionCount: number = 5): Promise<QuizContent> {
    const prompt = `Create ${questionCount} multiple-choice quiz questions. Respond only with valid JSON.

Content: ${content}

JSON format:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is correct"
    }
  ]
}`

    const result = await this.makeRequest(prompt)
    return JSON.parse(result)
  }

  async generateFlashcards(content: string, cardCount: number = 10): Promise<FlashcardContent> {
    const prompt = `Create ${cardCount} flashcards. Respond only with valid JSON.

Content: ${content}

JSON format:
{
  "cards": [
    {
      "front": "Question or term",
      "back": "Answer or definition"
    }
  ]
}`

    const result = await this.makeRequest(prompt)
    return JSON.parse(result)
  }

  async generateFlowchart(content: string): Promise<FlowchartContent> {
    const prompt = `Create a flowchart using Mermaid syntax. Respond only with valid JSON.

Content: ${content}

JSON format:
{
  "mermaidCode": "flowchart TD...",
  "nodes": [...],
  "edges": [...]
}`

    const result = await this.makeRequest(prompt)
    return JSON.parse(result)
  }

  async studyAssist(question: string, context: string): Promise<string> {
    const prompt = `Based on the following context, answer the question.

Context: ${context}

Question: ${question}`

    return await this.makeRequest(prompt)
  }
}

// AI Service with fallback
class AIService {
  private primary: AIProvider
  private fallback: AIProvider
  private requestQueue: Array<() => Promise<any>> = []
  private requestsThisMinute: number = 0
  private lastResetTime: number = Date.now()
  private maxRequestsPerMinute: number = 14

  constructor(groqKey: string, cohereKey: string) {
    this.primary = new GroqProvider(groqKey)
    this.fallback = new CohereProvider(cohereKey)
  }

  private async rateLimit<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now()
    if (now - this.lastResetTime > 60000) {
      this.requestsThisMinute = 0
      this.lastResetTime = now
    }

    if (this.requestsThisMinute >= this.maxRequestsPerMinute) {
      const waitTime = 60000 - (now - this.lastResetTime)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.requestsThisMinute = 0
      this.lastResetTime = Date.now()
    }

    this.requestsThisMinute++
    return fn()
  }

  private async tryWithFallback<T>(fn: (provider: AIProvider) => Promise<T>): Promise<T> {
    try {
      return await this.rateLimit(() => fn(this.primary))
    } catch (error) {
      console.warn('Primary AI provider failed, using fallback:', error)
      return await fn(this.fallback)
    }
  }

  async generateSummary(content: string): Promise<SummaryContent> {
    return this.tryWithFallback(provider => provider.generateSummary(content))
  }

  async generateQuiz(content: string, questionCount?: number): Promise<QuizContent> {
    return this.tryWithFallback(provider => provider.generateQuiz(content, questionCount))
  }

  async generateFlashcards(content: string, cardCount?: number): Promise<FlashcardContent> {
    return this.tryWithFallback(provider => provider.generateFlashcards(content, cardCount))
  }

  async generateFlowchart(content: string): Promise<FlowchartContent> {
    return this.tryWithFallback(provider => provider.generateFlowchart(content))
  }

  async studyAssist(question: string, context: string): Promise<string> {
    return this.tryWithFallback(provider => provider.studyAssist(question, context))
  }
}

const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY || ''
const cohereKey = process.env.EXPO_PUBLIC_COHERE_API_KEY || ''

export const ai = new AIService(groqKey, cohereKey)
