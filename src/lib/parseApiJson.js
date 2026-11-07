export async function parseApiJson(response, action) {
  const body = await response.text();

  try {
    return JSON.parse(body);
  } catch {
    const isHtml = /^\s*(?:<!doctype\s+html|<html\b)/i.test(body);
    const responseType = isHtml
      ? "an HTML page instead of JSON"
      : "an invalid JSON response";
    const route = response.url ? new URL(response.url).pathname : "";
    const location = route ? ` for ${route}` : "";

    throw new Error(
      `${action} failed: the server returned ${responseType} (HTTP ${response.status}${location}). Check that the request reached the DAET application server.`
    );
  }
}
