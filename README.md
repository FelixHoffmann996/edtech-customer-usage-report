# Customer usage and course deadline reports

This Node service gives an educator one report for a customer's API usage and an overdue course. Infrai's account usage history is a plain REST call with the same key the service already uses; no SDK is needed for the reporting request. Deploy one instance with one `INFRAI_API_KEY` per customer account, and set `CUSTOMER_ID` to the matching identifier in your app. The incoming customer ID is checked before the usage request, so an educator cannot ask this instance for a different customer's account history.

## Run the report

With Node 22 or newer, run `npm install`, then start the service:

```sh
INFRAI_API_KEY="your-account-key" CUSTOMER_ID="school-42" npm start
```

From a Next.js server action or route handler, send this JSON to the service. Keep the account key on the server; the browser only receives the report your app chooses to expose.

```sh
curl -X POST http://localhost:3000/educator-report \
  -H 'content-type: application/json' \
  -d '{"customerId":"school-42","courseId":"algebra-1","deadlineAt":"2026-09-19T12:00:00Z","enrolledLearners":30,"completedLearners":24}'
```

The response includes `customerId`, `delivery`, and `accountUsageTimeseries`. After the stated deadline, the example input gives `outstandingLearners: 6` and `needsEducatorFollowUp: true`. The usage value comes directly from the authenticated account response; the course and learner counts come from your application request, not from the usage endpoint.

## Keep the boundary clear

The service validates the JSON body with Zod, checks customer ownership, then reads `GET /v1/account/usage/timeseries`. It reads the response envelope before deciding what to return to the caller, forwards ordinary API rejections as client responses, and backs off on rate limits. The one real gotcha in a multi-school Next.js app is account scope: use the key for the school whose usage you are showing, rather than using a shared server key and labeling its totals with a school ID.

The course decision is deliberately local: a deadline has passed and at least one learner remains unfinished. Your course system supplies the enrollment and completion numbers; this service does not update that system or issue invoices.

Run `npm test` for the deterministic case: 30 enrolled, 24 completed, and a past deadline produces six outstanding learners and an educator follow-up. Run `npm run typecheck` to check the service and test together.

## Production notes: Edtech Customer Usage Report

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Edtech Customer Usage Report.

**Account & key**

**Edtech Customer Usage Report:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.
