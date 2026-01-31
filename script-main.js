import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyBWcNu995ZmMaAa_rEiHQss2lVXHWaxmQk";
const genAI = new GoogleGenerativeAI(API_KEY);

// Helper to update the dashboard values
function updateDashboard() {
  const rawBalances = localStorage.getItem("finalBalances");
  const balances = rawBalances
    ? JSON.parse(rawBalances)
    : { wallet: 0, spendings: 0, savings: 0, rainyDay: 0 };

  const goalName = localStorage.getItem("targetGoal") || "Prize";
  const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;
  const amountNeeded = Math.max(0, targetPrice - balances.savings);

  // Update the UI elements
  if (document.getElementById("stat-wallet")) {
    document.getElementById("stat-wallet").innerText = balances.wallet;
    document.getElementById("stat-spendings").innerText = balances.spendings;
    document.getElementById("stat-savings").innerText = balances.savings;
    document.getElementById("stat-rainyDay").innerText = balances.rainyDay;
    document.getElementById("stat-goal-name").innerText = goalName;
    document.getElementById("stat-needed").innerText = amountNeeded;
  }

  return { balances, goalName, amountNeeded };
}

async function initMainHub() {
  if (document.querySelector(".game-nav")) {
    const age = localStorage.getItem("playerAge") || "7";

    // Open the chat window

    togglePennyChat();

    addMessage(
      "Hi! Welcome to the Hub! Let me show you around... 💭",

      "penny-msg",
    );

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",

        systemInstruction: `You are Penny. Explain 4 places to a ${age} year old: 

    1. Shopping, 2. Garden, 3. Chores, 4. Bank.

    

    STRICT FORMATTING RULES:

    - Write exactly ONE short sentence per place.

    - Use TWO newlines  between every single place.

    - Start each line with the name of the place in bold.

    

    Example:

    **Shopping**: You can buy treats here, but it uses up your goal money!

    

    **Garden**: Grow pretty plants to earn more coins!`,
      });

      const result = await model.generateContent("Explain the hub to me!");

      addMessage(result.response.text(), "penny-msg");
    } catch (e) {
      addMessage(
        "Welcome! Earn coins in the Garden or Chores, and visit the Bank to win! 🐷",

        "penny-msg",
      );
    }
  }
}

// Global functions for the window
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

window.onload = initMainHub;
window.togglePennyChat = togglePennyChat;
