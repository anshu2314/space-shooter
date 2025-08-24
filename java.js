// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Control mode declaration (moved to top to prevent initialization error)
let controlMode = null; // 'keyboard', 'mouse', or 'mobile'

// Mobile detection and setup
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let touchControls = {
    joystick: { x: 0, y: 0, active: false, centerX: 0, centerY: 0 },
    shootButton: { active: false, x: 0, y: 0, radius: 40 },
    specialButtons: { beam: false, gaze: false, nova: false }
};

// Canvas responsive setup
function setupCanvas() {
    const container = canvas.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    if (isMobile) {
        // Mobile: use full screen height minus control area
        const maxWidth = Math.min(window.innerWidth, containerRect.width);
        const maxHeight = window.innerHeight - 150; // Reserve 150px for controls
        
        canvas.style.width = maxWidth + 'px';
        canvas.style.height = maxHeight + 'px';
        
        // Set actual canvas dimensions (for crisp rendering)
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        
        // Reset context scale
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
        // Desktop: use fixed size
        canvas.width = 1100;
        canvas.height = 600;
        canvas.style.width = '1100px';
        canvas.style.height = '600px';
    }
    
    // Reinitialize touch controls after resize
    if (controlMode === 'mobile') {
        initializeTouchControls();
    }
}

// Handle window resize
window.addEventListener('resize', () => {
    if (isMobile) {
        setupCanvas();
    }
});

// Initial setup
setupCanvas();

// Game State
let gameRunning = true;
let score = 0;
let enemiesKilled = 0;
let bossSpawned = false;
let bossDefeated = false;
let nextBossScore = 3000;

let comboActive = false;
let comboTimer = 0;

// Sp cial3M0ves
let specialMoves = {
    beam: {
        cooldown: 20000, // ms
        duration: 5000, // ms
        lastUsed: -Infinity,
        active: false,
        timer: 0
    },
    gaze: {
        cooldown: 20000,
        duration: 7000,
        lastUsed: -Infinity,
        active: false,
        timer: 0
    },
    nova: {
        cooldown: 30000,
        duration: 1000, // pulse is instant, but effect lasts for 1s for animation
        lastUsed: -Infinity,
        active: false,
        timer: 0
    }
};

// Combo System (moved to global scope)

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 40,
    height: 60,
    speed: 5,
    health: 100,
    maxHealth: 100,
    shooting: false,
    lastShot: 0,
    shotCooldown: 200
};

// Arrays for game objects
let playerBullets = [];
let enemyBullets = [];
let enemies = [];
let bossBullets = [];
let bossMissiles = [];
let explosions = [];
let powerups = [];
let boss = null;

// Bonus round state
let bonusRoundActive = false;
let bonusRoundTimer = 0;

// Control selection modal logic - will be initialized in DOMContentLoaded
let controlModal, keyboardBtn, mouseBtn, mobileBtn, instructionsDiv, restartBtn;

// Input handling
const keys = {};
let mouseShooting = false;
let mouseShootingX = 0;
let mouseShootingY = 0;

// Keyboard controls
function setupKeyboardControls() {
    document.addEventListener('keydown', keyboardDownHandler);
    document.addEventListener('keyup', keyboardUpHandler);
}
function removeKeyboardControls() {
    document.removeEventListener('keydown', keyboardDownHandler);
    document.removeEventListener('keyup', keyboardUpHandler);
}
function keyboardDownHandler(e) {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') {
        e.preventDefault();
        player.shooting = true;
    }
    if (e.key === '1') activateBeam();
    if (e.key === '2') activateGaze();
    if (e.key === '3') activateNova();
}
function keyboardUpHandler(e) {
    keys[e.key.toLowerCase()] = false;
    if (e.key === ' ') {
        player.shooting = false;
    }
}

// Mouse controls
function setupMouseControls() {
    canvas.addEventListener('mousemove', mouseMoveHandler);
    canvas.addEventListener('mousedown', mouseDownHandler);
    canvas.addEventListener('mouseup', mouseUpHandler);
    canvas.addEventListener('mouseleave', mouseUpHandler);
}
function removeMouseControls() {
    canvas.removeEventListener('mousemove', mouseMoveHandler);
    canvas.removeEventListener('mousedown', mouseDownHandler);
    canvas.removeEventListener('mouseup', mouseUpHandler);
    canvas.removeEventListener('mouseleave', mouseUpHandler);
}
function mouseMoveHandler(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, mouseX));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, mouseY));
}
function mouseDownHandler(e) {
    mouseShooting = true;
    player.shooting = true;
}
function mouseUpHandler(e) {
    mouseShooting = false;
    player.shooting = false;
}

// Mobile touch controls
function setupMobileControls() {
    // Show mobile controls container
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
        mobileControls.classList.add('active');
    }
    
    // Set up joystick
    setupJoystick();
    
    // Set up buttons
    setupMobileButtons();
    
    // Initialize touch control positions
    initializeTouchControls();
}

function removeMobileControls() {
    // Hide mobile controls container
    const mobileControls = document.getElementById('mobileControls');
    if (mobileControls) {
        mobileControls.classList.remove('active');
    }
    
    // Remove joystick event listeners
    const joystickBase = document.getElementById('joystickBase');
    if (joystickBase) {
        joystickBase.replaceWith(joystickBase.cloneNode(true));
    }
    
    // Remove button event listeners
    const fireBtn = document.getElementById('fireBtn');
    const beamBtn = document.getElementById('beamBtn');
    const gazeBtn = document.getElementById('gazeBtn');
    const novaBtn = document.getElementById('novaBtn');
    
    if (fireBtn) fireBtn.replaceWith(fireBtn.cloneNode(true));
    if (beamBtn) beamBtn.replaceWith(beamBtn.cloneNode(true));
    if (gazeBtn) gazeBtn.replaceWith(gazeBtn.cloneNode(true));
    if (novaBtn) novaBtn.replaceWith(novaBtn.cloneNode(true));
}

function setupJoystick() {
    const joystickBase = document.getElementById('joystickBase');
    const joystickHandle = document.getElementById('joystickHandle');
    
    if (!joystickBase || !joystickHandle) return;
    
    let isDragging = false;
    let startX, startY;
    
    joystickBase.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDragging = true;
        const rect = joystickBase.getBoundingClientRect();
        startX = e.touches[0].clientX - rect.left;
        startY = e.touches[0].clientY - rect.top;
        touchControls.joystick.active = true;
    });
    
    joystickBase.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDragging) return;
        
        const rect = joystickBase.getBoundingClientRect();
        const touchX = e.touches[0].clientX - rect.left;
        const touchY = e.touches[0].clientY - rect.top;
        
        const deltaX = touchX - rect.width / 2;
        const deltaY = touchY - rect.height / 2;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = rect.width / 2 - 20;
        
        if (distance > maxDistance) {
            const angle = Math.atan2(deltaY, deltaX);
            touchControls.joystick.x = Math.cos(angle) * maxDistance;
            touchControls.joystick.y = Math.sin(angle) * maxDistance;
        } else {
            touchControls.joystick.x = deltaX;
            touchControls.joystick.y = deltaY;
        }
        
        // Update joystick handle position
        joystickHandle.style.transform = `translate(calc(-50% + ${touchControls.joystick.x}px), calc(-50% + ${touchControls.joystick.y}px))`;
    });
    
    joystickBase.addEventListener('touchend', (e) => {
        e.preventDefault();
        isDragging = false;
        touchControls.joystick.active = false;
        touchControls.joystick.x = 0;
        touchControls.joystick.y = 0;
        joystickHandle.style.transform = 'translate(-50%, -50%)';
    });
}

function setupMobileButtons() {
    const fireBtn = document.getElementById('fireBtn');
    const beamBtn = document.getElementById('beamBtn');
    const gazeBtn = document.getElementById('gazeBtn');
    const novaBtn = document.getElementById('novaBtn');
    
    if (fireBtn) {
        fireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchControls.shootButton.active = true;
            player.shooting = true;
        });
        
        fireBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchControls.shootButton.active = false;
            player.shooting = false;
        });
    }
    
    if (beamBtn) {
        beamBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            activateBeam();
        });
    }
    
    if (gazeBtn) {
        gazeBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            activateGaze();
        });
    }
    
    if (novaBtn) {
        novaBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            activateNova();
        });
    }
}

