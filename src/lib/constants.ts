/**
 * Shared constants for application-wide status values.
 * Use these instead of raw strings to avoid typo-induced silent bugs.
 */
export const APPLICATION_STATUS = {
  PENDING: 'pending',
  SHORTLISTED: 'shortlisted',
  REJECTED: 'rejected',
  INTERVIEW: 'interview',
} as const;

export const JOB_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed',
  DRAFT: 'draft',
} as const;

export const INTERVIEW_STATUS = {
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type ApplicationStatus = (typeof APPLICATION_STATUS)[keyof typeof APPLICATION_STATUS];
export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];
export type InterviewStatus = (typeof INTERVIEW_STATUS)[keyof typeof INTERVIEW_STATUS];
