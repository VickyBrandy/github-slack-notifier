export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    const rawBody = await request.text();

    // 1. Verify this really came from GitHub
    const signature = request.headers.get("X-Hub-Signature-256");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }
    const valid = await verifySignature(env.GITHUB_WEBHOOK_SECRET, rawBody, signature);
    if (!valid) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = request.headers.get("X-GitHub-Event");
    const payload = JSON.parse(rawBody);

    const message = buildSlackMessage(event, payload);
    if (!message) {
      return new Response("Ignored event", { status: 200 });
    }

    await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    return new Response("OK", { status: 200 });
  },
};

async function verifySignature(secret, body, signatureHeader) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = "sha256=" + [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // constant-time-ish comparison
  if (expected.length !== signatureHeader.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return mismatch === 0;
}

function buildSlackMessage(event, payload) {
  const repo = payload.repository?.full_name;

  if (event === "push") {
    const commits = payload.commits || [];
    const pusher = payload.pusher?.name;
    const branch = payload.ref?.replace("refs/heads/", "");
    if (commits.length === 0) return null;
    const lines = commits.map((c) => `• ${c.message} (${c.id.slice(0, 7)})`).join("\n");
    return `📦 *${pusher}* pushed ${commits.length} commit(s) to *${repo}* [${branch}]\n${lines}`;
  }

  if (event === "repository") {
    const action = payload.action;
    const actor = payload.sender?.login;
    if (action === "created") return `🆕 *${actor}* created repo *${repo}*`;
    if (action === "deleted") return `🗑️ *${actor}* deleted repo *${repo}*`;
    if (action === "renamed") return `✏️ *${actor}* renamed repo → *${repo}*`;
    if (action === "archived") return `📦 *${actor}* archived repo *${repo}*`;
    return `ℹ️ *${actor}* ${action} repo *${repo}*`;
  }

  if (event === "fork") {
    const forkee = payload.forkee?.full_name;
    const actor = payload.sender?.login;
    return `🍴 *${actor}* forked *${repo}* → *${forkee}*`;
  }

  return null;
}