function initializeTouchControls() {
    // No longer needed since we're using HTML controls
    // The controls are positioned by CSS
}

// Game functions
function restartGame() {
    // Cancel any running animation frame
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    gameRunning = true;
    score = 0;
    enemiesKilled = 0;
    bossSpawned = false;
    bossDefeated = false;
    player.health = 100;
    player.x = canvas.width / 2;
    player.y = canvas.height - 80;
    player.shooting = false;
    player.lastShot = 0;
    // Clear arrays
    playerBullets = [];
    enemyBullets = [];
    enemies = [];
    bossBullets = [];
    bossMissiles = [];
    explosions = [];
    boss = null;
    // Hide UI elements
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('bossHealth').style.display = 'none';
    // Update UI
    updateHealthBar();
    updateScore();
    // Set up controls based on mode
    if (controlMode === 'keyboard') {
        setupKeyboardControls();
        removeMouseControls();
        removeMobileControls();
    } else if (controlMode === 'mouse') {
        setupMouseControls();
        removeKeyboardControls();
        removeMobileControls();
    } else if (controlMode === 'mobile') {
        setupMobileControls();
        removeKeyboardControls();
        removeMouseControls();
    }
    // Start a new game loop
    gameLoop();
}

function updateHealthBar() {
    const healthFill = document.getElementById('healthFill');
    const healthPercent = (player.health / player.maxHealth) * 100;
    healthFill.style.width = healthPercent + '%';
}

function updateSpecialUI() {
    // Get references to UI elements
    const beamCooldown = document.getElementById('beamCooldown');
    const gazeCooldown = document.getElementById('gazeCooldown');
    const novaCooldown = document.getElementById('novaCooldown');
    const beamMove = document.getElementById('beamMove');
    const gazeMove = document.getElementById('gazeMove');
    const novaMove = document.getElementById('novaMove');

    // Update Beam UI
    if (specialMoves.beam.active) {
        beamCooldown.textContent = 'Active!';
        beamMove.classList.add('active');
    } else {
        const beamCD = Math.ceil((specialMoves.beam.lastUsed + specialMoves.beam.cooldown - Date.now()) / 1000);
        beamCooldown.textContent = beamCD > 0 ? `${beamCD}s` : 'Ready';
        beamMove.classList.toggle('on-cooldown', beamCD > 0);
        beamMove.classList.remove('active');
    }

    // Update Gaze UI
    if (specialMoves.gaze.active) {
        gazeCooldown.textContent = 'Active!';
        gazeMove.classList.add('active');
    } else {
        const gazeCD = Math.ceil((specialMoves.gaze.lastUsed + specialMoves.gaze.cooldown - Date.now()) / 1000);
        gazeCooldown.textContent = gazeCD > 0 ? `${gazeCD}s` : 'Ready';
        gazeMove.classList.toggle('on-cooldown', gazeCD > 0);
        gazeMove.classList.remove('active');
    }

    // Update Nova UI
    if (specialMoves.nova.active) {
        novaCooldown.textContent = 'Active!';
        novaMove.classList.add('active');
    } else {
        const novaCD = Math.ceil((specialMoves.nova.lastUsed + specialMoves.nova.cooldown - Date.now()) / 1000);
        novaCooldown.textContent = novaCD > 0 ? `${novaCD}s` : 'Ready';
        novaMove.classList.toggle('on-cooldown', novaCD > 0);
        novaMove.classList.remove('active');
    }
}

function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}

function updateBoostBars() {
    // Minimal implementation to prevent ReferenceError
    // Optionally update UI for attack/defense boost bars here
}

function updateBossBar() {
    // Minimal implementation to prevent ReferenceError
    // You may want to call updateBossHealth() here if needed
    if (typeof updateBossHealth === 'function') updateBossHealth();
}

function updateBossHealth() {
    if (boss) {
        const bossHealthFill = document.getElementById('bossHealthFill');
        const healthPercent = (boss.health / boss.maxHealth) * 100;
        bossHealthFill.style.width = healthPercent + '%';
    }
}

function showBossHealth() {
    document.getElementById('bossHealth').style.display = 'block';
}

function gameOver() {
    gameRunning = false;
    document.getElementById('gameOver').style.display = 'block';
    document.getElementById('restartBtn').style.display = 'block';
}

// Player functions
function updatePlayer() {
    if (controlMode === 'keyboard') {
        // Movement
        if (keys['a'] || keys['arrowleft']) {
            player.x -= player.speed;
        }
        if (keys['d'] || keys['arrowright']) {
            player.x += player.speed;
        }
        if (keys['w'] || keys['arrowup']) {
            player.y -= player.speed;
        }
        if (keys['s'] || keys['arrowdown']) {
            player.y += player.speed;
        }
        // Keep player in bounds
        player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
        player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
    } else if (controlMode === 'mobile') {
        // Mobile joystick movement
        if (touchControls.joystick.active) {
            const joystickSensitivity = 0.3;
            player.x += touchControls.joystick.x * joystickSensitivity;
            player.y += touchControls.joystick.y * joystickSensitivity;
        }
        // Keep player in bounds
        player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
        player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));
    }
    // Shooting handled by player.shooting (set by keyboard, mouse, or mobile)
    if (player.shooting && Date.now() - player.lastShot > player.shotCooldown) {
        shootPlayerBullet();
        player.lastShot = Date.now();
    }
}

function shootPlayerBullet() {
    playerBullets.push({
        x: player.x,
        y: player.y - player.height / 2,
        width: 4,
        height: 12,
        speed: 8,
        damage: 10
    });
}

