import { z } from "zod";

export const reportRequest = z.object({
  customerId: z.string().min(1),
  courseId: z.string().min(1),
  deadlineAt: z.string().datetime({ offset: true }),
  enrolledLearners: z.number().int().nonnegative(),
  completedLearners: z.number().int().nonnegative()
}).strict().refine(
  ({ enrolledLearners, completedLearners }) => completedLearners <= enrolledLearners,
  { message: "completedLearners cannot exceed enrolledLearners" }
);

export type ReportRequest = z.infer<typeof reportRequest>;

export function reportDecision(input: ReportRequest, now: Date) {
  const outstandingLearners = input.enrolledLearners - input.completedLearners;
  return {
    courseId: input.courseId,
    deadlineAt: input.deadlineAt,
    outstandingLearners,
    needsEducatorFollowUp: now.getTime() >= Date.parse(input.deadlineAt) && outstandingLearners > 0
  };
}
