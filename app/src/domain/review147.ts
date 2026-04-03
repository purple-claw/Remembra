export type ReviewPerformance = 'again' | 'hard' | 'good' | 'easy';
export type ReviewOutcome = 'pass' | 'fail';
export type PostSevenDayAction = 'schedule30' | 'complete';

export const REVIEW_INTERVALS_147 = [1, 4, 7] as const;
export const OPTIONAL_REVIEW_DAY_30 = 30;
export const DECISION_STAGE = REVIEW_INTERVALS_147.length; // after day-7 completion
export const THIRTY_DAY_STAGE = DECISION_STAGE + 1;
// Auto-deletion is disabled to prevent data loss after inactivity.
export const DELETE_AFTER_COMPLETION_DAYS = 0;
export const MAX_ACTIVE_STAGE = THIRTY_DAY_STAGE;
export const MASTERED_STAGE = MAX_ACTIVE_STAGE + 1; // logical terminal stage (not persisted)

export interface Review147State {
  review_stage: number;
  cycle_started_at?: string;
  lapse_count: number;
}

export interface Review147Result {
  nextStage: number;
  nextReviewDate: string;
  cycleStartedAt: string;
  outcome: ReviewOutcome;
  status: 'active' | 'completed';
  lapseCount: number;
  intervalDays: number;
  completedAt?: string;
  deleteAt?: string;
  requiresDeletionConfirmation: boolean;
  requiresSevenDayDecision: boolean;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(input: string | Date): string {
  if (typeof input === 'string') {
    if (ISO_DATE_REGEX.test(input)) return input;
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return new Date().toISOString().split('T')[0];
  }

  if (Number.isNaN(input.getTime())) {
    return new Date().toISOString().split('T')[0];
  }

  return input.toISOString().split('T')[0];
}

export function addDays(dateIso: string, days: number): string {
  const base = new Date(`${toIsoDate(dateIso)}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().split('T')[0];
}

export function performanceToOutcome(performance: ReviewPerformance): ReviewOutcome {
  if (performance === 'good' || performance === 'easy') {
    return 'pass';
  }
  return 'fail';
}

export function getScheduledDateForStage(cycleStartedAt: string, stage: number): string {
  if (stage >= 0 && stage < REVIEW_INTERVALS_147.length) {
    return addDays(cycleStartedAt, REVIEW_INTERVALS_147[stage]);
  }
  if (stage === THIRTY_DAY_STAGE) {
    return addDays(cycleStartedAt, OPTIONAL_REVIEW_DAY_30);
  }
  return '';
}

export function getCurrentIntervalForStage(stage: number): number {
  if (stage < 0) return REVIEW_INTERVALS_147[0];
  if (stage >= 0 && stage < REVIEW_INTERVALS_147.length) return REVIEW_INTERVALS_147[stage];
  if (stage === THIRTY_DAY_STAGE) return OPTIONAL_REVIEW_DAY_30;
  return 0;
}

export function process147Review(
  state: Review147State,
  performance: ReviewPerformance,
  now: Date = new Date(),
): Review147Result {
  const outcome = performanceToOutcome(performance);
  const nowIso = toIsoDate(now);
  const currentStage = Math.max(0, Math.min(state.review_stage || 0, MAX_ACTIVE_STAGE));
  const cycleStartedAt = toIsoDate(state.cycle_started_at || nowIso);

  if (currentStage > MAX_ACTIVE_STAGE) {
    return {
      nextStage: MAX_ACTIVE_STAGE,
      nextReviewDate: '',
      cycleStartedAt,
      outcome,
      status: 'completed',
      lapseCount: state.lapse_count || 0,
      intervalDays: 0,
      completedAt: now.toISOString(),
      requiresDeletionConfirmation: false,
      requiresSevenDayDecision: false,
    };
  }

  if (outcome === 'fail') {
    const resetCycle = nowIso;
    const nextDate = getScheduledDateForStage(resetCycle, 0);

    return {
      nextStage: 0,
      nextReviewDate: nextDate,
      cycleStartedAt: resetCycle,
      outcome,
      status: 'active',
      lapseCount: (state.lapse_count || 0) + 1,
      intervalDays: REVIEW_INTERVALS_147[0],
      requiresDeletionConfirmation: false,
      requiresSevenDayDecision: false,
    };
  }

  if (currentStage === DECISION_STAGE) {
    return {
      nextStage: DECISION_STAGE,
      nextReviewDate: '',
      cycleStartedAt,
      outcome,
      status: 'active',
      lapseCount: state.lapse_count || 0,
      intervalDays: 0,
      requiresDeletionConfirmation: false,
      requiresSevenDayDecision: true,
    };
  }

  if (currentStage === THIRTY_DAY_STAGE) {
    const completedAt = now.toISOString();
    return {
      nextStage: THIRTY_DAY_STAGE,
      nextReviewDate: '',
      cycleStartedAt,
      outcome,
      status: 'completed',
      lapseCount: state.lapse_count || 0,
      intervalDays: 0,
      completedAt,
      requiresDeletionConfirmation: false,
      requiresSevenDayDecision: false,
    };
  }

  const nextStage = currentStage + 1;

  // After day-7 review, wait for user choice:
  // schedule day-30 OR mark completed.
  if (currentStage === REVIEW_INTERVALS_147.length - 1) {
    return {
      nextStage: DECISION_STAGE,
      nextReviewDate: '',
      cycleStartedAt,
      outcome,
      status: 'active',
      lapseCount: state.lapse_count || 0,
      intervalDays: 0,
      requiresDeletionConfirmation: false,
      requiresSevenDayDecision: true,
    };
  }

  const nextReviewDate = getScheduledDateForStage(cycleStartedAt, nextStage);

  return {
    nextStage,
    nextReviewDate,
    cycleStartedAt,
    outcome,
    status: 'active',
    lapseCount: state.lapse_count || 0,
    intervalDays: getCurrentIntervalForStage(nextStage),
    requiresDeletionConfirmation: false,
    requiresSevenDayDecision: false,
  };
}

export function applyPostSevenDayDecision(
  state: Review147State,
  action: PostSevenDayAction,
  now: Date = new Date(),
): Review147Result {
  const nowIso = toIsoDate(now);
  const cycleStartedAt = toIsoDate(state.cycle_started_at || nowIso);
  const safeLapseCount = state.lapse_count || 0;

  if (action === 'schedule30') {
    return {
      nextStage: THIRTY_DAY_STAGE,
      nextReviewDate: getScheduledDateForStage(cycleStartedAt, THIRTY_DAY_STAGE),
      cycleStartedAt,
      outcome: 'pass',
      status: 'active',
      lapseCount: safeLapseCount,
      intervalDays: OPTIONAL_REVIEW_DAY_30,
      requiresDeletionConfirmation: false,
      requiresSevenDayDecision: false,
    };
  }

  const completedAt = now.toISOString();
  return {
    nextStage: DECISION_STAGE,
    nextReviewDate: '',
    cycleStartedAt,
    outcome: 'pass',
    status: 'completed',
    lapseCount: safeLapseCount,
    intervalDays: 0,
    completedAt,
    requiresDeletionConfirmation: false,
    requiresSevenDayDecision: false,
  };
}

export function getStageDayLabel(stage: number, status?: 'active' | 'completed' | 'archived'): string {
  if (status === 'completed') return 'Completed';
  if (stage === 0) return 'Day 1';
  if (stage === 1) return 'Day 4';
  if (stage === 2) return 'Day 7';
  if (stage === DECISION_STAGE) return 'Choose 30 Day or Complete';
  if (stage === THIRTY_DAY_STAGE) return 'Day 30';
  return 'Day 1';
}