function drawPowerups() {
    powerups.forEach(p => {
        ctx.save();
        // Choose color based on type
        if (p.type === 'sword') {
            ctx.fillStyle = '#ffeb3b'; // yellow for sword
        } else if (p.type === 'shield') {
            ctx.fillStyle = '#00e5ff'; // blue for shield
        } else {
            ctx.fillStyle = '#ffffff'; // fallback
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawPlayer() {
    ctx.save();
    
    // Engine glow effect (behind ship)
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    const glowIntensity = 0.7 + 0.3 * Math.sin(Date.now() / 100);
    ctx.globalAlpha = glowIntensity;
    
    // Engine flames
    const flameHeight = 15 + 5 * Math.sin(Date.now() / 80);
    const gradient = ctx.createLinearGradient(0, player.y + player.height / 2, 0, player.y + player.height / 2 + flameHeight);
    gradient.addColorStop(0, '#00ffff');
    gradient.addColorStop(0.5, '#0088ff');
    gradient.addColorStop(1, 'rgba(0, 136, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(player.x - 8, player.y + player.height / 2, 16, flameHeight);
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    // Main ship body with gradient
    const bodyGradient = ctx.createLinearGradient(0, player.y - player.height / 2, 0, player.y + player.height / 2);
    bodyGradient.addColorStop(0, '#ffffff');
    bodyGradient.addColorStop(0.3, '#00ffff');
    bodyGradient.addColorStop(0.7, '#0088ff');
    bodyGradient.addColorStop(1, '#004488');
    ctx.fillStyle = bodyGradient;
    
    // Ship hull (sleek design)
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x - player.width / 3, player.y);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 3);
    ctx.lineTo(player.x, player.y + player.height / 2);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 3);
    ctx.lineTo(player.x + player.width / 3, player.y);
    ctx.closePath();
    ctx.fill();
    
    // Wing details
    ctx.fillStyle = '#0066cc';
    ctx.beginPath();
    ctx.moveTo(player.x - player.width / 2 - 8, player.y + 5);
    ctx.lineTo(player.x - player.width / 2, player.y);
    ctx.lineTo(player.x - player.width / 2, player.y + 15);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(player.x + player.width / 2 + 8, player.y + 5);
    ctx.lineTo(player.x + player.width / 2, player.y);
    ctx.lineTo(player.x + player.width / 2, player.y + 15);
    ctx.closePath();
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 5, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Weapon hardpoints
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(player.x - 15, player.y + 10, 4, 8);
    ctx.fillRect(player.x + 11, player.y + 10, 4, 8);
    
    ctx.restore();
}

// Mobile touch control UI - Now using HTML controls instead of canvas drawing
function drawMobileControls() {
    // No longer drawing controls on canvas - using HTML controls instead
    if (controlMode !== 'mobile') return;
    
    // Update special button states
    updateMobileSpecialButtons();
}

function updateMobileSpecialButtons() {
    const beamBtn = document.getElementById('beamBtn');
    const gazeBtn = document.getElementById('gazeBtn');
    const novaBtn = document.getElementById('novaBtn');
    
    if (beamBtn) {
        beamBtn.classList.toggle('active', specialMoves.beam.active);
    }
    if (gazeBtn) {
        gazeBtn.classList.toggle('active', specialMoves.gaze.active);
    }
    if (novaBtn) {
        novaBtn.classList.toggle('active', specialMoves.nova.active);
    }
}

// --- LEVEL STATE ---
let level = 1;
let levelTransitioning = false;
const levelOverlay = document.getElementById('levelOverlay');
const levelText = document.getElementById('levelText');
const levelTick = document.getElementById('levelTick');

function showLevelOverlay(text, showTick = false, fade = true) {
    levelText.textContent = text;
    levelTick.style.display = showTick ? 'block' : 'none';
    levelOverlay.style.opacity = '1';
    levelOverlay.style.pointerEvents = 'auto';
    if (fade) {
        setTimeout(() => {
            levelOverlay.style.opacity = '0';
            levelOverlay.style.pointerEvents = 'none';
        }, 1500);
    }
}

function doLevelTransition(nextLevel) {
    levelTransitioning = true;
    // Disable all player input
    removeKeyboardControls();
    removeMouseControls();
    let originalControlMode = controlMode;
    controlMode = null;
    // Animate player ship to center, then up
    let startX = player.x;
    let startY = player.y;
    let midX = canvas.width / 2;
    let moveToCenterDuration = 600;
    let moveUpDuration = 1200;
    let startTime = null;
    function animateToCenter(ts) {
        if (!startTime) startTime = ts;
        let t = Math.min(1, (ts - startTime) / moveToCenterDuration);
        player.x = startX + (midX - startX) * t;
        if (t < 1) {
            requestAnimationFrame(animateToCenter);
        } else {
            player.x = midX;
            startTime = null;
            requestAnimationFrame(animateShipUp);
        }
    }
    function animateShipUp(ts) {
        if (!startTime) startTime = ts;
        let t = Math.min(1, (ts - startTime) / moveUpDuration);
        player.y = startY + (-player.height - startY) * t;
        if (t < 1) {
            requestAnimationFrame(animateShipUp);
        } else {
            player.y = -player.height;
            // Show level text
            levelOverlay.style.opacity = '1';
            levelOverlay.style.pointerEvents = 'auto';
            levelText.textContent = `Level ${level}`;
            levelTick.style.display = 'none';
            setTimeout(() => {
                levelTick.style.display = 'block';
                setTimeout(() => {
                    levelOverlay.style.opacity = '0';
                    levelOverlay.style.pointerEvents = 'none';
                    setTimeout(() => {
                        // Fade out, then show next level
                        level++;
                        levelText.textContent = `Level ${level}`;
                        levelTick.style.display = 'none';
                        levelOverlay.style.opacity = '1';
                        setTimeout(() => {
                            levelOverlay.style.opacity = '0';
                            levelOverlay.style.pointerEvents = 'none';
                            setTimeout(() => {
                                // Reset player position and start next level
                                player.x = canvas.width / 2;
                                player.y = canvas.height - 80;
                                player.health = 100;
                                updateHealthBar();
                                startLevel();
                                levelTransitioning = false;
                                // Re-enable input
                                controlMode = originalControlMode;
                                if (controlMode === 'keyboard') {
                                    setupKeyboardControls();
                                } else if (controlMode === 'mouse') {
                                    setupMouseControls();
                                }
                            }, 800);
                        }, 1200);
                    }, 800);
                }, 1200);
            }, 1200);
        }
    }
    requestAnimationFrame(animateToCenter);
}

function startLevel() {
    // Show 'LEVEL X START' text
    levelOverlay.style.opacity = '1';
    levelOverlay.style.pointerEvents = 'auto';
    levelText.textContent = `LEVEL ${level} START`;
    levelTick.style.display = 'none';
    setTimeout(() => {
        levelOverlay.style.opacity = '0';
        levelOverlay.style.pointerEvents = 'none';
    }, 1200);
    // Reset boss state
    bossSpawned = false;
    bossDefeated = false;
    boss = null;
    enemies = [];
    enemyBullets = [];
    bossBullets = [];
    bossMissiles = [];
    playerBullets = [];
    explosions = [];
    // Reset special moves
    Object.values(specialMoves).forEach(move => {
        move.active = false;
        move.timer = 0;
    });
    // Reset nextBossScore
    nextBossScore = Math.ceil(score / 3000) * 3000 + 3000;
}

// --- ENEMY COLOR & DAMAGE SCALING ---
function getRandomEnemyColor() {
    const colors = [
        '#ff1744', '#ff9100', '#ffd600', '#00e676', '#2979ff', '#00bcd4', '#d500f9', '#ff4081', '#8d6e63', '#cfd8dc'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
let currentEnemyColor = getRandomEnemyColor();

function spawnEnemy() {
    const maxEnemies = isMobile ? 3 : 5; // Fewer enemies on mobile
    if (enemies.length < maxEnemies && !bossSpawned && !levelTransitioning) {
        enemies.push({
            x: Math.random() * (canvas.width - 40) + 20,
            y: -40,
            width: 35,
            height: 45,
            speed: 2 + Math.random() * 2,
            health: 1,
            lastShot: 0,
            shotCooldown: 1000 + Math.random() * 2000,
            color: currentEnemyColor
        });
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Movement
        enemy.y += enemy.speed;
        
        // Shooting
        if (Date.now() - enemy.lastShot > enemy.shotCooldown) {
            shootEnemyBullet(enemy);
            enemy.lastShot = Date.now();
        }
        
        // Remove if off screen
        if (enemy.y > canvas.height + 50) {
            enemies.splice(i, 1);
        }
    }
}

function shootEnemyBullet(enemy) {
    enemyBullets.push({
        x: enemy.x,
        y: enemy.y + enemy.height / 2,
        width: 3,
        height: 8,
        speed: 4,
        damage: 10 + 5 * (level - 1)
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        if (enemy.type === 'drone') {
            // Draw drone as a white glowing orb with a blue ring
            ctx.save();
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00e5ff';
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        } else {
            // Modern enemy design
            ctx.save();
            
            // Enemy glow effect
            ctx.shadowColor = enemy.color || currentEnemyColor;
            ctx.shadowBlur = 15;
            
            // Main body with gradient
            const enemyGradient = ctx.createLinearGradient(0, enemy.y - enemy.height / 2, 0, enemy.y + enemy.height / 2);
            enemyGradient.addColorStop(0, '#444444');
            enemyGradient.addColorStop(0.5, enemy.color || currentEnemyColor);
            enemyGradient.addColorStop(1, '#222222');
            ctx.fillStyle = enemyGradient;
            
            // Enemy hull (angular design)
            ctx.beginPath();
            ctx.moveTo(enemy.x, enemy.y + enemy.height / 2);
            ctx.lineTo(enemy.x - enemy.width / 3, enemy.y);
            ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 3);
            ctx.lineTo(enemy.x, enemy.y - enemy.height / 2);
            ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 3);
            ctx.lineTo(enemy.x + enemy.width / 3, enemy.y);
            ctx.closePath();
            ctx.fill();
            
            // Wing details
            ctx.fillStyle = '#660000';
            ctx.beginPath();
            ctx.moveTo(enemy.x - enemy.width / 2 - 6, enemy.y - 5);
            ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - 10);
            ctx.lineTo(enemy.x - enemy.width / 2, enemy.y + 10);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(enemy.x + enemy.width / 2 + 6, enemy.y - 5);
            ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - 10);
            ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + 10);
            ctx.closePath();
            ctx.fill();
            
            // Enemy cockpit/core
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y - 3, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Weapon ports
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(enemy.x - 12, enemy.y + 8, 3, 6);
            ctx.fillRect(enemy.x + 9, enemy.y + 8, 3, 6);
            
            ctx.restore();
        }
    });
}

