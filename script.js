import { GoogleGenerativeAI } from "@google/generative-ai";

//api
const API_KEY = "AIzaSyB1YTvKeTmc41vfRze1XAiyvRHPn5FhCm8";
const genAI = new GoogleGenerativeAI(API_KEY);

let currentStep = 0;
const steps = ["spendings", "savings", "rainyDay"];
let balances = { wallet: 50, spendings: 0, savings: 0, rainyDay: 0 };

// math and stats
let pendingAmount = 0;
let pendingJar = "";
let expectedRemaining = 0;
let needsRatioLesson = false;

async function initJarPage() {
  if (document.getElementById("jar-spendings")) {
    updateDashboard();

    const chatWindow = document.getElementById("penny-chat-window");
    if (chatWindow && chatWindow.classList.contains("chat-hidden"))
      togglePennyChat();
    setTimeout(() => {
      explainNextJar();
    }, 600);
  }
}

//tour
async function explainNextJar() {
  const age = localStorage.getItem("playerAge") || "7";
  const loadingId = "loading-" + Date.now();

  if (currentStep === steps.length) {
    addMessage("Penny is thinking... 💭", "penny-msg", loadingId);
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: `You are Penny. The jar tour is over. Now explain the 3 main rules of the game to a ${age} year old:
        1. You have $50 to split between these jars. 
        2. Spendings is for the Shop, Savings is for your ${localStorage.getItem("targetGoal") || "trip"}, and Rainy Day is for emergencies.
        3. Once your wallet is empty, you'll go to the Hub to earn more!
        Keep it very simple. End with 'Click a jar to add money to it!'`,
      });
      const result = await model.generateContent("Explain the game rules.");
      document.getElementById(loadingId).innerText = result.response.text();

      currentStep++;
    } catch (e) {
      document.getElementById(loadingId).innerText =
        "Great job learning the jars! Now, split your $50 to start your adventure. Type YES to begin! 🐷";
      currentStep++;
    }
    return;
  }

  if (currentStep > steps.length) {
    addMessage("Penny is thinking... 💭", "penny-msg", loadingId);
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: `You are Penny. Tell the user: 'You're a pro! You have $50. Click a jar to add money! 💰' and give them one last encouraging boost.`,
      });
      const result = await model.generateContent("Final encouragement.");
      document.getElementById(loadingId).innerText = result.response.text();
    } catch (e) {
      document.getElementById(loadingId).innerText =
        "You're a pro! You have $50. Click a jar to add money! 💰";
    }
    resetJars();
    updateDashboard();
    return;
  }


  ///different jars
  const jarId = steps[currentStep];
  highlightJar(jarId);
  addMessage("Penny is thinking... 💭", "penny-msg", loadingId);
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are Penny. Explain the ${jarId} jar in 2 short sentences for a child of age ${age}. End with 'Type YES to continue! 🐷'`,
    });
    const result = await model.generateContent(`Explain the ${jarId} jar.`);
    document.getElementById(loadingId).innerText = result.response.text();
  } catch (e) {
    document.getElementById(loadingId).innerText =
      "I'm a bit sleepy! Type YES to move on! 🐷";
  }
}

 //miney allocaitn
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

  // cant put moer than half in spendings
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

async function sendToGemini() {
  const inputField = document.getElementById("user-query");
  const userText = inputField.value.trim().toLowerCase();
  if (!userText) return;
  addMessage(userText, "user-msg");
  inputField.value = "";

  if (userText === "yes" && currentStep < steps.length) {
    currentStep++;
    explainNextJar();
    return;
  }

  // ratio
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

  // regular AI Chat
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

  if (age === "") {
    alert("Please enter your age!");
    return;
  }
  localStorage.setItem("playerAge", age);
  window.location.href = "chosePrize.html";
}

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
  localStorage.setItem("targetGoal", name);
  localStorage.setItem("targetPrice", price);
  alert("Great choice! Let's go fill up our Jars for the " + name + "!");
  window.location.href = "jar.html";
}

function updateDashboard() {
  const goalName = localStorage.getItem("targetGoal") || "Prize";
  const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;
  const amountNeeded = Math.max(0, targetPrice - balances.savings);

  const mapping = {
    "stat-wallet": balances.wallet,
    "stat-spendings": balances.spendings,
    "stat-savings": balances.savings,
    "stat-rainyDay": balances.rainyDay,
    "stat-goal-name": goalName,
    "stat-needed": amountNeeded,
  };

  Object.entries(mapping).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerText = value;
    }
  });

  localStorage.setItem("finalBalances", JSON.stringify(balances));
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
