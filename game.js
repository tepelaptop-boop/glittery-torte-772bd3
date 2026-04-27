const difficulty = localStorage.getItem('gameDifficulty') || 'medium';
let enemySpeed, spawnRate, changeLaneChance;

if (difficulty === 'easy') {
    enemySpeed = 4; spawnRate = 95; changeLaneChance = 0;
} else if (difficulty === 'medium') {
    enemySpeed = 6.5; spawnRate = 75; changeLaneChance = 0.01;
} else { 
    enemySpeed = 9.5; spawnRate = 45; changeLaneChance = 0.035;
}

const canvas = document.getElementById('roadCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth > 500 ? 400 : window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let score = 0;
let highScore = 0;
try {
    const saved = localStorage.getItem('maxHighScore');
    highScore = saved ? parseInt(saved) : 0;
    if (isNaN(highScore)) highScore = 0;
} catch (e) { highScore = 0; }

function refreshUI() {
    if (document.getElementById('score-val')) document.getElementById('score-val').innerText = score;
    if (document.getElementById('high-score-val')) document.getElementById('high-score-val').innerText = highScore;
}
refreshUI();

let gameActive = true;
let frameCount = 0;
let enemies = [];
let items = [];
let particles = [];
let nitroActive = false;
let nightMode = false;
let nearMissText = "";
let nearMissTimer = 0;
let drunkTimer = 0;
let slowMoTimer = 0;
let lateralVelocity = 0;
let touchSide = null;
const friction = 0.85;

const playerImg = new Image(); playerImg.src = 'Copilot_20260422_165007.png';
const carImg = new Image(); carImg.src = 'Copilot_20260422_175337-removebg-preview.png';
const beerImg = new Image(); beerImg.src = 'yuri_b-beer-4316330_1920.png';

const player = { x: canvas.width / 2 - 27, y: canvas.height - 150, w: 55, h: 85 };
const lanes = [canvas.width * 0.15, canvas.width * 0.5 - 27, canvas.width * 0.85 - 55];

const keys = {};

window.addEventListener('keydown', e => { if(gameActive) keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

if (btnLeft && btnRight) {
    const startLeft = (e) => { e.preventDefault(); touchSide = 'left'; };
    const startRight = (e) => { e.preventDefault(); touchSide = 'right'; };
    const stopTouch = (e) => { e.preventDefault(); touchSide = null; };

    btnLeft.addEventListener('touchstart', startLeft, {passive: false});
    btnLeft.addEventListener('touchend', stopTouch, {passive: false});
    btnRight.addEventListener('touchstart', startRight, {passive: false});
    btnRight.addEventListener('touchend', stopTouch, {passive: false});
}

document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, {passive: false});

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        try {
            localStorage.setItem('maxHighScore', highScore.toString());
        } catch (e) {}
        refreshUI();
    }
}

function spawnEnemy() {
    let laneIdx = Math.floor(Math.random() * 3);
    enemies.push({ 
        x: lanes[laneIdx], 
        y: -120, 
        w: 55, 
        h: 90, 
        currentLane: laneIdx, 
        targetX: lanes[laneIdx], 
        missCounted: false 
    });
}

function checkCollision(a, b) {
    const p = 16; 
    return a.x + p < b.x + b.w - p && a.x + a.w - p > b.x + p && a.y + p < b.y + b.h - p && a.y + a.h - p > b.y + p;
}

function gameOver() {
    gameActive = false;
    canvas.classList.add('shake');
    saveHighScore();
    document.getElementById('game-over').classList.remove('hidden');
}

