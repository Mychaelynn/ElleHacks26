import { getBalances, saveBalances, updateUI } from "./state.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// api
const API_KEY = "AIzaSyBDpA_DWav4UW2cWPdgK9RQ8THShposT40";
const genAI = new GoogleGenerativeAI(API_KEY);

let growthInterval = null;
let sessionEarnings = 0;
let selectedCategory = null;
let pendingRewardAmount = 0;

window.addEventListener("DOMContentLoaded", () => {
  try {
    updateUI();

    const balances = getBalances();

    initGardenPenny();

    if (localStorage.getItem("customCursor") === "active") {
      document.body.classList.add("custom-cursor-active");
    }
  } catch (e) {}
});

// Penny's Investment Lesson
async function initGardenPenny() {
  const win = document.getElementById("penny-chat-window");

  if (win) {
    win.classList.remove("chat-hidden");
  }

  addMessage(
    "Welcome to the Garden! 🌻 This is a great place to learn about **Investments**.",
    "penny-msg",
  );

  addMessage(
    "When you buy seeds for $30, you are 'investing' your money. You spend a little now to earn more over time!",
    "penny-msg",
  );

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "You are Penny the Piggy Bank. Explain to a child why buying seeds is like a business investment. Keep it short and use emojis.",
    });

    const result = await model.generateContent("Explain garden investments.");

    addMessage(result.response.text(), "penny-msg");
  } catch (e) {
    addMessage(
      "The more you wait, the bigger your 'return' will be! 📈",
      "penny-msg",
    );
  }
}

// 2. Buy Seeds Logic
window.buySeeds = function () {
  let balances = getBalances();

  if (balances.spendings < 30) {
    addMessage(
      "Oops! You need $30 to start this investment. Try doing some chores first! 🐷",
      "penny-msg",
    );
    return;
  }

  balances.spendings -= 30;
  saveBalances(balances);
  updateUI();

  document.getElementById("buy-seeds-btn").classList.add("hidden");
  document.getElementById("stop-garden-btn").classList.remove("hidden");
  document.getElementById("earnings-display").classList.remove("hidden");
  document.getElementById("garden-status").innerText =
    "Investment growing... 🌻";

  growthInterval = setInterval(() => {
    sessionEarnings += 5;
    document.getElementById("current-session-cash").innerText = sessionEarnings;
  }, 10000);
};

// 3. Stop Garden & Collect Earnings
window.stopGarden = function () {
  if (growthInterval) {
    clearInterval(growthInterval);
    growthInterval = null;
  }

  if (sessionEarnings > 0) {
    pendingRewardAmount = sessionEarnings;
    selectedCategory = null;

    const win = document.getElementById("penny-chat-window");
    if (win) win.classList.remove("chat-hidden");

    addMessage(
      `🎉 You earned $${sessionEarnings} from your investment!`,
      "penny-msg",
    );
    addMessage(`Which category should we put this in?`, "penny-msg");
    addMessage(`Type: "spendings", "savings", or "rainy day"`, "penny-msg");

    document.getElementById("user-query").focus();
  } else {
    addMessage("You didn't wait long enough to earn anything! 🌱", "penny-msg");
  }

  sessionEarnings = 0;
  document.getElementById("current-session-cash").innerText = 0;
  document.getElementById("buy-seeds-btn").classList.remove("hidden");
  document.getElementById("stop-garden-btn").classList.add("hidden");
  document.getElementById("earnings-display").classList.add("hidden");
  document.getElementById("garden-status").innerText =
    "The garden is empty. Buy seeds to start!";
};

// 4. Gemini Chat Integration
window.sendToGemini = async function () {
  const inputField = document.getElementById("user-query");
  const userText = inputField.value.trim().toLowerCase();

  if (!userText) return;

  addMessage(userText, "user-msg");
  inputField.value = "";

  const raw = localStorage.getItem("finalBalances");
  let balances = raw
    ? JSON.parse(raw)
    : { wallet: 0, spendings: 0, savings: 0, rainyDay: 0 };

  // If we're waiting for category selection
  if (pendingRewardAmount > 0 && !selectedCategory) {
    const validCategories = ["spendings", "savings", "rainy day"];
    if (validCategories.includes(userText)) {
      selectedCategory = userText === "rainy day" ? "rainyDay" : userText;

      const currentBalance = balances[selectedCategory] || 0;
      addMessage(`Okay! Putting it in ${userText}.`, "penny-msg");
      addMessage(`You currently have $${currentBalance} there.`, "penny-msg");
      addMessage(
        `With the new $${pendingRewardAmount}, how much will you have in ${userText} total?`,
        "penny-msg",
      );
    } else {
      addMessage(
        `Hmm, I don't recognize that category. Please type "spendings", "savings", or "rainy day"!`,
        "penny-msg",
      );
    }
    return;
  }

  // If we're waiting for math answer
  if (pendingRewardAmount > 0 && selectedCategory) {
    const previousAmount = balances[selectedCategory] || 0;
    const expectedTotal = previousAmount + pendingRewardAmount;
    const userMath = parseInt(userText);

    if (userMath === expectedTotal) {
      balances[selectedCategory] = expectedTotal;
      localStorage.setItem("finalBalances", JSON.stringify(balances));
      updateUI();

      addMessage(
        `🎉 Correct! Your ${selectedCategory} now has $${expectedTotal}!`,
        "penny-msg",
      );

      selectedCategory = null;
      pendingRewardAmount = 0;
    } else {
      addMessage(
        `Not quite! $${previousAmount} + $${pendingRewardAmount} = $${expectedTotal}. Try again!`,
        "penny-msg",
      );
    }
    return;
  }

  // Normal Penny chat

  try {
    const age = localStorage.getItem("playerAge") || "7"; // ADD THIS LINE
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are Penny the Piggy Bank. 
      Give advice about investing money and growing wealth. 
      Tailor your language and complexity specifically for a ${age}-year-old child. 
      Keep it simple, encouraging, and use relatable analogies.`, //
    });
    const result = await model.generateContent(userText);
    addMessage(result.response.text(), "penny-msg");
  } catch (error) {
    addMessage("Oops! I lost my voice! 🐷", "penny-msg");
  }
};

window.togglePennyChat = function () {
  const win = document.getElementById("penny-chat-window");
  if (win) {
    win.classList.toggle("chat-hidden");
  }
};

function addMessage(text, className) {
  const box = document.getElementById("chat-messages");
  if (!box) {
    return;
  }
  box.innerHTML += `<p class="${className}">${text}</p>`;
  box.scrollTop = box.scrollHeight;
}
