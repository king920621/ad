// bot/commands.js
import { SlashCommandBuilder } from 'discord.js';

export const commands = [

  // ========== 查詢類 ==========
  new SlashCommandBuilder()
    .setName('listsections')
    .setDescription('列出目前所有的標題區塊'),

  new SlashCommandBuilder()
    .setName('listcards')
    .setDescription('列出某個標題下的所有卡片')
    .addStringOption(o =>
      o.setName('section').setDescription('標題名稱').setRequired(true).setAutocomplete(true)
    ),

  new SlashCommandBuilder()
    .setName('findcard')
    .setDescription('用卡號搜尋卡片在哪個標題下')
    .addStringOption(o =>
      o.setName('cardid').setDescription('卡號，例如 SFN/S136-P01').setRequired(true)
    ),

  // ========== Title 操作 ==========
  new SlashCommandBuilder()
    .setName('addsection')
    .setDescription('新增一個標題區塊')
    .addStringOption(o =>
      o.setName('title').setDescription('新標題名稱').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('renamesection')
    .setDescription('修改標題名稱')
    .addStringOption(o =>
      o.setName('old').setDescription('舊標題名稱').setRequired(true).setAutocomplete(true)
    )
    .addStringOption(o =>
      o.setName('new').setDescription('新標題名稱').setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('removesection')
    .setDescription('刪除整個標題區塊（包含底下所有卡片）')
    .addStringOption(o =>
      o.setName('title').setDescription('要刪除的標題名稱').setRequired(true).setAutocomplete(true)
    ),

  // ========== 卡片操作 ==========
  new SlashCommandBuilder()
    .setName('addcard')
    .setDescription('在指定標題下新增卡片')
    .addStringOption(o =>
      o.setName('section').setDescription('標題名稱').setRequired(true).setAutocomplete(true)
    )
    .addStringOption(o =>
      o.setName('cardid').setDescription('卡號，例如 SFN/S136-P01').setRequired(true)
    )
    .addStringOption(o =>
      o.setName('name').setDescription('卡名').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('price').setDescription('售價（日圓）').setRequired(false)
    )
    .addStringOption(o =>
      o.setName('rarity').setDescription('版本，例如 pr、pr+').setRequired(false)
    )
    .addStringOption(o =>
      o.setName('series').setDescription('作品名稱').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('updatecard')
    .setDescription('修改指定卡片的內容')
    .addStringOption(o =>
      o.setName('section').setDescription('標題名稱').setRequired(true).setAutocomplete(true)
    )
    .addStringOption(o =>
      o.setName('cardid').setDescription('卡號').setRequired(true)
    )
    .addIntegerOption(o =>
      o.setName('price').setDescription('新售價（日圓）').setRequired(false)
    )
    .addStringOption(o =>
      o.setName('name').setDescription('新卡名').setRequired(false)
    )
    .addStringOption(o =>
      o.setName('rarity').setDescription('新版本').setRequired(false)
    )
    .addStringOption(o =>
      o.setName('series').setDescription('新作品名稱').setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('removecard')
    .setDescription('刪除指定卡片')
    .addStringOption(o =>
      o.setName('section').setDescription('標題名稱').setRequired(true).setAutocomplete(true)
    )
    .addStringOption(o =>
      o.setName('cardid').setDescription('卡號').setRequired(true)
    ),

].map(c => c.toJSON());
