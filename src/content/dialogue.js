// Dialogue content and selection - no DOM. Two speakers comment on the battle:
// "ai" is your own intrusion-detection daemon (friendly, purple); "malware" is
// the hostile process trying to find your password (taunting, red).

const FACES = {
  ai: {
    neutral: "<| ᵔᵕᵔ|>",
    happy: "<| ᵔᗜᵔ|>",
    worried: "<| °ᗝ°|>",
    win: "<| *ᗜ*|>",
    lose: "<| ㅠᗝㅠ|>",
  },
  malware: {
    neutral: "<|x_x |>",
    happy: "<|▲‸▲ |>",
    worried: "<|¿_¿ |>",
    win: "<|ᛕᗜᛕ |>",
    lose: "<|×‸× |>",
  },
};

// a short scripted briefing, typed out once when the page loads, explaining
// the premise before the player ever touches the menu
const LORE = [
  "SYSTEM ALERT: unauthorized process detected on this network.",
  "Codename: MALWARE. Objective: extract your root password.",
  "You have one advantage - it doesn't know exactly where you are yet.",
  "Deploy your defenses. Find it before it finds you.",
  "Good luck, Operator. The network is counting on you.",
];

const LINES = {
  ai: {
    intro: [
      "Deploying your firewall grid. Place your defenses, Operator.",
      "Set up your nodes. I'll flag anything that looks like a weak spot.",
      "Arrange your defenses carefully - it only needs one gap.",
      "Building your perimeter now. Take your time with this part.",
    ],
    battleStart: [
      "Intrusion detected. Let's find it before it finds you.",
      "Scan initiated. Every cell you clear brings us closer.",
      "It's in the network somewhere. Let's flush it out.",
    ],
    hit: [
      "Contact! We clipped one of its processes.",
      "Direct hit - it's bleeding packets.",
      "Got it. That's one less thread to worry about.",
      "Nice shot. Its signature just spiked.",
      "Confirmed hit. I'm marking that sector red.",
      "That's damage. Keep pressing that cluster.",
    ],
    sunk: [
      "Process terminated. One thread down.",
      "That one's fully quarantined. Nice work.",
      "Clean kill. Its footprint just shrank.",
      "Node fully purged. Onto the next one.",
      "That cluster's dead. No more traffic from it.",
    ],
    miss: [
      "No response from that address. Try another sector.",
      "Clean ping, nothing there.",
      "Dead end. It's hiding somewhere else.",
      "Negative contact. Adjusting the scan radius.",
      "Empty node. It can't hide forever.",
      "Nothing there. Let's narrow the search.",
    ],
    win: [
      "All hostile processes purged. System secure, Operator.",
      "Network's clean. You did it.",
      "Threat eliminated. Great work out there.",
    ],
    lose: [
      "It got through. Rebooting defenses for next time.",
      "We lost this round. I'm logging everything it did.",
      "Compromised. I'm sorry, Operator - I should've caught that.",
    ],
    face: {
      hit: "happy",
      sunk: "happy",
      miss: "worried",
      win: "win",
      lose: "lose",
    },
  },
  malware: {
    battleStart: [
      "I already know where you're weak. This won't take long.",
      "Scanning your defenses now. I always find a way in.",
      "Let's see how long you can keep me out.",
    ],
    hit: [
      "Firewall breached. I'm getting closer to your password.",
      "That's a vulnerability. Logging it.",
      "Ha. Found you.",
      "Weak spot confirmed. Digging in further.",
      "Contact. Your defenses aren't as solid as you think.",
      "Got a foothold. This is going well for me.",
    ],
    sunk: [
      "Node fully compromised. On to the next.",
      "That sector's mine now.",
      "Another one down. You're running out of cover.",
      "Fully breached. That was barely a challenge.",
      "Consumed. I'll remember this location.",
    ],
    miss: [
      "...nothing there. Recalibrating.",
      "Missed. You got lucky, Operator.",
      "Empty address. Rerouting scan.",
      "No signal. I'll try somewhere else.",
      "Dead node. Doesn't matter, I have time.",
      "Nothing of value here. Moving on.",
    ],
    win: [
      "Access granted. Your password is mine now.",
      "Defenses breached. This was almost too easy.",
      "System compromised. Thanks for playing, Operator.",
    ],
    lose: [
      "Impossible. Purging myself before you trace this session...",
      "Not... possible. How did you find me that fast?",
      "Fine. Take your network back. For now.",
    ],
    face: {
      hit: "happy",
      sunk: "happy",
      miss: "worried",
      win: "win",
      lose: "lose",
    },
  },
};

const QUIET_LINE = "...";

// picks a random line from an array, avoiding immediate repeats of `previous`
function pickLine(lines, previous) {
  if (lines.length === 1) return lines[0];
  let next = previous;
  while (next === previous) {
    next = lines[Math.floor(Math.random() * lines.length)];
  }
  return next;
}

// returns { text, face } for a speaker+category, or the quiet line if the
// speaker has nothing to say for that category (e.g. malware during placement)
function getDialogue(speaker, category, previous) {
  const entry = LINES[speaker][category];
  if (!entry) {
    return { text: QUIET_LINE, face: FACES[speaker].neutral };
  }
  const text = Array.isArray(entry) ? pickLine(entry, previous) : entry;
  const faceKey = LINES[speaker].face?.[category] ?? "neutral";
  return { text, face: FACES[speaker][faceKey] };
}

export { getDialogue, QUIET_LINE, FACES, LORE };
