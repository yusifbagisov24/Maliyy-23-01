let currentDifficulty = 'easy', solution = [], puzzle = [];
let myName = "", currentRoom = "", myScore = 0, myErrors = 0;
let seconds = 0, timerInterval;

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
    puzzle = base.map(row => [...row]);
    let blanks = currentDifficulty === 'easy' ? 30 : currentDifficulty === 'medium' ? 45 : 55;
    while(blanks > 0) {
        let r = Math.floor(Math.random() * 9), c = Math.floor(Math.random() * 9);
        if(puzzle[r][c] !== 0) { puzzle[r][c] = 0; blanks--; }
    }
}

function joinBattle() {
    myName = document.getElementById("usernameInput").value.trim();
    currentRoom = document.getElementById("roomInput").value.trim();
    if(!myName || !currentRoom) return alert("Məlumatları daxil edin!");

    generateSudoku();
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("game-screen").classList.add("active");

    const playerPath = `rooms/${currentRoom}/players/${myName}`;
    db.ref(playerPath).set({ score: 0, errors: 0, isFrozen: false });
    db.ref(playerPath).onDisconnect().remove();

    db.ref(`rooms/${currentRoom}/players`).on('value', snap => {
        const players = snap.val() || {};
        const pNames = Object.keys(players);
        pNames.forEach((name, i) => {
            if(i < 2) {
                document.getElementById(`p${i+1}-name`).innerText = name;
                document.getElementById(`p${i+1}-score`).innerText = players[name].score;
            }
        });
        if(players[myName]?.isFrozen) applyFreeze();
    });

    createBoard();
    startTimer();
    setupChat();
}

function applyFreeze() {
    const overlay = document.getElementById("freeze-overlay");
    overlay.style.display = "flex";
    document.querySelectorAll(".cell").forEach(c => c.disabled = true);
    setTimeout(() => {
        db.ref(`rooms/${currentRoom}/players/${myName}`).update({ isFrozen: false });
        overlay.style.display = "none";
        document.querySelectorAll(".cell:not(.fixed):not(.correct)").forEach(c => c.disabled = false);
    }, 5000);
}

function createBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    puzzle.forEach((row, r) => {
        row.forEach((val, c) => {
            const input = document.createElement("input");
            input.type = "number"; input.className = "cell";
            if(val !== 0) { input.value = val; input.disabled = true; input.classList.add("fixed"); }
            else {
                input.oninput = (e) => {
                    let v = e.target.value.slice(-1);
                    e.target.value = v;
                    if(v >= 1 && v <= 9) handleMove(e.target, r, c, parseInt(v));
                };
            }
            board.appendChild(input);
        });
    });
}

function handleMove(input, r, c, val) {
    if(val === solution[r][c]) {
        sfxCorrect.play();
        input.classList.add("correct");
        input.disabled = true;
        myScore += 10;
    } else {
        sfxWrong.play();
        input.classList.add("wrong");
        myErrors++;
        myScore = Math.max(0, myScore - 20);
        setTimeout(() => { input.classList.remove("wrong"); input.value = ""; }, 500);
    }
    document.getElementById("errors-count").innerText = myErrors;
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore, errors: myErrors });
}

function useHint() {
    if(myScore < 50) return alert("50 xal lazımdır!");
    const cells = Array.from(document.querySelectorAll(".cell:not(.fixed):not(.correct)"));
    if(cells.length > 0) {
        const target = cells[0];
        const idx = Array.from(document.querySelectorAll(".cell")).indexOf(target);
        const r = Math.floor(idx/9), c = idx%9;
        target.value = solution[r][c];
        handleMove(target, r, c, solution[r][c]);
        myScore -= 60; // handleMove +10 verdiyi üçün balansı 50 azaldırıq
        db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
    }
}

function useFreeze() {
    if(myScore < 150) return alert("150 xal lazımdır!");
    db.ref(`rooms/${currentRoom}/players`).once('value', snap => {
        const players = snap.val();
        const opponent = Object.keys(players).find(p => p !== myName);
        if(opponent) {
            db.ref(`rooms/${currentRoom}/players/${opponent}`).update({ isFrozen: true });
            myScore -= 150;
            db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
        }
    });
}

function setupChat() {
    db.ref(`rooms/${currentRoom}/chat`).on('child_added', snap => {
        const m = snap.val();
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<b>${m.user}:</b> ${m.text}`;
        const box = document.getElementById('chat-messages');
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    });
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    if(input.value.trim()) {
        db.ref(`rooms/${currentRoom}/chat`).push({ user: myName, text: input.value });
        input.value = "";
    }
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
    const total = document.querySelectorAll(".cell").length;
    const correct = document.querySelectorAll(".cell.fixed, .cell.correct").length;
    if(total === correct) {
        confetti({ particleCount: 150 });
        alert("TEBRİKLER! BİTİRDİNİZ!");
    } else alert("Hələ boş xanalar var!");
}