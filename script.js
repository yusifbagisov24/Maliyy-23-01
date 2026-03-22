let puzzle = [];
let solution = [];
let timer = null;
let seconds = 0;
let isPaused = false;
let currentDifficulty = 'easy';
let score = 0;
let consecutiveErrors = 0;

let completedRows = new Set();
let completedCols = new Set();

const boardElement = document.getElementById("board");
const scoreDisplay = document.getElementById("current-score");

function startGame(level) {
    currentDifficulty = level;
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    restartGame();
}

function backToMenu() {
    clearInterval(timer);
    document.getElementById("game-screen").classList.add("hidden");
    document.getElementById("start-screen").classList.remove("hidden");
}

function generateSudoku() {
    let mat = Array.from({ length: 9 }, () => Array(9).fill(0));
    for (let i = 0; i < 9; i += 3) fillBox(mat, i, i);
    solveSudoku(mat);
    solution = mat.map(row => [...row]);
    
    let tempPuzzle = mat.map(row => [...row]);
    let removeCount = currentDifficulty === 'easy' ? 35 : currentDifficulty === 'medium' ? 48 : 58;

    while (removeCount > 0) {
        let i = Math.floor(Math.random() * 9), j = Math.floor(Math.random() * 9);
        if (tempPuzzle[i][j] !== 0) { tempPuzzle[i][j] = 0; removeCount--; }
    }
    puzzle = tempPuzzle;
}

function fillBox(mat, row, col) {
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            let num;
            do { num = Math.floor(Math.random() * 9) + 1; } while (!isSafe(mat, row, col, num));
            mat[row + i][col + j] = num;
        }
    }
}

function isSafe(mat, row, col, num) {
    for (let x = 0; x < 9; x++) if (mat[row][x] === num || mat[x][col] === num) return false;
    let sR = row - row % 3, sC = col - col % 3;
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) if (mat[sR + i][sC + j] === num) return false;
    return true;
}

function solveSudoku(mat) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (mat[r][c] === 0) {
                for (let n = 1; n <= 9; n++) {
                    if (isSafe(mat, r, c, n)) {
                        mat[r][c] = n;
                        if (solveSudoku(mat)) return true;
                        mat[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function createBoard() {
    boardElement.innerHTML = "";
    generateSudoku();
    score = 0;
    consecutiveErrors = 0;
    scoreDisplay.innerText = score;
    completedRows.clear(); completedCols.clear();

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const input = document.createElement("input");
            input.type = "number";
            input.classList.add("cell");
            input.dataset.row = r;
            input.dataset.col = c;

            if (puzzle[r][c] !== 0) {
                input.value = puzzle[r][c];
                input.readOnly = true;
                input.classList.add("fixed");
            }

            input.addEventListener("focus", () => highlightRelated(r, c));
            input.addEventListener("input", (e) => {
                if(e.target.value.length > 1) e.target.value = e.target.value.slice(0,1);
                handleInput(e.target, r, c);
            });

            boardElement.appendChild(input);
        }
    }
    createNumberPanel();
}

function highlightRelated(row, col) {
    document.querySelectorAll(".cell").forEach(cell => {
        cell.classList.remove("highlighted");
        if (cell.dataset.row == row || cell.dataset.col == col) cell.classList.add("highlighted");
    });
}

function handleInput(input, r, c) {
    const val = parseInt(input.value);
    input.classList.remove("correct", "wrong");

    if (!val) return;

    if (val === solution[r][c]) {
        input.classList.add("correct");
        consecutiveErrors = 0;
        addScore(15);
        checkBonuses(r, c);
    } else {
        input.classList.add("wrong");
        consecutiveErrors++;
        let penalty = consecutiveErrors >= 2 ? -100 : -50;
        addScore(penalty);
    }
    updateNumberPanel();
}

function addScore(pts) {
    score += pts;
    scoreDisplay.innerText = score;
    scoreDisplay.style.color = pts > 0 ? "var(--success)" : "var(--danger)";
    scoreDisplay.style.transform = "scale(1.2)";
    setTimeout(() => {
        scoreDisplay.style.color = "white";
        scoreDisplay.style.transform = "scale(1)";
    }, 400);
}

function checkBonuses(r, c) {
    const cells = Array.from(document.querySelectorAll(".cell"));
    const grid = Array.from({length: 9}, () => []);
    cells.forEach(cell => grid[cell.dataset.row][cell.dataset.col] = parseInt(cell.value) || 0);

    if (!completedRows.has(r) && grid[r].every((v, i) => v === solution[r][i])) {
        addScore(100); completedRows.add(r);
    }
    let colValues = grid.map(row => row[c]);
    if (!completedCols.has(c) && colValues.every((v, i) => v === solution[i][c])) {
        addScore(100); completedCols.add(c);
    }
}

function updateNumberPanel() {
    const counts = Array(10).fill(0);
    document.querySelectorAll(".cell").forEach(cell => {
        const val = parseInt(cell.value);
        if (val && val === solution[cell.dataset.row][cell.dataset.col]) counts[val]++;
    });
    for (let i = 1; i <= 9; i++) {
        const btn = document.getElementById("num-" + i);
        if(btn) btn.classList.toggle("completed", counts[i] === 9);
    }
}

function createNumberPanel() {
    const panel = document.getElementById("number-panel");
    panel.innerHTML = "";
    for (let i = 1; i <= 9; i++) {
        const div = document.createElement("div");
        div.className = "num-btn";
        div.id = "num-" + i;
        div.innerText = i;
        panel.appendChild(div);
    }
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById("pause-overlay").classList.toggle("hidden", !isPaused);
    document.getElementById("pause-btn").innerText = isPaused ? "Davam Et" : "Durdur";
}

function startTimer() {
    if(timer) clearInterval(timer);
    seconds = 0;
    timer = setInterval(() => {
        if(!isPaused) {
            seconds++;
            let m = Math.floor(seconds/60).toString().padStart(2,'0');
            let s = (seconds%60).toString().padStart(2,'0');
            document.getElementById("timer").innerText = `${m}:${s}`;
        }
    }, 1000);
}

function restartGame() {
    createBoard();
    startTimer();
}

function checkWin() {
    let cells = document.querySelectorAll(".cell");
    let win = Array.from(cells).every(c => parseInt(c.value) === solution[c.dataset.row][c.dataset.col]);
    if (win) {
        addScore(1000);
        alert("Təbriklər! Final Xalınız: " + score);
        backToMenu();
    } else {
        alert("Tamamlanmayıb.");
    }
}