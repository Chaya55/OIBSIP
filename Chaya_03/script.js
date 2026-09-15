const passwordEl = document.getElementById("password");
const lengthEl = document.getElementById("length");
const lengthValue = document.getElementById("lengthValue");
const uppercaseEl = document.getElementById("uppercase");
const lowercaseEl = document.getElementById("lowercase");
const numbersEl = document.getElementById("numbers");
const symbolsEl = document.getElementById("symbols");
const strengthText = document.getElementById("strengthText");
const meterBar = document.getElementById("meterBar");
const statusEl = document.getElementById("status");

const sets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?"
};

function randomInt(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function generatePassword() {
  const selected = [];
  if (uppercaseEl.checked) selected.push(sets.uppercase);
  if (lowercaseEl.checked) selected.push(sets.lowercase);
  if (numbersEl.checked) selected.push(sets.numbers);
  if (symbolsEl.checked) selected.push(sets.symbols);

  if (!selected.length) {
    passwordEl.value = "";
    statusEl.textContent = "Select at least one character type.";
    updateStrength(0);
    return;
  }

  const length = Number(lengthEl.value);
  let chars = selected.map(set => set[randomInt(set.length)]);

  const all = selected.join("");
  while (chars.length < length) chars.push(all[randomInt(all.length)]);

  // Fisher-Yates shuffle using crypto randomness.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  passwordEl.value = chars.join("");
  statusEl.textContent = "";
  updateStrength(length);
}

function updateStrength(length) {
  const types = [uppercaseEl, lowercaseEl, numbersEl, symbolsEl].filter(x => x.checked).length;
  const score = length * types;

  let label = "Weak";
  if (score >= 40) label = "Medium";
  if (score >= 70) label = "Strong";
  if (score >= 110) label = "Very Strong";

  const percent = Math.min(100, Math.max(8, score / 1.1));
  strengthText.textContent = label;
  meterBar.style.width = percent + "%";
  strengthText.style.color =
    label === "Weak" ? "#f87171" :
    label === "Medium" ? "#facc15" : "#4ade80";
  meterBar.style.background =
    label === "Weak" ? "#f87171" :
    label === "Medium" ? "#facc15" : "#4ade80";
}

document.getElementById("generateBtn").addEventListener("click", generatePassword);
document.getElementById("copyBtn").addEventListener("click", async () => {
  if (!passwordEl.value) return;
  try {
    await navigator.clipboard.writeText(passwordEl.value);
    statusEl.textContent = "Password copied to clipboard.";
  } catch {
    passwordEl.select();
    document.execCommand("copy");
    statusEl.textContent = "Password copied.";
  }
});

lengthEl.addEventListener("input", () => {
  lengthValue.textContent = lengthEl.value;
  generatePassword();
});
[uppercaseEl, lowercaseEl, numbersEl, symbolsEl].forEach(el =>
  el.addEventListener("change", generatePassword)
);

generatePassword();
