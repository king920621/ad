import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { updateCard, addCard, removeCard, readData } from './dataManager.js';

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // 可選，指定伺服器指令更快生效

if (!TOKEN || !CLIENT_ID) {
  console.error('缺少 DISCORD_TOKEN 或 DISCORD_CLIENT_ID 環境變數');
  process.exit(1);
}

// 定義斜線指令
const commands = [
  new SlashCommandBuilder()
    .setName('price')
    .setDescription('更新卡片價格與庫存')
    .addStringOption(o => o.setName('cardid').setDescription('卡號，如 SFN/S136-P01').setRequired(true))
    .addIntegerOption(o => o.setName('price').setDescription('最新售價（日圓）').setRequired(true))
    .addIntegerOption(o => o.setName('stock').setDescription('當前庫存').setRequired(false))
    .addStringOption(o => o.setName('note').setDescription('備註').setRequired(false)),

  new SlashCommandBuilder()
    .setName('addcard')
    .setDescription('新增一張追蹤卡片')
    .addStringOption(o => o.setName('cardid').setDescription('卡號').setRequired(true))
    .addStringOption(o => o.setName('name').setDescription('卡名').setRequired(true))
    .addStringOption(o => o.setName('rarity').setDescription('稀有度').setRequired(false))
    .addIntegerOption(o => o.setName('price').setDescription('售價').setRequired(false))
    .addIntegerOption(o => o.setName('stock').setDescription('庫存').setRequired(false)),

  new SlashCommandBuilder()
    .setName('removecard')
    .setDescription('移除追蹤卡片')
    .addStringOption(o => o.setName('cardid').setDescription('卡號').setRequired(true)),

  new SlashCommandBuilder()
    .setName('list')
    .setDescription('列出所有追蹤中的卡片'),
].map(c => c.toJSON());

// 註冊指令
const rest = new REST({ version: '10' }).setToken(TOKEN);
try {
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ 已註冊伺服器指令');
  } else {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ 已註冊全域指令（可能需等 1 小時生效）');
  }
} catch (e) {
  console.error('註冊指令失敗:', e);
}

// 啟動 Bot
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply();

  try {
    if (interaction.commandName === 'price') {
      const cardId = interaction.options.getString('cardid');
      const price = interaction.options.getInteger('price');
      const stock = interaction.options.getInteger('stock');
      const note = interaction.options.getString('note');

      const updates = { price };
      if (stock != null) updates.stock = stock;
      if (note != null) updates.note = note;

      const card = await updateCard(cardId, updates);
      await interaction.editReply(
        `✅ 已更新 **${card.id}** ${card.name}\n` +
        `💰 售價：¥${card.price.toLocaleString()}` +
        (card.prevPrice != null && card.prevPrice !== card.price
          ? `（前次 ¥${card.prevPrice.toLocaleString()}）` : '') + '\n' +
        `📦 庫存：${card.stock ?? '—'}`
      );
    }

    else if (interaction.commandName === 'addcard') {
      const card = await addCard({
        id: interaction.options.getString('cardid'),
        name: interaction.options.getString('name'),
        rarity: interaction.options.getString('rarity') || '',
        price: interaction.options.getInteger('price'),
        stock: interaction.options.getInteger('stock'),
        prevPrice: null,
        series: '',
        url: '',
        note: ''
      });
      await interaction.editReply(`✅ 已新增 **${card.id}** ${card.name}`);
    }

    else if (interaction.commandName === 'removecard') {
      const removed = await removeCard(interaction.options.getString('cardid'));
      await interaction.editReply(`🗑️ 已移除 **${removed.id}** ${removed.name}`);
    }

    else if (interaction.commandName === 'list') {
      const data = await readData();
      const lines = data.cards.map(c =>
        `• **${c.id}** ${c.name} — ¥${(c.price ?? 0).toLocaleString()}｜庫存 ${c.stock ?? '—'}`
      );
      await interaction.editReply(`📋 共 ${data.cards.length} 張卡：\n` + lines.join('\n'));
    }
  } catch (e) {
    console.error(e);
    await interaction.editReply(`❌ 錯誤：${e.message}`);
  }
});

client.login(TOKEN);
