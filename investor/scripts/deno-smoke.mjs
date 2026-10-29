import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const server = spawn(
  process.env.DENO_BINARY || "deno",
  ["run", "--allow-env", "--allow-read", "--allow-net", "server/index.mjs"],
  {
    env: {
      ...process.env,
      PORT: "8107",
      PORTAL_PREVIEW: "true",
      EDGE_MODE: "true",
      FUNCTION_PREFIX: "/adya-investor",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
server.stdout.on("data", (d) => (logs += d));
server.stderr.on("data", (d) => (logs += d));
try {
  let ready = false;
  for (let i = 0; i < 15; i++) {
    try {
      if (
        (
          await fetch("http://127.0.0.1:8107/adya-investor/health", {
            signal: AbortSignal.timeout(800),
          })
        ).ok
      ) {
        ready = true;
        break;
      }
    } catch {}
    if (server.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  if (!ready) throw Error(logs);
  const cfg = await (
    await fetch("http://127.0.0.1:8107/adya-investor/api/config")
  ).json();
  assert(cfg.preview);
  assert(!cfg.live);
  assert(!cfg.checkoutEnabled);
  assert.equal(
    (
      await fetch(
        "http://127.0.0.1:8107/adya-investor/api/startups?lane=public",
      )
    ).status,
    401,
  );
  console.log(
    "Deno local edge-prefixed HTTP smoke passed; not Supabase production proof",
  );
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((r) => server.once("exit", r)),
      new Promise((r) => setTimeout(r, 1000)),
    ]);
  }
}
