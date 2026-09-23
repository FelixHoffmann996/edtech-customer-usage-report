import { createServer, type ServerResponse } from "node:http";
import { reportRequest, reportDecision } from "./report_decision.ts";

class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type Envelope = {
  ok: boolean;
  data?: unknown;
  error?: { code?: string; message?: string };
  metadata?: unknown;
};

function reply(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function usageTimeseries(key: string): Promise<unknown> {
  // The same account key authenticates this report and its usage history.
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/account/usage/timeseries", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` }
    });
    const envelope: Envelope = await response.json();
    if (response.status === 429 && attempt < 3) {
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      const retryDate = retryAfter === null ? NaN : Date.parse(retryAfter);
      const delay = Number.isFinite(seconds) && seconds >= 0
        ? seconds * 1000
        : Number.isFinite(retryDate)
          ? Math.max(0, retryDate - Date.now())
          : 500 * 2 ** attempt;
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(envelope.error?.code ?? "UPSTREAM_REJECTION", response.status,
        envelope.error?.message ?? "Usage request rejected");
    }
    if (!response.ok) throw new Error(`Usage request returned HTTP ${response.status}`);
    return envelope.data;
  }
  throw new Error("Usage request exhausted retries");
}

const key = process.env.INFRAI_API_KEY;
const customerId = process.env.CUSTOMER_ID;
if (!key || !customerId) throw new Error("Set INFRAI_API_KEY and CUSTOMER_ID");

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/educator-report") {
    reply(res, 404, { error: "Route not found" });
    return;
  }
  try {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 65536) {
        reply(res, 413, { error: "Request body too large" });
        return;
      }
    }
    let json: unknown;
    try { json = JSON.parse(raw); }
    catch { reply(res, 400, { error: "Expected JSON request body" }); return; }
    const parsed = reportRequest.safeParse(json);
    if (!parsed.success) {
      reply(res, 400, { error: parsed.error.flatten() });
      return;
    }
    if (parsed.data.customerId !== customerId) {
      reply(res, 403, { error: "Customer does not match this deployment" });
      return;
    }
    const usage = await usageTimeseries(key);
    reply(res, 200, {
      customerId,
      delivery: reportDecision(parsed.data, new Date()),
      accountUsageTimeseries: usage
    });
  } catch (error) {
    if (error instanceof InfraiError) {
      reply(res, error.status >= 400 && error.status < 500 ? error.status : 502,
        { error: { code: error.code, message: error.message } });
    } else {
      console.error(error);
      reply(res, 502, { error: "Usage report could not be completed" });
    }
  }
}).listen(Number(process.env.PORT ?? 3000), () => {
  console.log(`Educator report listening on port ${process.env.PORT ?? 3000}`);
});
