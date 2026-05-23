const { Client, GatewayIntentBits, WebhookClient, EmbedBuilder } = require("discord.js");

// ============================================================
//  CONFIGURATION — fill these in before running
// ============================================================
const CONFIG = {
  BOT_TOKEN: process.env.BOT_TOKEN,
  SOURCE_CHANNEL_ID: "1506433821866856629",
  DEST_WEBHOOK_URL: process.env.DEST_WEBHOOK_URL,
};
// ============================================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const webhook = new WebhookClient({ url: CONFIG.DEST_WEBHOOK_URL });

client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  console.log(`👀 Watching channel ID: ${CONFIG.SOURCE_CHANNEL_ID}`);
});

client.on("messageCreate", async (message) => {
  // Only forward messages from the specific #welcome channel
  if (message.channelId !== CONFIG.SOURCE_CHANNEL_ID) return;

  // Skip system messages (member join cards, etc.) — remove this if you want them
  if (message.system) return;

  try {
    const files = message.attachments.map((a) => a.url);

    const embeds = message.embeds
      .filter((e) => e.data && Object.keys(e.data).length > 0)
      .slice(0, 10); // Discord allows max 10 embeds

    await webhook.send({
      content: message.content || null,
      username: message.author.username,
      avatarURL: message.author.displayAvatarURL({ size: 256 }),
      files,
      embeds,
    });

    console.log(`📨 Forwarded message from ${message.author.tag}`);
  } catch (err) {
    console.error("❌ Failed to forward message:", err.message);
  }
});

client.login(CONFIG.BOT_TOKEN);
