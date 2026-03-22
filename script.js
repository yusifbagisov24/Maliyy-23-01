let currentDifficulty = 'easy';
let solution = [];
let puzzle = [];
let myName = "", currentRoom = "", myScore = 0, myErrors = 0;
let seconds = 0;
let timerInterval;
let lastFocusedCell = null; // Kömək üçün seçilmiş xananı saxlayır

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
    if(!myName || !currentRoom) return alert("Məlumatları daxil edin!");

    generateSudoku();
    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("game-screen").classList.add("active");

    db.ref(`rooms/${currentRoom}/players/${myName}`).set({ score: 0, errors: 0, finished: false });
    
    db.ref(`rooms/${currentRoom}/players`).on('value', (snap) => {
        const players = snap.val();
        if(!players) return;
        Object.keys(players).forEach((p, i) => {
            if(i < 2) {
                document.getElementById(`p${i+1}-name`).innerText = p;
                document.getElementById(`p${i+1}-score`).innerText = players[p].score;
            }
        });
    });

    createBoard();
    startTimer();
}

function createBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    puzzle.forEach((row, r) => {
        row.forEach((val, c) => {
            const input = document.createElement("input");
            input.type = "tel"; 
            input.className = "cell";
            
            // Xananın seçilməsini izləyirik
            input.onfocus = () => { if(!input.disabled) lastFocusedCell = {el: input, r, c}; };

            if(val !== 0) {
                input.value = val; input.disabled = true; input.classList.add("fixed");
            } else {
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
        myScore -= (myErrors * 10);
        document.getElementById("errors-count").innerText = myErrors;
        setTimeout(() => { input.classList.remove("wrong"); input.value = ""; }, 700);
    }
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore, errors: myErrors });
}

// Kömək Funksiyası
function useHint() {
    if (myScore < 50) {
        alert("Kifayət qədər xalınız yoxdur! (Minimum 50 XP lazımdır)");
        return;
    }
    if (!lastFocusedCell || lastFocusedCell.el.disabled) {
        alert("Kömək üçün əvvəlcə boş bir xananın üzərinə klikləyin!");
        return;
    }

    const { el, r, c } = lastFocusedCell;
    const correctVal = solution[r][c];

    myScore -= 50;
    el.value = correctVal;
    el.classList.add("correct");
    el.disabled = true;
    sfxCorrect.play();

    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
    lastFocusedCell = null; // İstifadədən sonra sıfırla
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
    let complete = true;
    cells.forEach((cell, i) => {
        let r = Math.floor(i/9), c = i%9;
        if(parseInt(cell.value) !== solution[r][c]) complete = false;
    });

    if(complete) {
        clearInterval(timerInterval);
        sfxWin.play();
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        db.ref(`rooms/${currentRoom}/players/${myName}`).update({ finished: true });
        alert(`Təbriklər! Xalınız: ${myScore}`);
    } else {
        alert("Hələ boş və ya səhv xanalar var!");
    }
}