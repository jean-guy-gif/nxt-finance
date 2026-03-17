// ============================================
// NXT Finance V3.6 — Business Plan Types
// Re-exports from @/types for feature-local usage
// ============================================

export type {
  BusinessPlan,
  BpHypothesis,
  BpProjection,
  BpNarrative,
} from '@/types/models';

export type {
  BpStatus,
  BpScenario,
  BpHypothesisLevel,
  BpHypothesisValueType,
  BpPeriodGranularity,
} from '@/types/enums';

export {
  BP_STATUSES,
  BP_STATUS_LABELS,
  BP_SCENARIOS,
  BP_SCENARIO_LABELS,
  BP_HYPOTHESIS_LEVELS,
  BP_HYPOTHESIS_LEVEL_LABELS,
  BP_HYPOTHESIS_VALUE_TYPES,
  BP_PERIOD_GRANULARITIES,
} from '@/types/enums';
