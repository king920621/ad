// bot/index.js
import 'dotenv/config';
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { commands } from './commands.js';
import { handleCommand, handleAutocomplete } from './handlers.js';

// ==========================================
// 環境變數檢查
// ==========================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

const REQUIRED = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
const missing = REQUIRED.filter(k => !process.env[k]);

if (missing.length > 0) {
  console.error('❌ 缺少以下環境變數：', missing.join(', '));
  process.exit(1);
}

// 權限控制（可選）
const ALLOWED_USER_IDS = (process.env.ALLOWED_USER_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ==========================================
// 註冊斜線指令
// ==========================================
const rest = new REST({ version: '10' }).setToken(TOKEN);

try {
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log(`✅ 已註冊 ${commands.length} 個伺服器指令`);
  } else {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log(`✅ 已註冊 ${commands.length} 個全域指令（可能需等 1 小時生效）`);
  }
} catch (e) {
  console.error('❌ 註冊指令失敗:', e);
  process.exit(1);
}

// ==========================================
// 啟動 Bot
// ==========================================
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  console.log(`📡 服務中 ${client.guilds.cache.size} 個伺服器`);
});

// Autocomplete 事件
client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
    return handleAutocomplete(interaction);
  }
});

// 斜線指令事件
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // 權限檢查
  if (ALLOWED_USER_IDS.length > 0 && !ALLOWED_USER_IDS.includes(interaction.user.id)) {
    return interaction.reply({
      content: '❌ 你沒有權限使用此指令。',
      ephemeral: true,
    });
  }

  await interaction.deferReply();
  await handleCommand(interaction);
});

// 錯誤處理
client.on('error', error => {
  console.error('Discord Client 錯誤:', error);
});

process.on('unhandledRejection', error => {
  console.error('未處理的 Promise 錯誤:', error);
});

// 登入
client.login(TOKEN);
