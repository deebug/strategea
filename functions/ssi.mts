// DiveDrop ↔ MySSI External API (v1, HMAC): signing relay.
//
// The DiveDrop apps cannot hold SSI's application secret ("never expose in client-side code"),
// so they call this function, which signs each request and passes it on. It stores nothing:
// no dives, no tokens, no logs of request bodies. Routes, all under /api/ssi/:
//
//   GET  health             configuration check, no secrets in the answer
//   POST link               { return, state } -> { signUpUrl }   (POST requestsignup at SSI)
//   GET  callback           MySSI sends the diver's browser here after "Accept";
//                           we forward ssi_user_id / ssi_user_token / name to `return`
//   GET  check              read-only key/signature check against production and test
//   GET  divelogs[/:id]     headers x-ssi-user-id + x-ssi-user-token from the app
//   POST divelogs           same headers, body { dives: [...] } in SSI's canonical contract
//
// Environment (Netlify, scope Functions): SSI_SECRET; TEST_ENV_PWD (or SSI_TEST_PASS), the basic-auth
// password of SSI's test environment; SSI_ENV "production" switches to the live API (default: test);
// optional SSI_KEY and SSI_PUBLIC_BASE.

import { createHmac } from "node:crypto"

const BASES = {
  production: "https://api.divessi.com/rst/extern/v1",
  test: "https://api.divessi-test.com/rst/extern/v1",
}
const VERSION = "1.0.0"
const MAX_BODY = 5 * 1024 * 1024
const MAX_DIVES = 100

type Env = { key: string; secret: string; mode: "production" | "test"; testPass: string; publicBase: string }

function env(): Env | null {
  // The key is public (it travels in every request header); only the secret and the test password are secret.
  const key = Netlify.env.get("SSI_KEY") || "divedrop-4b-261110"
  const secret = Netlify.env.get("SSI_SECRET") ?? ""
  const mode = Netlify.env.get("SSI_ENV") === "production" ? "production" : "test"
  const testPass = Netlify.env.get("SSI_TEST_PASS") || Netlify.env.get("TEST_ENV_PWD") || ""
  const publicBase = (Netlify.env.get("SSI_PUBLIC_BASE") ?? "https://divedrop.app").replace(/\/+$/, "")
  if (!key || !secret || (mode === "test" && !testPass)) return null
  return { key, secret, mode, testPass, publicBase }
}

// ---------- signature (MySSI recipe, mirrors PHP urldecode(http_build_query(ksort(...)))) ----------

function scalar(v: unknown): string {
  if (typeof v === "boolean") return v ? "1" : "0"
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : ""
  return String(v)
}

function flatten(value: unknown, key: string, out: string[]) {
  if (value === null || value === undefined) return // http_build_query skips null
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${key}[${i}]`, out))
  } else if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) flatten(v, `${key}[${k}]`, out)
  } else {
    out.push(`${key}=${scalar(value)}`)
  }
}

export function signingString(method: string, uri: string, headers: Record<string, string>, body: Record<string, unknown> | null): string {
  const merged: Record<string, unknown> = {}
  for (const [k, v] of Object.entries({ ...headers, ...(body ?? {}) })) {
    if (v !== null && v !== undefined) merged[k.toLowerCase()] = v
  }
  const parts: string[] = []
  for (const k of Object.keys(merged).sort()) flatten(merged[k], k, parts)
  return [method.toUpperCase(), uri.replace(/^\/+|\/+$/g, ""), parts.join("&")].join("\n")
}

// ---------- talking to SSI ----------

function error(status: number, code: string, message: string, detail = ""): Response {
  return Response.json({ error: { code, http_status: status, message, detail } }, { status, headers: { "cache-control": "no-store" } })
}

async function callSSI(e: Env, method: "GET" | "POST", path: string, body: Record<string, unknown> | null, user?: { id: string; token: string }, mode: Env["mode"] = e.mode): Promise<Response> {
  const auth: Record<string, string> = {
    "x-ssi-key": e.key,
    "x-ssi-timestamp": String(Math.floor(Date.now() / 1000)),
    "x-ssi-version": VERSION,
  }
  if (user) {
    auth["x-ssi-user-id"] = user.id
    auth["x-ssi-user-token"] = user.token
  }
  // A trailing numeric id is not part of the signed URI.
  const uri = path.replace(/\/\d+$/, "")
  const signature = createHmac("sha256", e.secret).update(signingString(method, uri, auth, body)).digest("hex")
  const headers: Record<string, string> = { ...auth, "x-ssi-signature": signature, accept: "application/json" }
  if (mode === "test") headers.authorization = "Basic " + Buffer.from(`${e.key}:${e.testPass}`).toString("base64")
  if (body) headers["content-type"] = "application/json"

  let res: Response
  try {
    res = await fetch(`${BASES[mode]}/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(50_000) })
  } catch {
    return error(502, "UPSTREAM_UNREACHABLE", "MySSI could not be reached.")
  }
  const text = await res.text()
  try {
    JSON.parse(text)
  } catch {
    return error(502, "UPSTREAM_INVALID", "MySSI did not answer with JSON.", `HTTP ${res.status}`)
  }
  return new Response(text, { status: res.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } })
}

function userFrom(req: Request): { id: string; token: string } | null {
  const id = req.headers.get("x-ssi-user-id") ?? ""
  const token = req.headers.get("x-ssi-user-token") ?? ""
  if (!/^\d{1,12}$/.test(id) || token.length < 8 || token.length > 512) return null
  return { id, token }
}

