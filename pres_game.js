const canvas = document.getElementById('presCanvas');
const ctx = canvas.getContext('2d');

// Στην αρχή του αρχείου, προσθήκη ελέγχου για iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function draw() {
    ctx.save();
    
    // Το Shake στο iOS μπορεί να προκαλέσει πτώση FPS, το περιορίζουμε
    if (shake > 1) {
        let s = isIOS ? shake * 0.5 : shake;
        ctx.translate(Math.random()*s - s/2, Math.random()*s - s/2);
    }

    drawAtmosphere();

    let w = Math.min(canvas.width * 0.35, 190);
    let h = w * 1.3;
    let groundY = canvas.height * 0.8;
    let charY = groundY - h + 15;

    // ΠΡΟΕΔΡΟΣ
    if (presSide !== null && !isWarning) {
        let px = presSide === 'left' ? canvas.width * 0.15 : canvas.width * 0.55;
        ctx.save();
        ctx.globalAlpha = 0.85;
        
        // Σημαντικό: Τα CSS filters στο Canvas σκοτώνουν το iPhone performance.
        // Αν είναι iOS, χρησιμοποιούμε μόνο opacity και ένα απλό shadow.
        if (isIOS) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = "red";
        } else {
            ctx.filter = "brightness(0.3) contrast(1.3) drop-shadow(0 0 15px rgba(255,0,0,0.8))";
        }
        
        ctx.drawImage(presImg, px, charY - 5, w, h);
        ctx.restore();
        
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(px + 25, charY - 20, (timer / difficulty.limit) * (w - 50), 5);
    }

    // ΠΑΙΚΤΗΣ
    ctx.save();
    if (isIOS) {
        // Ελαφρύ φίλτρο για iOS
        ctx.globalAlpha = 0.9;
    } else {
        ctx.filter = "brightness(0.7) saturate(0.6) hue-rotate(195deg) contrast(1.1) drop-shadow(-2px -2px 6px rgba(200,220,255,0.15))";
    }
    ctx.drawImage(playerImg, playerX, charY, w, h);
    ctx.restore();

    // UI - Χρήση Standard Γραμματοσειράς για συμβατότητα
    ctx.fillStyle = "white";
    ctx.font = "italic bold 32px sans-serif"; // sans-serif για να πιάσει το system font του iOS
    ctx.textAlign = "center";
    ctx.fillText(score, canvas.width/2, 70);

    ctx.restore();
    update();
    
    // Χρήση RequestAnimationFrame με fallback
    if (active || shake > 0.1) {
        window.requestAnimationFrame(draw);
    }
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const playerImg = new Image(); playerImg.src = 'Copilot_20260425_104706.png';
const presImg = new Image(); presImg.src = 'Copilot_20260425_103520.png';

let active = false;
let score = 0;
let highScore = localStorage.getItem('presHighScore') || 0;
let playerSide = 'left';
let playerX = 0; 
let presSide = null;
let lastPresSide = null;
let isWarning = false;
let timer = 0;
let shake = 0;
let bgOffset = 0;
let flash = 0;

let difficulty = { limit: 100, warningTime: 600, spawnRate: 2000, fakeChance: 0 };

function startGame(mode) {
    document.getElementById('p-menu').classList.add('hidden');
    document.getElementById('mobile-controls').classList.remove('hidden');
    active = true;
    score = 0;
    playerX = (playerSide === 'left') ? canvas.width * 0.15 : canvas.width * 0.55;

    if (mode === 'easy') {
        difficulty = { limit: 110, warningTime: 850, spawnRate: 2500, fakeChance: 0 };
    } else if (mode === 'hard') {
        difficulty = { limit: 70, warningTime: 450, spawnRate: 1500, fakeChance: 0.15 };
    } else if (mode === 'nightmare') {
        difficulty = { limit: 40, warningTime: 220, spawnRate: 800, fakeChance: 0.35 };
    }

    spawn();
    draw();
}

function move(side) {
    if (!active) return;
    playerSide = side;
}

