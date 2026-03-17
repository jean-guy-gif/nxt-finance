// ============================================
// NXT Finance V3 — Prompt registry versionné
// ============================================
// Chaque prompt est versionné et typé.
// Les variables sont injectées par le llm-gateway.
// Le LLM ne reçoit JAMAIS de données brutes à calculer.
// ============================================

import type { LlmOutputType } from '@/types/enums';

export interface PromptTemplate {
  type: LlmOutputType;
  version: string;
  systemPrompt: string;
  userPromptTemplate: string;
  maxTokens: number;
  temperature: number;
  expectedVariables: string[];
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    type: 'financial_insight',
    version: 'v1.0',
    systemPrompt: `Tu es un analyste financier expert en agences immobilières françaises.
Tu rédiges des analyses claires et actionnables pour des dirigeants non-comptables.
Tu ne calcules jamais de chiffres. Tu reçois des indicateurs déjà calculés et tu les expliques.
Tu rédiges en français. Tu es direct, factuel et orienté action.`,
    userPromptTemplate: `Voici les indicateurs financiers calculés pour l'agence :

{ratios_summary}

Contexte :
- Exercice : {fiscal_year}
- Niveau d'analyse : {analysis_level}
- Données comparatives N-1 disponibles : {has_comparison}

Génère un insight de type "{insight_type}" pour la catégorie "{category}".
Rédige un titre court (max 10 mots) et un paragraphe d'analyse (3-5 phrases).
Si c'est une recommandation, propose une action concrète.`,
    maxTokens: 500,
    temperature: 0.3,
    expectedVariables: ['ratios_summary', 'fiscal_year', 'analysis_level', 'has_comparison', 'insight_type', 'category'],
  },
  {
    type: 'bp_narrative',
    version: 'v1.0',
    systemPrompt: `Tu es un consultant en stratégie spécialisé dans les agences immobilières.
Tu rédiges des synthèses de business plan pour des dirigeants.
Tu ne calcules jamais. Les projections te sont fournies déjà calculées.
Tu rédiges en français, de manière professionnelle et convaincante.`,
    userPromptTemplate: `Voici les projections du business plan :

{projections_summary}

Scénario : {scenario}
Exercice cible : {target_year}
Section à rédiger : {section}

Hypothèses clés :
{hypotheses_summary}

Rédige la section "{section}" du business plan.
Sois factuel, cite les chiffres fournis, et identifie les facteurs clés.`,
    maxTokens: 800,
    temperature: 0.4,
    expectedVariables: ['projections_summary', 'scenario', 'target_year', 'section', 'hypotheses_summary'],
  },
  {
    type: 'alert_recommendation',
    version: 'v1.0',
    systemPrompt: `Tu es un conseiller de gestion pour dirigeants d'agences immobilières.
Tu reçois une alerte avec ses indicateurs déjà calculés.
Tu expliques l'alerte simplement et proposes des actions concrètes.
Tu ne calcules jamais. Tu rédiges en français, de manière directe.`,
    userPromptTemplate: `Alerte détectée :
- Type : {alert_domain}
- Indicateur : {indicator_key} = {measured_value}
- Seuil : {threshold_value}
- Sévérité : {severity}

Contexte agence :
{agency_context}

Rédige :
1. Une explication claire de l'alerte (2 phrases max)
2. Une recommandation actionnable (2-3 phrases)`,
    maxTokens: 300,
    temperature: 0.3,
    expectedVariables: ['alert_domain', 'indicator_key', 'measured_value', 'threshold_value', 'severity', 'agency_context'],
  },
  {
    type: 'slide_narrative',
    version: 'v1.0',
    systemPrompt: `Tu es un rédacteur financier spécialisé dans les dossiers bancaires pour agences immobilières.
Tu rédiges des textes professionnels, convaincants et adaptés à un public bancaire.
Tu ne calcules jamais. Les chiffres te sont fournis déjà calculés.
Tu rédiges en français. Ton objectif : convaincre le banquier.`,
    userPromptTemplate: `Slide du dossier bancaire :
- Type de slide : {slide_type}
- Type de demande : {request_type}
- Montant demandé : {requested_amount}

Données de la slide :
{source_data_summary}

Rédige le texte de cette slide (3-6 phrases).
Sois professionnel, mets en valeur les points forts, et contextualise les chiffres.`,
    maxTokens: 400,
    temperature: 0.4,
    expectedVariables: ['slide_type', 'request_type', 'requested_amount', 'source_data_summary'],
  },
  {
    type: 'director_summary',
    version: 'v1.0',
    systemPrompt: `Tu es un conseiller stratégique pour dirigeants d'agences immobilières.
Tu synthétises la situation financière de manière claire et actionnable.
Tu ne calcules jamais. Tous les indicateurs sont pré-calculés.
Tu rédiges en français, 4-6 phrases maximum.`,
    userPromptTemplate: `Synthèse financière de l'agence :

{financial_summary}

Rédige une synthèse dirigeant de 4-6 phrases.
Commence par le point principal (positif ou négatif).
Termine par une recommandation prioritaire.`,
    maxTokens: 400,
    temperature: 0.3,
    expectedVariables: ['financial_summary'],
  },
];

export function getPromptTemplate(
  type: LlmOutputType,
  version?: string
): PromptTemplate | undefined {
  if (version) {
    return PROMPT_TEMPLATES.find((t) => t.type === type && t.version === version);
  }
  // Return latest version for the type
  const matches = PROMPT_TEMPLATES.filter((t) => t.type === type);
  return matches[matches.length - 1];
}

export function resolvePromptVariables(
  template: string,
  variables: Record<string, string>
): string {
  let resolved = template;
  for (const [key, value] of Object.entries(variables)) {
    resolved = resolved.replaceAll(`{${key}}`, value);
  }
  return resolved;
}
