const https = require("https");

const USER_TOKEN = process.env.USER_TOKEN;
const SOURCE_CHANNEL_ID = "1506433821866856629";
const DEST_WEBHOOK_URL = process.env.DEST_WEBHOOK_URL;

let lastMessageId = null;

function discordRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "discord.com",
      path: `/api/v10/${path}`,
      headers: {
        Authorization: USER_TOKEN,
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    };
    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

function sendWebhook(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(DEST_WEBHOOK_URL);
    const body = JSON.stringify(payload);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      res.on("data", () => {});
      res.on("end", resolve);
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function poll() {
  try {
    const params = lastMessageId
      ? `channels/${SOURCE_CHANNEL_ID}/messages?after=${lastMessageId}&limit=10`
      : `channels/${SOURCE_CHANNEL_ID}/messages?limit=1`;

    const messages = await discordRequest(params);

    if (!Array.isArray(messages) || messages.length === 0) return;

    // Sort oldest first
    const sorted = messages.reverse();

    for (const msg of sorted) {
      if (!lastMessageId) {
        // On first run, just record the latest ID without forwarding
        lastMessageId = msg.id;
        console.log(`✅ Started. Last message ID: ${lastMessageId}`);
        return;
      }


      const files = (msg.attachments || []).map((a) => a.url);

      await sendWebhook({
        content: msg.content || null,
        username: msg.author.username,
        avatar_url: `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`,
        embeds: msg.embeds || [],
      });

      console.log(`📨 Forwarded from ${msg.author.username}`);
      lastMessageId = msg.id;
    }
  } catch (err) {
    console.error("❌ Poll error:", err.message);
  }
}

console.log("🚀 Bot starting, polling every 3 seconds...");
poll();
setInterval(poll, 3000);
