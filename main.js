import { GoogleGenerativeAI } from "@google/generative-ai";
import { updateUI, getBalances, saveBalances } from "./state.js";

const API_KEY = "AIzaSyB1YTvKeTmc41vfRze1XAiyvRHPn5FhCm8";
const genAI = new GoogleGenerativeAI(API_KEY);

const UMBRELLA_COST = 10;

// Check for rainy day event (1/3 chance)
function checkRainyDay() {
  const randomChance = Math.random(); // 0 to 1
  return randomChance < 0.33; // 1/3 chance = 33%
}

// Handle rainy day event with AI
async function handleRainyDay() {
  let balances = getBalances();
  const age = localStorage.getItem("playerAge") || "7";

  const win = document.getElementById("penny-chat-window");
  if (win) win.classList.remove("chat-hidden");

  addMessage(
    "☔ Oh no! You walked back to the Hub and got caught in the rain! You need to buy an umbrella for $10. 🌧️",
    "penny-msg",
  );

  let situation = "";
  let usedFromRainyDay = 0;
  let usedFromSavings = 0;
  let usedFromSpendings = 0;
  let debtAmount = 0;

  if (balances.rainyDay >= UMBRELLA_COST) {
    //full coverage from Rainy Day fund
    situation = "full_coverage";
    balances.rainyDay -= UMBRELLA_COST;
    usedFromRainyDay = UMBRELLA_COST;
    saveBalances(balances);
    updateUI();
  } else {
    // Not enough in rainy day fund
    let remaining = UMBRELLA_COST - balances.rainyDay;
    usedFromRainyDay = balances.rainyDay;
    balances.rainyDay = 0; 

    // Double cost when taking from savings (penalty for no rainy day fund)
    remaining = remaining * 2;

    if (balances.savings >= remaining) {
      situation = "rainy_and_savings";
      usedFromSavings = remaining;
      balances.savings -= remaining;
      saveBalances(balances);
      updateUI();
    } else {
      usedFromSavings = balances.savings;
      remaining -= balances.savings;
      balances.savings = 0;

      if (balances.spendings >= remaining) {
        //All three accounts (no debt)
        situation = "all_three_accounts";
        usedFromSpendings = remaining;
        balances.spendings -= remaining;
        saveBalances(balances);
        updateUI();
      } else {
        //Not enough anywhere then go into debt
        situation = "debt";
        usedFromSpendings = balances.spendings;
        remaining -= balances.spendings;
        balances.spendings = 0;
        balances.savings = -remaining; 
        debtAmount = remaining;

        saveBalances(balances);
        updateUI();
      }
    }
  }

  //AI explanation based on situation
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: `You are Penny, a friendly piggy bank assistant teaching a ${age} year old about financial responsibility.

SITUATION: They just had to buy an umbrella for $${UMBRELLA_COST} due to unexpected rain.

WHAT HAPPENED:
${
  situation === "full_coverage"
    ? `- Paid $${usedFromRainyDay} from Rainy Day fund
- Still have $${balances.rainyDay} left in Rainy Day
- Didn't touch Savings ($${balances.savings}) or Spendings ($${balances.spendings})`
    : ""
}${
        situation === "rainy_and_savings"
          ? `- Used $${usedFromRainyDay} from Rainy Day (now $0)
- Had to take $${usedFromSavings} from Savings (DOUBLED as penalty!)
- Now have $${balances.savings} in Savings
- This affected their goal savings!
- They paid DOUBLE because they didn't have enough in Rainy Day!`
          : ""
      }${
        situation === "all_three_accounts"
          ? `- Used $${usedFromRainyDay} from Rainy Day (now $0)
- Used $${usedFromSavings} from Savings (now $0) - DOUBLED penalty applied!
- Had to use $${usedFromSpendings} from Spendings
- Now have $${balances.spendings} in Spendings
- They paid DOUBLE because they didn't have enough in Rainy Day!`
          : ""
      }${
        situation === "debt"
          ? `- Used $${usedFromRainyDay} from Rainy Day (now $0)
- Used $${usedFromSavings} from Savings (now $0)
- Used $${usedFromSpendings} from Spendings (now $0)
- Still owed $${debtAmount} - now in DEBT!
- Savings is now -$${debtAmount}
- They paid DOUBLE because they didn't have enough in Rainy Day!`
          : ""
      }

