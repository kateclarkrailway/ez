process.env.FFMPEG_PATH = "";

const { Client, WebhookClient } = require("discord.js-selfbot-v13");

const USER_TOKEN = process.env.USER_TOKEN;
const SOURCE_CHANNEL_ID = "1506433821866856629";
const DEST_WEBHOOK_URL = process.env.DEST_WEBHOOK_URL;

const client = new Client({ checkUpdate: false });
const webhook = new WebhookClient({ url: DEST_WEBHOOK_URL });

client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`👀 Watching channel: ${SOURCE_CHANNEL_ID}`);
});

client.on("messageCreate", async (message) => {
  if (message.channelId !== SOURCE_CHANNEL_ID) return;

  try {
    const files = message.attachments.map((a) => a.url);
    const embeds = message.embeds.slice(0, 10);

    await webhook.send({
      content: message.content || null,
      username: message.author.username,
      avatarURL: message.author.displayAvatarURL({ size: 256 }),
      files,
      embeds,
    });

    console.log(`📨 Forwarded from ${message.author.tag}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
});

client.login(USER_TOKEN);
