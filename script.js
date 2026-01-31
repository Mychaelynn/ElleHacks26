import { GoogleGenerativeAI } from "@google/generative-ai";

// 1. Setup API (Using Gemini 2.0 Flash)
const API_KEY = "AIzaSyBWcNu995ZmMaAa_rEiHQss2lVXHWaxmQk";
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. Game State
let currentStep = 0;
const steps = ["spendings", "savings", "rainyDay"];
let balances = { wallet: 50, spendings: 0, savings: 0, rainyDay: 0 };

// Math & Lesson State
let pendingAmount = 0;
let pendingJar = "";
let expectedRemaining = 0;
let needsRatioLesson = false;

// 3. Init Page
async function initJarPage() {
  if (document.getElementById("jar-spendings")) {
    // --- ADD THIS LINE ---
    updateDashboard();

    const chatWindow = document.getElementById("penny-chat-window");
    if (chatWindow && chatWindow.classList.contains("chat-hidden"))
      togglePennyChat();
    setTimeout(() => {
      explainNextJar();
    }, 600);
  }
}

// 4. Guided Tour
async function explainNextJar() {
  const age = localStorage.getItem("playerAge") || "7";
  if (currentStep >= steps.length) {
    addMessage(
      "You're a pro! You have $50. Click a jar to add money! 💰",
      "penny-msg",
    );
    resetJars();
    updateDashboard();
    return;
  }
  const jarId = steps[currentStep];
  highlightJar(jarId);
  const loadingId = "loading-" + Date.now();
  addMessage("Penny is thinking... 💭", "penny-msg", loadingId);
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are Penny. Explain the ${jarId} jar in 2 short sentences for a child of age ${age}. End with 'Type YES to continue! 🐷'`,
    });
    const result = await model.generateContent(`Explain the ${jarId} jar.`);
    document.getElementById(loadingId).innerText = result.response.text();
  } catch (e) {
    document.getElementById(loadingId).innerText = "Type YES to move on! 🐷";
  }
}

// 5. Money Allocation with Ratio Lesson
function allocateMoney(jarType) {
  if (currentStep < steps.length) return;

  let amount = prompt(
    `How much money do you want to add to your ${jarType} jar?`,
  );
  amount = parseInt(amount);

  if (isNaN(amount) || amount <= 0 || amount > balances.wallet) {
    addMessage("Check your wallet and try a different number! 🐷", "penny-msg");
    return;
  }

  // NEW: Ratio Lesson Check
  // If user tries to put more than $25 (half of their total) into Spendings
  if (jarType === "spendings" && balances.spendings + amount > 25) {
    needsRatioLesson = true;
    pendingAmount = amount;
    pendingJar = jarType;

    addMessage(`Wait! $${amount} is a lot for just Spendings!`, "user-msg");
    addMessage(
      "Spending too much now means less for your goals later. Have you heard of the 50/30/20 rule? 50% should be for needs, not just treats! Do you want to reconsider or try anyway? (Type RECONSIDER or TRY)",
      "penny-msg",
    );
    return;
  }

  startMathChallenge(jarType, amount);
}

function startMathChallenge(jarType, amount) {
  pendingAmount = amount;
  pendingJar = jarType;
  expectedRemaining = balances.wallet - amount;
  addMessage(
    `Math time! $${balances.wallet} minus $${amount}... how much is left in your wallet? 🧐`,
    "penny-msg",
  );
}

// 6. Gemini Send Function
async function sendToGemini() {
  const inputField = document.getElementById("user-query");
  const userText = inputField.value.trim().toLowerCase();
  if (!userText) return;
  addMessage(userText, "user-msg");
  inputField.value = "";

  // A. Tour Logic
  if (userText === "yes" && currentStep < steps.length) {
    currentStep++;
    explainNextJar();
    return;
  }

  // B. Ratio Lesson Logic
  if (needsRatioLesson) {
    if (userText === "reconsider") {
      addMessage(
        "Smart choice! Balance is key to being a money master. 🐷",
        "penny-msg",
      );
      needsRatioLesson = false;
      pendingAmount = 0;
    } else if (userText === "try") {
      addMessage(
        "Okay, it's your money, but try to save more next time! 🐷",
        "penny-msg",
      );
      needsRatioLesson = false;
      startMathChallenge(pendingJar, pendingAmount);
    } else {
      addMessage("Please type RECONSIDER or TRY! 🐷", "penny-msg");
    }
    return;
  }

  // C. Math Challenge Logic
  if (pendingAmount > 0) {
    if (parseInt(userText) === expectedRemaining) {
      balances.wallet = expectedRemaining;
      balances[pendingJar] += pendingAmount;
      addMessage(
        `Correct! $${pendingAmount} added to ${pendingJar}.`,
        "penny-msg",
      );
      pendingAmount = 0;
      updateDashboard();
    } else {
      addMessage("Not quite! Try the math again! 🐷", "penny-msg");
    }
    return;
  }

  // D. Regular AI Chat
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(userText);
    addMessage(result.response.text(), "penny-msg");
  } catch (error) {
    addMessage("Oops! Try again? 🐷", "penny-msg");
  }
}
function saveAgeAndGo() {
  const age = document.getElementById("age-input").value;

  // Validation to make sure the kid entered a number
  if (age === "") {
    alert("Please enter your age!");
    return;
  }

  // Save it so Penny can use it on the next pages
  localStorage.setItem("playerAge", age);

  // Now move to the next page
  window.location.href = "chosePrize.html";
}

// 7. UI Helpers

function addMessage(text, className, id = null) {
  const chatMessages = document.getElementById("chat-messages");
  const msgHtml = id
    ? `<p class="${className}" id="${id}">${text}</p>`
    : `<p class="${className}">${text}</p>`;
  chatMessages.innerHTML += msgHtml;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function highlightJar(id) {
  resetJars();
  const jar = document.getElementById("jar-" + id);
  if (jar) jar.classList.add("active-jar");
}

function resetJars() {
  document
    .querySelectorAll(".jar-card")
    .forEach((j) => j.classList.remove("active-jar"));
}
function togglePennyChat() {
  document.getElementById("penny-chat-window").classList.toggle("chat-hidden");
}

function selectGoal(name, price) {
  // 1. Save the goal details for the Hub and Jar pages
  localStorage.setItem("targetGoal", name);
  localStorage.setItem("targetPrice", price);

  // 2. Alert the user (Optional, but good for feedback)
  alert("Great choice! Let's go fill up our Jars for the " + name + "!");

  // 3. Move to the next page
  window.location.href = "jar.html";
}

function updateDashboard() {
  // --- DEBUG CHECK: Add this to see what's actually in your storage ---
  console.log("Goal in Storage:", localStorage.getItem("targetGoal"));
  console.log("Price in Storage:", localStorage.getItem("targetPrice"));
  // 1. Get the current jar balances
  document.getElementById("stat-wallet").innerText = balances.wallet;
  document.getElementById("stat-spendings").innerText = balances.spendings;
  document.getElementById("stat-savings").innerText = balances.savings;
  document.getElementById("stat-rainyDay").innerText = balances.rainyDay;

  // 2. Fetch the prize info you picked in chosePrize.html
  // Use the exact keys you used in selectGoal()
  const goalName = localStorage.getItem("targetGoal") || "Prize";
  const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;

  // 3. The Math: Item Price - Savings
  const amountNeeded = Math.max(0, targetPrice - balances.savings);

  // 4. Update the display elements
  const goalNameEl = document.getElementById("stat-goal-name");
  const neededEl = document.getElementById("stat-needed");

  if (goalNameEl) goalNameEl.innerText = goalName;
  if (neededEl) neededEl.innerText = amountNeeded;

  // 5. Save the balances for the next page
  localStorage.setItem("finalBalances", JSON.stringify(balances));

  // Check if wallet is finished
  if (balances.wallet === 0 && pendingAmount === 0) {
    addMessage(
      `Great! You still need $${amountNeeded} for your ${goalName}. Let's go! 🏰`,
      "penny-msg",
    );
    setTimeout(() => {
      window.location.href = "main.html";
    }, 3000);
  }
}

window.selectGoal = selectGoal;
window.saveAgeAndGo = saveAgeAndGo;
window.onload = initJarPage;
window.togglePennyChat = togglePennyChat;
window.sendToGemini = sendToGemini;
window.allocateMoney = allocateMoney;