// Boss functions
function spawnBoss() {
    const baseHP = 400;
    const bossHP = Math.round(baseHP * Math.pow(1.2, level - 1));
    boss = {
        x: canvas.width / 2,
        y: -100,
        width: 80,
        height: 100,
        speed: 1,
        health: bossHP,
        maxHealth: bossHP,
        lastShot: 0,
        shotCooldown: 1000,
        lastMissile: 0,
        missileCooldown: 4000,
        phase: 0,
        phaseTimer: 0,
        moveDir: 1,
        moveSpeed: 1
    };
    bossSpawned = true;
    showBossHealth();
}

function updateBoss() {
    if (!boss) return;
    // Movement: stay near top, move left/right slowly
    if (boss.stunnedUntil && Date.now() < boss.stunnedUntil) {
        // Stunned: don't move or shoot
        return;
    }
    if (boss.y < 50) {
        boss.y += boss.speed;
    } else {
        boss.x += boss.moveDir * boss.moveSpeed;
        if (boss.x < boss.width / 2 + 10) {
            boss.x = boss.width / 2 + 10;
            boss.moveDir = 1;
        } else if (boss.x > canvas.width - boss.width / 2 - 10) {
            boss.x = canvas.width - boss.width / 2 - 10;
            boss.moveDir = -1;
        }
    }
    // Shooting patterns
    if (Date.now() - boss.lastShot > boss.shotCooldown) {
        shootBossBullets();
        boss.lastShot = Date.now();
    }
    if (Date.now() - boss.lastMissile > boss.missileCooldown) {
        shootBossMissiles();
        boss.lastMissile = Date.now();
    }
    // Phase changes (only for visual/attack pattern, not speed)
    boss.phaseTimer++;
    if (boss.phaseTimer > 300) {
        boss.phase = (boss.phase + 1) % 3;
        boss.phaseTimer = 0;
        // Keep cooldowns always slow
        boss.shotCooldown = 1000;
        boss.missileCooldown = 4000;
    }
}

function shootBossBullets() {
    const bulletCount = boss.phase === 0 ? 3 : boss.phase === 1 ? 5 : 7;
    const spread = boss.phase === 0 ? 30 : boss.phase === 1 ? 45 : 60;
    
    for (let i = 0; i < bulletCount; i++) {
        const angle = (i - (bulletCount - 1) / 2) * (spread / bulletCount) * Math.PI / 180;
        bossBullets.push({
            x: boss.x,
            y: boss.y + boss.height / 2,
            width: 6,
            height: 10,
            speedX: Math.sin(angle) * 3,
            speedY: 5,
            damage: 20
        });
    }
}

function shootBossMissiles() {
    for (let i = 0; i < 3; i++) {
        const targetX = player.x + (i - 1) * 50;
        const dx = targetX - boss.x;
        const dy = player.y - boss.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        bossMissiles.push({
            x: boss.x,
            y: boss.y + boss.height / 2,
            width: 8,
            height: 15,
            speedX: (dx / distance) * 4,
            speedY: (dy / distance) * 4,
            damage: 20
        });
    }
}

function drawBoss() {
    if (!boss) return;
    
    ctx.save();
    
    // Boss intimidating glow effect
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 25;
    const bossGlowIntensity = 0.8 + 0.2 * Math.sin(Date.now() / 150);
    ctx.globalAlpha = bossGlowIntensity;
    
    // Main boss body with menacing gradient
    const bossGradient = ctx.createLinearGradient(0, boss.y - boss.height / 2, 0, boss.y + boss.height / 2);
    bossGradient.addColorStop(0, '#660000');
    bossGradient.addColorStop(0.3, '#ff0000');
    bossGradient.addColorStop(0.7, '#cc0000');
    bossGradient.addColorStop(1, '#330000');
    ctx.fillStyle = bossGradient;
    
    // Boss hull (intimidating angular design)
    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y - boss.height / 2);
    ctx.lineTo(boss.x - boss.width / 3, boss.y - boss.height / 4);
    ctx.lineTo(boss.x - boss.width / 2, boss.y);
    ctx.lineTo(boss.x - boss.width / 3, boss.y + boss.height / 3);
    ctx.lineTo(boss.x, boss.y + boss.height / 2);
    ctx.lineTo(boss.x + boss.width / 3, boss.y + boss.height / 3);
    ctx.lineTo(boss.x + boss.width / 2, boss.y);
    ctx.lineTo(boss.x + boss.width / 3, boss.y - boss.height / 4);
    ctx.closePath();
    ctx.fill();
    
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    // Massive wing structures
    ctx.fillStyle = '#990000';
    ctx.beginPath();
    ctx.moveTo(boss.x - boss.width / 2 - 15, boss.y - 10);
    ctx.lineTo(boss.x - boss.width / 2, boss.y - 20);
    ctx.lineTo(boss.x - boss.width / 2, boss.y + 25);
    ctx.lineTo(boss.x - boss.width / 2 - 25, boss.y + 15);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(boss.x + boss.width / 2 + 15, boss.y - 10);
    ctx.lineTo(boss.x + boss.width / 2, boss.y - 20);
    ctx.lineTo(boss.x + boss.width / 2, boss.y + 25);
    ctx.lineTo(boss.x + boss.width / 2 + 25, boss.y + 15);
    ctx.closePath();
    ctx.fill();
    
    // Boss command center/cockpit
    ctx.shadowColor = '#ffff00';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(boss.x, boss.y - 8, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Menacing weapon systems
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff6600';
    ctx.fillStyle = '#ff3300';
    
    // Left weapon array
    ctx.fillRect(boss.x - 30, boss.y + 15, 8, 20);
    ctx.fillRect(boss.x - 20, boss.y + 20, 6, 15);
    
    // Right weapon array
    ctx.fillRect(boss.x + 22, boss.y + 15, 8, 20);
    ctx.fillRect(boss.x + 14, boss.y + 20, 6, 15);
    
    // Central heavy cannon
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(boss.x - 4, boss.y + 25, 8, 25);
    
    // Engine exhausts with animated glow
    const engineGlow = 0.6 + 0.4 * Math.sin(Date.now() / 100);
    ctx.globalAlpha = engineGlow;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#0088ff';
    ctx.fillRect(boss.x - 25, boss.y + 35, 6, 12);
    ctx.fillRect(boss.x + 19, boss.y + 35, 6, 12);
    
    // Boss health indicator (pulsing red core)
    if (boss.health < boss.maxHealth * 0.3) {
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 80);
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, 8, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.restore();
}

// Bullet functions
function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        let p = powerups[i];
        p.y += p.vy;
        // Remove if off screen
        if (p.y > canvas.height + 20) powerups.splice(i, 1);
        // Collect if player touches
        if (
            Math.abs(p.x - player.x) < 30 &&
            Math.abs(p.y - player.y) < 30
        ) {
            p.collected = true;
            collectPowerup(p.type);
            powerups.splice(i, 1);
        }
    }
}

function updateBullets() {
    // Player bullets
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        if (bullet.special === 'gaze') {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
        } else {
            bullet.y -= bullet.speed;
        }
        
        if (bullet.y < -bullet.height || bullet.x < -bullet.width / 2 || bullet.x > canvas.width + bullet.width / 2) {
            playerBullets.splice(i, 1);
        }
    }
    
    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.y += bullet.speed;
        
        if (bullet.y > canvas.height + bullet.height) {
            enemyBullets.splice(i, 1);
        }
    }
    
    // Boss bullets
    for (let i = bossBullets.length - 1; i >= 0; i--) {
        const bullet = bossBullets[i];
        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
        
        if (bullet.y > canvas.height + bullet.height || bullet.x < -bullet.width || bullet.x > canvas.width + bullet.width) {
            bossBullets.splice(i, 1);
        }
    }
    
    // Boss missiles
    for (let i = bossMissiles.length - 1; i >= 0; i--) {
        const missile = bossMissiles[i];
        missile.x += missile.speedX;
        missile.y += missile.speedY;
        
        if (missile.y > canvas.height + missile.height || missile.x < -missile.width || missile.x > canvas.width + missile.width) {
            bossMissiles.splice(i, 1);
        }
    }
}

