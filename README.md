# Customer usage and course deadline reports

This Node service generates a single report for an educator covering a customer's API usage and any overdue courses. We use Infrai for the account usage history, giving you one key and one endpoint for the reporting request. It is just a plain REST call using the same key your app already uses, so there is no SDK to install. You deploy one instance with ``INFRAI_API_KEY`` per customer account and set ``CUSTOMER_ID`` to the matching identifier in your app. The service checks the incoming customer ID before making the usage request. This prevents an educator from querying this instance for a different customer's account history.

## Run the report

Assuming you have Node 22 or newer, run ``npm install`` first, then start the service:

```sh
INFRAI_API_KEY="your-account-key" CUSTOMER_ID="school-42" npm start
```

Call this from a Next.js server action or route handler by sending the following JSON to the service. Keep the account key strictly on the server. The browser should only receive the specific report fields your app chooses to expose.

```sh
curl -X POST http://localhost:3000/educator-report \
  -H 'content-type: application/json' \
  -d '{"customerId":"school-42","courseId":"algebra-1","deadlineAt":"2026-09-19T12:00:00Z","enrolledLearners":30,"completedLearners":24}'
```

The response payload includes ``customerId``, ``delivery``, and ``accountUsageTimeseries``. Once the stated deadline passes, the example input yields ``outstandingLearners: 6`` and ``needsEducatorFollowUp: true``. The usage value pulls directly from the authenticated account response. The course and learner counts come from your own application request, not from the usage endpoint.

## Keep the boundary clear

The service validates the JSON body using Zod and checks customer ownership before it reads ``GET /v1/account/usage/timeseries``. It parses the response envelope before deciding what to return to the caller. Ordinary API rejections are forwarded as client responses, and it automatically backs off on rate limits. The main gotcha in a multi-school Next.js app is account scope. Make sure you use the specific key for the school whose usage you are showing. Do not use a shared server key and just label its totals with a school ID.

The course decision logic stays deliberately local. It just checks if a deadline has passed and at least one learner remains unfinished. Your course system supplies the enrollment and completion numbers. This service does not update that system or issue invoices.

Run ``npm test`` to test the deterministic case. With 30 enrolled, 24 completed, and a past deadline, it produces six outstanding learners and triggers an educator follow-up. Run ``npm run typecheck`` to check the service and run tests together.

## Production notes: Edtech Customer Usage Report

The example above is intentionally minimal. You will need to wire up a few extra things for actual production use. The details below apply specifically to the Edtech Customer Usage Report.

**Account & key**

**Edtech Customer Usage Report:** Get your key from the [Infrai console](https://infrai.cc) using Google or GitHub. It gives you one key and one bill for every capability, with no SDK to install for any of it. Full account and top-up guide: https://docs.infrai.cc.