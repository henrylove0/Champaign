import { createHmac, scrypt, timingSafeEqual } from "node:crypto";

export const PREVIEW_COOKIE = "__Host-champaign_preview";
export const PREVIEW_SESSION_SECONDS = 60 * 60 * 24 * 7;
export type PreviewConfig = { passwordHash?: string; sessionSecret?: string };

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
  // Native form POSTs may send Origin: null under no-referrer. Keep referrers
  // on this host so the strict same-origin login/logout checks work in browsers.
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
};
export const previewResponseHeaders = () => ({ ...privateHeaders });

function configured(config: PreviewConfig): config is Required<PreviewConfig> {
  return (
    /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.passwordHash ?? "") &&
    (config.sessionSecret?.length ?? 0) >= 32
  );
}
export function safeReturnTo(value: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return "/";
  try {
    const base = "https://preview.invalid";
    const parsed = new URL(value, base);
    if (parsed.origin !== base || parsed.pathname.startsWith("/__preview"))
      return "/";
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/";
  }
}
function signature(
  expiry: number,
  hostname: string,
  config: Required<PreviewConfig>,
): Buffer {
  return createHmac("sha256", config.sessionSecret)
    .update(`champaign-preview:v1:${hostname}:${expiry}:${config.passwordHash}`)
    .digest();
}
export function issuePreviewSession(
  hostname: string,
  config: Required<PreviewConfig>,
  at = Date.now(),
): string {
  const expiry = Math.floor(at / 1000) + PREVIEW_SESSION_SECONDS;
  return `v1.${expiry}.${signature(expiry, hostname, config).toString("base64url")}`;
}
export function validPreviewSession(
  cookieHeader: string,
  hostname: string,
  config: PreviewConfig,
  at = Date.now(),
): boolean {
  if (!configured(config)) return false;
  const matches = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.startsWith(`${PREVIEW_COOKIE}=`));
  if (matches.length !== 1) return false;
  const value = matches[0].slice(PREVIEW_COOKIE.length + 1);
  const match = /^v1\.(\d{10})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!match) return false;
  const expiry = Number(match[1]);
  const seconds = Math.floor(at / 1000);
  if (expiry <= seconds || expiry > seconds + PREVIEW_SESSION_SECONDS + 60)
    return false;
  const supplied = Buffer.from(match[2], "base64url");
  const expected = signature(expiry, hostname, config);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
async function checkPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  if (!password || password.length > 128) return false;
  const [, salt, hex] = encoded.split(":");
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, derived) =>
      error ? reject(error) : resolve(derived),
    );
  });
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );

