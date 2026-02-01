// state.js
export const STORAGE_KEY = "finalBalances";

export function getBalances() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved
    ? JSON.parse(saved)
    : { wallet: 0, spendings: 0, savings: 0, rainyDay: 0 };
}

export function saveBalances(balances) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
  // Dispatch a custom event so other parts of the page know to update
  window.dispatchEvent(new Event("balanceUpdate"));
}

export function updateUI() {
  const balances = getBalances();
  const goalName = localStorage.getItem("targetGoal") || "Goal";
  const targetPrice = parseInt(localStorage.getItem("targetPrice")) || 0;

  // Unified ID mapping
  const mapping = {
    "stat-wallet": balances.wallet,
    "stat-spendings": balances.spendings,
    "stat-savings": balances.savings,
    "stat-rainyDay": balances.rainyDay,
    "stat-needed": Math.max(0, targetPrice - balances.savings),
    "stat-goal-name": goalName,
  };

  for (const [id, value] of Object.entries(mapping)) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  }
}

window.addTestMoney = function (spendings = 100, savings = 50, rainyDay = 25) {
  let balances = getBalances();
  balances.spendings += spendings;
  balances.savings += savings;
  balances.rainyDay += rainyDay;
  saveBalances(balances);
  updateUI();
  console.log("💰 Added test money!", balances);
};
