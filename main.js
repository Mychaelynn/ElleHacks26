import { GoogleGenerativeAI } from "@google/generative-ai";
import { updateUI, getBalances, saveBalances } from "./state.js";

const API_KEY = "AIzaSyDk3isNLBDgRkx10pgPhblPrZcKX8_sT5E";
const genAI = new GoogleGenerativeAI(API_KEY);

const UMBRELLA_COST = 10;

// Check for rainy day event (1/3 chance)
function checkRainyDay() {
  const randomChance = Math.random(); // 0 to 1

  if (randomChance < 0.33) {
    // 1/3 chance
    return true;
  }
  return false;
}

// Handle rainy day event
function handleRainyDay() {
  let balances = getBalances();

  // Open Penny's chat
  const win = document.getElementById("penny-chat-window");
  if (win) win.classList.remove("chat-hidden");

  alert(
    "☔ Oh no! You walked back to the Hub and got caught in the rain! You need to buy an umbrella for $10. 🌧️",
    "penny-msg",
  );

  if (balances.rainyDay >= UMBRELLA_COST) {
    // User has enough in rainy day fund
    balances.rainyDay -= UMBRELLA_COST;
    saveBalances(balances);
    updateUI();

    alert(
      `Great job! You used your Rainy Day fund to buy the umbrella. You now have $${balances.rainyDay} left in your Rainy Day fund. This is exactly why we save for unexpected expenses! 🐷💪`,
      "penny-msg",
    );
  } else {
    // Not enough in rainy day fund - take from savings
    const shortfall = UMBRELLA_COST - balances.rainyDay;

    if (balances.savings >= shortfall) {
      // Take from savings
      const usedFromRainyDay = balances.rainyDay;
      balances.rainyDay = 0;
      balances.savings -= shortfall;
      saveBalances(balances);
      updateUI();

      addMesalertage(
        `Uh oh! You only had $${usedFromRainyDay} in your Rainy Day fund, so we had to take $${shortfall} from your Savings/Spendings to buy the umbrella. 😟`,
        "penny-msg",
      );

      alert(
        `This is why it's SO important to save for rainy days! Unexpected things happen, and if we don't prepare, it affects our big goals. Let's make sure to put some money in your Rainy Day fund next time you earn! 🐷💡`,
        "penny-msg",
      );
    } else {
      // Not enough money anywhere
      alert(
        `Oh no! You don't have enough money even in your Savings. You need $${UMBRELLA_COST} total but only have $${balances.rainyDay + balances.savings}. You'll have to walk home wet this time! Next time, make sure you save for rainy days! 🌧️😢`,
        "penny-msg",
      );
    }
  }
}

// Define addMessage
function addMessage(text, className) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) {
    return;
  }
  chatMessages.style.whiteSpace = "pre-line";
  chatMessages.innerHTML += `<p class="${className}">${text}</p>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Main Hub Initialization
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

    // Check for rainy day BEFORE welcome message
    if (checkRainyDay()) {
      handleRainyDay();
      // Small delay before showing welcome message
      setTimeout(() => {
        alert(
          `Now that that's taken care of... Welcome back to the Hub! You still need $${amountNeeded} for your ${goalName}! 💭`,
          "penny-msg",
        );
      }, 2000);
    } else {
      // Normal welcome
      alert(
        `Hi! Welcome to the Hub! You still need $${amountNeeded} for your ${goalName}! 💭`,
        "penny-msg",
      );
    }

    const age = localStorage.getItem("playerAge") || "7";

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
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
    addMessage(
      "Welcome! Earn coins in the Garden or Chores to reach your goal! 🐷",
      "penny-msg",
    );
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
