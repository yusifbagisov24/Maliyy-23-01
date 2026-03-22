let solution = [], puzzle = [], myName = "", currentRoom = "", myScore = 0, myErrors = 0;
let consecutive = 0, isFrozen = false, lastTime = 0, lastFocused = null;

function generateSudoku() {
    const base = [
        [5,3,4,6,7,8,9,1,2], [6,7,2,1,9,5,3,4,8], [1,9,8,3,4,2,5,6,7],
        [8,5,9,7,6,1,4,2,3], [4,2,6,8,5,3,7,9,1], [7,1,3,9,2,4,8,5,6],
        [9,6,1,5,3,7,2,8,4], [2,8,7,4,1,9,6,3,5], [3,4,5,2,8,6,1,7,9]
    ];
    solution = base; puzzle = base.map(row => row.map(v => Math.random() > 0.4 ? v : 0));
}

function joinBattle() {
    myName = document.getElementById("usernameInput").value;
    currentRoom = document.getElementById("roomInput").value;
    if(!myName || !currentRoom) return;

    db.ref(`rooms/${currentRoom}/players/${myName}`).set({ score: 0, errors: 0 });
    
    // Listeners
    db.ref(`rooms/${currentRoom}/players`).on('value', s => {
        const p = s.val(); if(!p) return;
        const keys = Object.keys(p);
        keys.forEach((k, i) => {
            if(i<2) { 
                document.getElementById(`p${i+1}-name`).innerText = k;
                document.getElementById(`p${i+1}-score`).innerText = p[k].score;
            }
        });
    });

    db.ref(`rooms/${currentRoom}/freeze`).on('value', s => {
        const f = s.val();
        if(f && f.to === myName && Date.now() - f.at < 5000) activateFreeze();
    });

    document.getElementById("auth-screen").classList.remove("active");
    document.getElementById("game-screen").classList.add("active");
    startRound();
}

function startRound() {
    generateSudoku();
    const b = document.getElementById("board"); b.innerHTML = "";
    puzzle.forEach((row, r) => {
        row.forEach((val, c) => {
            const i = document.createElement("input");
            i.className = "cell" + (val ? " fixed" : "");
            i.value = val || ""; i.disabled = !!val;
            i.type = "number";
            i.onfocus = () => lastFocused = {el: i, r, c};
            i.oninput = (e) => {
                const v = parseInt(e.target.value.slice(-1));
                if(v) handleInput(i, r, c, v); else i.value = "";
            };
            b.appendChild(i);
        });
    });
    lastTime = Date.now();
}

function handleInput(el, r, c, v) {
    if(isFrozen) { el.value = ""; return; }
    if(v === solution[r][c]) {
        el.classList.add("correct"); el.disabled = true;
        let p = 10; consecutive++;
        if(consecutive == 2) p+=10; else if(consecutive == 3) p+=25; else if(consecutive >= 4) p+=50;
        if(Date.now() - lastTime < 3000) p+=15;
        myScore += p; showCombo(consecutive);
    } else {
        el.classList.add("wrong"); consecutive = 0; myScore -= 25; myErrors++;
        document.getElementById("errors-count").innerText = myErrors;
        setTimeout(() => { el.classList.remove("wrong"); el.value = ""; }, 500);
    }
    lastTime = Date.now();
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore, errors: myErrors });
}

function useFreeze() {
    if(myScore < 150) return;
    myScore -= 150;
    const opp = document.getElementById(myName === document.getElementById("p1-name").innerText ? "p2-name" : "p1-name").innerText;
    db.ref(`rooms/${currentRoom}/freeze`).set({ to: opp, at: Date.now() });
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
}

function activateFreeze() {
    isFrozen = true; document.getElementById("freeze-overlay").style.display = "flex";
    setTimeout(() => { isFrozen = false; document.getElementById("freeze-overlay").style.display = "none"; }, 5000);
}

function showCombo(n) {
    if(n < 2) return;
    const c = document.getElementById("combo-popup");
    c.innerText = "X" + n + " COMBO!"; c.classList.add("animate-combo");
    setTimeout(() => c.classList.remove("animate-combo"), 600);
}

function useHint() {
    if(myScore < 50 || !lastFocused) return;
    myScore -= 50; consecutive = 0;
    const {el, r, c} = lastFocused;
    el.value = solution[r][c]; el.classList.add("correct"); el.disabled = true;
    db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
}

function checkWin() {
    // Sadə yoxlama: bütün xanalar dolubmu?
    const cells = document.querySelectorAll(".cell");
    if([...cells].every(c => c.value)) {
        myScore += 500;
        db.ref(`rooms/${currentRoom}/players/${myName}`).update({ score: myScore });
        confetti(); alert("QALİB!");
    }
}