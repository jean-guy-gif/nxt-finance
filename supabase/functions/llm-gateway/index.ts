import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// OpenRouter API — compatible OpenAI format
// Supports Claude, Llama, Mistral, etc. via unified API
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const {
      systemPrompt,
      userPrompt,
      maxTokens = 4096,
      temperature = 0.3,
      model = "anthropic/claude-sonnet-4-20250514",
    } = await req.json();

    // Validate required fields
    if (!systemPrompt || !userPrompt) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: systemPrompt and userPrompt are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call OpenRouter API (OpenAI-compatible format)
    const llmResponse = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://nxt-finance.vercel.app",
        "X-Title": "NXT Finance",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!llmResponse.ok) {
      const errorBody = await llmResponse.text();
      console.error(
        `OpenRouter API error: ${llmResponse.status} — ${errorBody}`
      );
      return new Response(
        JSON.stringify({
          error: "LLM API error",
          status: llmResponse.status,
          details: errorBody,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await llmResponse.json();

    // Extract content from OpenAI-compatible response
    const content = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage ?? {};

    return new Response(
      JSON.stringify({
        content,
        usage: {
          input_tokens: usage.prompt_tokens ?? 0,
          output_tokens: usage.completion_tokens ?? 0,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Internal error in llm-gateway:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