function update() {
    if (!gameActive) return;
    frameCount++;

    let baseSpeed = slowMoTimer > 0 ? enemySpeed * 0.4 : enemySpeed;
    if (slowMoTimer > 0) slowMoTimer--;
    let currentSpeed = nitroActive ? baseSpeed * 2 : baseSpeed;

    let agility = drunkTimer > 0 ? 0.6 : 1.5;
    if (player.x < 30 || player.x > canvas.width - 80) agility *= 0.5; 
    if (drunkTimer > 0) drunkTimer--;

    if (keys['ArrowLeft'] || touchSide === 'left') lateralVelocity -= agility;
    if (keys['ArrowRight'] || touchSide === 'right') lateralVelocity += agility;
    lateralVelocity *= friction;
    player.x += lateralVelocity;

    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.w) player.x = canvas.width - player.w;

    if (frameCount % 15 === 0) particles.push({x: Math.random()*canvas.width, y:-10, s: Math.random()*3+1});
    particles.forEach((p, i) => { p.y += currentSpeed; if(p.y > canvas.height) particles.splice(i,1); });

    if (frameCount % spawnRate === 0) spawnEnemy();
    if (frameCount % 450 === 0) items.push({ x: lanes[Math.floor(Math.random()*3)], y: -50, w: 40, h: 40, type: 'beer' });
    if (frameCount % 1200 === 0) items.push({ x: lanes[Math.floor(Math.random()*3)], y: -50, w: 40, h: 40, type: 'nitro' });

    enemies.forEach((en, i) => {
        en.y += currentSpeed;
        if (Math.random() < changeLaneChance && en.y > 50 && en.y < canvas.height / 2) {
            let nextLane = Math.random() > 0.5 ? en.currentLane + 1 : en.currentLane - 1;
            if (nextLane >= 0 && nextLane <= 2) {
                en.currentLane = nextLane;
                en.targetX = lanes[nextLane];
            }
        }
        en.x += (en.targetX - en.x) * 0.08;
        if (!nitroActive && checkCollision(player, en)) gameOver();
        if (!nitroActive && !en.missCounted && Math.abs(player.y - en.y) < 30 && Math.abs(player.x - en.x) < 70 && Math.abs(player.x - en.x) > 40) {
            score += 5;
            nearMissText = "ADRENALINE! +5";
            nearMissTimer = 40;
            slowMoTimer = 15;
            en.missCounted = true;
            saveHighScore();
        }
        if (en.y > canvas.height) {
            enemies.splice(i, 1);
            score++;
            saveHighScore();
            nightMode = (Math.floor(score / 50) % 2 !== 0);
            refreshUI();
            enemySpeed += 0.02;
        }
    });

    items.forEach((it, i) => {
        it.y += currentSpeed;
        if (checkCollision(player, it)) {
            if (it.type === 'beer') { score += 15; drunkTimer = 150; canvas.classList.add('shake'); setTimeout(()=>canvas.classList.remove('shake'), 800); }
            else { nitroActive = true; score += 40; setTimeout(()=>nitroActive=false, 3500); }
            saveHighScore();
            items.splice(i, 1);
        }
        if (it.y > canvas.height) items.splice(i, 1);
    });
    if (nearMissTimer > 0) nearMissTimer--;
}

function draw() {
    let drunkOffset = drunkTimer > 0 ? Math.sin(frameCount * 0.15) * 5 : 0;
    ctx.save();
    ctx.translate(drunkOffset, 0);
    ctx.fillStyle = nightMode ? "#050505" : "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = nightMode ? "#111" : "#2d1e12";
    ctx.fillRect(0, 0, 30, canvas.height);
    ctx.fillRect(canvas.width - 30, 0, 30, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    particles.forEach(p => ctx.fillRect(p.x, p.y, p.s, p.s));
    ctx.strokeStyle = nitroActive ? "#00ffff" : "rgba(255, 255, 255, 0.15)";
    ctx.setLineDash([40, 40]);
    ctx.lineDashOffset = -frameCount * (enemySpeed + 5);
    ctx.strokeRect(canvas.width * 0.33, -10, 1, canvas.height + 20);
    ctx.strokeRect(canvas.width * 0.66, -10, 1, canvas.height + 20);
    if (nitroActive) {
        ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
        ctx.beginPath(); ctx.arc(player.x + player.w/2, player.y + player.h/2, 60, 0, Math.PI*2); ctx.fill();
    }
    ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
    if (nearMissTimer > 0) {
        ctx.fillStyle = "yellow";
        ctx.font = "bold 24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(nearMissText, player.x + player.w/2, player.y - 30);
        ctx.textAlign = "start";
    }
    enemies.forEach(e => ctx.drawImage(carImg, e.x, e.y, e.w, e.h));
    items.forEach(it => {
        if (it.type === 'beer') ctx.drawImage(beerImg, it.x, it.y, it.w, it.h);
        else { ctx.fillStyle = "cyan"; ctx.beginPath(); ctx.arc(it.x+20, it.y+20, 15, 0, Math.PI*2); ctx.fill(); }
    });
    ctx.restore();
    update();
    if (gameActive) requestAnimationFrame(draw);
}

let loaded = 0;
const start = () => { if(++loaded === 3) draw(); };
playerImg.onload = carImg.onload = beerImg.onload = start;
