// bot/handlers.js
import {
  getAllTitles,
  getCardsBySection,
  findCard,
  addSection,
  renameSection,
  removeSection,
  addCard,
  updateCard,
  removeCard,
} from './dataManager.js';

// ==========================================
// Autocomplete 處理
// ==========================================
export async function handleAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);

  if (focused.name === 'section' || focused.name === 'old' || focused.name === 'title') {
    try {
      const titles = await getAllTitles();
      const filtered = titles
        .filter(t => t.toLowerCase().includes(focused.value.toLowerCase()))
        .slice(0, 25)
        .map(t => ({ name: t, value: t }));
      await interaction.respond(filtered);
    } catch (e) {
      console.error('Autocomplete 錯誤:', e);
      await interaction.respond([]);
    }
  } else {
    await interaction.respond([]);
  }
}

// ==========================================
// 指令處理主函式
// ==========================================
export async function handleCommand(interaction) {
  const { commandName } = interaction;

  try {
    // ---------- 查詢類 ----------
    if (commandName === 'listsections') {
      const titles = await getAllTitles();
      if (titles.length === 0) {
        return interaction.editReply('📭 目前沒有任何標題區塊，請用 `/addsection` 新增。');
      }
      const msg = titles.map((t, i) => `**${i + 1}.** ${t}`).join('\n');
      return interaction.editReply(`📋 目前共有 **${titles.length}** 個區塊：\n${msg}`);
    }

    if (commandName === 'listcards') {
      const section = interaction.options.getString('section');
      const cards = await getCardsBySection(section);
      if (cards.length === 0) {
        return interaction.editReply(`📭 「${section}」目前沒有任何卡片。`);
      }
      const msg = cards
        .map(c => `• \`${c.id}\` | ${c.name} | ¥${c.price ?? '—'} | ${c.rarity || '—'}`)
        .join('\n');
      return interaction.editReply(`📋 「${section}」共 **${cards.length}** 張卡：\n${msg}`);
    }

    if (commandName === 'findcard') {
      const cardId = interaction.options.getString('cardid');
      const result = await findCard(cardId);
      if (!result) {
        return interaction.editReply(`❌ 找不到卡號「${cardId}」`);
      }
      const { section, card } = result;
      return interaction.editReply(
        `✅ 找到卡片！\n` +
        `📍 所屬標題：**${section}**\n` +
        `🃏 卡名：${card.name}\n` +
        `💰 售價：¥${card.price ?? '—'}\n` +
        `🏷️ 版本：${card.rarity || '—'}\n` +
        `📚 作品：${card.series || '—'}`
      );
    }

    // ---------- Title 操作 ----------
    if (commandName === 'addsection') {
      const title = interaction.options.getString('title');
      await addSection(title);
      return interaction.editReply(`✅ 已新增標題區塊「**${title}**」`);
    }

    if (commandName === 'renamesection') {
      const oldTitle = interaction.options.getString('old');
      const newTitle = interaction.options.getString('new');
      await renameSection(oldTitle, newTitle);
      return interaction.editReply(`✅ 已將「${oldTitle}」改名為「**${newTitle}**」`);
    }

    if (commandName === 'removesection') {
      const title = interaction.options.getString('title');
      const removed = await removeSection(title);
      return interaction.editReply(
        `🗑️ 已刪除標題「**${title}**」（連同 ${removed.cards.length} 張卡片）`
      );
    }

    // ---------- 卡片操作 ----------
    if (commandName === 'addcard') {
      const section = interaction.options.getString('section');
      const cardId = interaction.options.getString('cardid');
      const name = interaction.options.getString('name');
      const price = interaction.options.getInteger('price');
      const rarity = interaction.options.getString('rarity');
      const series = interaction.options.getString('series');

      const newCard = await addCard(section, {
        id: cardId,
        name,
        price,
        rarity,
        series,
      });

      return interaction.editReply(
        `✅ 已在「${section}」新增卡片：\n` +
        `🃏 **${newCard.id}** ${newCard.name}\n` +
        `💰 ¥${newCard.price ?? '—'} | 🏷️ ${newCard.rarity || '—'}`
      );
    }

    if (commandName === 'updatecard') {
      const section = interaction.options.getString('section');
      const cardId = interaction.options.getString('cardid');
      const price = interaction.options.getInteger('price');
      const name = interaction.options.getString('name');
      const rarity = interaction.options.getString('rarity');
      const series = interaction.options.getString('series');

      const updates = {};
      if (price != null) updates.price = price;
      if (name != null) updates.name = name;
      if (rarity != null) updates.rarity = rarity;
      if (series != null) updates.series = series;

      if (Object.keys(updates).length === 0) {
        return interaction.editReply('❌ 請至少提供一個要修改的欄位（price / name / rarity / series）');
      }

      const updated = await updateCard(section, cardId, updates);

      let changeMsg = '';
      if (updated.prevPrice != null && updated.prevPrice !== updated.price) {
        changeMsg = `\n📊 價格變動：¥${updated.prevPrice.toLocaleString()} → ¥${updated.price.toLocaleString()}`;
      }

      return interaction.editReply(
        `✅ 已更新「${section}」中的 **${updated.id}**\n` +
        `🃏 ${updated.name}\n` +
        `💰 ¥${updated.price ?? '—'} | 🏷️ ${updated.rarity || '—'}${changeMsg}`
      );
    }

    if (commandName === 'removecard') {
      const section = interaction.options.getString('section');
      const cardId = interaction.options.getString('cardid');
      const removed = await removeCard(section, cardId);
      return interaction.editReply(
        `🗑️ 已從「${section}」刪除卡片 **${removed.id}** ${removed.name}`
      );
    }

  } catch (error) {
    console.error(`指令 ${commandName} 執行錯誤:`, error);
    return interaction.editReply(`❌ 錯誤：${error.message}`);
  }
}
