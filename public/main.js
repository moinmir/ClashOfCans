// ---------- GLOBALS ----------
const COLORS = ['red', 'green', 'blue', 'orange', 'purple', 'yellow', 'pink', 'teal'];
let solution = [];
let currentOrder = [];
let turns = 0;
let selectedNumCans = 5;
let alreadyWon = false;
let lastGameResult = null;

// ---------- DOM ELEMENTS ----------
const cansContainer = document.getElementById('cansContainer');
const numCansRange = document.getElementById('numCansRange');
const rangeValue = document.getElementById('rangeValue');
const checkBtn = document.getElementById('checkBtn');
const resetBtn = document.getElementById('resetBtn');
const nameForm = document.getElementById('nameForm');
const submitNameBtn = document.getElementById('submitNameBtn');
const playerNameInput = document.getElementById('playerName');
const scoreboardList = document.getElementById('scoreboardList');
const turnsStat = document.getElementById('turnsStat');
const correctStat = document.getElementById('correctStat');

// ---------- EVENT LISTENERS ----------
window.addEventListener('DOMContentLoaded', async () => {
  // Initially set rangeValue
  rangeValue.textContent = numCansRange.value;
  selectedNumCans = parseInt(numCansRange.value, 10);

  await startNewGame();
  await fetchAndDisplayScoreboard();
});

// Automatically start a new game whenever the slider changes
numCansRange.addEventListener('input', async (e) => {
  selectedNumCans = parseInt(e.target.value, 10);
  rangeValue.textContent = selectedNumCans;
  await startNewGame();
});

checkBtn.addEventListener('click', () => {
  if (!alreadyWon) checkGuess();
});

resetBtn.addEventListener('click', async () => {
  await startNewGame();
});

submitNameBtn.addEventListener('click', async () => {
  await submitName();
});

// ---------- GAME LOGIC ----------
async function startNewGame() {
  alreadyWon = false;
  lastGameResult = null;
  nameForm.style.display = 'none';
  turns = 0;

  // Generate solution
  const chosenColors = COLORS.slice(0, selectedNumCans);
  solution = shuffleArray(chosenColors);

  // Create an initial arrangement with exactly 1 can in the correct position
  do {
    currentOrder = shuffleArray([...solution]);
  } while (countCorrectPositions(currentOrder, solution) !== 1);

  renderCans(currentOrder);
  updateStats();
}

// Render the cans
function renderCans(order) {
  cansContainer.innerHTML = '';
  order.forEach((color, index) => {
    const can = document.createElement('div');
    can.classList.add('can');
    can.style.color = color;
    can.dataset.index = index;

    // Setup drag & drop
    can.setAttribute('draggable', true);
    can.addEventListener('dragstart', handleDragStart);
    can.addEventListener('dragover', handleDragOver);
    can.addEventListener('drop', handleDrop);
    can.addEventListener('dragend', handleDragEnd);

    cansContainer.appendChild(can);
  });
}

// Check correctness
function checkGuess() {
  turns++;
  const correctCount = countCorrectPositions(currentOrder, solution);

  if (correctCount === selectedNumCans) {
    alreadyWon = true;
    lastGameResult = { canCount: selectedNumCans, turns };
    nameForm.style.display = 'inline-block'; // show name form
  }

  updateStats();
}

// Update stats
function updateStats() {
  turnsStat.textContent = `Turns: ${turns}`;
  const correctCount = countCorrectPositions(currentOrder, solution);
  correctStat.textContent = `Correct: ${correctCount}`;
}

// Count correct positions
function countCorrectPositions(arr1, arr2) {
  let count = 0;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] === arr2[i]) count++;
  }
  return count;
}

// Shuffle array
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- DRAG & DROP ----------
let draggedIndex = null;

function handleDragStart(e) {
  draggedIndex = parseInt(e.target.dataset.index, 10);
  e.target.classList.add('dragging');
}
function handleDragOver(e) {
  e.preventDefault();
}
function handleDrop(e) {
  e.preventDefault();
  const target = e.target;
  if (!target.classList.contains('can')) return;
  const targetIndex = parseInt(target.dataset.index, 10);
  if (targetIndex !== draggedIndex) {
    swapPositions(currentOrder, draggedIndex, targetIndex);
    renderCans(currentOrder);
  }
}
function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  draggedIndex = null;
}
function swapPositions(arr, i, j) {
  [arr[i], arr[j]] = [arr[j], arr[i]];
  draggedIndex = j;
}

// ---------- SCOREBOARD ----------
async function fetchAndDisplayScoreboard() {
  try {
    const resp = await fetch('/api/scores');
    if (!resp.ok) return;
    const data = await resp.json();
    displayScoreboard(data);
  } catch (err) {
    console.error('Error fetching scoreboard:', err);
  }
}
function displayScoreboard(scoreboardData) {
  scoreboardList.innerHTML = '';
  const table = document.createElement('table');

  const sortedKeys = Object.keys(scoreboardData).sort((a, b) => +a - +b);
  sortedKeys.forEach(canCountKey => {
    const scores = scoreboardData[canCountKey];
    if (scores.length > 0) {
      const headerRow = document.createElement('tr');
      const headerCell = document.createElement('th');
      headerCell.colSpan = 3;
      headerCell.textContent = `Cans: ${canCountKey}`;
      headerRow.appendChild(headerCell);
      table.appendChild(headerRow);

      scores.sort((a, b) => a.turns - b.turns);
      scores.forEach((entry, idx) => {
        const row = document.createElement('tr');
        const rankCell = document.createElement('td');
        rankCell.textContent = idx + 1;
        const nameCell = document.createElement('td');
        nameCell.textContent = entry.name;
        const turnsCell = document.createElement('td');
        turnsCell.textContent = entry.turns;
        row.appendChild(rankCell);
        row.appendChild(nameCell);
        row.appendChild(turnsCell);
        table.appendChild(row);
      });
    }
  });

  scoreboardList.appendChild(table);
}

// ---------- NAME SUBMISSION ----------
async function submitName() {
  if (!lastGameResult) return;
  const playerName = playerNameInput.value.trim();
  if (playerName.length < 1 || playerName.length > 15) {
    alert('Invalid name. Must be 1–15 characters.');
    return;
  }
  const { canCount, turns } = lastGameResult;
  const bodyData = { canCount, turns, name: playerName };

  try {
    const resp = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    if (resp.ok) {
      nameForm.style.display = 'none';
      playerNameInput.value = '';
      await fetchAndDisplayScoreboard();
    } else {
      alert('Error submitting score.');
    }
  } catch (err) {
    console.error('Error submitting score:', err);
  }
}