YOUR RESPONSE (based on age ${age}):
${situation === "full_coverage" ? "Celebrate! Explain why having a Rainy Day fund is AWESOME - they didn't have to touch their savings or spendings! This is exactly why we save for emergencies. Make them feel proud and smart!" : ""}${situation === "rainy_and_savings" ? "Explain that because they didn't have enough in Rainy Day, they had to pay DOUBLE from their Savings! This is a big lesson about why emergency funds are SO important. Encourage them to build it back up. Keep it age-appropriate but make the lesson clear." : ""}${situation === "all_three_accounts" ? "This is a major teaching moment! They had to pay DOUBLE and use ALL their money because their Rainy Day fund was empty. Explain why having enough in Rainy Day would have saved them money and protected their other accounts. Encourage them to rebuild the Rainy Day fund FIRST." : ""}${situation === "debt" ? "Explain debt in SIMPLE terms for a ${age} year old: When you owe money, you have to pay it back before you can save again. It's like having a negative score in a game. They also paid DOUBLE because they didn't have emergency savings! Explain they need to earn money to get back to $0, THEN they can save again. Make it serious but not scary - focus on the lesson and how to fix it." : ""}

Keep response 2-4 sentences. Be encouraging but teach the lesson clearly. EMPHASIZE the doubling penalty if they didn't have rainy day funds. Use emojis appropriate for a ${age} year old.`,
    });

    const result = await model.generateContent(
      `Explain what just happened with the umbrella purchase based on their situation.`,
    );

    addMessage(result.response.text(), "penny-msg");
  } catch (error) {
    console.error("AI Error in rainy day:", error);
    if (situation === "full_coverage") {
      addMessage(
        `Great job! You used your Rainy Day fund to buy the umbrella. You now have $${balances.rainyDay} left in your Rainy Day fund. This is exactly why we save for unexpected expenses! 🐷💪`,
        "penny-msg",
      );
    } else if (situation === "rainy_and_savings") {
      addMessage(
        `Uh oh! You only had $${usedFromRainyDay} in your Rainy Day fund, so we had to take $${usedFromSavings} from your Savings to buy the umbrella - and it DOUBLED as a penalty! 😟`,
        "penny-msg",
      );
      addMessage(
        `This is why it's SO important to save for rainy days! Without emergency savings, things cost you MORE! Let's make sure to put money in your Rainy Day fund next time! 🐷💡`,
        "penny-msg",
      );
    } else if (situation === "all_three_accounts") {
      addMessage(
        `Uh oh! You only had $${usedFromRainyDay} in Rainy Day, so you had to pay DOUBLE! We took $${usedFromSavings} from Savings and $${usedFromSpendings} from Spendings! 😟`,
        "penny-msg",
      );
      addMessage(
        `This is why emergency savings are SO important! Without a Rainy Day fund, emergencies cost you DOUBLE. Let's rebuild that fund! 🐷💡`,
        "penny-msg",
      );
    } else if (situation === "debt") {
      addMessage(
        `Oh no! You didn't have enough in Rainy Day, so it DOUBLED! We used everything from all accounts and you still owe $${debtAmount}! 😢`,
        "penny-msg",
      );
      addMessage(
        `Your Savings is now -$${debtAmount}. You'll need to earn money to pay this back before you can save for your goal again! This is why saving for emergencies is SO important! 🐷💡`,
        "penny-msg",
      );
    }
  }
}

function addMessage(text, className) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) {
    return;
  }
  chatMessages.style.whiteSpace = "pre-line";
  chatMessages.innerHTML += `<p class="${className}">${text}</p>`;
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

window.sendToGemini = async function () {
  const inputField = document.getElementById("user-query");
  const userText = inputField.value.trim();

  if (!userText) return;

  addMessage(userText, "user-msg");
  inputField.value = "";

  try {
    const age = localStorage.getItem("playerAge") || "7";
    const balances = getBalances();
    const goalName = localStorage.getItem("targetGoal") || "your goal";
    const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: `You are Penny, a friendly piggy bank assistant helping a ${age} year old save for ${goalName} (costs $${targetPrice}). 
      Current balances: Spendings $${balances.spendings}, Savings $${balances.savings}, Rainy Day $${balances.rainyDay}.
      Give short, encouraging financial advice for kids. Keep responses under 3 sentences.`,
    });

    const result = await model.generateContent(userText);
    addMessage(result.response.text(), "penny-msg");
  } catch (error) {
    addMessage("Oops! I lost my voice for a moment! 🐷", "penny-msg");
  }
};

async function initMainHub() {
  try {
    const win = document.getElementById("penny-chat-window");

    if (win) {
      win.classList.remove("chat-hidden");
    }

    const goalName = localStorage.getItem("targetGoal") || "your goal";
    const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;
    const balances = getBalances();
    const amountNeeded = Math.max(0, targetPrice - balances.savings);

    updateUI();

    //check for rainy day BEFORE welcome message
    if (checkRainyDay()) {
      await handleRainyDay(); // Wait for rainy day to complete
      // small delay before showing welcome message
      setTimeout(() => {
        addMessage(
          `Now that that's taken care of... Welcome back to the Hub! You still need $${amountNeeded} for your ${goalName}! 💭`,
          "penny-msg",
        );
      }, 2000);
    } else {
      // normal welcome
      addMessage(
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
