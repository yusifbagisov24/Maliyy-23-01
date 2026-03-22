const puzzle = [
    [5,3,0,0,7,0,0,0,0], [6,0,0,1,9,5,0,0,0], [0,9,8,0,0,0,0,6,0],
    [8,0,0,0,6,0,0,0,3], [4,0,0,8,0,3,0,0,1], [7,0,0,0,2,0,0,0,6],
    [0,6,0,0,0,0,2,8,0], [0,0,0,4,1,9,0,0,5], [0,0,0,0,8,0,0,7,9]
];

const solution = [
    [5,3,4,6,7,8,9,1,2], [6,7,2,1,9,5,3,4,8], [1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3], [4,2,6,8,5,3,7,9,1], [7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4], [2,8,7,4,1,9,6,3,5], [3,4,5,2,8,6,1,7,9]
];

let currentRoom = null;
let seconds = 0;
let timer = null;
let score = 0;
let consecutiveErrors = 0;

function joinRoom() {
    const roomName = document.getElementById("roomInput").value;
    if (!roomName) return alert("Otaq adı daxil edin!");
    currentRoom = roomName;
    alert(currentRoom + " otağına qoşuldunuz!");

    // Otaqdakı hərəkətləri dinləməyə başla
    db.ref('rooms/' + currentRoom + '/moves').on('child_added', (snapshot) => {
        const move = snapshot.val();
        const cells = document.querySelectorAll(".cell");
        const index = move.r * 9 + move.c;
        const input = cells[index];
        
        if (input.value != move.val) {
            input.value = move.val;
            checkCell(input, move.r, move.c, false); // Rəqibin gedişinə görə sənə cərimə yazılmasın
        }
    });
}

function createBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    for(let r=0; r<9; r++) {
        for(let c=0; c<9; c++) {
            const input = document.createElement("input");
            input.classList.add("cell");
            input.type = "number";
            input.oninput = function() { if (this.value.length > 1) this.value = this.value.slice(0, 1); };

            if(puzzle[r][c] !== 0) {
                input.value = puzzle[r][c];
                input.disabled = true;
                input.classList.add("fixed");
            } else {
                input.addEventListener("input", (e) => {
                    const val = e.target.value;
                    checkCell(e.target, r, c, true);
                    if (currentRoom && val) {
                        db.ref('rooms/' + currentRoom + '/moves').push({ r, c, val });
                    }
                });
            }
            input.addEventListener("focus", () => highlight(r, c));
            board.appendChild(input);
        }
    }
}

function checkCell(input, r, c, isLocal) {
    const val = parseInt(input.value);
    input.classList.remove("correct", "wrong");
    if (!val) return;

    if (val === solution[r][c]) {
        input.classList.add("correct");
        if(isLocal) { consecutiveErrors = 0; updateScore(10); }
    } else {
        input.classList.add("wrong");
        if(isLocal) {
            consecutiveErrors++;
            let penalty = consecutiveErrors >= 2 ? -100 : -50;
            updateScore(penalty);
        }
    }
}

function updateScore(amount) {
    score += amount;
    document.getElementById("score-display").innerText = "Xal: " + score;
}

function highlight(row, col) {
    const cells = document.querySelectorAll(".cell");
    cells.forEach((cell, i) => {
        const r = Math.floor(i/9);
        const c = i%9;
        cell.style.background = (r === row || c === col) ? "#e8f0fe" : "white";
        if(cell.classList.contains("fixed") && (r === row || col === c)) cell.style.background = "#d1d9e6";
    });
}

function startTimer() {
    if(timer) clearInterval(timer);
    timer = setInterval(() => {
        seconds++;
        document.getElementById("timer").innerText = "Vaxt: " + seconds + " s";
    }, 1000);
}

function restartGame() {
    seconds = 0; score = 0; consecutiveErrors = 0;
    document.getElementById("score-display").innerText = "Xal: 0";
    createBoard();
    startTimer();
}

function checkWin() {
    const cells = document.querySelectorAll(".cell");
    let win = true;
    cells.forEach((cell, i) => {
        const r = Math.floor(i/9);
        const c = i%9;
        if (parseInt(cell.value) !== solution[r][c]) win = false;
    });
    if (win) { clearInterval(timer); alert("🎉 Təbriklər!"); }
    else alert("Hələ səhvlər var.");
}

createBoard();
startTimer();