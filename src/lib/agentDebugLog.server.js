import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "debug-ee1adc.log");
const LOG_PATH_CURSOR = path.join(process.cwd(), ".cursor", "debug-197cec.log");
const INGEST_URL = "http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c";

function debugEnabled() {
  return process.env.ENABLE_AGENT_DEBUG === "1" || process.env.NODE_ENV === "development";
}

/** Server-side debug log — disabled in production unless ENABLE_AGENT_DEBUG=1 */
export function agentDebugLog(payload) {
  if (!debugEnabled()) return;

  const sessionId = payload.sessionId || "ee1adc";
  const entry = { sessionId, timestamp: Date.now(), ...payload };
  fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": sessionId },
    body: JSON.stringify(entry),
  }).catch(() => {});

  const line = `${JSON.stringify(entry)}\n`;
  try {
    fs.appendFileSync(LOG_PATH, line);
  } catch {
    console.info("[agentDebug]", JSON.stringify(entry));
  }
  if (sessionId === "197cec") {
    try {
      fs.appendFileSync(LOG_PATH_CURSOR, line);
    } catch {
      /* ignore */
    }
  }
}
