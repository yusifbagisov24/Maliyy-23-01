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
    if(!myName || !currentRoom) return alert("Məlumatları doldurun!");

    generateSudoku();
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("game-screen").classList.add("active");

    db.ref(`rooms/${currentRoom}/players/${myName}`).set({ score: 0, errors: 0, finished: false });
    
    // Rəqibləri və donma vəziyyətini izlə
    db.ref(`rooms/${currentRoom}/players`).on('value', snap => {
        const players = snap.val();
        if(!players) return;
        Object.keys(players).forEach((p, i) => {
            if(i < 2) {
                document.getElementById(`p${i+1}-name`).innerText = p;
                document.getElementById(`p${i+1}-score`).innerText = players[p].score;
            }
        });
        if(players[myName].isFrozen) {
            document.getElementById("freeze-overlay").style.display = "flex";
            setTimeout(() => {
                db.ref(`rooms/${currentRoom}/players/${myName}`).update({ isFrozen: false });
                document.getElementById("freeze-overlay").style.display = "none";
            }, 5000);
        }
    });

    createBoard();
    startTimer();
    setupChat();
}

function createBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    puzzle.forEach((row, r) => {
        row.forEach((val, c) => {
            const input = document.createElement("input");
            input.type = "tel"; input.className = "cell";
            if(val !== 0) { input.value = val; input.disabled = true; input.classList.add("fixed"); }
            else {
                input.oninput = (e) => {
                    let v = e.target.value.replace(/[^1-9]/g, '').slice(-1);
                    e.target.value = v;
                    if(v) handleMove(e.target, r, c, parseInt(v));
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
    const inputs = document.querySelectorAll(".cell:not(.fixed)");
    for(let input of inputs) {
        if(!input.value) {
            const idx = Array.from(document.querySelectorAll(".cell")).indexOf(input);
            input.value = solution[Math.floor(idx/9)][idx%9];
            handleMove(input, Math.floor(idx/9), idx%9, parseInt(input.value));
            myScore -= 60; // handleMove 10 əlavə edir, cəmi -50 olsun deyə
            return;
        }
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
    const chatRef = db.ref(`rooms/${currentRoom}/chat`);
    chatRef.limitToLast(10).on('child_added', snap => {
        const msg = snap.val();
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<b>${msg.user}:</b> ${msg.text}`;
        const box = document.getElementById('chat-messages');
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    });
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    if(!input.value.trim()) return;
    db.ref(`rooms/${currentRoom}/chat`).push({ user: myName, text: input.value });
    input.value = "";
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
    let win = true;
    cells.forEach((c, i) => { if(parseInt(c.value) !== solution[Math.floor(i/9)][i%9]) win = false; });
    if(win) {
        confetti({ particleCount: 150 });
        alert("Təbriklər! Qalib gəldiniz!");
    } else alert("Hələ bitməyib!");
}