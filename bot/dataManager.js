import fs from 'fs/promises';
import path from 'path';

const DATA_PATH = path.join('/app', 'public', 'data.json');

// 讀取
export async function readData() {
  const raw = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(raw);
}

// 寫入（原子寫入，避免寫到一半被讀取）
export async function writeData(data) {
  data.lastUpdated = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  const tmpPath = DATA_PATH + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tmpPath, DATA_PATH); // 原子替換
}

// 更新單張卡
export async function updateCard(cardId, updates) {
  const data = await readData();
  const card = data.cards.find(c => c.id === cardId);
  if (!card) throw new Error(`找不到卡號 ${cardId}`);

  // 自動記錄舊價格為 prevPrice
  if (updates.price != null && card.price !== updates.price) {
    card.prevPrice = card.price;
  }

  Object.assign(card, updates);
  await writeData(data);
  return card;
}

// 新增卡片
export async function addCard(card) {
  const data = await readData();
  if (data.cards.some(c => c.id === card.id)) {
    throw new Error(`卡號 ${card.id} 已存在`);
  }
  data.cards.push(card);
  await writeData(data);
  return card;
}

// 刪除卡片
export async function removeCard(cardId) {
  const data = await readData();
  const idx = data.cards.findIndex(c => c.id === cardId);
  if (idx === -1) throw new Error(`找不到卡號 ${cardId}`);
  const [removed] = data.cards.splice(idx, 1);
  await writeData(data);
  return removed;
}
