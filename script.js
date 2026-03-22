let currentDifficulty = 'easy';
let solution = [];
let puzzle = [];
let myName = "", currentRoom = "", myScore = 0, myErrors = 0;

// Səviyyə seçimi düymələri üçün
document.querySelectorAll('.lvl-btn').forEach(btn => {
    btn.onclick = (e) => {
        document.querySelectorAll('.lvl-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentDifficulty = e.target.dataset.lvl;
    };
});

// Hər dəfə fərqli rəqəmlər yaradan funksiya (Sadələşdirilmiş Sudoku Generator)
function generateSudoku() {
    // Bu hissədə həmişə yeni bir həll yaradılır (nümunə üçün qarışdırılmış bazadan istifadə olunur)
    const baseSolution = [
        [5,3,4,6,7,8,9,1,2], [6,7,2,1,9,5,3,4,8], [1,9,8,3,4,2,5,6,7],
        [8,5,9,7,6,1,4,2,3], [4,2,6,8,5,3,7,9,1], [7,1,3,9,2,4,8,5,6],
        [9,6,1,5,3,7,2,8,4], [2,8,7,4,1,9,6,3,5], [3,4,5,2,8,6,1,7,9]
    ];
    
    // Rəqəmlərin yerini təsadüfi dəyişək
    const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);
    solution = baseSolution.map(row => [...row]); 

    // Çətinliyə görə xanaları silək
    let attempts = currentDifficulty === 'easy' ? 30 : currentDifficulty === 'medium' ? 45 : 60;
    puzzle = solution.map(row => [...row]);
    
    while (attempts > 0) {
        let r = Math.floor(Math.random() * 9);
        let c = Math.floor(Math.random() * 9);
        if (puzzle[r][c] !== 0) {
            puzzle[r][c] = 0;
            attempts--;
        }
    }
}

function joinBattle() {
    myName = document.getElementById("usernameInput").value;
    currentRoom = document.getElementById("roomInput").value;
    if(!myName || !currentRoom) return alert("Məlumatları doldurun!");

    generateSudoku(); // Hər oyunda yeni rəqəmlər

    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("game-screen").classList.add("active");

    db.ref(`rooms/${currentRoom}/players/${myName}`).set({ score: 0, errors: 0 });

    db.ref(`rooms/${currentRoom}/players`).on('value', (snap) => {
        const players = snap.val();
        const pIds = Object.keys(players);
        pIds.forEach((p, i) => {
            const n = i + 1;
            if(n <= 2) {
                document.getElementById(`p${n}-name`).innerText = p;
                document.getElementById(`p${n}-score`).innerText = players[p].score;
            }
        });
    });

    createBoard();
    startTimer();
}

function handleInput(input, r, c) {
    let val = parseInt(input.value.slice(-1));
    input.value = val || "";
    if(!val) return;

    if(val === solution[r][c]) {
        input.classList.add("correct");
        input.classList.remove("wrong");
        input.disabled = true;
        myScore += 10;
    } else {
        input.classList.add("wrong");
        myErrors++;
        // Ağırlaşan cəza sistemi: -10, -20, -30...
        let penalty = myErrors * 10;
        myScore -= penalty;
        
        document.getElementById("errors").innerText = myErrors;
        // Titrəmə animasiyası üçün
        setTimeout(() => input.classList.remove("wrong"), 500);
    }
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore, errors: myErrors });
}

// ... Digər timer və board yaratma funksiyaları eyni qalır
function createBoard() {
    const board = document.getElementById("board");
    board.innerHTML = "";
    puzzle.forEach((row, r) => {
        row.forEach((val, c) => {
            const input = document.createElement("input");
            input.className = "cell";
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

function startTimer() {
    let s = 0;
    setInterval(() => {
        s++;
        let m = String(Math.floor(s/60)).padStart(2, '0');
        let sec = String(s%60).padStart(2, '0');
        document.getElementById("timer").innerText = `${m}:${sec}`;
    }, 1000);
}