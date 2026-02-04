// @ts-nocheck
// Supabase Edge Function: AI Study Assistant (Explain, Analogy, Mnemonic)
// Deploy: npx supabase functions deploy study-assist
// NOTE: This file runs in Deno runtime, not Node.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StudyAssistRequest {
    itemId: string;
    type: 'explain' | 'analogy' | 'mnemonic' | 'connections';
}

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { itemId, type } = (await req.json()) as StudyAssistRequest;

        if (!itemId || !type) {
            return new Response(
                JSON.stringify({ error: 'itemId and type are required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch memory item content
        const { data: item, error: dbError } = await supabase
            .from('memory_items')
            .select('title, content, content_blocks')
            .eq('id', itemId)
            .single();

        if (dbError || !item) {
            return new Response(
                JSON.stringify({ error: 'Memory item not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Construct prompt based on request type
        let systemPrompt = 'You are a helpful expert tutor.';
        let userPrompt = '';

        const itemContext = `Topic: ${item.title}\nContent: ${item.content}`;

        switch (type) {
            case 'explain':
                userPrompt = `Explain the following topic in simple terms, as if I'm a beginner. focus on the core concepts.\n\n${itemContext}`;
                break;
            case 'analogy':
                userPrompt = `Give me a creative analogy or metaphor to help me understand and remember this topic.\n\n${itemContext}`;
                break;
            case 'mnemonic':
                userPrompt = `Create a memorable mnemonic device (acronym, rhyme, or phrase) to help me memorize the key points of this topic.\n\n${itemContext}`;
                break;
            case 'connections':
                userPrompt = `Connect this topic to other common concepts or real-world examples to help build a knowledge graph.\n\n${itemContext}`;
                break;
            default:
                userPrompt = `Help me study this topic: ${item.title}`;
        }

        const groqApiKey = Deno.env.get('GROQ_API_KEY');
        if (!groqApiKey) {
            return new Response(
                JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${groqApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'llama-3.1-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
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
        const suggestion = data.choices[0]?.message?.content;

        return new Response(
            JSON.stringify({ suggestion }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
