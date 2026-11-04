import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "workflows");
const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

const rules = [
  { name: "64-char hex string (HMAC/API key)", re: /\b[a-f0-9]{64}\b/i },
  { name: "Bearer token", re: /Bearer\s+[A-Za-z0-9._~+\/-]{16,}/ },
  { name: "Clerk secret key", re: /sk_(live|test)_[A-Za-z0-9]+/ },
  {
    name: "Hard-coded secret/password/token",
    re: /"(secret|password|token|apiKey|api_key)"\s*:\s*"(?!=)[^"]{8,}"/i,
  },
  {
    name: "Non-empty credential id",
    re: /"credentials"\s*:\s*\{[^}]*"id"\s*:\s*"[^"]+"/,
  },
];

let failed = false;
for (const file of files) {
  const text = readFileSync(join(dir, file), "utf8");
  for (const { name, re } of rules) {
    if (re.test(text)) {
      console.error(`FAIL  ${file}: possible secret -> ${name}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`OK  ${files.length} workflow file(s) checked, no secrets found.`);
