// shopping.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getBalances, saveBalances, updateUI } from "./state.js";

const API_KEY = "AIzaSyDk3isNLBDgRkx10pgPhblPrZcKX8_sT5E";
const genAI = new GoogleGenerativeAI(API_KEY);

// Audio for the Gatcha prize
const gatchaSound = new Audio("gachaVid.mp3");

let currentPurchase = null; // Store pending purchase info

// 1. Unified Purchase Logic with Penny's Question
window.buyItem = async function (name, cost, action) {
  let balances = getBalances();

  if (balances.spendings < cost) {
    // Open Penny's chat and show error
    openPennyChat();
    addMessage(
      `Oh no! You only have $${balances.spendings} in Spendings, but you need $${cost}! Maybe earn more coins first? 🐷`,
      "penny-msg",
    );
    return;
  }

  // Store purchase details
  currentPurchase = { name, cost, action };

  // Open Penny's chat and ask the question
  openPennyChat();

  // Penny questions if it's wise
  addMessage(
    `Hmm... are you sure you want to spend $${cost} on "${name}"? 🤔`,
    "penny-msg",
  );

  addMessage(
    `Let me ask you this: You have $${balances.spendings} in Spendings right now. If you buy this for $${cost}, how much will you have left? 💭`,
    "penny-msg",
  );

  addMessage(
    `Type your answer below! (Or type "cancel" to change your mind)`,
    "penny-msg",
  );

  // Focus the input
  const inputField = document.getElementById("user-query");
  if (inputField) inputField.focus();
};

window.closeVideo = function () {
  const overlay = document.getElementById("video-overlay");
  const video = document.getElementById("gacha-video");
  overlay.style.display = "none";
  video.pause();
  video.currentTime = 0;
};

function openPennyChat() {
  const win = document.getElementById("penny-chat-window");
  if (win) {
    win.classList.remove("chat-hidden");
  }
}

function togglePennyChat() {
  const win = document.getElementById("penny-chat-window");
  if (win) {
    win.classList.toggle("chat-hidden");
  }
}

function addMessage(text, className) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) {
    return;
  }
  chatMessages.innerHTML += `<p class="${className}">${text}</p>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function completePurchase() {
  if (!currentPurchase) return;

  const { name, cost, action } = currentPurchase;
  let balances = getBalances();

  // Deduct money
  balances.spendings -= cost;
  saveBalances(balances);
  updateUI();

  addMessage(
    `✅ Purchase complete! You bought "${name}" for $${cost}. You now have $${balances.spendings} left in Spendings! 🎉`,
    "penny-msg",
  );

  // Handle specific actions
  if (action === "unlockCursor") {
    localStorage.setItem("customCursor", "active");
    document.body.classList.add("custom-cursor-active");
    addMessage("Your Magic Cursor is now active! 🖱️✨", "penny-msg");
  } else if (action === "playSnake") {
    addMessage("Taking you to the Snake Game! 🐍", "penny-msg");
    setTimeout(() => {
      window.location.href = "https://www.snakegame.org";
    }, 1500);
  } else if (action === "playGatcha") {
    addMessage("🎰 Here comes your prize!", "penny-msg");
    setTimeout(() => {
      const overlay = document.getElementById("video-overlay");
      const video = document.getElementById("gacha-video");
      overlay.style.display = "flex";
      video.play();
      video.onended = () => {
        closeVideo();
      };
    }, 1000);
  } else if (action === "equipChain") {
    addMessage(
      "You're now wearing the WealthSimple Gold Chain! 💰✨",
      "penny-msg",
    );
  }

  // Clear pending purchase
  currentPurchase = null;
}

async function sendToGemini() {
  const inputField = document.getElementById("user-query");
  const userText = inputField.value.trim();
  if (!userText) {
    return;
  }

  addMessage(userText, "user-msg");
  inputField.value = "";

  // Check if we're waiting for a math answer
  if (currentPurchase) {
    const balances = getBalances();
    const correctAnswer = balances.spendings - currentPurchase.cost;

    // Check if user wants to cancel
    if (
      userText.toLowerCase() === "cancel" ||
      userText.toLowerCase() === "no"
    ) {
      addMessage(
        "Good thinking! Your money is safe. Come back anytime! 🐷💰",
        "penny-msg",
      );
      currentPurchase = null;
      return;
    }

    // Check the math answer
    const userAnswer = parseInt(userText);

    if (userAnswer === correctAnswer) {
      addMessage(
        `🎉 Correct! $${balances.spendings} - $${currentPurchase.cost} = $${correctAnswer}!`,
        "penny-msg",
      );
      addMessage(
        "Great job with your math! Processing your purchase now... 💳",
        "penny-msg",
      );
      completePurchase();
    } else {
      addMessage(
        `Hmm, that's not quite right. The answer is $${correctAnswer}. ($${balances.spendings} - $${currentPurchase.cost} = $${correctAnswer})`,
        "penny-msg",
      );
      addMessage(
        "Want to try again, or type 'cancel' to keep your money? 🐷",
        "penny-msg",
      );
    }

    return;
  }

  // Normal Penny chat if not in purchase mode
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction:
        "You are Penny, a friendly piggy bank assistant in the shop. Give financial advice to kids about their purchases. Keep responses short and encouraging.",
    });
    const result = await model.generateContent(userText);
    addMessage(result.response.text(), "penny-msg");
  } catch (error) {
    addMessage("Oops! I lost my voice for a moment! 🐷", "penny-msg");
  }
}

// 2. Initialization
window.addEventListener("DOMContentLoaded", () => {
  updateUI();

  const cursorStatus = localStorage.getItem("customCursor");
  if (cursorStatus === "active") {
    document.body.classList.add("custom-cursor-active");
  }
});

// Export functions to window
window.togglePennyChat = togglePennyChat;
window.sendToGemini = sendToGemini;