function spawn() {
    if (!active) return;
    
    if (presSide === null) {
        let targetSide = Math.random() > 0.5 ? 'left' : 'right';
        let warningSide = targetSide;

        // Fake-Out Logic (Hard/Nightmare)
        if (Math.random() < difficulty.fakeChance) {
            warningSide = (targetSide === 'left') ? 'right' : 'left';
        }

        isWarning = true;
        presSide = warningSide; 

        let actualWarningTime = difficulty.warningTime * (0.85 + Math.random() * 0.3);

        setTimeout(() => {
            if (!active) return;
            isWarning = false;
            presSide = targetSide; 
            timer = difficulty.limit;
            if(Math.random() > 0.65) flash = 8; 
        }, actualWarningTime);
    }
    
    let delay = Math.random() * difficulty.spawnRate + 1000;
    if (score > 10 && Math.random() > 0.8) delay = 450; 

    setTimeout(spawn, delay);
}

function endGame() {
    active = false;
    shake = 35;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('presHighScore', highScore);
    }
    document.getElementById('p-game-over').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
    document.getElementById('high-score-display').innerText = highScore;
}

function drawAtmosphere() {
    let skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGrad.addColorStop(0, "#010103");
    skyGrad.addColorStop(1, "#0d0d16");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    bgOffset += 0.4;
    ctx.fillStyle = "#030305";
    for(let i=0; i<12; i++) {
        let tx = (i * 250 - bgOffset) % (canvas.width + 250);
        ctx.beginPath();
        ctx.moveTo(tx, canvas.height * 0.8);
        ctx.lineTo(tx + 35, canvas.height * 0.48);
        ctx.lineTo(tx + 70, canvas.height * 0.8);
        ctx.fill();
    }
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, canvas.height * 0.8, canvas.width, canvas.height * 0.2);

    if (flash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash/12})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flash--;
    }
}

function update() {
    if (!active) return;
    let lx = canvas.width * 0.15;
    let rx = canvas.width * 0.55;
    let targetX = playerSide === 'left' ? lx : rx;
    playerX += (targetX - playerX) * 0.18;

    if (presSide !== null && !isWarning) {
        timer--;
        let presPos = presSide === 'left' ? lx : rx;
        
        if (Math.abs(playerX - presPos) < 75) {
            if (timer <= 0) endGame();
        } else {
            if (timer <= 0) {
                score++;
                presSide = null;
                if (difficulty.limit > 20) difficulty.limit -= 0.5;
            }
        }
    }
    if (shake > 0) shake *= 0.9;
}

function draw() {
    ctx.save();
    if (shake > 1) ctx.translate(Math.random()*shake - shake/2, Math.random()*shake - shake/2);

    drawAtmosphere();

    let w = Math.min(canvas.width * 0.35, 190);
    let h = w * 1.3;
    let groundY = canvas.height * 0.8;
    let charY = groundY - h + 15;

    if (isWarning && presSide) {
        let wx = presSide === 'left' ? canvas.width * 0.15 : canvas.width * 0.55;
        let grad = ctx.createRadialGradient(wx+w/2, charY+h/2, 5, wx+w/2, charY+h/2, w*2.5);
        grad.addColorStop(0, "rgba(255, 0, 0, 0.45)");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (presSide !== null && !isWarning) {
        let px = presSide === 'left' ? canvas.width * 0.15 : canvas.width * 0.55;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.filter = "brightness(0.3) contrast(1.3) drop-shadow(0 0 15px rgba(255,0,0,0.8))";
        ctx.drawImage(presImg, px, charY - 5, w, h);
        ctx.restore();
        
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(px + 25, charY - 20, (timer / difficulty.limit) * (w - 50), 5);
    }

    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath(); ctx.ellipse(playerX + w/2, groundY, w/3, 8, 0, 0, Math.PI*2); ctx.fill();
    
    ctx.save();
    ctx.filter = "brightness(0.7) saturate(0.6) hue-rotate(195deg) contrast(1.1) drop-shadow(-2px -2px 6px rgba(200,220,255,0.15))";
    ctx.drawImage(playerImg, playerX, charY, w, h);
    ctx.restore();

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "italic bold 34px Arial";
    ctx.textAlign = "center";
    ctx.shadowBlur = 12; ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.fillText(score, canvas.width/2, 70);

    ctx.restore();
    update();
    if (active || shake > 0.1) requestAnimationFrame(draw);
}

window.onkeydown = (e) => {
    if (e.key === "ArrowLeft") move('left');
    if (e.key === "ArrowRight") move('right');
};
document.getElementById('p-btn-left').onclick = (e) => { e.preventDefault(); move('left'); };
document.getElementById('p-btn-right').onclick = (e) => { e.preventDefault(); move('right'); };