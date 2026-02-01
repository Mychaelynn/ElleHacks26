import { GoogleGenerativeAI } from "@google/generative-ai";

//gemini api
const API_KEY = "AIzaSyB1YTvKeTmc41vfRze1XAiyvRHPn5FhCm8";
const genAI = new GoogleGenerativeAI(API_KEY);

var character = document.querySelector(".character");
var map = document.querySelector(".map");
var cleanPrompt = document.getElementById("clean-prompt");
var x = 90;
var y = 34;
var held_directions = [];
var speed = 1;
var activeItem = null;

var selectedCategory = null;
var pendingRewardAmount = 10;

//images
const bgImages = {
  dirty: "url('choreAssets/dirtyKitchen.png')",
  sinkClean: "url('choreAssets/dirtyTrashCleanSink.png')",
  trashClean: "url('choreAssets/dirtySinkCleanTrash.png')",
  allClean: "url('choreAssets/allClean.png')",
};

//chores
var chores = [
  { name: "Sink", id: "sink", x: 408, y: 240, cleaned: false },
  { name: "Trash", id: "trash", x: 664, y: 352, cleaned: false },
];

// Helper to get balances consistently
function getBalances() {
  const raw = localStorage.getItem("finalBalances");
  return raw
    ? JSON.parse(raw)
    : { wallet: 0, spendings: 0, savings: 0, rainyDay: 0 };
}

function saveBalances(balances) {
  localStorage.setItem("finalBalances", JSON.stringify(balances));
}

//penny
function updateStatsBoard() {
  const balances = getBalances();
  const goalName = localStorage.getItem("targetGoal") || "Prize";
  const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;
  const amountNeeded = Math.max(0, targetPrice - balances.savings);

  if (document.getElementById("stat-wallet")) {
    document.getElementById("stat-goal-name").innerText = goalName;
    document.getElementById("stat-needed").innerText = amountNeeded;
    document.getElementById("stat-spendings").innerText = balances.spendings;
    document.getElementById("stat-savings").innerText = balances.savings;
    document.getElementById("stat-rainyDay").innerText = balances.rainyDay;
  }
}

async function triggerPennyReward() {
  const balances = getBalances();
  const rewardAmount = 10;

  // Add to wallet first
  balances.wallet += rewardAmount;
  saveBalances(balances);

  const chatWin = document.getElementById("penny-chat-window");
  if (chatWin) {
    chatWin.classList.remove("chat-hidden");
  }

  // Set pending reward amount
  pendingRewardAmount = rewardAmount;
  selectedCategory = null;

  addMessage(
    `Great job cleaning! You earned $${pendingRewardAmount}! 🐷`,
    "penny-msg",
  );

  addMessage(`Which category should we put this in?`, "penny-msg");

  addMessage(`Type: "spendings", "savings", or "rainy day"`, "penny-msg");

  const inputField = document.getElementById("user-query");
  if (inputField) {
    inputField.focus();
  }

  updateStatsBoard();
}

