import "./styles.css";
import { startSetup, playBriefing } from "./ui/domController.js";
import { initMatrixRain } from "./ui/matrix.js";

initMatrixRain();
playBriefing();

document.getElementById("menu-continue").addEventListener("click", () => {
  const p1Config = {
    name: document.getElementById("p1-name").value || "Player 1",
    isComputer: document.getElementById("p1-computer").checked,
  };
  const p2Config = {
    name: document.getElementById("p2-name").value || "Player 2",
    isComputer: document.getElementById("p2-computer").checked,
  };

  document.getElementById("menu-phase").hidden = true;
  document.getElementById("briefing").hidden = true;
  document.getElementById("companions-row").hidden = false;
  startSetup(p1Config, p2Config);
});
