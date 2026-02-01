import { getBalances, updateUI } from "./state.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyB1YTvKeTmc41vfRze1XAiyvRHPn5FhCm8";
const genAI = new GoogleGenerativeAI(API_KEY);

// 1. Initialization
window.addEventListener("DOMContentLoaded", () => {
  try {
    updateUI();

    // Get goal info from localStorage (NOT from getBalances!)
    const goalName = localStorage.getItem("targetGoal") || "Your Destination";
    const goalAmount = parseInt(localStorage.getItem("targetPrice")) || 0;

    const goalTitle = document.getElementById("current-goal-title");
    const destinationText = document.getElementById("destination-text");

    // Set display name based on goal
    if (goalTitle) {
      goalTitle.innerText = `Ticket to ${goalName}`;
    }

    if (destinationText) {
      destinationText.innerText = goalName;
    }

    // Apply Magic Cursor if active
    if (localStorage.getItem("customCursor") === "active") {
      document.body.classList.add("custom-cursor-active");
    }
  } catch (e) {
    alert("ERROR during initialization: " + e.message);
  }
});

// 2. Ticket Logic
document.getElementById("buy-ticket-btn").addEventListener("click", () => {
  const balances = getBalances();
  const goalAmount = parseInt(localStorage.getItem("targetPrice")) || 0;
  const goalName = localStorage.getItem("targetGoal") || "Your Destination";

  const amountNeeded = goalAmount - balances.savings;

  if (amountNeeded <= 0) {
    // SUCCESS: Redirect based on goal name
    const goal = goalName.toLowerCase();
    alert("Goal achieved! Redirecting...");

    if (goal.includes("disney")) {
      // Check if they bought the gold chain
      const hasGoldChain = localStorage.getItem("goldChain") === "equipped";

      if (hasGoldChain) {
        window.location.href = "disneyCool.html";
      } else {
        window.location.href = "disneyPrize.html";
      }
    } else if (goal.includes("niagara")) {
      // Check if they bought the gold chain
      const hasGoldChain = localStorage.getItem("goldChain") === "equipped";

      if (hasGoldChain) {
        window.location.href = "niagaraCool.html";
      } else {
        window.location.href = "niagara.html";
      }
    } else if (goal.includes("wealth")) {
      // Check if they bought the gold chain
      const hasGoldChain = localStorage.getItem("goldChain") === "equipped";

      if (hasGoldChain) {
        window.location.href = "coolwealth.html";
      } else {
        window.location.href = "wealth.html";
      }
    } else {
      alert(`🎉 Congratulations! You saved enough for ${goalName}! 🎉`);
    }
  } else {
    // FAILURE: Penny speaks
    openPennyChat();
    addMessage(
      `Wait! You still need $${amountNeeded} more in your Savings to buy this ticket. Keep doing your chores! 🐷💸`,
      "penny-msg",
    );
  }
});

// 3. Penny UI Helpers
function openPennyChat() {
  const win = document.getElementById("penny-chat-window");

  if (win) {
    win.classList.remove("chat-hidden");
  }
}

window.togglePennyChat = function () {
  const win = document.getElementById("penny-chat-window");

  if (win) {
    win.classList.toggle("chat-hidden");
  }
};

function addMessage(text, className) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) {
    return;
  }
  chatMessages.innerHTML += `<p class="${className}">${text}</p>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 4. Gemini AI
window.sendToGemini = async function () {
  const inputField = document.getElementById("user-query");
  const userText = inputField.value.trim();
  if (!userText) {
    return;
  }

  addMessage(userText, "user-msg");
  inputField.value = "";

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "You are Penny, a friendly piggy bank assistant. You help kids understand if they have enough savings for their big goal trip.",
    });
    const result = await model.generateContent(userText);
    alert("Got response from Gemini!");
    addMessage(result.response.text(), "penny-msg");
  } catch (error) {
    alert("Gemini error: " + error.message);
    addMessage("Oops! I lost my voice! 🐷", "penny-msg");
  }
};
