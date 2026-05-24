const https = require("https");

const USER_TOKEN = process.env.USER_TOKEN;
const SOURCE_GUILD_ID = "1446872039200653406"; // Server to monitor joins from
const DEST_WEBHOOK_URL = process.env.DEST_WEBHOOK_URL;

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

const WebSocket = require("ws");

const GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";

let ws;
let heartbeatInterval;
let sessionId;
let resumeUrl;
let sequence = null;

function connect() {
  ws = new WebSocket(GATEWAY_URL);

  ws.on("open", () => {
    console.log("🔌 Connected to Discord gateway");
  });

  ws.on("message", async (data) => {
    const payload = JSON.parse(data);
    const { op, d, s, t } = payload;

    if (s) sequence = s;

    if (op === 10) {
      // Hello — start heartbeat
      heartbeatInterval = setInterval(() => {
        ws.send(JSON.stringify({ op: 1, d: sequence }));
      }, d.heartbeat_interval);

      // Identify
      ws.send(JSON.stringify({
        op: 2,
        d: {
          token: USER_TOKEN,
          properties: {
            os: "windows",
            browser: "chrome",
            device: "chrome",
          },
          intents: (1 << 1), // GUILD_MEMBERS intent
        },
      }));
    }

    if (op === 0 && t === "READY") {
      sessionId = d.session_id;
      resumeUrl = d.resume_gateway_url;
      console.log(`✅ Logged in as ${d.user.username}`);
      console.log(`👀 Watching server: ${SOURCE_GUILD_ID}`);
    }

    if (op === 0 && t === "GUILD_MEMBER_ADD") {
      if (d.guild_id !== SOURCE_GUILD_ID) return;

      const user = d.user;
      const username = user.username;
      const userId = user.id;
      const avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`;

      console.log(`📨 New member: ${username}`);

      await sendWebhook({
        username: "Join Logger",
        avatar_url: avatar,
        embeds: [{
          title: "👋 New Member Joined",
          description: `<@${userId}> just joined the server!`,
          color: 0x57f287,
          thumbnail: { url: avatar },
          fields: [
            { name: "Username", value: username, inline: true },
            { name: "User ID", value: userId, inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      });
    }

    if (op === 7) {
      // Reconnect
      reconnect();
    }

    if (op === 9) {
      // Invalid session
      setTimeout(() => identify(), 5000);
    }
  });

  ws.on("close", () => {
    console.log("⚠️ Disconnected, reconnecting...");
    clearInterval(heartbeatInterval);
    setTimeout(() => connect(), 5000);
  });

  ws.on("error", (err) => {
    console.error("❌ WebSocket error:", err.message);
  });
}

function reconnect() {
  clearInterval(heartbeatInterval);
  ws.close();
}

connect();
