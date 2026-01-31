import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Setup API (Using Gemini 2.0 Flash)
const API_KEY = "AIzaSyAoygtUD9yWAcSaIrv4ExtgdT44zuvbfaQ";
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. Dashboard Logic: Reads from your "notebook" (localStorage)
function updateDashboard() {
  const rawBalances = localStorage.getItem("finalBalances");
  const balances = rawBalances
    ? JSON.parse(rawBalances)
    : { wallet: 0, spendings: 0, savings: 0, rainyDay: 0 };

  const goalName = localStorage.getItem("targetGoal") || "Prize";
  const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;

  // Calculate remaining: Item Price - Savings
  const amountNeeded = Math.max(0, targetPrice - balances.savings);

  // Update UI elements if they exist on the page
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

// 3. Main Hub Initialization
async function initMainHub() {
  // Only run this if we are on the main hub page
  if (document.querySelector(".game-nav")) {
    const age = localStorage.getItem("playerAge") || "7";

    // Update the numbers and prize name immediately
    const { goalName, amountNeeded } = updateDashboard();

    // Open Penny's chat window to greet the user
    togglePennyChat();

    addMessage(
      `Hi! Welcome to the Hub! You still need $${amountNeeded} for your ${goalName}! 💭`,
      "penny-msg",
    );

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: `You are Penny, a friendly piggy bank mascot. Explain these 4 places to a ${age} year old: 
        1. Shopping, 2. Garden, 3. Chores, 4. Bank.
        
        STRICT FORMATTING RULES:
        - Write exactly ONE short sentence per place.
        - Use TWO newlines between every single place.
        - Start each line with the name of the place in bold.`,
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

// 4. Gemini Chat Function: Handles regular user questions
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

// 5. UI Helper Functions
function addMessage(text, className) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  // Ensure the container respects the \n\n from Gemini
  chatMessages.style.whiteSpace = "pre-line";

  chatMessages.innerHTML += `<p class="${className}">${text}</p>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function togglePennyChat() {
  const win = document.getElementById("penny-chat-window");
  if (win) win.classList.toggle("chat-hidden");
}

// 6. Global Exports (Required for Module type)
window.onload = initMainHub;
window.togglePennyChat = togglePennyChat;
window.sendToGemini = sendToGemini;
