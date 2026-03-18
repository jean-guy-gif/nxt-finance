import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Diagnostic: which keys are available?
  const keysStatus = {
    NEXT_PUBLIC_SUPABASE_URL: url ? `${url.slice(0, 30)}...` : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? `${anonKey.slice(0, 10)}...` : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? `${serviceKey.slice(0, 10)}...` : 'MISSING',
  };

  // Use service role key if available (bypasses RLS + auth for Edge Functions)
  const key = serviceKey ?? anonKey;
  if (!url || !key) {
    return NextResponse.json({
      success: false,
      error: 'Missing Supabase credentials',
      keysStatus,
    });
  }

  const supabase = createClient(url, key);

  // Test 1: Can we invoke the Edge Function at all?
  try {
    const { data, error } = await supabase.functions.invoke('llm-gateway', {
      body: {
        systemPrompt: 'Tu es un assistant de test. Réponds en une phrase.',
        userPrompt: 'Dis "Le LLM fonctionne correctement." et rien d\'autre.',
        maxTokens: 50,
        temperature: 0,
        model: 'anthropic/claude-sonnet-4-20250514',
      },
    });

    return NextResponse.json({
      success: !error,
      data,
      error: error ? { message: error.message, name: error.name, context: error.context } : null,
      keysStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : undefined,
      },
      keysStatus,
      timestamp: new Date().toISOString(),
    });
  }
}
