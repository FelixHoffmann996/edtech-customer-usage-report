import assert from "node:assert/strict";
import { test } from "node:test";
import { reportDecision, reportRequest } from "../src/report_decision.ts";

test("an overdue course with unfinished learners needs educator follow-up", () => {
  const input = reportRequest.parse({
    customerId: "school-42", courseId: "algebra-1",
    deadlineAt: "2026-09-19T12:00:00Z", enrolledLearners: 30, completedLearners: 24
  });
  assert.deepEqual(reportDecision(input, new Date("2026-09-20T12:00:00Z")), {
    courseId: "algebra-1", deadlineAt: "2026-09-19T12:00:00Z",
    outstandingLearners: 6, needsEducatorFollowUp: true
  });
  assert.equal(reportDecision(input, new Date("2026-09-18T12:00:00Z")).needsEducatorFollowUp, false);
  assert.equal(reportRequest.safeParse({ ...input, completedLearners: 31 }).success, false);
});
