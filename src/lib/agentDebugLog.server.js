import fs from "fs";
import path from "path";

const LOG_PATH = path.join(process.cwd(), "debug-ee1adc.log");
const INGEST_URL = "http://127.0.0.1:7540/ingest/3142bff0-53ba-4c2c-9606-b4d021977f0c";

/** Server-side debug log — file (local) + ingest (Cursor debug session) */
export function agentDebugLog(payload) {
  const entry = { sessionId: "ee1adc", timestamp: Date.now(), ...payload };
  fetch(INGEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "ee1adc" },
    body: JSON.stringify(entry),
  }).catch(() => {});

  try {
    fs.appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`);
  } catch {
    // read-only FS on some hosts — console is fallback
    console.info("[agentDebug]", JSON.stringify(entry));
  }
}
