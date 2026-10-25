import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import {
  handlePreviewRequest,
  issuePreviewSession,
  PREVIEW_COOKIE,
  PREVIEW_SESSION_SECONDS,
  safeReturnTo,
  validPreviewSession,
} from "../server/preview-gate.ts";

const origin = "https://preview.example";
const password = "fixture-only-password";
const salt = "0".repeat(32);
const config = {
  passwordHash: `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
  sessionSecret: "test-fixture-session-key-".repeat(3),
};
const cookie = (token: string) => `${PREVIEW_COOKIE}=${token}`;
const request = (path = "/", init: RequestInit = {}) =>
  new Request(origin + path, init);
const login = (value = password, returnTo = "/", extra: HeadersInit = {}) =>
  request("/__preview/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: origin,
      ...extra,
    },
    body: new URLSearchParams({
      password: value,
      returnTo,
      lang: "en",
    }).toString(),
  });

test("anonymous visitors get the private preview form without application HTML", async () => {
  const r = (await handlePreviewRequest(request(), config))!;
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /Private preview/);
  assert.match(html, /name="password"/);
  assert.doesNotMatch(html, /\/assets\/|Maré Studio|R\$|fixture-only-password/);
  assert.match(r.headers.get("cache-control")!, /no-store/);
  assert.match(r.headers.get("content-security-policy")!, /form-action 'self'/);
});
test("JavaScript, CSS, maps, and exported data are blocked without a valid cookie", async () => {
  for (const path of [
    "/assets/app.js",
    "/assets/app.css",
    "/private.json",
    "/index.js.map",
    "/favicon.svg",
  ]) {
    const r = (await handlePreviewRequest(request(path), config))!;
    assert.equal(r.status, 401, path);
    assert.equal(await r.text(), "Preview access required.");
  }
});
test("missing or malformed server configuration fails closed for app and assets", async () => {
  for (const path of ["/", "/assets/app.js"])
    for (const value of [
      {},
      { ...config, sessionSecret: "short" },
      { ...config, passwordHash: "invalid" },
    ]) {
      const r = (await handlePreviewRequest(request(path), value))!;
      assert.equal(r.status, 503);
      assert.doesNotMatch(await r.text(), /Maré Studio|\/assets\/app/);
    }
});
test("incorrect passwords get a generic error, no cookie, and are never reflected", async () => {
  const r = (await handlePreviewRequest(
    login("wrong-password-not-reflected"),
    config,
  ))!;
  assert.equal(r.status, 401);
  assert.equal(r.headers.get("set-cookie"), null);
  const html = await r.text();
  assert.match(html, /didn’t match/);
  assert.doesNotMatch(html, /wrong-password-not-reflected/);
});
test("valid login creates a signed, host-only, HttpOnly, Secure cookie and safe redirect", async () => {
  const r = (await handlePreviewRequest(
    login(password, "/?view=plan"),
    config,
  ))!;
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "/?view=plan");
  const set = r.headers.get("set-cookie")!;
  assert.match(set, /HttpOnly/);
  assert.match(set, /Secure/);
  assert.match(set, /SameSite=Lax/);
  assert.doesNotMatch(set, /Domain=/);
  const next = await handlePreviewRequest(
    request("/assets/app.js", { headers: { cookie: set.split(";")[0] } }),
    config,
  );
  assert.equal(next, null);
});
test("sessions expire, cannot be forged, are host-bound, and are revoked by password or key rotation", () => {
  const at = Date.parse("2026-10-26T00:00:00Z");
  const token = issuePreviewSession("preview.example", config, at);
  assert.equal(
    validPreviewSession(cookie(token), "preview.example", config, at),
    true,
  );
  assert.equal(
    validPreviewSession(cookie(token), "other.example", config, at),
    false,
  );
  assert.equal(
    validPreviewSession(
      cookie(token),
      "preview.example",
      { ...config, sessionSecret: "another-key".repeat(5) },
      at,
    ),
    false,
  );
  assert.equal(
    validPreviewSession(
      cookie(token),
      "preview.example",
      { ...config, passwordHash: config.passwordHash.replace(/0/, "1") },
      at,
    ),
    false,
  );
  assert.equal(
    validPreviewSession(
      cookie(token),
      "preview.example",
      config,
      at + PREVIEW_SESSION_SECONDS * 1000,
    ),
    false,
  );
  assert.equal(
    validPreviewSession(
      cookie(token.slice(0, -4) + "aaaa"),
      "preview.example",
      config,
      at,
    ),
    false,
  );
  assert.equal(
    validPreviewSession(
      cookie(token) + "; " + cookie(token),
      "preview.example",
      config,
      at,
    ),
    false,
  );
});
test("cross-origin login and logout are rejected", async () => {
  assert.equal(
    (await handlePreviewRequest(
      login(password, "/", { Origin: "https://attacker.example" }),
      config,
    ))!.status,
    403,
  );
  assert.equal(
    (await handlePreviewRequest(
      request("/__preview/logout", {
        method: "POST",
        headers: { Origin: "https://attacker.example" },
      }),
      config,
    ))!.status,
    403,
  );
  assert.equal(
    (await handlePreviewRequest(
      request("/__preview/login", { method: "POST", body: "password=x" }),
      config,
    ))!.status,
    403,
  );
});
test("logout uses POST, clears the preview cookie, and disables caching", async () => {
  assert.equal(
    (await handlePreviewRequest(request("/__preview/logout"), config))!.status,
    405,
  );
  const r = (await handlePreviewRequest(
    request("/__preview/logout", {
      method: "POST",
      headers: { Origin: origin },
    }),
    config,
  ))!;
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "/");
  assert.match(r.headers.get("set-cookie")!, /Max-Age=0/);
  assert.match(r.headers.get("cache-control")!, /no-store/);
});
test("login rejects oversized, duplicate, and unsupported form payloads", async () => {
  const variants = [
    new URLSearchParams({ password: "x".repeat(3000) }).toString(),
    "password=a&password=b",
  ];
  for (const body of variants) {
    const r = (await handlePreviewRequest(
      request("/__preview/login", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }),
      config,
    ))!;
    assert.equal(r.status, 400);
  }
  assert.equal(
    (await handlePreviewRequest(
      request("/__preview/login", {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: "{}",
      }),
      config,
    ))!.status,
    400,
  );
});
test("redirect targets stay on this site and cannot redirect into auth routes", () => {
  for (const target of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/\nLocation: evil",
    "/__preview/logout",
  ])
    assert.equal(safeReturnTo(target), "/");
  assert.equal(
    safeReturnTo("/?view=people#/agreements"),
    "/?view=people#/agreements",
  );
});
test("the Portuguese login is available and HEAD responses do not emit a body", async () => {
  const pt = (await handlePreviewRequest(request("/?lang=pt"), config))!;
  assert.match(await pt.text(), /Senha da prévia/);
  const head = (await handlePreviewRequest(
    request("/", { method: "HEAD" }),
    config,
  ))!;
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
});
