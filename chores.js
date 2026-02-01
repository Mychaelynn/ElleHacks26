import { GoogleGenerativeAI } from "@google/generative-ai";

//gemini api
const API_KEY = "AIzaSyDk3isNLBDgRkx10pgPhblPrZcKX8_sT5E"; 
const genAI = new GoogleGenerativeAI(API_KEY);

var character = document.querySelector(".character");
var map = document.querySelector(".map");
var cleanPrompt = document.getElementById("clean-prompt");
var x = 90;
var y = 34;
var held_directions = [];
var speed = 1;
var activeItem = null;

//images
const bgImages = {
    dirty:      "url('/ElleHacks26/choreAssets/dirtyKitchen.png')",
    sinkClean:  "url('/ElleHacks26/choreAssets/dirtyTrashCleanSink.png')",
    trashClean: "url('/ElleHacks26/choreAssets/dirtySinkCleanTrash.png')",
    allClean:   "url('/ElleHacks26/choreAssets/allClean.png')"
};

//chores
var chores = [
    { name: "Sink",  id: "sink",  x: 408, y: 240, cleaned: false },
    { name: "Trash", id: "trash", x: 664, y: 352, cleaned: false }
];

//penny
function updateStatsBoard() {
    const raw = localStorage.getItem("finalBalances");
    const balances = raw ? JSON.parse(raw) : { wallet: 0, spendings: 0, savings: 0, rainyDay: 0 };
    
    const goalName = localStorage.getItem("targetGoal") || "Prize";
    const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;
    const amountNeeded = Math.max(0, targetPrice - balances.savings);

    if(document.getElementById("stat-wallet")) {
         document.getElementById("stat-wallet").innerText = balances.wallet;
         document.getElementById("stat-goal-name").innerText = goalName;
         document.getElementById("stat-needed").innerText = amountNeeded;
         document.getElementById("stat-spendings").innerText = balances.spendings;
         document.getElementById("stat-savings").innerText = balances.savings;
         document.getElementById("stat-rainyDay").innerText = balances.rainyDay;
    }
}

function getWalletBalance() {
    const raw = localStorage.getItem("finalBalances");
    const data = raw ? JSON.parse(raw) : { wallet: 50 }; 
    return parseInt(data.wallet) || 0;
}

async function triggerPennyReward() {
    const previousMoney = getWalletBalance();
    const rewardAmount = 10;
    const newTotal = previousMoney + rewardAmount;

    const chatWin = document.getElementById("penny-chat-window");
    chatWin.classList.remove("chat-hidden");

    addMessage(`Good job!`, "penny-msg");
    addMessage(`You had $${previousMoney} in your wallet.`, "penny-msg");
    addMessage(`You just earned $${rewardAmount}!`, "penny-msg");
    addMessage(`How much money do you have now?`, "penny-msg");

    const currentData = JSON.parse(localStorage.getItem("finalBalances")) || { wallet: 0, spendings:0, savings:0, rainyDay:0 };
    currentData.wallet = newTotal;
    localStorage.setItem("finalBalances", JSON.stringify(currentData));
    
    updateStatsBoard();
}

window.sendToGemini = async function() {
    const inputField = document.getElementById("user-query");
    const userText = inputField.value.trim();
    if (!userText) return;

    addMessage(userText, "user-msg");
    inputField.value = "";

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `You are Penny the Piggy Bank. 
        The user just earned money. 
        User said: "${userText}". 
        If they did the math right (Previous + 10), congratulate them warmly! 
        If they got it wrong, gently help them fix it. Keep it short.`;
        
        const result = await model.generateContent(prompt);
        addMessage(result.response.text(), "penny-msg");
    } catch (e) {
        addMessage("Oink! I can't hear you right now. But great job!", "penny-msg");
    }
};

function addMessage(text, className) {
    const box = document.getElementById("chat-messages");
    box.innerHTML += `<p class="${className}">${text}</p>`;
    box.scrollTop = box.scrollHeight;
}

window.togglePennyChat = function() {
    const win = document.getElementById("penny-chat-window");
    win.classList.toggle("chat-hidden");
}