window.sendToGemini = async function () {
  const inputField = document.getElementById("user-query");
  const userText = inputField.value.trim().toLowerCase();

  if (!userText) return;

  addMessage(userText, "user-msg");
  inputField.value = "";

  let balances = getBalances();

  // STEP 1: Handle Category Selection
  if (!selectedCategory) {
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

  // STEP 2: Handle Math Calculation
  const previousAmount = balances[selectedCategory] || 0;
  const expectedTotal = previousAmount + pendingRewardAmount;
  const userMath = parseInt(userText);

  if (userMath === expectedTotal) {
    // Deduct from wallet and add to category
    balances.wallet -= pendingRewardAmount;
    balances[selectedCategory] = expectedTotal;
    saveBalances(balances);
    updateStatsBoard();

    addMessage(
      `🎉 Correct! Your ${selectedCategory} now has $${expectedTotal}!`,
      "penny-msg",
    );

    addMessage(
      `Heading back to the Adventure Hub in 3 seconds... ✈️`,
      "penny-msg",
    );

    selectedCategory = null;
    pendingRewardAmount = 0;

    setTimeout(() => {
      window.location.href = "main.html";
    }, 3000);
  } else {
    // Math is wrong
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `You are Penny the Piggy Bank. 
          The user is adding $${pendingRewardAmount} to their $${previousAmount} in ${selectedCategory}. 
          They guessed $${userText}, but it should be $${expectedTotal}. 
          Gently help them fix the math. Keep it short.`;

      const result = await model.generateContent(prompt);
      addMessage(result.response.text(), "penny-msg");
    } catch (e) {
      addMessage(
        `Not quite! $${previousAmount} + $${pendingRewardAmount} is $${expectedTotal}. Try typing that!`,
        "penny-msg",
      );
    }
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

window.togglePennyChat = function () {
  const win = document.getElementById("penny-chat-window");
  if (win) {
    win.classList.toggle("chat-hidden");
  }
};

function updateMapBackground() {
  var sinkState = chores.find((c) => c.id === "sink").cleaned;
  var trashState = chores.find((c) => c.id === "trash").cleaned;

  if (sinkState && trashState) {
    map.style.backgroundImage = bgImages.allClean;

    var successModal = document.getElementById("success-modal");
    if (successModal) {
      successModal.classList.remove("hidden");
    }

    setTimeout(triggerPennyReward, 1000);
  } else if (sinkState && !trashState) {
    map.style.backgroundImage = bgImages.sinkClean;
  } else if (!sinkState && trashState) {
    map.style.backgroundImage = bgImages.trashClean;
  } else {
    map.style.backgroundImage = bgImages.dirty;
  }
}

function checkProximity() {
  var pixelSize = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue("--pixel-size"),
  );
  activeItem = null;
  var foundAny = false;
  chores.forEach((chore) => {
    if (chore.cleaned) return;
    var targetGameX = chore.x / pixelSize;
    var targetGameY = chore.y / pixelSize;
    var dist = Math.sqrt(
      Math.pow(x - targetGameX, 2) + Math.pow(y - targetGameY, 2),
    );
    if (dist < 15) {
      activeItem = chore;
      foundAny = true;
    }
  });
  if (foundAny && cleanPrompt) {
    cleanPrompt.innerHTML = `Press <b>E</b> to clean ${activeItem.name} (+10$)`;
    cleanPrompt.classList.remove("hidden");
  } else if (cleanPrompt) {
    cleanPrompt.classList.add("hidden");
  }
}

const placeCharacter = () => {
  var pixelSize = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue("--pixel-size"),
  );
  const held_direction = held_directions[0];
  if (held_direction) {
    if (held_direction === directions.right) {
      x += speed;
    }
    if (held_direction === directions.left) {
      x -= speed;
    }
    if (held_direction === directions.down) {
      y += speed;
    }
    if (held_direction === directions.up) {
      y -= speed;
    }
    character.setAttribute("facing", held_direction);
  }
  character.setAttribute("walking", held_direction ? "true" : "false");

  var leftLimit = -8;
  var rightLimit = 16 * 20 + 8;
  var topLimit = -8 + 32;
  var bottomLimit = 16 * 20;
  if (x < leftLimit) {
    x = leftLimit;
  }
  if (x > rightLimit) {
    x = rightLimit;
  }
  if (y < topLimit) {
    y = topLimit;
  }
  if (y > bottomLimit) {
    y = bottomLimit;
  }

  var camera_left = pixelSize * 66;
  var camera_top = pixelSize * 42;
  map.style.transform = `translate3d( ${-x * pixelSize + camera_left}px, ${-y * pixelSize + camera_top}px, 0 )`;
  character.style.transform = `translate3d( ${x * pixelSize}px, ${y * pixelSize}px, 0 )`;
};

const step = () => {
  placeCharacter();
  checkProximity();
  window.requestAnimationFrame(step);
};

// INITIALIZATION - Set dirty room background!
updateStatsBoard();
updateMapBackground(); // <- THIS WAS MISSING!
step();

document.addEventListener("keydown", (e) => {
  if (
    activeItem &&
    !cleanPrompt.classList.contains("hidden") &&
    (e.code === "KeyE" || e.key === "e")
  ) {
    activeItem.cleaned = true;
    updateMapBackground();
    cleanPrompt.classList.add("hidden");
  }
});

const directions = { up: "up", down: "down", left: "left", right: "right" };
const keys = {
  38: directions.up,
  37: directions.left,
  39: directions.right,
  40: directions.down,
};
document.addEventListener("keydown", (e) => {
  var dir = keys[e.which];
  if (dir && held_directions.indexOf(dir) === -1) held_directions.unshift(dir);
});
document.addEventListener("keyup", (e) => {
  var dir = keys[e.which];
  var index = held_directions.indexOf(dir);
  if (index > -1) held_directions.splice(index, 1);
});

//d-pad (same as before)
var isPressed = false;
const removePressedAll = () => {
  document.querySelectorAll(".dpad-button").forEach((d) => {
    d.classList.remove("pressed");
  });
};
document.body.addEventListener("mousedown", () => {
  isPressed = true;
});
document.body.addEventListener("mouseup", () => {
  isPressed = false;
  held_directions = [];
  removePressedAll();
});
const handleDpadPress = (direction, click) => {
  if (click) {
    isPressed = true;
  }
  held_directions = isPressed ? [direction] : [];
  if (isPressed) {
    removePressedAll();
    document.querySelector(".dpad-" + direction).classList.add("pressed");
  }
};
document
  .querySelector(".dpad-left")
  .addEventListener("mousedown", (e) => handleDpadPress(directions.left, true));
document
  .querySelector(".dpad-up")
  .addEventListener("mousedown", (e) => handleDpadPress(directions.up, true));
document
  .querySelector(".dpad-right")
  .addEventListener("mousedown", (e) =>
    handleDpadPress(directions.right, true),
  );
document
  .querySelector(".dpad-down")
  .addEventListener("mousedown", (e) => handleDpadPress(directions.down, true));
