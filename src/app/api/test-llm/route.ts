import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  const keysStatus = {
    url: url ? url.slice(0, 40) + '...' : 'MISSING',
    anonKey: anonKey ? anonKey.slice(0, 10) + '...' : 'MISSING',
    serviceKey: serviceKey ? serviceKey.slice(0, 10) + '...' : 'MISSING',
  };

  if (!url || !anonKey) {
    return NextResponse.json({ success: false, error: 'Missing env vars', keysStatus });
  }

  // Use service role key to bypass auth on Edge Function
  const key = serviceKey || anonKey;

  // Direct fetch to the Edge Function (no supabase client needed)
  const fnUrl = `${url}/functions/v1/llm-gateway`;

  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({
        systemPrompt: 'Tu es un assistant de test.',
        userPrompt: 'Réponds exactement : "LLM OK"',
        maxTokens: 20,
        temperature: 0,
        model: 'anthropic/claude-3.5-sonnet',
      }),
    });

    const status = res.status;
    const text = await res.text();

    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON */ }

    return NextResponse.json({
      success: status === 200,
      httpStatus: status,
      response: parsed ?? text,
      fnUrl,
      keysStatus,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      fnUrl,
      keysStatus,
    });
  }
}
