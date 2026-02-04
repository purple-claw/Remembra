// @ts-nocheck
// Supabase Edge Function: Generate quiz questions using Groq API
// Deploy: npx supabase functions deploy generate-quiz
// NOTE: This file runs in Deno runtime, not Node.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuizRequest {
    content: string;
    questionCount?: number;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { content, questionCount = 5 } = (await req.json()) as QuizRequest;

        if (!content || content.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: 'Content is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const groqApiKey = Deno.env.get('GROQ_API_KEY');
        if (!groqApiKey) {
            return new Response(
                JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const prompt = `Based on the following content, generate ${questionCount} multiple-choice quiz questions to test understanding. Each question should have 4 options with one correct answer.

Respond in JSON format exactly like this:
{
  "questions": [
    {
      "id": "q1",
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Content:
${content}`;

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert quiz creator. Generate clear, educational questions that test understanding. Always respond with valid JSON.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.5,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API error:', errorText);
            return new Response(
                JSON.stringify({ error: 'AI service unavailable' }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content;

        let result;
        try {
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
        } catch {
            result = { questions: [], error: 'Failed to parse quiz' };
        }

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Edge function error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