function updateMapBackground() {
   var sinkState = chores.find(c => c.id === "sink").cleaned;
   var trashState = chores.find(c => c.id === "trash").cleaned;

   if (sinkState && trashState) {
       map.style.backgroundImage = bgImages.allClean;
       
       var successModal = document.getElementById("success-modal");
       successModal.classList.remove("hidden");
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
     var pixelSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size'));
     activeItem = null;
     var foundAny = false;
     chores.forEach(chore => {
         if (chore.cleaned) return; 
         var targetGameX = chore.x / pixelSize;
         var targetGameY = chore.y / pixelSize;
         var dist = Math.sqrt(Math.pow(x - targetGameX, 2) + Math.pow(y - targetGameY, 2));
         if (dist < 15) { activeItem = chore; foundAny = true; }
     });
     if (foundAny && cleanPrompt) {
        cleanPrompt.innerHTML = `Press <b>E</b> to clean ${activeItem.name} (+5$)`;
        cleanPrompt.classList.remove("hidden");
     } else if (cleanPrompt) {
        cleanPrompt.classList.add("hidden");
     }
}

const placeCharacter = () => {
     var pixelSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size'));
     const held_direction = held_directions[0];
     if (held_direction) {
        if (held_direction === directions.right) {x += speed;}
        if (held_direction === directions.left) {x -= speed;}
        if (held_direction === directions.down) {y += speed;}
        if (held_direction === directions.up) {y -= speed;}
        character.setAttribute("facing", held_direction);
     }
     character.setAttribute("walking", held_direction ? "true" : "false");
     
     var leftLimit = -8; var rightLimit = (16 * 20) + 8; 
     var topLimit = -8 + 32; var bottomLimit = (16 * 20);    
     if (x < leftLimit) { x = leftLimit; }
     if (x > rightLimit) { x = rightLimit; }
     if (y < topLimit) { y = topLimit; }
     if (y > bottomLimit) { y = bottomLimit; }
     
     var camera_left = pixelSize * 66; var camera_top = pixelSize * 42;
     map.style.transform = `translate3d( ${-x*pixelSize+camera_left}px, ${-y*pixelSize+camera_top}px, 0 )`;
     character.style.transform = `translate3d( ${x*pixelSize}px, ${y*pixelSize}px, 0 )`;  
}

const step = () => { placeCharacter(); checkProximity(); window.requestAnimationFrame(step); }

// Initialize
updateStatsBoard(); // Load stats on start
step(); 

// CONTROLS
document.addEventListener("keydown", (e) => {
     if (activeItem && !cleanPrompt.classList.contains("hidden") && (e.code === "KeyE" || e.key === "e")) {
        activeItem.cleaned = true;
        updateMapBackground();
        cleanPrompt.classList.add("hidden");
        alert("You gained $5 for cleaning!");
     }
});

const directions = { up: "up", down: "down", left: "left", right: "right" }
const keys = { 38: directions.up, 37: directions.left, 39: directions.right, 40: directions.down }
document.addEventListener("keydown", (e) => {
     var dir = keys[e.which];
     if (dir && held_directions.indexOf(dir) === -1) held_directions.unshift(dir);
})
document.addEventListener("keyup", (e) => {
     var dir = keys[e.which];
     var index = held_directions.indexOf(dir);
     if (index > -1) held_directions.splice(index, 1);
});

// D-PAD Controls
var isPressed = false;
const removePressedAll = () => {
   document.querySelectorAll(".dpad-button").forEach(d => {
      d.classList.remove("pressed")
   })
}
document.body.addEventListener("mousedown", () => { isPressed = true; })
document.body.addEventListener("mouseup", () => { isPressed = false; held_directions = []; removePressedAll(); })
const handleDpadPress = (direction, click) => {   
   if (click) { isPressed = true; }
   held_directions = (isPressed) ? [direction] : []
   if (isPressed) {
      removePressedAll();
      document.querySelector(".dpad-"+direction).classList.add("pressed");
   }
}
document.querySelector(".dpad-left").addEventListener("mousedown", (e) => handleDpadPress(directions.left, true));
document.querySelector(".dpad-up").addEventListener("mousedown", (e) => handleDpadPress(directions.up, true));
document.querySelector(".dpad-right").addEventListener("mousedown", (e) => handleDpadPress(directions.right, true));
document.querySelector(".dpad-down").addEventListener("mousedown", (e) => handleDpadPress(directions.down, true));