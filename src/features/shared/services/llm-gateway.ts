import type { SupabaseClient } from '@supabase/supabase-js';
import type { LlmGeneration } from '@/types/models';
import type { LlmOutputType } from '@/types/enums';
import { DEFAULT_LLM_MODEL, DEFAULT_LLM_PROVIDER } from '@/lib/constants';
import { getPromptTemplate, resolvePromptVariables } from '@/lib/registries/prompt-registry';

// ============================================
// Interfaces
// ============================================

export interface LlmRequest {
  type: LlmOutputType;
  promptVersion?: string;
  variables: Record<string, string>;
  agencyId: string;
  outputId?: string;
}

export interface LlmResponse {
  content: string;
  generationId: string;
}

// ============================================
// Content generation
// ============================================

/**
 * Generate LLM content with full traceability.
 * Graceful degradation: returns null on any failure (modules work without text).
 */
export async function generateContent(
  supabase: SupabaseClient,
  request: LlmRequest
): Promise<LlmResponse | null> {
  // 1. Look up prompt template
  const template = getPromptTemplate(request.type, request.promptVersion);

  if (!template) {
    console.error(
      `[llm-gateway] No prompt template found for type="${request.type}" version="${request.promptVersion ?? 'latest'}"`
    );
    return null;
  }

  // 2. Create traceability record (status: pending)
  const { data: generation, error: insertError } = await supabase
    .from('llm_generations')
    .insert({
      agency_id: request.agencyId,
      provider: DEFAULT_LLM_PROVIDER,
      model: DEFAULT_LLM_MODEL,
      prompt_version: template.version,
      input_refs: request.variables,
      output_type: request.type,
      output_id: request.outputId ?? null,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !generation) {
    console.error('[llm-gateway] Failed to insert llm_generations record:', insertError);
    return null;
  }

  const generationId = generation.id as string;
  const startTime = Date.now();

  try {
    // 3. Resolve prompt variables
    const userPrompt = resolvePromptVariables(template.userPromptTemplate, request.variables);

    // 4. Call Edge Function
    const { data, error: fnError } = await supabase.functions.invoke('llm-gateway', {
      body: {
        systemPrompt: template.systemPrompt,
        userPrompt,
        maxTokens: template.maxTokens,
        temperature: template.temperature,
        model: DEFAULT_LLM_MODEL,
      },
    });

    if (fnError) {
      throw fnError;
    }

    const durationMs = Date.now() - startTime;
    const content = data?.content as string;
    // Edge Function returns { content, usage: { input_tokens, output_tokens } }
    const tokensInput = (data?.usage?.input_tokens as number) ?? null;
    const tokensOutput = (data?.usage?.output_tokens as number) ?? null;

    // 5. Update generation record: completed
    await supabase
      .from('llm_generations')
      .update({
        status: 'completed',
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        duration_ms: durationMs,
        generated_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    return { content, generationId };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update generation record: failed
    await supabase
      .from('llm_generations')
      .update({
        status: 'failed',
        error_message: errorMessage,
        duration_ms: durationMs,
      })
      .eq('id', generationId);

    console.error(`[llm-gateway] Edge Function call failed for generation ${generationId}:`, error);
    return null;
  }
}

// ============================================
// Queries
// ============================================

/**
 * Fetch a single LLM generation by id.
 */
export async function fetchGeneration(
  supabase: SupabaseClient,
  generationId: string
): Promise<LlmGeneration | null> {
  const { data } = await supabase
    .from('llm_generations')
    .select('*')
    .eq('id', generationId)
    .maybeSingle();

  return (data as LlmGeneration) ?? null;
}

/**
 * Fetch recent LLM generations for an agency.
 */
export async function fetchRecentGenerations(
  supabase: SupabaseClient,
  agencyId: string,
  limit = 20
): Promise<LlmGeneration[]> {
  const { data, error } = await supabase
    .from('llm_generations')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data as LlmGeneration[];
}
