// shopping.js
import { getBalances, saveBalances, updateUI } from "./state.js";

// Audio for the Gatcha prize
const gatchaSound = new Audio("gachaVid.mp3");

// 1. Unified Purchase Logic
window.buyItem = async function (name, cost, action) {
  let balances = getBalances();

  if (balances.spendings < cost) {
    alert(
      `Oops! You only have $${balances.spendings} in Spendings. You need $${cost}! 🐷`,
    );
    return;
  }

  // Deduct money and save to the shared 'finalBalances' key
  balances.spendings -= cost;
  saveBalances(balances);
  updateUI();

  // Handle Specific Item Rewards
  if (action === "unlockCursor") {
    localStorage.setItem("customCursor", "active");
    document.body.classList.add("custom-cursor-active"); // Apply style immediately
    alert("Magic Cursor unlocked! 🖱️✨");
  } else if (action === "playSnake") {
    alert("Heading to the Snake Game! 🐍");
    window.location.href = "https://www.snakegame.org"; // External redirect
  } else if (action === "playGatcha") {
    alert("🎰 Spinning the Gatcha machine!");
    const overlay = document.getElementById("video-overlay");
    const video = document.getElementById("gacha-video");
    {
    }

    overlay.style.display = "flex"; // Show the overlay
    video.play(); // Play the gacha.mp4

    // Optional: Hide the video automatically when it ends
    video.onended = () => {
      closeVideo();
    };
  } else if (action === "equipChain") {
    alert("YAYAYAY");
  }
};

window.togglePennyChat = function () {
  const win = document.getElementById("penny-chat-window");
  if (win) win.classList.toggle("chat-hidden");
};

function addMessage(text, className) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;
  chatMessages.innerHTML += `<p class="${className}">${text}</p>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 3. Gemini AI Integration
window.sendToGemini = async function () {
  const inputField = document.getElementById("user-query");
  const userText = inputField.value.trim();
  if (!userText) return;

  addMessage(userText, "user-msg");
  inputField.value = "";

  try {
    const genAI = new GoogleGenerativeAI(
      "AIzaSyB7MzR6AL6aCn3e7QUQLqnMaFuPOh3pDvA",
    );
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction:
        "You are Penny, a friendly piggy bank assistant in the shop. Give financial advice to kids about their purchases.",
    });
    const result = await model.generateContent(userText);
    addMessage(result.response.text(), "penny-msg");
  } catch (error) {
    addMessage("Oops! I lost my voice! 🐷", "penny-msg");
  }
};

// 2. Initialization: Runs when the Shop page loads
window.addEventListener("DOMContentLoaded", () => {
  updateUI();
  const cursorStatus = localStorage.getItem("customCursor");
  console.log("Cursor Status in Storage:", cursorStatus); // Should say "active"

  if (cursorStatus === "active") {
    document.body.classList.add("custom-cursor-active");
    console.log("Class 'custom-cursor-active' added to body.");
  }
});

window.togglePennyChat = togglePennyChat;
window.sendToGemini = sendToGemini;
