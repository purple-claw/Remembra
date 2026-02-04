import { supabase } from './supabase';

// AI Service Helper for Remembra
// Calls Supabase Edge Functions for AI features

export interface SummaryResult {
    summary: string;
    bulletPoints: string[];
    keyTerms: string[];
}

export interface QuizQuestion {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
}

export interface QuizResult {
    questions: QuizQuestion[];
}

export interface FlowchartResult {
    mermaidCode: string;
}

// Generate a summary of content using Groq via Edge Function
export async function generateSummary(content: string): Promise<SummaryResult | null> {
    try {
        const { data, error } = await supabase.functions.invoke('summarize', {
            body: { content },
        });

        if (error) {
            console.error('Error generating summary:', error);
            return null;
        }

        return data as SummaryResult;
    } catch (err) {
        console.error('AI summarization failed:', err);
        return null;
    }
}

// Generate quiz questions from content
export async function generateQuiz(content: string, questionCount: number = 5): Promise<QuizResult | null> {
    try {
        const { data, error } = await supabase.functions.invoke('generate-quiz', {
            body: { content, questionCount },
        });

        if (error) {
            console.error('Error generating quiz:', error);
            return null;
        }

        return data as QuizResult;
    } catch (err) {
        console.error('Quiz generation failed:', err);
        return null;
    }
}

// Generate a Mermaid flowchart from content
export async function generateFlowchart(content: string): Promise<FlowchartResult | null> {
    try {
        const { data, error } = await supabase.functions.invoke('generate-flowchart', {
            body: { content },
        });

        if (error) {
            console.error('Error generating flowchart:', error);
            return null;
        }

        return data as FlowchartResult;
    } catch (err) {
        console.error('Flowchart generation failed:', err);
        return null;
    }
}

// Get AI-powered study suggestions
export async function getStudySuggestions(
    itemId: string,
    type: 'explain' | 'analogy' | 'mnemonic' | 'connections'
): Promise<string | null> {
    try {
        const { data, error } = await supabase.functions.invoke('study-assist', {
            body: { itemId, type },
        });

        if (error) {
            console.error('Error getting study suggestions:', error);
            return null;
        }

        return data?.suggestion || null;
    } catch (err) {
        console.error('Study assist failed:', err);
        return null;
    }
}
