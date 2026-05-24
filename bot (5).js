const https = require("https");

const USER_TOKEN = process.env.USER_TOKEN;
const SOURCE_GUILD_ID = "1446872039200653406";
const DEST_WEBHOOK_URL = process.env.DEST_WEBHOOK_URL;

let knownMembers = new Set();
let initialized = false;

function discordRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "discord.com",
      path: `/api/v9/${path}`,
      headers: {
        Authorization: USER_TOKEN,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Content-Type": "application/json",
      },
    };
    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
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

async function fetchMembers() {
  // Fetch up to 1000 members sorted by join date
  const res = await discordRequest(
    `guilds/${SOURCE_GUILD_ID}/members?limit=1000`
  );

  if (!Array.isArray(res.body)) {
    console.error("❌ Failed to fetch members:", JSON.stringify(res.body));
    return;
  }

  const members = res.body;

  if (!initialized) {
    for (const m of members) knownMembers.add(m.user.id);
    initialized = true;
    console.log(`✅ Initialized with ${knownMembers.size} members`);
    return;
  }

  for (const m of members) {
    if (!knownMembers.has(m.user.id)) {
      knownMembers.add(m.user.id);
      const user = m.user;
      const avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${Number(user.id) % 5}.png`;

      console.log(`📨 New member detected: ${user.username}`);

      await sendWebhook({
        username: "Join Logger",
        avatar_url: "https://cdn.discordapp.com/embed/avatars/0.png",
        embeds: [{
          title: "👋 New Member Joined",
          description: `<@${user.id}> just joined the server!`,
          color: 0x57f287,
          thumbnail: { url: avatar },
          fields: [
            { name: "Username", value: user.username, inline: true },
            { name: "User ID",  value: user.id,       inline: true },
          ],
          timestamp: new Date().toISOString(),
        }],
      });
    }
  }
}

console.log("🚀 Join monitor starting...");
fetchMembers();
setInterval(fetchMembers, 10000); // Check every 10 seconds
