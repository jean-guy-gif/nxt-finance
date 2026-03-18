// ============================================
// NXT Finance V3.5 — Prompt registry versionné
// ============================================
// Phase C : prompts calibrés dirigeant agence immobilière
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

const SYSTEM_IMMOBILIER = `Tu es un analyste financier spécialisé dans le secteur immobilier (transaction, gestion locative, location).
Tu t'adresses à un dirigeant d'agence immobilière.
Tu expliques les chiffres en langage business, pas en langage comptable.
Tu es direct, précis et orienté action.
Règles de rédaction :
- Phrases courtes et actives
- Toujours quantifier (montants, pourcentages, mois)
- Jamais de jargon comptable brut sans explication (pas de "BFR", "ratio de liquidité" sans contexte)
- Pas de formulations creuses ("il convient de", "il serait souhaitable de")
- Ton professionnel mais accessible, comme un conseiller financier qui parle à un patron de PME`;

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  // ============================================
  // Q1 — "Où en suis-je ?" — Synthèse dirigeant
  // ============================================
  {
    type: 'director_summary',
    version: 'v2.0',
    systemPrompt: SYSTEM_IMMOBILIER,
    userPromptTemplate: `Situation de l'agence — Exercice {fiscal_year} :

Score de santé financière : {health_score}/100 ({health_label})
CA total HT : {ca_total_ht}
Marge opérationnelle : {marge_operationnelle}
Tendance CA 3 mois : {trend_ca}
Projection CA fin d'année : {projection_ca}
Taux de récurrence (gestion + location) : {taux_recurrence}
Nombre de collaborateurs actifs : {nb_collaborateurs}
Point fort principal : {top_strength}
Point faible principal : {top_weakness}

Rédige une synthèse de 3-4 phrases en langage dirigeant.
Commence par le rythme d'activité (CA mensuel moyen, tendance).
Mentionne le socle récurrent s'il est significatif.
Termine par la projection ou le point d'attention principal.
Ne répète pas les chiffres bruts — intègre-les dans des phrases naturelles.`,
    maxTokens: 400,
    temperature: 0.3,
    expectedVariables: [
      'fiscal_year', 'health_score', 'health_label',
      'ca_total_ht', 'marge_operationnelle', 'trend_ca',
      'projection_ca', 'taux_recurrence', 'nb_collaborateurs',
      'top_strength', 'top_weakness',
    ],
  },

  // ============================================
  // Q2 — "Qu'est-ce qui va bien ?" — Forces
  // ============================================
  {
    type: 'financial_insight',
    version: 'v2.0-strength',
    systemPrompt: SYSTEM_IMMOBILIER,
    userPromptTemplate: `Points forts de l'agence — Exercice {fiscal_year} :

{ratios_detail}

Pour chaque indicateur ci-dessus, rédige :
- Un titre court (max 8 mots, orienté business)
- 2-3 phrases qui expliquent POURQUOI c'est bien et CE QUE ÇA SIGNIFIE pour le business
- Compare au benchmark sectoriel quand il est fourni

Format de sortie (respecte exactement) :
**[Titre]** — [Explication en 2-3 phrases]

Sépare chaque point par une ligne vide.
Ne commence pas par "Votre" à chaque fois — varie les formulations.`,
    maxTokens: 600,
    temperature: 0.3,
    expectedVariables: ['fiscal_year', 'ratios_detail'],
  },

  // ============================================
  // Q3 — "Qu'est-ce qui ne va pas ?" — Faiblesses
  // ============================================
  {
    type: 'financial_insight',
    version: 'v2.0-weakness',
    systemPrompt: SYSTEM_IMMOBILIER,
    userPromptTemplate: `Points de vigilance de l'agence — Exercice {fiscal_year} :

{ratios_detail}

Pour chaque indicateur ci-dessus, rédige :
- Un titre court (max 8 mots, orienté risque business)
- 2-3 phrases qui quantifient l'impact et expliquent le risque concret
- Sois direct, pas alarmiste mais pas édulcoré

Format de sortie (respecte exactement) :
**[Titre]** — [Explication en 2-3 phrases avec impact quantifié]

Sépare chaque point par une ligne vide.`,
    maxTokens: 600,
    temperature: 0.3,
    expectedVariables: ['fiscal_year', 'ratios_detail'],
  },

  // ============================================
  // Q4 — "Qu'est-ce que je dois surveiller ?" — Anomalies
  // ============================================
  {
    type: 'financial_insight',
    version: 'v2.0-anomaly',
    systemPrompt: SYSTEM_IMMOBILIER,
    userPromptTemplate: `Signaux à surveiller — Exercice {fiscal_year} :

{signals_detail}

Pour chaque signal, rédige :
- Un titre court orienté surveillance (max 8 mots)
- 2-3 phrases qui expliquent la tendance et ce qui se passe si elle continue
- Projette l'impact à 3-6 mois si possible

Format de sortie (respecte exactement) :
**[Titre]** — [Explication avec projection]

Sépare chaque point par une ligne vide.
Si aucun signal n'est fourni, écris : "Aucun signal d'alerte détecté sur la période."`,
    maxTokens: 500,
    temperature: 0.3,
    expectedVariables: ['fiscal_year', 'signals_detail'],
  },

  // ============================================
  // Q5 — "Que faire maintenant ?" — Recommandations
  // ============================================
  {
    type: 'financial_insight',
    version: 'v2.0-recommendation',
    systemPrompt: SYSTEM_IMMOBILIER,
    userPromptTemplate: `Faiblesses et anomalies identifiées — Exercice {fiscal_year} :

{issues_detail}

Modules NXT Finance disponibles pour agir :
- Pilotage rentabilité (suivi collaborateurs, marge par activité)
- Dépenses par catégorie (charges fixes, variables)
- Recettes et encaissements (suivi CA, délais)
- Reversements collaborateurs (parts, commissions)
- Périodes comptables (TVA, pièces justificatives)

Rédige 2-3 recommandations d'action concrètes.
Pour chaque recommandation :
- Une action précise en une phrase
- Une justification chiffrée en une phrase
- Le module NXT à consulter (format : → [Nom du module])

Format de sortie (respecte exactement) :
**[Action]**
[Justification chiffrée]
→ [Module NXT]

Sépare chaque recommandation par une ligne vide.`,
    maxTokens: 500,
    temperature: 0.3,
    expectedVariables: ['fiscal_year', 'issues_detail'],
  },

  // ============================================
  // Autres prompts existants (inchangés)
  // ============================================
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
