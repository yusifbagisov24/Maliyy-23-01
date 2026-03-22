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

let myName = "";
let currentRoom = null;
let myScore = 0;
let seconds = 0;
let timer = null;

function joinBattle() {
    myName = document.getElementById("usernameInput").value;
    currentRoom = document.getElementById("roomInput").value;

    if (!myName || !currentRoom) return alert("Ad və Otaq kodunu yazın!");

    // Bazada öz xalımızı yaradırıq
    db.ref(`rooms/${currentRoom}/players/${myName}`).set({
        score: 0,
        finished: false
    });

    // Rəqibləri izləyirik
    db.ref(`rooms/${currentRoom}/players`).on('value', (snapshot) => {
        const players = snapshot.val();
        updateLeaderboard(players);
    });

    alert("Döyüşə hazırsınız! Lövhəni doldurun.");
    createBoard();
    startTimer();
}

function updateLeaderboard(players) {
    const pIds = Object.keys(players);
    
    // Birinci oyunçu
    if (pIds[0]) {
        document.getElementById("p1-stat").innerText = `${pIds[0]}: ${players[pIds[0]].score} xal`;
        if (players[pIds[0]].finished) document.getElementById("p1-stat").innerText += " ✅";
    }
    
    // İkinci oyunçu
    if (pIds[1]) {
        document.getElementById("p2-stat").innerText = `${pIds[1]}: ${players[pIds[1]].score} xal`;
        if (players[pIds[1]].finished) document.getElementById("p2-stat").innerText += " ✅";
    }
}

function createBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    for(let r=0; r<9; r++) {
        for(let c=0; c<9; c++) {
            const input = document.createElement("input");
            input.classList.add("cell");
            input.setAttribute("inputmode", "numeric");

            if(puzzle[r][c] !== 0) {
                input.value = puzzle[r][c];
                input.disabled = true;
                input.classList.add("fixed");
            } else {
                input.addEventListener("input", (e) => {
                    let val = e.target.value.slice(0, 1);
                    e.target.value = val;
                    checkMyCell(e.target, r, c);
                });
            }
            board.appendChild(input);
        }
    }
}

function checkMyCell(input, r, c) {
    const val = parseInt(input.value);
    input.classList.remove("correct", "wrong");

    if (!val) return;

    if (val === solution[r][c]) {
        input.classList.add("correct");
        myScore += 10;
    } else {
        input.classList.add("wrong");
        myScore -= 20;
    }
    
    // Xalımızı anlıq Firebase-ə göndəririk (Rəqib görsün deyə)
    if (currentRoom) {
        db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
    }
}

function startTimer() {
    if(timer) clearInterval(timer);
    timer = setInterval(() => {
        seconds++;
        document.getElementById("timer").innerText = "Vaxt: " + seconds + " s";
    }, 1000);
}

function checkWin() {
    const cells = document.querySelectorAll(".cell");
    let win = true;
    cells.forEach((cell, i) => {
        const r = Math.floor(i/9);
        const c = i%9;
        if (parseInt(cell.value) !== solution[r][c]) win = false;
    });

    if (win) {
        clearInterval(timer);
        db.ref(`rooms/${currentRoom}/players/${myName}`).update({ finished: true });
        alert(`MÜKƏMMƏL! Siz bitirdiniz! Final xalınız: ${myScore}. Rəqibi gözləyin.`);
    } else {
        alert("Hələ səhvlər var və ya boş xanalar qalıb!");
    }
}