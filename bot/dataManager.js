// bot/dataManager.js
import { Octokit } from 'octokit';
import fs from 'fs/promises';   
import path from 'path';        

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const FILE_PATH = process.env.GITHUB_FILE_PATH || 'data.json';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

// 本地檔案路徑（Docker 容器內的工作目錄是 /app）
const LOCAL_DATA_PATH = path.join('/app', 'public', 'data.json');
// ==========================================
// 寫入隊列
// ==========================================
let writeQueue = Promise.resolve();

function enqueue(task) {
  const result = writeQueue.then(task, task);
  writeQueue = result.catch(() => {});
  return result;
}

// ==========================================
// 資料正規化：自動補齊缺失欄位
// ==========================================
function normalizeData(data) {
  if (!data.sections) data.sections = [];

  data.sections.forEach(section => {
    if (!section.cards) section.cards = [];
    section.cards.forEach(card => {
      // 自動補上 prevPrice（若原本沒有）
      if (card.prevPrice === undefined) card.prevPrice = null;
      // 補上其他可能缺失的欄位
      if (card.series === undefined) card.series = '';
      if (card.rarity === undefined) card.rarity = '';
      if (card.name === undefined) card.name = '';
      if (card.price === undefined) card.price = null;
    });
  });

  return data;
}

// ==========================================
// 基礎讀寫
// ==========================================
export async function readData() {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path: FILE_PATH,
      ref: BRANCH,
    });

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const parsed = JSON.parse(content);
    return normalizeData(parsed); // ← 關鍵：自動正規化
  } catch (error) {
    if (error.status === 404) {
      return { lastUpdated: '', sections: [] };
    }
    throw error;
  }
}

async function _writeData(data) {
  data.lastUpdated = new Date().toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false,
  });

  const jsonString = JSON.stringify(data, null, 2);

  // 1. 寫入本地檔案（讓 Nginx 立刻提供最新資料）
  try {
    await fs.writeFile(LOCAL_DATA_PATH, jsonString, 'utf-8');
    console.log('✅ 已更新本地 public/data.json');
  } catch (e) {
    console.error('⚠️ 寫入本地檔案失敗:', e.message);
  }

  // 2. 寫入 GitHub（永久保存）
  const content = Buffer.from(jsonString).toString('base64');
  let sha;
  try {
    const { data: fileData } = await octokit.rest.repos.getContent({
      owner: OWNER, repo: REPO, path: FILE_PATH, ref: BRANCH,
    });
    sha = fileData.sha;
  } catch (error) {
    if (error.status !== 404) throw error;
  }

  const params = {
    owner: OWNER, repo: REPO, path: FILE_PATH,
    message: `Update data: ${data.lastUpdated}`,
    content: content, branch: BRANCH,
  };
  if (sha) params.sha = sha;

  await octokit.rest.repos.createOrUpdateFileContents(params);
  console.log('✅ 已更新 GitHub 上的 data.json');
}

export async function writeData(data) {
  return enqueue(() => _writeData(data));
}


// ==========================================
// 查詢功能
// ==========================================

export async function getAllTitles() {
  const data = await readData();
  return (data.sections || []).map(s => s.title);
}

export async function getCardsBySection(sectionTitle) {
  const data = await readData();
  const section = data.sections.find(s => s.title === sectionTitle);
  if (!section) throw new Error(`找不到標題「${sectionTitle}」`);
  return section.cards;
}

export async function findCard(cardId) {
  const data = await readData();
  for (const section of data.sections) {
    const card = section.cards.find(c => c.id === cardId);
    if (card) return { section: section.title, card };
  }
  return null;
}

// ==========================================
// Title 操作
// ==========================================

export async function addSection(newTitle) {
  const data = await readData();
  if (!data.sections) data.sections = [];

  if (data.sections.some(s => s.title === newTitle)) {
    throw new Error(`標題「${newTitle}」已經存在`);
  }

  data.sections.push({ title: newTitle, cards: [] });
  await writeData(data);
  return newTitle;
}

export async function renameSection(oldTitle, newTitle) {
  const data = await readData();
  const section = data.sections.find(s => s.title === oldTitle);

  if (!section) throw new Error(`找不到標題「${oldTitle}」`);
  if (data.sections.some(s => s.title === newTitle)) {
    throw new Error(`標題「${newTitle}」已經存在`);
  }

  section.title = newTitle;
  await writeData(data);
  return newTitle;
}

export async function removeSection(title) {
  const data = await readData();
  const index = data.sections.findIndex(s => s.title === title);

  if (index === -1) throw new Error(`找不到標題「${title}」`);

  const [removed] = data.sections.splice(index, 1);
  await writeData(data);
  return removed;
}

// ==========================================
// 卡片操作
// ==========================================

export async function addCard(sectionTitle, cardData) {
  const data = await readData();
  const section = data.sections.find(s => s.title === sectionTitle);

  if (!section) throw new Error(`找不到標題「${sectionTitle}」`);
  if (section.cards.some(c => c.id === cardData.id)) {
    throw new Error(`卡片「${cardData.id}」已經存在於此標題下`);
  }

  const newCard = {
    id: cardData.id || '',
    series: cardData.series || '',
    name: cardData.name || '',
    price: cardData.price != null ? cardData.price : null,
    rarity: cardData.rarity || '',
    prevPrice: null,
  };

  section.cards.push(newCard);
  await writeData(data);
  return newCard;
}

export async function updateCard(sectionTitle, cardId, updates) {
  const data = await readData();
  const section = data.sections.find(s => s.title === sectionTitle);

  if (!section) throw new Error(`找不到標題「${sectionTitle}」`);

  const card = section.cards.find(c => c.id === cardId);
  if (!card) throw new Error(`在「${sectionTitle}」中找不到卡片「${cardId}」`);

  if (updates.price != null && card.price !== updates.price) {
    card.prevPrice = card.price;
  }

  Object.assign(card, updates);
  await writeData(data);
  return card;
}

export async function removeCard(sectionTitle, cardId) {
  const data = await readData();
  const section = data.sections.find(s => s.title === sectionTitle);

  if (!section) throw new Error(`找不到標題「${sectionTitle}」`);

  const index = section.cards.findIndex(c => c.id === cardId);
  if (index === -1) throw new Error(`在「${sectionTitle}」中找不到卡片「${cardId}」`);

  const [removed] = section.cards.splice(index, 1);
  await writeData(data);
  return removed;
}
