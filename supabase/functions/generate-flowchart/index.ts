// @ts-nocheck
// Supabase Edge Function: Generate a Mermaid flowchart from content
// Deploy: npx supabase functions deploy generate-flowchart
// NOTE: This file runs in Deno runtime, not Node.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FlowchartRequest {
    content: string;
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { content } = (await req.json()) as FlowchartRequest;

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

        const prompt = `Create a Mermaid.js flowchart to visualize the following content.
Return ONLY valid Mermaid code starting with "graph TD" (or similar). Do not include markdown code ticks (\`\`\`).

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
                        content: 'You are a technical diagram expert. Generate valid Mermaid.js flowchart syntax only. No markdown formatting.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.2,
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: 'AI service unavailable' }),
                { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data = await response.json();
        let mermaidCode = data.choices[0]?.message?.content?.trim();

        // Cleanup if the AI included markdown ticks despite instructions
        mermaidCode = mermaidCode?.replace(/^```mermaid\n/, '').replace(/^```\n/, '').replace(/```$/, '');

        return new Response(
            JSON.stringify({ mermaidCode }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
