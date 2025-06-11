require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { JsonRpcProvider, Contract, formatUnits } = require('ethers');
const sqlite3 = require('sqlite3').verbose();
const { USDT_ABI } = require('../src/transactionUtils');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RPC_URL = process.env.RPC_URL;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS.toLowerCase();
const CHAT_ID = process.env.CHAT_ID;
const USDT_CONTRACT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

const bot = new TelegramBot(TOKEN, { polling: true });
const provider = new JsonRpcProvider(RPC_URL);
const usdtContract = new Contract(USDT_CONTRACT_ADDRESS, USDT_ABI, provider);

const db = new sqlite3.Database(':memory:');
db.run(`CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  txHash TEXT UNIQUE,
  fromAddress TEXT,
  toAddress TEXT,
  amount TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

bot.on('message', (msg) => {
  if (!CHAT_ID) {
    console.log(`Chat ID: ${msg.chat.id}`);
    bot.sendMessage(msg.chat.id, `Chat ID is ${msg.chat.id}. Add to .env!`);
  }
});

const express = require('express');
const app = express();
app.use(express.json());

async function monitorTransfers() {
  usdtContract.on('Transfer', async (from, to, value, event) => {
    if (from.toLowerCase() !== WALLET_ADDRESS) return;

    const amount = formatUnits(value, 18);
    const txHash = event.log.transactionHash;
    const timestamp = new Date().toISOString();

    db.run(
      `INSERT OR IGNORE INTO transfers (txHash, fromAddress, toAddress, amount, timestamp) VALUES (?, ?, ?, ?, ?)`,
      [txHash, from, to, amount, timestamp],
      (err) => { if (err) console.error('DB Error:', err); }
    );

    const message = `🚀 Transfer Detected!\nFrom: ${from}\nTo: ${to}\nAmount: ${amount} USDT\nTx: ${txHash}\nTime: ${timestamp}`;
    bot.sendMessage(CHAT_ID, message).catch((err) => console.error('Telegram Error:', err));
  });

  console.log(`Monitoring ${WALLET_ADDRESS} for USDT transfers...`);
}

app.post('/notify', async (req, res) => {
  const { txHash, from, to, amount } = req.body;
  const message = `🚀 Manual Transfer!\nFrom: ${from}\nTo: ${to}\nAmount: ${amount} USDT\nTx: ${txHash}\nTime: ${new Date().toISOString()}`;
  await bot.sendMessage(CHAT_ID, message);
  res.status(200).json({ status: 'Notified' });
});

module.exports = async (req, res) => {
  try {
    await monitorTransfers();
    res.status(200).json({ status: 'Bot running' });
  } catch (error) {
    console.error('Bot Error:', error);
    res.status(500).json({ error: 'Bot failed' });
  }
};
