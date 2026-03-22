let currentDifficulty = 'easy';
let solution = [], puzzle = [];
let myName = "", currentRoom = "", myScore = 0, myErrors = 0;
let seconds = 0, timerInterval, lastInputTime = 0;
let consecutiveCorrect = 0, isFrozen = false, lastFocusedCell = null;

const sfxCorrect = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-click-1112.mp3');
const sfxWrong = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-negative-tone-interface-628.mp3');

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
    if(!myName || !currentRoom) return alert("Məlumatları tam doldurun!");

    // Otağa qoşulma
    db.ref(`rooms/${currentRoom}/players/${myName}`).set({
        score: 0,
        errors: 0,
        finished: false,
        lastActive: Date.now()
    });

    setupListeners();
    startNewRound();
}

function setupListeners() {
    // 1. Liderlik lövhəsi
    db.ref(`rooms/${currentRoom}/players`).on('value', (snap) => {
        const players = snap.val();
        if(!players) return;
        const pNames = Object.keys(players);
        pNames.forEach((p, i) => {
            if(i < 2) {
                document.getElementById(`p${i+1}-name`).innerText = p;
                document.getElementById(`p${i+1}-score`).innerText = players[p].score;
            }
        });
    });

    // 2. Dondurma (Freeze) Tətikləyicisi
    db.ref(`rooms/${currentRoom}/freezeCommand`).on('value', (snap) => {
        const cmd = snap.val();
        if(cmd && cmd.target === myName && (Date.now() - cmd.time < 5000)) {
            applyFreezeEffect();
        }
    });

    // 3. Oyun Sıfırlama (Reset)
    db.ref(`rooms/${currentRoom}/resetSignal`).on('value', (snap) => {
        if(snap.val() === true) {
            setTimeout(() => {
                if(myName === document.getElementById("p1-name").innerText) {
                    db.ref(`rooms/${currentRoom}/resetSignal`).set(false);
                }
                startNewRound();
            }, 3000);
        }
    });
}

function startNewRound() {
    generateSudoku();
    myErrors = 0;
    consecutiveCorrect = 0;
    document.getElementById("errors-count").innerText = "0";
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("game-screen").classList.add("active");
    createBoard();
    if(!timerInterval) startTimer();
    lastInputTime = Date.now();
    isFrozen = false;
    document.getElementById("freeze-overlay").style.display = "none";
}

function createBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    puzzle.forEach((row, r) => {
        row.forEach((val, c) => {
            const input = document.createElement("input");
            input.type = "number";
            input.className = "cell";
            input.onfocus = () => { if(!input.disabled) lastFocusedCell = {el: input, r, c}; };
            if(val !== 0) {
                input.value = val;
                input.disabled = true;
                input.classList.add("fixed");
            } else {
                input.oninput = (e) => {
                    let v = parseInt(e.target.value.slice(-1));
                    if(v >= 1 && v <= 9) handleMove(e.target, r, c, v);
                    else e.target.value = "";
                };
            }
            board.appendChild(input);
        });
    });
}

function handleMove(input, r, c, val) {
    if(isFrozen) { input.value = ""; return; }
    
    let now = Date.now();
    let timeSpent = (now - lastInputTime) / 1000;

    if(val === solution[r][c]) {
        sfxCorrect.play();
        input.classList.add("correct");
        input.disabled = true;
        
        let gain = 10;
        consecutiveCorrect++;
        if(consecutiveCorrect === 2) gain += 10;
        else if(consecutiveCorrect === 3) gain += 25;
        else if(consecutiveCorrect >= 4) gain += 50;
        
        if(timeSpent <= 3) gain += 15;
        
        myScore += gain;
        showComboEffect(consecutiveCorrect);
    } else {
        sfxWrong.play();
        input.classList.add("wrong");
        consecutiveCorrect = 0;
        myErrors++;
        myScore -= 25;
        document.getElementById("errors-count").innerText = myErrors;
        setTimeout(() => { input.classList.remove("wrong"); input.value = ""; }, 500);
    }
    lastInputTime = Date.now();
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore, errors: myErrors });
}

function useFreeze() {
    if(myScore < 150) return alert("Xalın çatmir!");
    myScore -= 150;
    
    // Rəqibi tap
    let p1 = document.getElementById("p1-name").innerText;
    let p2 = document.getElementById("p2-name").innerText;
    let target = (myName === p1) ? p2 : p1;

    db.ref(`rooms/${currentRoom}/freezeCommand`).set({
        target: target,
        by: myName,
        time: Date.now()
    });
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
}

function applyFreezeEffect() {
    isFrozen = true;
    const overlay = document.getElementById("freeze-overlay");
    overlay.style.display = "flex";
    setTimeout(() => {
        overlay.style.display = "none";
        isFrozen = false;
    }, 5000);
}

function showComboEffect(count) {
    if(count < 2) return;
    const alert = document.getElementById("combo-alert");
    alert.innerText = `X${count} COMBO!`;
    alert.classList.remove("combo-animate");
    void alert.offsetWidth;
    alert.classList.add("combo-animate");
}

function useHint() {
    if(myScore < 50 || !lastFocusedCell) return alert("Seçim edin və ya 50 XP toplayın!");
    myScore -= 50;
    consecutiveCorrect = 0;
    const { el, r, c } = lastFocusedCell;
    el.value = solution[r][c];
    el.classList.add("correct");
    el.disabled = true;
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
    let allCorrect = true;
    cells.forEach((cell, i) => {
        if(parseInt(cell.value) !== solution[Math.floor(i/9)][i%9]) allCorrect = false;
    });

    if(allCorrect) {
        myScore += 500;
        db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore, finished: true });
        db.ref(`rooms/${currentRoom}/resetSignal`).set(true);
        confetti({ particleCount: 150 });
        alert("QALİB GƏLDİNİZ! +500 XP");
    } else {
        alert("Hələ bitməyib!");
    }
}