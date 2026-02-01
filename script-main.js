import { GoogleGenerativeAI } from "@google/generative-ai";
import { updateUI } from "./state.js";

// 1. Setup API
const API_KEY = "AIzaSyB6bhitVPviniMCIDTr3KZcoMCDgysLEqs";
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. Main Hub Initialization
async function initMainHub() {
  const nav = document.querySelector(".game-nav");
  if (nav) {
    const age = localStorage.getItem("playerAge") || "7";

    // Sync the dashboard
    const { goalName, amountNeeded } = updateUI();

    // Open the chat window for the intro
    const win = document.getElementById("penny-chat-window");
    if (win) win.classList.remove("chat-hidden");

    addMessage(
      `Hi! Welcome to the Hub! You still need $${amountNeeded} for your ${goalName}! 💭`,
      "penny-msg",
    );

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: `You are Penny, a friendly piggy bank mascot. Explain these 4 places to a ${age} year old: 
                1. Shopping, 2. Garden, 3. Chores, 4. Bank.
                STRICT FORMATTING: One short sentence per place. Two newlines between places. Start with the name in bold.`,
      });

      const result = await model.generateContent(
        "Introduce the hub and my goal progress.",
      );
      addMessage(result.response.text(), "penny-msg");
    } catch (e) {
      addMessage(
        "Welcome! Earn coins in the Garden or Chores to reach your goal! 🐷",
        "penny-msg",
      );
    }
  }
}

// 3. UI Helpers & Gemini Logic
async function sendToGemini() {
  const inputField = document.getElementById("user-query");
  const userText = inputField.value.trim();
  if (!userText) return;

  addMessage(userText, "user-msg");
  inputField.value = "";

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "You are Penny, a friendly piggy bank. Keep answers short and use emojis.",
    });
    const result = await model.generateContent(userText);
    addMessage(result.response.text(), "penny-msg");
  } catch (error) {
    addMessage("Oops! I lost my voice for a second! 🐷", "penny-msg");
  }
}

function addMessage(text, className) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;
  chatMessages.style.whiteSpace = "pre-line";
  chatMessages.innerHTML += `<p class="${className}">${text}</p>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
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

// 4. Unified Initialization
window.addEventListener("DOMContentLoaded", () => {
  applyGlobalSettings();
  initMainHub();
});

// 5. Global Exports
window.togglePennyChat = togglePennyChat;
window.sendToGemini = sendToGemini;
