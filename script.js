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

let myName = "", currentRoom = "", myScore = 0, myErrors = 0;
let timerInterval;

function joinBattle() {
    myName = document.getElementById("usernameInput").value;
    currentRoom = document.getElementById("roomInput").value;
    if(!myName || !currentRoom) return alert("Məlumatları tam doldur!");

    db.ref(`rooms/${currentRoom}/players/${myName}`).set({ score: 0, errors: 0, finished: false });
    
    db.ref(`rooms/${currentRoom}/players`).on('value', (snap) => {
        const players = snap.val();
        const pIds = Object.keys(players);
        pIds.forEach((p, index) => {
            const num = index + 1;
            if(num <= 2) {
                document.getElementById(`p${num}-name`).innerText = p;
                document.getElementById(`p${num}-score`).innerText = players[p].score;
            }
        });
    });

    document.getElementById("online-panel").style.display = "none";
    createBoard();
    startTimer();
}

function createBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    puzzle.forEach((row, r) => {
        row.forEach((val, c) => {
            const input = document.createElement("input");
            input.className = "cell";
            input.setAttribute("inputmode", "numeric");
            if(val !== 0) {
                input.value = val;
                input.disabled = true;
                input.classList.add("fixed");
            } else {
                input.oninput = (e) => handleInput(e.target, r, c);
            }
            board.appendChild(input);
        });
    });
}

function handleInput(input, r, c) {
    let val = input.value.slice(-1);
    input.value = val;
    if(!val) return;

    if(parseInt(val) === solution[r][c]) {
        input.classList.add("correct");
        input.classList.remove("wrong");
        myScore += 10;
    } else {
        input.classList.add("wrong");
        myErrors++;
        myScore -= 5;
        document.getElementById("errors").innerText = myErrors;
        if(myErrors >= 3) alert("Məğlub oldunuz! Çox səhv etdiniz.");
    }
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore, errors: myErrors });
}

function startTimer() {
    let s = 0;
    timerInterval = setInterval(() => {
        s++;
        let min = String(Math.floor(s/60)).padStart(2, '0');
        let sec = String(s%60).padStart(2, '0');
        document.getElementById("timer").innerText = `${min}:${sec}`;
    }, 1000);
}