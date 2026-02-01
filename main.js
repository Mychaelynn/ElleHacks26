import { GoogleGenerativeAI } from "@google/generative-ai";
import { updateUI, getBalances } from "./state.js";

const API_KEY = "AIzaSyDk3isNLBDgRkx10pgPhblPrZcKX8_sT5E";
const genAI = new GoogleGenerativeAI(API_KEY);

// ← DEFINE addMessage HERE, BEFORE initMainHub
function addMessage(text, className) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) {
    alert("ERROR: chat-messages element not found!");
    return;
  }
  chatMessages.style.whiteSpace = "pre-line";
  chatMessages.innerHTML += `<p class="${className}">${text}</p>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// NOW define initMainHub
async function initMainHub() {
  try {
    const nav = document.querySelector(".game-nav");
    const win = document.getElementById("penny-chat-window");

    if (win) {
      win.classList.remove("chat-hidden");
    }

    const goalName = localStorage.getItem("targetGoal") || "your goal";

    const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;

    const balances = getBalances();

    const amountNeeded = Math.max(0, targetPrice - balances.savings);

    updateUI();

    addMessage(
      `Hi! Welcome to the Hub! You still need $${amountNeeded} for your ${goalName}! 💭`,
      "penny-msg",
    );

    const age = localStorage.getItem("playerAge") || "7";

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are Penny, a friendly piggy bank mascot. Explain these 4 places to a ${age} year old: 
              1. Shopping, 2. Garden, 3. Chores, 4. Bank.
              STRICT FORMATTING: One short sentence per place. Two newlines between places. Start with the name in bold.`,
    });

    const result = await model.generateContent(
      "Introduce the hub areas: Shopping, Garden, Chores, and Bank.",
    );

    const responseText = result.response.text();

    addMessage(responseText, "penny-msg");
  } catch (e) {
    alert("CRASH! Error: " + e.message);
  }
}

function togglePennyChat() {
  const win = document.getElementById("penny-chat-window");
  if (win) win.classList.toggle("chat-hidden");
}

function applyGlobalSettings() {
  const cursorStatus = localStorage.getItem("customCursor");
  if (cursorStatus === "active") {
    document.body.classList.add("custom-cursor-active");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  applyGlobalSettings();
  initMainHub();
});

window.togglePennyChat = togglePennyChat;
