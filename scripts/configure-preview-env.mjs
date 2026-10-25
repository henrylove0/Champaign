import { readFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { spawnSync } from "node:child_process";

// Read the chosen password from stdin; never commit it, echo it, or put generated
// secrets in command arguments. Requires `vercel link` for THIS project first.
const password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
if (!password || password.length > 128 || /[\r\n]/.test(password))
  throw new Error("Supply one password, up to 128 characters, on stdin.");
const project = JSON.parse(
  readFileSync(new URL("../.vercel/project.json", import.meta.url), "utf8"),
);
if (project.projectName !== "champaign" || !project.projectId || !project.orgId)
  throw new Error("Link this checkout to the Champaign Vercel project first.");
const salt = randomBytes(16).toString("hex");
const values = {
  PREVIEW_PASSWORD_HASH: `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
  PREVIEW_SESSION_SECRET: randomBytes(48).toString("base64url"),
};
for (const [name, value] of Object.entries(values)) {
  const result = spawnSync(
    "npm",
    [
      "exec",
      "--yes",
      "--registry=https://registry.npmjs.org",
      "--package=vercel@65.2.0",
      "--",
      "vercel",
      "env",
      "add",
      name,
      "--environment",
      "production,preview",
      "--sensitive",
      "--yes",
      "--scope",
      project.orgId,
      "--project",
      project.projectId,
    ],
    { input: value, encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  if (result.status !== 0) {
    const detail = String(result.stderr ?? "")
      .replaceAll(value, "[redacted]")
      .replaceAll(password, "[redacted]");
    throw new Error(`Could not configure ${name}. ${detail}`);
  }
  console.log(`Configured ${name} for production and preview (value hidden).`);
}