function loginPage(
  request: Request,
  {
    error = false,
    unavailable = false,
    lang: chosenLang,
    returnTo: chosenReturn,
  }: {
    error?: boolean;
    unavailable?: boolean;
    lang?: string;
    returnTo?: string;
  } = {},
): Response {
  const url = new URL(request.url);
  const lang =
    (chosenLang ?? url.searchParams.get("lang")) === "pt" ? "pt" : "en";
  const t = (en: string, pt: string) => (lang === "pt" ? pt : en);
  const returnTo = safeReturnTo(
    chosenReturn ??
      (url.pathname.startsWith("/__preview") ? "/" : url.pathname + url.search),
  );
  const html = `<!doctype html><html lang="${lang === "pt" ? "pt-BR" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#f2efe9"><title>Champaign — ${t("Private preview", "Prévia privada")}</title><style>
  :root{font-family:'Futura','Century Gothic',sans-serif;color:#292c26;background:#f2efe9;font-synthesis:none}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:flex;flex-direction:column}a{color:inherit}header{height:90px;display:flex;align-items:center;justify-content:space-between;padding:0 6vw;border-bottom:1px solid #dadfd0}.wordmark{font-size:31px;letter-spacing:-1.6px;font-weight:500}.wordmark span{font-size:26px;color:#7a8c63;position:relative;top:-9px;letter-spacing:0}.language{font-family:system-ui,sans-serif;font-size:11px;display:flex;gap:16px}.language a{text-decoration:none;opacity:.55}.language a[aria-current=page]{opacity:1;text-decoration:underline;text-underline-offset:5px}main{max-width:1100px;width:100%;margin:auto;display:grid;grid-template-columns:1.15fr 1fr;gap:100px;padding:70px 40px}.eyebrow{font-family:system-ui,sans-serif;font-size:10px;letter-spacing:2px;color:#758267;font-weight:500}.intro h1{font-size:clamp(44px,6vw,72px);line-height:1.13;font-weight:400;letter-spacing:-2px;margin:27px 0}.intro>p{font-family:system-ui,sans-serif;font-size:14px;line-height:1.9;color:#6d7861;max-width:360px}.features{display:flex;flex-wrap:wrap;gap:9px;margin-top:33px}.features span{border:1px solid #d1d9c5;border-radius:4px;padding:7px 10px;font-family:system-ui,sans-serif;font-size:10px;color:#71825d}.access{align-self:center;background:#faf9f4;border:1px solid #d7dfca;border-radius:8px;padding:36px}.lock{width:43px;height:43px;background:#e2e8d6;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#667c4c;margin-bottom:24px}.access h2{font-size:29px;line-height:1.3;font-weight:400;letter-spacing:-.6px;margin:0 0 12px}.access p{font-family:system-ui,sans-serif;font-size:12px;line-height:1.8;color:#79866c}form{margin-top:26px}label{font-family:system-ui,sans-serif;font-size:11px;color:#657653;font-weight:500;display:block;margin-bottom:9px}input{width:100%;padding:13px 14px;border:1px solid #cdd7be;border-radius:4px;background:#fdfcf8;font-family:system-ui,sans-serif;font-size:16px;min-height:48px;color:#354c2c}input:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid #66804d;outline-offset:3px}button{width:100%;margin-top:14px;border:1px solid #344d3f;border-radius:4px;padding:14px;background:#344d3f;color:#f5f5e9;font-family:system-ui,sans-serif;font-size:12px;font-weight:500;cursor:pointer;min-height:47px;display:flex;align-items:center;justify-content:center;gap:12px}button:hover{background:#263f30}.notice{font-family:system-ui,sans-serif;font-size:10px!important;border-top:1px solid #e0e5d6;padding-top:19px;margin-top:24px!important;line-height:1.8!important}.error{background:#f4e6db;color:#8e583f!important;border:1px solid #e5cdbd;border-radius:4px;padding:11px;margin-top:15px!important;font-size:11px!important}footer{border-top:1px solid #dadfd0;margin:0 6vw;padding:24px 0;display:flex;justify-content:space-between;gap:20px;font-family:system-ui,sans-serif;font-size:10px;color:#8a937e}footer strong{font-weight:500;letter-spacing:1.7px;color:#657655}@media(max-width:760px){header{height:75px;padding:0 25px}.wordmark{font-size:28px}main{padding:40px 25px 50px;grid-template-columns:1fr;gap:32px;max-width:500px}.intro h1{font-size:46px;line-height:1.12;margin:20px 0;letter-spacing:-1.5px}.intro>p{font-size:12px}.features{margin-top:21px;gap:7px}.features span{font-size:9px;padding:6px 8px}.access{padding:27px}.access h2{font-size:27px}.lock{width:36px;height:36px;margin-bottom:20px}footer{margin:0 25px;font-size:9px;padding:20px 0;line-height:1.7}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
  </style></head><body><header><div class="wordmark">champaign<span>✳</span></div><nav class="language" aria-label="${t("Language", "Idioma")}"><a href="/?lang=en" ${lang === "en" ? 'aria-current="page"' : ""}>EN</a><a href="/?lang=pt" ${lang === "pt" ? 'aria-current="page"' : ""}>PT</a></nav></header><main><section class="intro"><span class="eyebrow">NAYA LIMA / ${t("CREATIVE WORKSPACE", "ESPAÇO CRIATIVO")}</span><h1>${t("Good work.<br>Great company.", "Seu trabalho.<br>Em boa companhia.")}</h1><p>${t("A shared home for every person, plan, and promise behind a creative campaign.", "Um lugar para cada pessoa, plano e compromisso por trás de uma campanha criativa.")}</p><div class="features"><span>${t("People & roles", "Pessoas e funções")}</span><span>${t("Agreements & rights", "Acordos e direitos")}</span><span>${t("One shared plan", "Um plano em comum")}</span></div></section><section class="access"><div class="lock"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg></div><h2>${unavailable ? t("We’ll be ready soon.", "Em breve, tudo pronto.") : t("A little peek inside.", "Uma prévia do que vem aí.")}</h2><p>${unavailable ? t("The preview is temporarily unavailable. Please ask the workspace owner to check access.", "A prévia está temporariamente indisponível. Peça à coordenação para verificar o acesso.") : t("This is a private, interactive preview. Enter the shared password to explore Naya’s campaign workspace.", "Esta é uma prévia privada e interativa. Digite a senha compartilhada para explorar o espaço de campanhas de Naya.")}</p>${unavailable ? "" : `<form method="post" action="/__preview/login"><input type="hidden" name="returnTo" value="${escape(returnTo)}"><input type="hidden" name="lang" value="${lang}"><label for="password">${t("Preview password", "Senha da prévia")}</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="128" placeholder="${t("Enter the password", "Digite a senha")}" ${error ? 'aria-invalid="true" aria-describedby="login-error"' : ""}><button type="submit">${t("Enter the workspace", "Entrar no espaço")} <span aria-hidden="true">→</span></button></form>`}${error ? `<p class="error" id="login-error" role="alert">${t("That password didn’t match. Please try again.", "A senha não confere. Tente novamente.")}</p>` : ""}<p class="notice">${t("An interactive prototype with sample campaigns. Shared preview access does not verify a participant’s identity.", "Um protótipo interativo com campanhas de exemplo. O acesso compartilhado não verifica a identidade de participantes.")}</p></section></main><footer><strong>NAYA LIMA STUDIO</strong><span>${t("More creating. Less in between.", "Mais criação. Menos burocracia.")}</span></footer></body></html>`;
  return new Response(request.method === "HEAD" ? null : html, {
    status: unavailable ? 503 : error ? 401 : 200,
    headers: {
      ...privateHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

async function limitedForm(request: Request): Promise<URLSearchParams | null> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/x-www-form-urlencoded")
  )
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  let text = "";
  let bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > 2048) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(part.value, { stream: true });
    }
    return new URLSearchParams(text + decoder.decode());
  } finally {
    reader.releaseLock();
  }
}
function sameOrigin(request: Request): boolean {
  return (
    request.headers.get("origin") === new URL(request.url).origin &&
    request.headers.get("sec-fetch-site") !== "cross-site"
  );
}
const reject = (
  status: number,
  message: string,
  headers: Record<string, string> = {},
) =>
  new Response(message, {
    status,
    headers: {
      ...privateHeaders,
      ...headers,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });

/** null means authenticated: the Vercel middleware may continue to the app. */
export async function handlePreviewRequest(
  request: Request,
  config: PreviewConfig,
): Promise<Response | null> {
  if (!configured(config)) return loginPage(request, { unavailable: true });
  const url = new URL(request.url);
  if (url.pathname === "/__preview/logout") {
    if (request.method !== "POST")
      return reject(405, "Use POST to lock the preview.", { Allow: "POST" });
    if (!sameOrigin(request)) return reject(403, "Origin rejected.");
    return new Response(null, {
      status: 303,
      headers: {
        ...privateHeaders,
        Location: "/",
        "Set-Cookie": `${PREVIEW_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      },
    });
  }
  if (url.pathname === "/__preview/login" && request.method === "POST") {
    if (!sameOrigin(request)) return reject(403, "Origin rejected.");
    const form = await limitedForm(request);
    if (!form || form.getAll("password").length !== 1)
      return reject(400, "Invalid form.");
    const returnTo = safeReturnTo(form.get("returnTo"));
    const lang = form.get("lang") ?? "en";
    if (!(await checkPassword(form.get("password") ?? "", config.passwordHash)))
      return loginPage(request, { error: true, lang, returnTo });
    const token = issuePreviewSession(url.hostname, config);
    return new Response(null, {
      status: 303,
      headers: {
        ...privateHeaders,
        Location: returnTo,
        "Set-Cookie": `${PREVIEW_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${PREVIEW_SESSION_SECONDS}`,
      },
    });
  }
  if (
    validPreviewSession(
      request.headers.get("cookie") ?? "",
      url.hostname,
      config,
    )
  )
    return null;
  if (!["GET", "HEAD"].includes(request.method))
    return reject(401, "Preview access required.");
  // Assets are covered too: a client-side overlay would leave the application public.
  if (
    url.pathname.startsWith("/assets/") ||
    /\.(?:js|css|map|json|svg|jpg|png|webp|ico|txt)$/i.test(url.pathname)
  )
    return reject(401, "Preview access required.");
  return loginPage(request);
}