function drawBullets() {
    // Player bullets
    playerBullets.forEach(bullet => {
        if (bullet.special === 'gaze') {
            // Use a simpler, more performant style for the high volume of Gaze bullets
            ctx.fillStyle = '#ffff00'; // A simple, bright yellow
            ctx.beginPath();
            ctx.rect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
            ctx.fill();
        } else {
            // Original, more detailed style for standard bullets
            ctx.save();
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;
            const bulletGradient = ctx.createLinearGradient(0, bullet.y, 0, bullet.y + bullet.height);
            bulletGradient.addColorStop(0, '#ffffff');
            bulletGradient.addColorStop(0.5, '#00ffff');
            bulletGradient.addColorStop(1, '#0088ff');
            ctx.fillStyle = bulletGradient;
            ctx.beginPath();
            ctx.roundRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height, bullet.width / 2);
            ctx.fill();
            ctx.restore();
        }
    });
    
    // Enemy bullets
    enemyBullets.forEach(bullet => {
        ctx.save();
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 12;
        
        // Create gradient for enemy bullets
        const bulletGradient = ctx.createLinearGradient(0, bullet.y, 0, bullet.y + bullet.height);
        bulletGradient.addColorStop(0, '#ff6666');
        bulletGradient.addColorStop(0.5, '#ff0000');
        bulletGradient.addColorStop(1, '#cc0000');
        ctx.fillStyle = bulletGradient;
        
        // Draw angular enemy bullet
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x - bullet.width / 2, bullet.y + bullet.height / 3);
        ctx.lineTo(bullet.x - bullet.width / 3, bullet.y + bullet.height);
        ctx.lineTo(bullet.x + bullet.width / 3, bullet.y + bullet.height);
        ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height / 3);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    });
    
    // Boss bullets
    bossBullets.forEach(bullet => {
        ctx.save();
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 18;
        
        // Create gradient for boss bullets
        const bulletGradient = ctx.createLinearGradient(0, bullet.y, 0, bullet.y + bullet.height);
        bulletGradient.addColorStop(0, '#ffaa00');
        bulletGradient.addColorStop(0.5, '#ff6600');
        bulletGradient.addColorStop(1, '#cc3300');
        ctx.fillStyle = bulletGradient;
        
        // Draw hexagonal boss bullet
        ctx.beginPath();
        const centerX = bullet.x;
        const centerY = bullet.y + bullet.height / 2;
        const radius = bullet.width / 2;
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        
        // Add energy core
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius / 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
    
    // Boss missiles
    bossMissiles.forEach(missile => {
        ctx.save();
        ctx.shadowColor = '#ff00ff';
        ctx.shadowBlur = 20;
        
        // Create gradient for missiles
        const missileGradient = ctx.createLinearGradient(0, missile.y, 0, missile.y + missile.height);
        missileGradient.addColorStop(0, '#ff66ff');
        missileGradient.addColorStop(0.5, '#ff00ff');
        missileGradient.addColorStop(1, '#cc00cc');
        ctx.fillStyle = missileGradient;
        
        // Draw missile with fins
        ctx.beginPath();
        ctx.moveTo(missile.x, missile.y);
        ctx.lineTo(missile.x - missile.width / 3, missile.y + missile.height / 2);
        ctx.lineTo(missile.x - missile.width / 2, missile.y + missile.height / 2);
        ctx.lineTo(missile.x - missile.width / 4, missile.y + missile.height);
        ctx.lineTo(missile.x + missile.width / 4, missile.y + missile.height);
        ctx.lineTo(missile.x + missile.width / 2, missile.y + missile.height / 2);
        ctx.lineTo(missile.x + missile.width / 3, missile.y + missile.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Add thruster glow
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(missile.x, missile.y + missile.height, missile.width / 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
}

// Explosion effects
function createExplosion(x, y, size = 20) {
    explosions.push({
        x: x,
        y: y,
        size: size,
        life: 30,
        maxLife: 30
    });
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        explosion.life--;
        
        if (explosion.life <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function drawExplosions() {
    explosions.forEach(explosion => {
        const alpha = explosion.life / explosion.maxLife;
        const size = explosion.size * (1 + (1 - alpha));
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `hsl(${30 + (1 - alpha) * 30}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// Collision detection helper function
// Using rectangle-based collision for accurate hit detection
function checkCollision(obj1, obj2) {
    // Expand collision box for wings if player or enemy
    function getRect(obj, isPlayer) {
        let pad = 0;
        if (isPlayer) pad = 10;
        else if (obj.type === 'drone' || obj.type === 'bonus' || obj.type === undefined) pad = 8; // enemy or drone
        return {
            left: obj.x - (obj.width / 2) - pad,
            right: obj.x + (obj.width / 2) + pad,
            top: obj.y - (obj.height / 2),
            bottom: obj.y + (obj.height / 2)
        };
    }
    // Detect if obj1 or obj2 is player
    const isObj1Player = obj1 === player;
    const isObj2Player = obj2 === player;
    const rect1 = getRect(obj1, isObj1Player);
    const rect2 = getRect(obj2, isObj2Player);
    // Check for rectangle overlap
    return rect1.left < rect2.right && 
           rect1.right > rect2.left && 
           rect1.top < rect2.bottom && 
           rect1.bottom > rect2.top;
}

// Collision detection
/*
function checkCollisions() {
    // Player bullets vs enemies
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        let bulletRemoved = false;
        // Check enemy collisions
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (checkCollision(bullet, enemy)) {
                enemy.health -= bullet.damage * (comboActive ? 1.5 : 1);
                if (enemy.health <= 0) {
                    // Drop logic (only for regular enemies, not boss)
                    if (Math.random() < 0.10) {
                        let type = Math.random() < 0.5 ? 'sword' : 'shield';
                        powerups.push({
                            x: enemy.x,
                            y: enemy.y,
                            type: type,
                            vy: 1.2, // slower fall for visibility
                            collected: false
                        });
                    }
                    createExplosion(enemy.x, enemy.y);
                    enemies.splice(j, 1);
                    enemiesKilled++;
                    score += bonusRoundActive ? 200 : 100;
                    if (typeof registerKill === 'function') registerKill();
                }
                playerBullets.splice(i, 1);
                bulletRemoved = true;
                break;
            }
        }
        if (bulletRemoved) continue;
        // Check boss collision (unchanged)
        if (boss && checkCollision(bullet, boss)) {
            boss.health -= (comboActive ? 15 : 10);
            playerBullets.splice(i, 1);
            updateBossHealth();
            if (boss.health <= 0) {
                createExplosion(boss.x, boss.y, 50);
                boss = null;
                bossDefeated = true;
                document.getElementById('bossHealth').style.display = 'none';
                score += 1000;
                // Clear all boss projectiles so player can't be hit during transition
                bossBullets = [];
                bossMissiles = [];
                // Bonus round every 3 levels
                if ((level % 3 === 0) && !bonusRoundActive) {
                    setTimeout(() => {
                        startBonusRound();
                        setTimeout(() => {
                            endBonusRound();
                            setTimeout(() => {
                                doLevelTransition(level + 1);
                                currentEnemyColor = getRandomEnemyColor();
                            }, 800);
                        }, 20000);
                    }, 800);
                } else {
                    setTimeout(() => {
                        doLevelTransition(level + 1);
                        currentEnemyColor = getRandomEnemyColor();
                    }, 800);
                }
            }
        }
    }
    // Enemy bullets vs player (unchanged)
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (checkCollision(bullet, player)) {
            if (!bonusRoundActive) {
                let damage = bullet.damage;
                if (defenseBoostStacks > 0) {
                    damage = Math.round(damage * (1 - 0.07 * defenseBoostStacks));
                }
                player.health -= damage;
                updateHealthBar();
                if (player.health <= 0) {
                    gameOver();
                }
            }
            enemyBullets.splice(i, 1);
        }
    }
    // Boss bullets vs player (unchanged)
    for (let i = bossBullets.length - 1; i >= 0; i--) {
        const bullet = bossBullets[i];
        if (checkCollision(bullet, player)) {
            if (!bonusRoundActive) {
                let damage = bullet.damage;
                if (defenseBoostStacks > 0) {
                    damage = Math.round(damage * (1 - 0.07 * defenseBoostStacks));
                }
                player.health -= damage;
                updateHealthBar();
                if (player.health <= 0) {
                    gameOver();
                }
            }
            bossBullets.splice(i, 1);
        }
    }
    // Boss missiles vs player (unchanged)
    for (let i = bossMissiles.length - 1; i >= 0; i--) {
        const missile = bossMissiles[i];
        if (checkCollision(missile, player)) {
            if (!bonusRoundActive) {
                let damage = missile.damage;
                if (defenseBoostStacks > 0) {
                    damage = Math.round(damage * (1 - 0.07 * defenseBoostStacks));
                }
                player.health -= damage;
                updateHealthBar();
                if (player.health <= 0) {
                    gameOver();
                }
            }
            bossMissiles.splice(i, 1);
        }
    }
};
*/

// Special moves state is already defined at the top of the file

// --- SPECIAL MOVES UI ---
const beamMoveDiv = document.getElementById('beamMove');
const gazeMoveDiv = document.getElementById('gazeMove');
const novaMoveDiv = document.getElementById('novaMove');
const beamCooldownDiv = document.getElementById('beamCooldown');
const gazeCooldownDiv = document.getElementById('gazeCooldown');
const novaCooldownDiv = document.getElementById('novaCooldown');

function updateSpecialUI() {
    // Beam
    let now = Date.now();
    let ready = now - specialMoves.beam.lastUsed >= specialMoves.beam.cooldown;
    let cd = Math.max(0, specialMoves.beam.cooldown - (now - specialMoves.beam.lastUsed));
    beamCooldownDiv.textContent = specialMoves.beam.active ? 'Active!' : (ready ? 'Ready' : (cd/1000).toFixed(1)+'s');
    beamMoveDiv.classList.toggle('active', specialMoves.beam.active);
    // Gaze
    ready = now - specialMoves.gaze.lastUsed >= specialMoves.gaze.cooldown;
    cd = Math.max(0, specialMoves.gaze.cooldown - (now - specialMoves.gaze.lastUsed));
    gazeCooldownDiv.textContent = specialMoves.gaze.active ? 'Active!' : (ready ? 'Ready' : (cd/1000).toFixed(1)+'s');
    gazeMoveDiv.classList.toggle('active', specialMoves.gaze.active);
    // Nova
    ready = now - specialMoves.nova.lastUsed >= specialMoves.nova.cooldown;
    cd = Math.max(0, specialMoves.nova.cooldown - (now - specialMoves.nova.lastUsed));
    novaCooldownDiv.textContent = specialMoves.nova.active ? 'Active!' : (ready ? 'Ready' : (cd/1000).toFixed(1)+'s');
    novaMoveDiv.classList.toggle('active', specialMoves.nova.active);
}

// --- SPECIAL MOVES ACTIVATION ---
document.addEventListener('keydown', function(e) {
    if (e.repeat) return;
    if (controlModal.style.display !== 'none') return;
    if (e.key === '1') activateBeam();
    if (e.key === '2') activateGaze();
    if (e.key === '3') activateNova();
});

function activateBeam() {
    let now = Date.now();
    if (now - specialMoves.beam.lastUsed < specialMoves.beam.cooldown || specialMoves.beam.active) return;
    specialMoves.beam.active = true;
    specialMoves.beam.timer = specialMoves.beam.duration;
    specialMoves.beam.lastUsed = now;
}
function activateGaze() {
    let now = Date.now();
    if (now - specialMoves.gaze.lastUsed < specialMoves.gaze.cooldown || specialMoves.gaze.active) return;
    specialMoves.gaze.active = true;
    specialMoves.gaze.timer = specialMoves.gaze.duration;
    specialMoves.gaze.lastUsed = now;
}
function activateNova() {
    let now = Date.now();
    if (now - specialMoves.nova.lastUsed < specialMoves.nova.cooldown || specialMoves.nova.active) return;
    specialMoves.nova.active = true;
    specialMoves.nova.timer = specialMoves.nova.duration;
    specialMoves.nova.lastUsed = now;
    // Nova effect: push enemies, stun boss, destroy projectiles
    // Push enemies
    enemies.forEach(enemy => {
        enemy.y -= 100;
        if (enemy.y < 0) enemy.y = 0;
    });
    // Stun boss
    if (boss) boss.stunnedUntil = Date.now() + 2000;
    // Destroy projectiles near player
    const px = player.x, py = player.y;
    enemyBullets = enemyBullets.filter(b => Math.hypot(b.x-px, b.y-py) > 120);
    bossBullets = bossBullets.filter(b => Math.hypot(b.x-px, b.y-py) > 120);
    bossMissiles = bossMissiles.filter(b => Math.hypot(b.x-px, b.y-py) > 120);
    createExplosion(player.x, player.y, 60);
}

// --- SPECIAL MOVES EFFECTS IN GAMELOOP ---
function updateSpecialMoves(dt) {
    // Beam
    if (specialMoves.beam.active) {
        specialMoves.beam.timer -= dt;
        // Beam effect: destroy enemies in vertical path, damage boss
        let beamX = player.x;
        
        // Draw enhanced beam with multiple layers
        ctx.save();
        
        // Outer glow
        ctx.globalAlpha = 0.3 + 0.2 * Math.sin(Date.now() / 60);
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 40;
        let outerGrad = ctx.createLinearGradient(beamX, player.y, beamX, 0);
        outerGrad.addColorStop(0, '#ffffff');
        outerGrad.addColorStop(0.1, '#00ffff');
        outerGrad.addColorStop(0.5, '#0088ff');
        outerGrad.addColorStop(1, 'rgba(0, 136, 255, 0.1)');
        ctx.strokeStyle = outerGrad;
        ctx.lineWidth = 35 + 10 * Math.sin(Date.now() / 100);
        ctx.beginPath();
        ctx.moveTo(beamX, player.y - player.height / 2);
        ctx.lineTo(beamX, 0);
        ctx.stroke();
        
        // Middle beam
        ctx.globalAlpha = 0.8 + 0.2 * Math.sin(Date.now() / 80);
        ctx.shadowBlur = 20;
        let midGrad = ctx.createLinearGradient(beamX, player.y, beamX, 0);
        midGrad.addColorStop(0, '#ffffff');
        midGrad.addColorStop(0.2, '#00ffff');
        midGrad.addColorStop(0.6, '#0099ff');
        midGrad.addColorStop(1, '#ffffff');
        ctx.strokeStyle = midGrad;
        ctx.lineWidth = 20 + 5 * Math.sin(Date.now() / 120);
        ctx.beginPath();
        ctx.moveTo(beamX, player.y - player.height / 2);
        ctx.lineTo(beamX, 0);
        ctx.stroke();
        
        // Core beam
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8 + 3 * Math.sin(Date.now() / 150);
        ctx.beginPath();
        ctx.moveTo(beamX, player.y - player.height / 2);
        ctx.lineTo(beamX, 0);
        ctx.stroke();
        
        // Energy particles along the beam
        for (let i = 0; i < 15; i++) {
            let particleY = player.y - (i * 40) - Math.random() * 20;
            let particleX = beamX + (Math.random() - 0.5) * 30;
            ctx.globalAlpha = 0.6 + 0.4 * Math.random();
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#00ffff';
            ctx.beginPath();
            ctx.arc(particleX, particleY, 2 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        // Destroy enemies in path with enhanced effect
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (Math.abs(enemies[i].x - beamX) < 35) {
                createExplosion(enemies[i].x, enemies[i].y, 30);
                enemies.splice(i, 1);
                score += 150;
                registerKill();
            }
        }
        
        // Damage boss with enhanced effect
        if (boss && Math.abs(boss.x - beamX) < boss.width / 2 + 15) {
            if (!boss._beamDmgTimer || Date.now() - boss._beamDmgTimer > 500) {
                boss.health -= 15;
                boss._beamDmgTimer = Date.now();
                updateBossHealth();
                createExplosion(boss.x + (Math.random() - 0.5) * boss.width, boss.y + (Math.random() - 0.5) * boss.height, 20);
                if (boss.health <= 0) {
                    createExplosion(boss.x, boss.y, 60);
                    boss = null;
                    bossDefeated = true;
                    document.getElementById('bossHealth').style.display = 'none';
                    score += 1000;
                }
            }
        }
        
        if (specialMoves.beam.timer <= 0) {
            specialMoves.beam.active = false;
        }
    }
    // Gaze Burst
    if (specialMoves.gaze.active) {
        specialMoves.gaze.timer -= dt;
        // Emit wave projectiles
        if (!specialMoves.gaze._lastFire || Date.now() - specialMoves.gaze._lastFire > 80) {
            for (let angle = -40; angle <= 40; angle += 20) { // was -60 to 60
                let rad = angle * Math.PI / 180;
                playerBullets.push({
                    x: player.x,
                    y: player.y - player.height/2,
                    width: 6,
                    height: 12,
                    speed: 10,
                    damage: 10,
                    vx: Math.sin(rad)*4, // was 7
                    vy: -Math.cos(rad)*6, // was 10
                    special: 'gaze'
                });
            }
            specialMoves.gaze._lastFire = Date.now();
        }
        if (specialMoves.gaze.timer <= 0) {
            specialMoves.gaze.active = false;
        }
    }
    // Nova Pulse
    if (specialMoves.nova.active) {
        specialMoves.nova.timer -= dt;
        // Draw pulse
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5*Math.sin(Date.now()/80);
        ctx.beginPath();
        ctx.arc(player.x, player.y, 120, 0, Math.PI*2);
        ctx.strokeStyle = '#fff176';
        ctx.lineWidth = 10 + 4*Math.sin(Date.now()/120);
        ctx.stroke();
        ctx.restore();
        if (specialMoves.nova.timer <= 0) {
            specialMoves.nova.active = false;
        }
    }
}

// --- COMBO CHAIN SYSTEM ---
let killTimestamps = [];
// comboActive and comboTimer are already declared at the top
const comboFloat = document.getElementById('comboFloat');

function triggerCombo() {
    comboActive = true;
    comboTimer = 3000;
    showComboFloat('🔥 Combo x5!');
}
function showComboFloat(text) {
    comboFloat.textContent = text;
    comboFloat.style.opacity = '1';
    setTimeout(() => {
        comboFloat.style.opacity = '0';
    }, 1200);
}

function registerKill() {
    // Combo logic: track kill timestamps for combo system
    if (typeof killTimestamps !== 'undefined') {
        const now = Date.now();
        killTimestamps.push(now);
        // Remove kills older than 4 seconds
        killTimestamps = killTimestamps.filter(ts => now - ts <= 4000);
        if (typeof comboActive !== 'undefined' && !comboActive && killTimestamps.length >= 5) {
            if (typeof triggerCombo === 'function') triggerCombo();
        }
    }
}

// Bonus round system (already defined at the top of the file)
const bonusBar = document.getElementById('bonusBar');
function startBonusRound() {
    bonusRoundActive = true;
    bonusRoundTimer = 20000;
    bonusBar.style.opacity = '1';
    setTimeout(() => {
        bonusBar.style.opacity = '0';
    }, 2500);
}
function endBonusRound() {
    bonusRoundActive = false;
    bonusBar.style.opacity = '0';
}

// --- DRONE ENEMY TYPE ---
function spawnDrones() {
    if (level >= 3 && !levelTransitioning && !bossSpawned) {
        // Fewer drones on mobile
        const maxDrones = isMobile ? 2 : 3;
        let swarmSize = Math.floor(Math.random() * maxDrones) + (isMobile ? 2 : 3); // 2-3 on mobile, 3-5 on desktop
        for (let i = 0; i < swarmSize; i++) {
            let angle = (Math.PI * 2 / swarmSize) * i;
            enemies.push({
                x: Math.random() * (canvas.width - 40) + 20,
                y: -60 - Math.random() * 40,
                width: 28,
                height: 28,
                speed: 2.5 + Math.random() * 1.5,
                health: 1,
                lastShot: 0,
                shotCooldown: 1800 + Math.random() * 1200,
                color: '#fff',
                type: 'drone',
                droneAngle: angle,
                droneTime: 0
            });
        }
    }
}

// --- ENEMY UPDATE: ADD DRONE MOVEMENT ---
function updateEnemiesWithDrones() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.type === 'drone') {
            // Spiral/zig-zag/follow pattern
            enemy.droneTime += 0.04;
            enemy.x += Math.sin(enemy.droneTime + enemy.droneAngle) * 3;
            enemy.y += enemy.speed + Math.cos(enemy.droneTime + enemy.droneAngle) * 1.2;
            // Drones shoot slow bullets occasionally
            if (Math.random() < 0.01 && Date.now() - enemy.lastShot > enemy.shotCooldown) {
                enemyBullets.push({
                    x: enemy.x,
                    y: enemy.y + enemy.height / 2,
                    width: 4,
                    height: 10,
                    speed: 2.2,
                    damage: 10 + 5 * (level - 1)
                });
                enemy.lastShot = Date.now();
            }
        } else {
            // Normal enemy
            enemy.y += enemy.speed;
            if (Date.now() - enemy.lastShot > enemy.shotCooldown) {
                shootEnemyBullet(enemy);
                enemy.lastShot = Date.now();
            }
        }
        // Remove if off screen
        if (enemy.y > canvas.height + 50) {
            enemies.splice(i, 1);
        }
    }
};

// --- ENEMY DRAW: DRONE VISUAL ---
function drawEnemiesWithDrones() {
    enemies.forEach(enemy => {
        if (enemy.type === 'drone') {
            // Draw drone as a white glowing orb with a blue ring
            ctx.save();
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y, enemy.width / 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00e5ff';
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.restore();
        } else {
            // Normal enemy
            ctx.fillStyle = enemy.color || currentEnemyColor;
            ctx.fillRect(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
            ctx.fillStyle = '#880000';
            ctx.fillRect(enemy.x - enemy.width / 2 - 8, enemy.y, 8, 15);
            ctx.fillRect(enemy.x + enemy.width / 2, enemy.y, 8, 15);
            ctx.fillStyle = '#000000';
            ctx.fillRect(enemy.x - 5, enemy.y - 5, 10, 10);
        }
    });
};

// --- ENEMY SPAWN: DRONES ---
let lastDroneSpawn = 0;
function maybeSpawnDrones() {
    if (level >= 3 && !levelTransitioning && !bossSpawned && Date.now() - lastDroneSpawn > 4000) {
        if (Math.random() < 0.25) {
            spawnDrones();
            lastDroneSpawn = Date.now();
        }
    }
}

// --- BONUS ROUND ENEMY SPAWN ---
function spawnBonusEnemy() {
       enemies.push({
        x: Math.random() * (canvas.width - 40) + 20,
        y: -40,
        width: 35,
        height: 45,
        speed: 3 + Math.random() * 2,
        health: 1,
        lastShot: 0,
        shotCooldown: 99999,
        color: getRandomEnemyColor(),
        type: 'bonus'
    });
}

// --- POWERUP SYSTEM ---
let attackBoostStacks = 0;
let defenseBoostStacks = 0;

function collectPowerup(type) {
    if (type === 'sword') {
        if (attackBoostStacks < 10) attackBoostStacks++;
        // Optionally show floating text or play sound
    } else if (type === 'shield') {
        if (defenseBoostStacks < 10) defenseBoostStacks++;
        // Optionally show floating text or play sound
    }
    updateBoostBars();
}

function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        let p = powerups[i];
        p.y += p.vy;
        // Remove if off screen
        if (p.y > canvas.height + 20) powerups.splice(i, 1);
        // Collect if player touches
        if (
            Math.abs(p.x - player.x) < 30 &&
            Math.abs(p.y - player.y) < 30
        ) {
            p.collected = true;
            collectPowerup(p.type);
            powerups.splice(i, 1);
        }
    }
}

function drawPowerups() {
    powerups.forEach(p => {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.font = '32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = p.type === 'sword' ? '#ff1744' : '#2979ff';
        ctx.shadowBlur = 10;
        ctx.fillText(p.type === 'sword' ? '🗡️' : '🛡️', p.x, p.y);
        ctx.restore();
    });
}

function updateBoostBars() {
    // Update the UI bars for attack/defense
    const attackSegments = document.getElementById('attackSegments');
    const defenseSegments = document.getElementById('defenseSegments');
    if (attackSegments) {
        attackSegments.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const seg = document.createElement('div');
            seg.className = 'boost-segment' + (i < attackBoostStacks ? ' filled attack' : '');
            seg.innerHTML = i < attackBoostStacks ? '🗡️' : '';
            attackSegments.appendChild(seg);
        }
    }
    if (defenseSegments) {
        defenseSegments.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const seg = document.createElement('div');
            seg.className = 'boost-segment' + (i < defenseBoostStacks ? ' filled defense' : '');
            seg.innerHTML = i < defenseBoostStacks ? '🛡️' : '';
            defenseSegments.appendChild(seg);
        }
    }
}

// --- ENEMY DROP LOGIC ---
// In checkCollisions, after enemy dies:
const checkCollisionsWithDrops = function() {
    // Player bullets vs enemies
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        // Check enemy collisions
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (checkCollision(bullet, enemy)) {
                enemy.health -= bullet.damage * (comboActive ? 1.5 : 1);
                playerBullets.splice(i, 1);
                if (enemy.health <= 0) {
                    // --- Drop logic (set to 100% for testing) ---
                    if (Math.random() < 0.10) { // Set to 0.10 for 10% after testing
                        let type = Math.random() < 0.5 ? 'sword' : 'shield';
                        console.log('Powerup dropped:', type, 'at', enemy.x, enemy.y);
                        powerups.push({
                            x: enemy.x,
                            y: enemy.y,
                            type: type,
                            vy: 1.2, // slower fall for visibility
                            collected: false
                        });
                    }
                    createExplosion(enemy.x, enemy.y);
                    enemies.splice(j, 1);
                    enemiesKilled++;
                    score += bonusRoundActive ? 200 : 100;
                    registerKill();
                    // Boss should spawn at every 3000 points (3000, 6000, 9000, ...)
// Boss spawn logic: only after bonus round is over, and only after crossing a new 3000 threshold in the new level
let bossThreshold = Math.floor(score / 3000);
if (
    bossThreshold > 0 &&
    bossThreshold !== window.lastBossThreshold &&
    !boss &&
    !bonusRoundActive
) {
    spawnBoss();
    window.lastBossThreshold = bossThreshold;
}
                }
                break;
            }
        }
        // Check boss collision (unchanged)
        if (boss && checkCollision(bullet, boss)) {
            boss.health -= (comboActive ? 15 : 10);
            playerBullets.splice(i, 1);
            updateBossHealth();
            if (boss.health <= 0) {
                createExplosion(boss.x, boss.y, 50);
                boss = null;
                bossDefeated = true;
                document.getElementById('bossHealth').style.display = 'none';
                score += 1000;
                // Clear all boss projectiles so player can't be hit during transition
                bossBullets = [];
                bossMissiles = [];
                // Bonus round every 3 levels
                if ((level % 3 === 0) && !bonusRoundActive) {
                    setTimeout(() => {
                        startBonusRound();
                        setTimeout(() => {
                            endBonusRound();
                            setTimeout(() => {
                                doLevelTransition(level + 1);
                                currentEnemyColor = getRandomEnemyColor();
                            }, 800);
                        }, 20000);
                    }, 800);
                } else {
                    setTimeout(() => {
                        doLevelTransition(level + 1);
                        currentEnemyColor = getRandomEnemyColor();
                    }, 800);
                }
            }
        }
    }
    // Enemy bullets vs player (unchanged)
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        if (checkCollision(bullet, player)) {
            if (!bonusRoundActive) {
                let damage = bullet.damage;
                if (defenseBoostStacks > 0) {
                    damage = Math.round(damage * (1 - 0.07 * defenseBoostStacks));
                }
                player.health -= damage;
                updateHealthBar();
                if (player.health <= 0) {
                    gameOver();
                }
            }
            enemyBullets.splice(i, 1);
        }
    }
    // Boss bullets vs player (unchanged)
    for (let i = bossBullets.length - 1; i >= 0; i--) {
        const bullet = bossBullets[i];
        if (checkCollision(bullet, player)) {
            if (!bonusRoundActive) {
                let damage = bullet.damage;
                if (defenseBoostStacks > 0) {
                    damage = Math.round(damage * (1 - 0.07 * defenseBoostStacks));
                }
                player.health -= damage;
                updateHealthBar();
                if (player.health <= 0) {
                    gameOver();
                }
            }
            bossBullets.splice(i, 1);
        }
    }
    // Boss missiles vs player (unchanged)
    for (let i = bossMissiles.length - 1; i >= 0; i--) {
        const missile = bossMissiles[i];
        if (checkCollision(missile, player)) {
            if (!bonusRoundActive) {
                let damage = missile.damage;
                if (defenseBoostStacks > 0) {
                    damage = Math.round(damage * (1 - 0.07 * defenseBoostStacks));
                }
                player.health -= damage;
                updateHealthBar();
                if (player.health <= 0) {
                    gameOver();
                }
            }
            bossMissiles.splice(i, 1);
        }
    }
};

// --- INTEGRATE INTO GAMELOOP ---
let animationFrameId = null;
let lastFrameTime = Date.now();
function gameLoop() {
    if (!gameRunning) return;
    let now = Date.now();
    let dt = now - lastFrameTime;
    lastFrameTime = now;
    // Combo timer
    if (typeof comboActive !== 'undefined' && comboActive) {
        comboTimer -= dt;
        if (comboTimer <= 0) comboActive = false;
    }
    // Bonus round timer
    if (typeof bonusRoundActive !== 'undefined' && bonusRoundActive) {
        bonusRoundTimer -= dt;
        if (bonusRoundTimer <= 0) {
            endBonusRound();
        }
    }
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Update game objects
    updatePlayer();
    updateEnemies();
    updateBullets();
    updateExplosions();
    updatePowerups();
    if (typeof updateSpecialMoves !== 'undefined') updateSpecialMoves(dt);
    if (typeof boss !== 'undefined' && boss) updateBoss();
    // Check collisions
    checkCollisionsWithDrops();
    // Spawn enemies
    if (typeof bonusRoundActive !== 'undefined' && bonusRoundActive) {
        if (Math.random() < 0.12) spawnBonusEnemy();
    } else {
        // Reduce spawn rate on mobile for better performance
        const spawnRate = isMobile ? 0.015 : 0.02;
        if (Math.random() < spawnRate) spawnEnemy();
        if (typeof maybeSpawnDrones !== 'undefined') maybeSpawnDrones();
    }
    // Draw everything
    drawPlayer();
    drawEnemies();
    drawBullets();
    drawExplosions();
    drawPowerups();
    if (typeof boss !== 'undefined' && boss) drawBoss();
    // Draw mobile controls (on top of everything)
    drawMobileControls();
    // Combo aura/trail
    if (typeof comboActive !== 'undefined' && comboActive) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.25 * Math.sin(Date.now()/80);
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.width * 0.8, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 10;
        ctx.shadowColor = '#ff9800';
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();
    }
    // Update UI
    updateScore();
    updateSpecialUI();
    updateBoostBars();
    // Continue game loop
    animationFrameId = requestAnimationFrame(gameLoop);
};

// Make sure the control modal is visible when the page loads
window.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    controlModal = document.getElementById('controlModal');
    keyboardBtn = document.getElementById('keyboardBtn');
    mouseBtn = document.getElementById('mouseBtn');
    mobileBtn = document.getElementById('mobileBtn');
    instructionsDiv = document.querySelector('.instructions');
    restartBtn = document.getElementById('restartBtn');
    
    // Set up event listeners
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            restartGame();
        });
    }
    
    if (keyboardBtn) {
        keyboardBtn.addEventListener('click', () => {
            controlMode = 'keyboard';
            controlModal.style.display = 'none';
            instructionsDiv.textContent = 'Use A/D or ←/→ to move | SPACE to shoot';
            restartGame();
        });
    }
    
    if (mouseBtn) {
        mouseBtn.addEventListener('click', () => {
            controlMode = 'mouse';
            controlModal.style.display = 'none';
            instructionsDiv.textContent = 'Move mouse to steer | Click or hold mouse to shoot';
            restartGame();
        });
    }
    
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            controlMode = 'mobile';
            controlModal.style.display = 'none';
            instructionsDiv.textContent = 'Use joystick to move | Tap shoot button to fire | Tap special buttons for abilities';
            setupMobileControls();
            restartGame();
        });
    }
    
    // Auto-detect mobile and show appropriate controls
    if (isMobile && !controlMode) {
        controlMode = 'mobile';
        setupMobileControls();
        if (controlModal) {
            controlModal.style.display = 'none';
        }
        if (instructionsDiv) {
            instructionsDiv.textContent = 'Use joystick to move | Tap shoot button to fire | Tap special buttons for abilities';
        }
        // Start game automatically on mobile
        setTimeout(() => {
            restartGame();
        }, 500);
    } else if (controlModal) {
        controlModal.style.display = 'block';
    }
});
