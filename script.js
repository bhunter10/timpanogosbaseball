// === Baseball Schedule Hub ===

// Load existing games from localStorage
let games = JSON.parse(localStorage.getItem("games")) || [];

// === DOM elements ===
const form = document.getElementById("gameForm");
const scheduleList = document.getElementById("scheduleList");

// === Display all games ===
function renderSchedule() {
  scheduleList.innerHTML = "";
  games.forEach((game, index) => {
    const timpanogosScore = parseInt(game.timpanogosScore);
    const opponentScore = parseInt(game.opponentScore);
    const outcome = timpanogosScore > opponentScore ? "W" : "L";

    const li = document.createElement("li");
    li.className = "result-item";
    li.innerHTML = `
      <span class="team-name">Timpanogos Timberwolves</span>
      <span class="score">${timpanogosScore}–${opponentScore}</span>
      <span class="opponent-name">${game.opponent}</span>
      <span class="outcome ${outcome === "W" ? "win" : "loss"}">${outcome}</span>
      <button onclick="editGame(${index})">✏️</button>
      <button onclick="deleteGame(${index})">🗑️</button>
    `;
    scheduleList.appendChild(li);
  });
}

// === Add new game ===
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const opponent = document.getElementById("opponent").value.trim();
  const date = document.getElementById("date").value;
  const timpanogosScore = document.getElementById("timpanogosScore").value;
  const opponentScore = document.getElementById("opponentScore").value;

  if (opponent && date && timpanogosScore !== "" && opponentScore !== "") {
    games.push({ opponent, date, timpanogosScore, opponentScore });
    localStorage.setItem("games", JSON.stringify(games));
    form.reset();
    renderSchedule();
  }
});

// === Edit existing game ===
function editGame(index) {
  const game = games[index];
  const newOpponent = prompt("Edit opponent:", game.opponent);
  const newDate = prompt("Edit date:", game.date);
  const newTimpanogosScore = prompt("Edit Timpanogos score:", game.timpanogosScore);
  const newOpponentScore = prompt("Edit opponent score:", game.opponentScore);

  if (newOpponent && newDate && newTimpanogosScore !== "" && newOpponentScore !== "") {
    games[index] = { 
      opponent: newOpponent, 
      date: newDate, 
      timpanogosScore: newTimpanogosScore, 
      opponentScore: newOpponentScore 
    };
    localStorage.setItem("games", JSON.stringify(games));
    renderSchedule();
  }
}

// === Delete game ===
function deleteGame(index) {
  if (confirm("Are you sure you want to delete this game?")) {
    games.splice(index, 1);
    localStorage.setItem("games", JSON.stringify(games));
    renderSchedule();
  }
}

// === Initial render ===
renderSchedule();