async function jsonBody(req: Request): Promise<Record<string, unknown> | Response> {
  const length = Number(req.headers.get("content-length") ?? "0")
  if (length > MAX_BODY) return error(413, "PROXY_TOO_LARGE", "Request body too large.", `max ${MAX_BODY} bytes`)
  const text = await req.text()
  if (text.length > MAX_BODY) return error(413, "PROXY_TOO_LARGE", "Request body too large.", `max ${MAX_BODY} bytes`)
  try {
    const v = JSON.parse(text)
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>
  } catch {}
  return error(400, "PROXY_BAD_REQUEST", "Body must be a JSON object.")
}

// ---------- where a linked diver may be sent back to ----------

// The apps register divedrop://. A loopback address (RFC 8252 §7.3) serves the test script: the token
// only ever reaches the machine that started the link.
function allowedReturn(url: string, _mode: Env["mode"]): URL | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol === "divedrop:") return u
  if (u.protocol === "http:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost") && u.port) return u
  return null
}

function page(title: string, text: string, status = 200): Response {
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font:17px/1.5 -apple-system,system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 16px;color:#0b2a3c;background:#f4f8fa">
<h1 style="font-size:1.4rem">${title}</h1><p>${text}</p></body></html>`
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" } })
}

// ---------- handler ----------

export default async (req: Request) => {
  const url = new URL(req.url)
  const route = url.pathname.replace(/^\/api\/ssi\/?/, "").replace(/\/+$/, "")
  const e = env()

  if (route === "health" && req.method === "GET") {
    // Names only, never values: which settings this deploy can see.
    const testMode = Netlify.env.get("SSI_ENV") !== "production"
    const missing = [
      ...(Netlify.env.get("SSI_SECRET") ? [] : ["SSI_SECRET"]),
      ...(testMode && !(Netlify.env.get("TEST_ENV_PWD") || Netlify.env.get("SSI_TEST_PASS")) ? ["TEST_ENV_PWD"] : []),
    ]
    return Response.json({ ok: !!e, environment: testMode ? "test" : "production", missing, version: VERSION }, { headers: { "cache-control": "no-store" } })
  }
  if (!e) return error(503, "PROXY_NOT_CONFIGURED", "The DiveDrop SSI relay is not configured.")

  // Read-only key and signature check against both SSI environments (documentation/available).
  // Answers status and error code only.
  if (route === "check" && req.method === "GET") {
    const result: Record<string, unknown> = {}
    for (const mode of ["production", "test"] as const) {
      if (mode === "test" && !e.testPass) continue
      const r = await callSSI(e, "GET", "documentation/available", null, undefined, mode)
      const j = (await r.json().catch(() => ({}))) as { error?: { code?: string } }
      result[mode] = { http: r.status, code: j.error?.code ?? (r.ok ? "OK" : "UNKNOWN") }
    }
    return Response.json(result, { headers: { "cache-control": "no-store" } })
  }

  if (route === "link" && req.method === "POST") {
    const body = await jsonBody(req)
    if (body instanceof Response) return body
    const ret = typeof body.return === "string" ? allowedReturn(body.return, e.mode) : null
    if (!ret) return error(400, "PROXY_RETURN_NOT_ALLOWED", "This return address is not allowed.")
    const state = typeof body.state === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(body.state) ? body.state : null
    if (!state) return error(400, "PROXY_BAD_REQUEST", "state must be 16-128 characters of A-Z, a-z, 0-9, _ or -.")
    // Extra fields travel with SSI and come back to the callback as query parameters.
    return callSSI(e, "POST", "requestsignup", { callback_url: `${e.publicBase}/api/ssi/callback`, return: ret.toString(), state })
  }

  if (route === "callback" && req.method === "GET") {
    const q = url.searchParams
    const ret = allowedReturn(q.get("return") ?? "", e.mode)
    const id = q.get("ssi_user_id") ?? ""
    const token = q.get("ssi_user_token") ?? ""
    if (!ret) return page("Linked with SSI", "You can close this window and return to DiveDrop.")
    const target = new URL(ret.toString())
    target.searchParams.set("state", q.get("state") ?? "")
    if (/^\d{1,12}$/.test(id) && token) {
      target.searchParams.set("ssi_user_id", id)
      target.searchParams.set("ssi_user_token", token)
      const name = q.get("confirmedByName")
      if (name) target.searchParams.set("name", name.slice(0, 120))
    } else {
      target.searchParams.set("error", "not_linked")
    }
    return new Response(null, { status: 302, headers: { location: target.toString(), "cache-control": "no-store", "referrer-policy": "no-referrer" } })
  }

  const m = route.match(/^divelogs(?:\/(\d+))?$/)
  if (m) {
    const user = userFrom(req)
    if (!user) return error(401, "PROXY_USER_MISSING", "x-ssi-user-id and x-ssi-user-token are required.")
    if (req.method === "GET") return callSSI(e, "GET", m[1] ? `divelogs/${m[1]}` : "divelogs", null, user)
    if (req.method === "POST" && !m[1]) {
      const body = await jsonBody(req)
      if (body instanceof Response) return body
      if (!Array.isArray(body.dives) || body.dives.length === 0) return error(400, "PROXY_BAD_REQUEST", "Body must be { dives: [ ... ] } with at least one dive.")
      if (body.dives.length > MAX_DIVES) return error(400, "PROXY_BAD_REQUEST", `At most ${MAX_DIVES} dives per request.`)
      return callSSI(e, "POST", "divelogs", { dives: body.dives }, user)
    }
  }

  return error(404, "PROXY_ROUTE_NOT_FOUND", "No such route.")
}

export const config = { path: ["/api/ssi/*"] }
