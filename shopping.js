// shopping.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getBalances, saveBalances, updateUI } from "./state.js";

const API_KEY = "AIzaSyBDpA_DWav4UW2cWPdgK9RQ8THShposT40";
const genAI = new GoogleGenerativeAI(API_KEY);

let currentPurchase = null; // Store pending purchase info

// purchase
window.buyItem = async function (name, cost, action) {
  let balances = getBalances();

  // if users spendings is less than price
  if (balances.spendings < cost) {
    openPennyChat();
    addMessage(
      `Oh no! You only have $${balances.spendings} in Spendings, but you need $${cost}! Maybe earn more coins first? 🐷`,
      "penny-msg",
    );
    return;
  }

  currentPurchase = { name, cost, action };

  openPennyChat();

  // let gemini respond based on details below
  try {
    const goalName = localStorage.getItem("targetGoal") || "your goal";
    const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;
    const amountNeeded = Math.max(0, targetPrice - balances.savings);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are Penny, a friendly piggy bank assistant helping kids make smart spending decisions.

CONTEXT:
- Item: "${name}" costs $${cost}
- Spendings: $${balances.spendings}
- Savings: $${balances.savings} (needs $${amountNeeded} more for ${goalName})
- Rainy Day: $${balances.rainyDay}

DECISION RULES:
1. If this is a small purchase (under $5) and they have plenty of spendings (over $20), be encouraging and supportive! It's okay to spend sometimes.
2. If this is expensive ($10+) relative to their spendings, gently question if it's wise and make them think about it.
3. If their savings are low and they're close to their goal, remind them about their goal.
4. Always consider the balance between all three categories.

YOUR RESPONSE:
- First, give your quick opinion (1-2 sentences) on whether this purchase is smart based on their financial situation.
- Then ALWAYS ask them this math question: "You have $${balances.spendings} in Spendings right now. If you buy this for $${cost}, how much will you have left?"
- End with: "Type your answer below! (Or type 'cancel' to change your mind)"

Keep it friendly, age-appropriate, and teaching them about balance - not just always saving!`,
    });

    const result = await model.generateContent(
      `The user wants to buy "${name}" for $${cost}. Give your response now.`,
    );

    const aiResponse = result.response.text();
    addMessage(aiResponse, "penny-msg");
    // if ai fails give default message
  } catch (error) {
    console.error("AI Error:", error);

    addMessage(`Thinking about "${name}" for $${cost}... 🤔`, "penny-msg");
    addMessage(
      `You have $${balances.spendings} in Spendings right now. If you buy this for $${cost}, how much will you have left?`,
      "penny-msg",
    );
    addMessage(
      `Type your answer below! (Or type "cancel" to change your mind)`,
      "penny-msg",
    );
  }

  // Focus the input
  const inputField = document.getElementById("user-query");
  if (inputField) inputField.focus(); // puts cursoe inside input field ready to type
};

window.closeVideo = function () {
  const overlay = document.getElementById("video-overlay");
  const video = document.getElementById("gacha-video");
  overlay.style.display = "none";
  video.pause();
  video.currentTime = 0;
};

function openPennyChat() {
  const windo = document.getElementById("penny-chat-window");
  if (windo) {
    windo.classList.remove("chat-hidden");
  }
}

function togglePennyChat() {
  const windo = document.getElementById("penny-chat-window");
  if (windo) {
    windo.classList.toggle("chat-hidden");
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
    localStorage.setItem("goldChain", "equipped");
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

  // check if purchase, do math
  if (currentPurchase) {
    const balances = getBalances();
    const correctAnswer = balances.spendings - currentPurchase.cost;

    // cjecl if user cancel
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
      model: "gemini-2.0-flash",
      systemInstruction:
        "You are Penny, a friendly piggy bank assistant in the shop. Give financial advice to kids about their purchases. Keep responses short and encouraging.",
    });
    const result = await model.generateContent(userText);
    addMessage(result.response.text(), "penny-msg");
  } catch (error) {
    addMessage("Oops! I lost my voice for a moment! 🐷", "penny-msg");
  }
}

// Dom is bridge from JS to HTML -- when make changes to html text this does it
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
