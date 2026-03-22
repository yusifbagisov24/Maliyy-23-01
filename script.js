let currentDifficulty = 'easy';
let solution = [], puzzle = [];
let myName = "", currentRoom = "", myScore = 0, myErrors = 0;
let seconds = 0, timerInterval, lastInputTime = 0;
let consecutiveCorrect = 0, isFrozen = false, lastFocusedCell = null;

const sfxCorrect = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-click-1112.mp3');
const sfxWrong = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-negative-tone-interface-628.mp3');
const sfxWin = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-stadium-crowd-light-applause-362.mp3');

document.querySelectorAll('.lvl-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.lvl-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentDifficulty = e.target.dataset.lvl;
    };
});

function generateSudoku() {
    const base = [
        [5,3,4,6,7,8,9,1,2], [6,7,2,1,9,5,3,4,8], [1,9,8,3,4,2,5,6,7],
        [8,5,9,7,6,1,4,2,3], [4,2,6,8,5,3,7,9,1], [7,1,3,9,2,4,8,5,6],
        [9,6,1,5,3,7,2,8,4], [2,8,7,4,1,9,6,3,5], [3,4,5,2,8,6,1,7,9]
    ];
    solution = base.map(row => [...row]);
    puzzle = solution.map(row => [...row]);
    let blanks = currentDifficulty === 'easy' ? 30 : currentDifficulty === 'medium' ? 45 : 55;
    while(blanks > 0) {
        let r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
        if(puzzle[r][c] !== 0) { puzzle[r][c] = 0; blanks--; }
    }
}

function joinBattle() {
    myName = document.getElementById("usernameInput").value.trim();
    currentRoom = document.getElementById("roomInput").value.trim();
    if(!myName || !currentRoom) return alert("Məlumat daxil edin!");

    startRound();

    // Rəqibləri izlə
    db.ref(`rooms/${currentRoom}/players`).on('value', (snap) => {
        const players = snap.val(); if(!players) return;
        Object.keys(players).forEach((p, i) => {
            if(i < 2) {
                document.getElementById(`p${i+1}-name`).innerText = p;
                document.getElementById(`p${i+1}-score`).innerText = players[p].score;
            }
        });
    });

    // Dondurma dinləyicisi
    db.ref(`rooms/${currentRoom}/freezeTarget`).on('value', (snap) => {
        const f = snap.val();
        if(f && f.by !== myName && (Date.now() - f.time < 5000)) applyFreeze();
    });

    // Yenilənmə dinləyicisi
    db.ref(`rooms/${currentRoom}/resetTrigger`).on('value', (snap) => {
        if(snap.val() === true) {
            setTimeout(() => { db.ref(`rooms/${currentRoom}/resetTrigger`).set(false); startRound(); }, 2500);
        }
    });
}

function startRound() {
    generateSudoku();
    myErrors = 0; consecutiveCorrect = 0;
    document.getElementById("errors-count").innerText = "0";
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("game-screen").classList.add("active");
    createBoard();
    if(!timerInterval) startTimer();
    lastInputTime = Date.now();
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore, finished: false });
}

function createBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    puzzle.forEach((row, r) => {
        row.forEach((val, c) => {
            const input = document.createElement("input");
            input.type = "tel"; input.className = "cell";
            input.onfocus = () => { if(!input.disabled) lastFocusedCell = {el: input, r, c}; };
            if(val !== 0) {
                input.value = val; input.disabled = true; input.classList.add("fixed");
            } else {
                input.oninput = (e) => {
                    let v = e.target.value.replace(/[^1-9]/g, '').slice(-1);
                    e.target.value = v; if(v) handleMove(e.target, r, c, parseInt(v));
                };
            }
            board.appendChild(input);
        });
    });
}

function handleMove(input, r, c, val) {
    if(isFrozen) return;
    let timeSpent = (Date.now() - lastInputTime) / 1000;

    if(val === solution[r][c]) {
        sfxCorrect.play(); input.classList.add("correct"); input.disabled = true;
        
        let gain = 10;
        consecutiveCorrect++;
        if(consecutiveCorrect === 2) gain += 10;
        else if(consecutiveCorrect === 3) gain += 25;
        else if(consecutiveCorrect >= 4) gain += 50;
        
        if(timeSpent <= 3) gain += 15; // Sürət bonusu
        
        showCombo(consecutiveCorrect);
        myScore += gain;
        lastInputTime = Date.now();
    } else {
        sfxWrong.play(); input.classList.add("wrong");
        consecutiveCorrect = 0; myErrors++; myScore -= 25;
        document.getElementById("errors-count").innerText = myErrors;
        setTimeout(() => { input.classList.remove("wrong"); input.value = ""; }, 600);
    }
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
}

function showCombo(count) {
    if(count < 2) return;
    const el = document.getElementById("combo-alert");
    el.innerText = `X${count} COMBO!`;
    el.classList.remove("combo-animate");
    void el.offsetWidth; el.classList.add("combo-animate");
}

function useFreeze() {
    if(myScore < 150) return alert("150 XP lazımdır!");
    myScore -= 150;
    db.ref(`rooms/${currentRoom}/freezeTarget`).set({ by: myName, time: Date.now() });
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
}

function applyFreeze() {
    const overlay = document.getElementById("freeze-overlay");
    overlay.style.display = "flex"; isFrozen = true;
    setTimeout(() => { overlay.style.display = "none"; isFrozen = false; }, 5000);
}

function useHint() {
    if(myScore < 50 || !lastFocusedCell) return alert("50 XP və ya seçili xana yoxdur!");
    myScore -= 50; consecutiveCorrect = 0;
    const { el, r, c } = lastFocusedCell;
    el.value = solution[r][c]; el.classList.add("correct"); el.disabled = true;
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
}

function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        let m = String(Math.floor(seconds/60)).padStart(2, '0');
        let s = String(seconds%60).padStart(2, '0');
        document.getElementById("timer").innerText = `${m}:${s}`;
    }, 1000);
}

function checkWin() {
    const cells = document.querySelectorAll(".cell");
    let win = [...cells].every((c, i) => parseInt(c.value) === solution[Math.floor(i/9)][i%9]);
    if(win) {
        sfxWin.play(); confetti({ particleCount: 200 });
        myScore += 500;
        db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore, finished: true });
        db.ref(`rooms/${currentRoom}/resetTrigger`).set(true);
        alert("+500 XP! Yeni raund başlayır...");
    } else alert("Səhv var!");
}