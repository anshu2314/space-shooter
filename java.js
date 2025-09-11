// Game Canvas Setup
const canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');

// Sound Manager using Web Audio API (no sound files needed)
const soundManager = {
    audioContext: null,
    masterGain: null,
    musicGain: null,
    musicSchedulerId: null,
    currentMusic: null,
    musicVolume: 0.3, // Volume for procedural music

    // Global state
    muted: false,

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 1;
            this.masterGain.connect(this.audioContext.destination);

            // Add a separate gain node for music
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);

        } catch (e) {
            console.error("Web Audio API is not supported. No sound will be played.");
            this.audioContext = null;
        }
    },

    playMusic(name) {
        if (!this.audioContext || (this.currentMusic && this.currentMusic.name === name)) {
            return; // Already playing this track or no audio context
        }
        this.stopMusic(); // Stop any previous music

        this.currentMusic = {
            name: name,
            sequence: this._getMusicSequence(name),
            noteIndex: 0,
        };

        const tempo = this.currentMusic.sequence.tempo;
        const noteDuration = 60 / tempo; // duration of a quarter note

        this.musicSchedulerId = setInterval(() => {
            if (this.muted || !this.audioContext) return;

            const now = this.audioContext.currentTime;
            const note = this.currentMusic.sequence.notes[this.currentMusic.noteIndex];
            
            if (note > 0) { // 0 represents a rest
                this._playNote(note, now, noteDuration * 0.9);
            }

            this.currentMusic.noteIndex = (this.currentMusic.noteIndex + 1) % this.currentMusic.sequence.notes.length;

        }, noteDuration * 1000);
    },

    stopMusic() {
        if (this.musicSchedulerId) {
            clearInterval(this.musicSchedulerId);
            this.musicSchedulerId = null;
        }
        this.currentMusic = null;
    },

    _playNote(freq, time, duration) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.type = this.currentMusic.sequence.waveType;
        osc.frequency.setValueAtTime(freq, time);
        
        // Simple ADSR-like envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(1, time + duration * 0.1); // Attack
        gain.gain.exponentialRampToValueAtTime(0.5, time + duration * 0.5); // Decay/Sustain
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration); // Release

        osc.start(time);
        osc.stop(time + duration);
    },

    _getMusicSequence(name) {
        // Note frequencies
        const C4=261.63, Eb4=311.13, G4=392.00, Bb4=466.16;
        const C5=523.25, E5=659.25, G5=783.99;
        const C3=130.81, Eb3=155.56, G3=196.00;

        const sequences = {
            boss: { notes: [G3, 0, Eb3, 0, G3, 0, C3, 0, G3, 0, Eb3, 0, C3, 0, Eb3, 0], tempo: 140, waveType: 'sawtooth' },
            bonus: { notes: [C5, G5, E5, G5, C5, G5, E5, G5], tempo: 160, waveType: 'triangle' },
            background: { notes: [C4, Eb4, G4, Bb4, G4, Eb4, C4, 0], tempo: 120, waveType: 'sine' }
        };
        return sequences[name] || sequences.background;
    },

    play(type) {
        if (!this.audioContext || this.muted) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        const now = this.audioContext.currentTime;
        
        switch(type) {
            case 'shoot': this._createShootSound(now); break;
            case 'explosion': this._createExplosionSound(now); break;
            case 'playerHit': this._createPlayerHitSound(now); break;
            case 'powerup': this._createPowerupSound(now); break;
            case 'gameOver': this._createGameOverSound(now); break;
            case 'beam': this._createBeamSound(now); break;
            case 'nova': this._createNovaSound(now); break;
            case 'bossDefeat': this._createBossDefeatSound(now); break;
            case 'missileLaunch': this._createMissileLaunchSound(now); break;
            case 'voidPulse': this._createVoidPulseSound(now); break;
        }
        if (type === 'temporalShield') this._createShieldSound(now);
    },

    _createShieldSound(now) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.5);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
        osc.start(now);
        osc.stop(now + 1.0);
    },

    _createMissileLaunchSound(now) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    },

    _createShootSound(now) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        
        osc.start(now);
        osc.stop(now + 0.1);
    },

    _createExplosionSound(now) {
        // Low-frequency thump
        const thump = this.audioContext.createOscillator();
        const thumpGain = this.audioContext.createGain();
        thump.connect(thumpGain);
        thumpGain.connect(this.masterGain);
        thump.type = 'sine';
        thump.frequency.setValueAtTime(120, now);
        thump.frequency.exponentialRampToValueAtTime(30, now + 0.3);
        thumpGain.gain.setValueAtTime(0.6, now);
        thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        thump.start(now);
        thump.stop(now + 0.3);

        // Noise burst
        const noiseSource = this.audioContext.createBufferSource();
        const bufferSize = this.audioContext.sampleRate * 0.3; // Shorter
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2); // Faster decay
        }
        noiseSource.buffer = buffer;
        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.value = 0.4;
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noiseSource.start(now);
    },

    _createPlayerHitSound(now) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        
        osc.start(now);
        osc.stop(now + 0.2);
    },

    _createPowerupSound(now) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.4, now);
        
        const t = 0.08;
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + t); // E5
        osc.frequency.setValueAtTime(783.99, now + t*2); // G5
        
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t*3);
        
        osc.start(now);
        osc.stop(now + t*3);
    },

    _createGameOverSound(now) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.5, now);
        
        const t = 0.4;
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(329.63, now + t); // E4
        osc.frequency.setValueAtTime(220, now + t*2); // A3
        
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t*3);
        
        osc.start(now);
        osc.stop(now + t*3);
    },
    
    _createNovaSound(now) {
        const noiseSource = this.audioContext.createBufferSource();
        const biquadFilter = this.audioContext.createBiquadFilter();
        const gainNode = this.audioContext.createGain();
        const bufferSize = this.audioContext.sampleRate * 0.8; // Longer
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { output[i] = Math.random() * 2 - 1; }
        noiseSource.buffer = buffer;
        
        biquadFilter.type = 'bandpass';
        biquadFilter.frequency.setValueAtTime(200, now);
        biquadFilter.frequency.exponentialRampToValueAtTime(6000, now + 0.6); // Wider sweep
        biquadFilter.Q.value = 5; // More resonant
        
        gainNode.gain.setValueAtTime(0.7, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        
        noiseSource.connect(biquadFilter);
        biquadFilter.connect(gainNode);
        gainNode.connect(this.masterGain);
        noiseSource.start(now);
        noiseSource.stop(now + 0.8);
    },
    
    _createBeamSound(now) {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.5);
    },
    
    _createBossDefeatSound(now) {
        // Triumphant arpeggio
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.type = 'square';
        gain.gain.setValueAtTime(0.3, now);
        const t = 0.1;
        osc.frequency.setValueAtTime(261.63, now); // C4
        osc.frequency.setValueAtTime(329.63, now + t); // E4
        osc.frequency.setValueAtTime(392.00, now + t*2); // G4
        osc.frequency.setValueAtTime(523.25, now + t*3); // C5
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t*4);
        osc.start(now);
        osc.stop(now + t*4);

        // Chain explosions
        setTimeout(() => this.audioContext && this._createExplosionSound(this.audioContext.currentTime), 200);
        setTimeout(() => this.audioContext && this._createExplosionSound(this.audioContext.currentTime), 450);
        setTimeout(() => this.audioContext && this._createExplosionSound(this.audioContext.currentTime), 700);
    },

    _createVoidPulseSound(now) {
        // Low-frequency teleport 'whoosh'
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.6, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);

        // High-frequency crackle for the wave
        setTimeout(() => {
            if (this.audioContext) this._createNovaSound(this.audioContext.currentTime);
        }, 100);
    },

    toggleMute() {
        if (!this.audioContext) return true;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.muted = !this.muted;

        // This single line mutes/unmutes both SFX and the procedural music
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.audioContext.currentTime);

        return this.muted;
    }
};

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
let credits = 0;
let playerShipId = 'ship1';
let bossSpawned = false;
let bossDefeated = false;
let nextBossScore = 3000;

let comboActive = false;
let comboTimer = 0;

// Special Moves
let specialMoves = {
    beam: {
        cooldown: 20000, // ms
        duration: 5000, // ms
        lastUsed: -Infinity,
        active: false,
        timer: 0,
        name: 'Beam Attack',
        description: 'Fires a continuous, powerful laser beam.'
    },
    gaze: {
        cooldown: 20000,
        duration: 7000,
        lastUsed: -Infinity,
        active: false,
        timer: 0,
        name: 'Gaze Burst',
        description: 'Unleashes a wide cone of projectiles.'
    },
    missileStrike: { // Replaces homingMissiles
        cooldown: 25000,
        duration: 10000,
        lastUsed: -Infinity,
        active: false,
        timer: 0,
        name: 'Missile Strike',
        description: 'Launches missiles that seek out enemies.'
    },
    plasmaWave: { // Replaces nova
        cooldown: 30000,
        duration: 1000,
        lastUsed: -Infinity,
        active: false,
        timer: 0,
        name: 'Plasma Wave',
        description: 'A defensive blast that clears projectiles.'
    },
    energyShield: { // Replaces temporalShield
        cooldown: 35000,
        duration: 6000,
        lastUsed: -Infinity,
        active: false,
        timer: 0,
        name: 'Energy Shield',
        description: 'Grants invincibility and slows nearby projectiles.'
    },
    teleportDash: {
        cooldown: 30000,
        duration: 1500, // Duration of the wave effect
        lastUsed: -Infinity,
        active: false,
        timer: 0,
        name: 'Void Pulse',
        description: 'Teleport to safety and unleash a screen-clearing reality wave.'
    },
    droneSupport: {
        cooldown: 40000,
        duration: 15000, // Drones last for 15 seconds
        lastUsed: -Infinity,
        active: false,
        timer: 0,
        name: 'Drone Support',
        description: 'Deploys autonomous attack drones.'
    }
};

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
let playerHomingMissiles = [];
let bossMissiles = [];
let explosions = [];
let friendlyDrones = [];
let powerups = [];
let boss = null;

let waveParticles = []; // For the Void Pulse wave effect
// Bonus round state
let bonusRoundActive = false;
let bonusRoundTimer = 0;

// High Score
let highScore = parseInt(localStorage.getItem('spaceShooterXHighScore')) || 0;

// Control selection modal logic - will be initialized in DOMContentLoaded
let controlModal, keyboardBtn, mouseBtn, mobileBtn, instructionsDiv, restartBtn;

// Input handling
const keys = {};
let mouseShooting = false;
let mouseShootingX = 0;
let mouseShootingY = 0;

// Screen Shake effect state
let screenShake = { intensity: 0, duration: 0, timer: 0 };

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
    // Activate special moves based on the current ship
    const currentShip = ships[playerShipId];
    if (e.key === '1') activateSpecialMove(currentShip.specialMoveIds[0]);
    if (e.key === '2') activateSpecialMove(currentShip.specialMoveIds[1]);
    if (e.key === '3') activateSpecialMove(currentShip.specialMoveIds[2]);
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
            const currentShip = ships[playerShipId];
            e.preventDefault();
            activateSpecialMove(currentShip.specialMoveIds[0]);
        });
    }
    
    if (gazeBtn) {
        gazeBtn.addEventListener('touchstart', (e) => {
            const currentShip = ships[playerShipId];
            e.preventDefault();
            activateSpecialMove(currentShip.specialMoveIds[1]);
        });
    }
    
    if (novaBtn) {
        novaBtn.addEventListener('touchstart', (e) => {
            const currentShip = ships[playerShipId];
            e.preventDefault();
            activateSpecialMove(currentShip.specialMoveIds[2]);
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
    // Start or resume background music
    soundManager.playMusic('background');
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
    friendlyDrones = [];
    playerHomingMissiles = [];
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
    const currentShip = ships[playerShipId];
    if (!currentShip) return;
    const moveIds = currentShip.specialMoveIds;
    const moveDivs = [document.getElementById('specialMove1'), document.getElementById('specialMove2'), document.getElementById('specialMove3')];

    for (let i = 0; i < 3; i++) {
        const moveId = moveIds[i];
        const move = specialMoves[moveId];
        const div = moveDivs[i];
        if (!div) continue;
        const cooldownDiv = document.getElementById(`specialCooldown${i + 1}`);

        if (move.active) {
            cooldownDiv.textContent = 'Active!';
            div.classList.add('active');
        } else {
            const now = Date.now();
            const cd = Math.max(0, Math.ceil((move.lastUsed + move.cooldown - now) / 1000));
            cooldownDiv.textContent = cd > 0 ? `${cd}s` : 'Ready';
            div.classList.toggle('on-cooldown', cd > 0);
            div.classList.remove('active');
        }
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
    soundManager.stopMusic();
    soundManager.play('gameOver');

    // Check for new high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('spaceShooterXHighScore', highScore);
        updateHighScoreDisplay();
    }

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
    soundManager.play('shoot');
    playerBullets.push({
        x: player.x,
        y: player.y - player.height / 2,
        width: 4,
        height: 12,
        speed: 8,
        damage: 10
    });
}

function drawPlayerShip1(p) {
    ctx.save();
    // Engine glow effect (behind ship)
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    const glowIntensity = 0.7 + 0.3 * Math.sin(Date.now() / 100);
    ctx.globalAlpha = glowIntensity;
    // Engine flames
    const flameHeight = 15 + 5 * Math.sin(Date.now() / 80);
    const gradient = ctx.createLinearGradient(0, p.y + p.height / 2, 0, p.y + p.height / 2 + flameHeight);
    gradient.addColorStop(0, '#00ffff');
    gradient.addColorStop(0.5, '#0088ff');
    gradient.addColorStop(1, 'rgba(0, 136, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(p.x - 8, p.y + p.height / 2, 16, flameHeight);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    // Main ship body with gradient
    const bodyGradient = ctx.createLinearGradient(0, p.y - p.height / 2, 0, p.y + p.height / 2);
    bodyGradient.addColorStop(0, '#ffffff'); bodyGradient.addColorStop(0.3, '#00ffff'); bodyGradient.addColorStop(0.7, '#0088ff'); bodyGradient.addColorStop(1, '#004488');
    ctx.fillStyle = bodyGradient;
    // Ship hull (sleek design)
    ctx.beginPath(); ctx.moveTo(p.x, p.y - p.height / 2); ctx.lineTo(p.x - p.width / 3, p.y); ctx.lineTo(p.x - p.width / 2, p.y + p.height / 3); ctx.lineTo(p.x, p.y + p.height / 2); ctx.lineTo(p.x + p.width / 2, p.y + p.height / 3); ctx.lineTo(p.x + p.width / 3, p.y); ctx.closePath(); ctx.fill();
    // Wing details
    ctx.fillStyle = '#0066cc'; ctx.beginPath(); ctx.moveTo(p.x - p.width / 2 - 8, p.y + 5); ctx.lineTo(p.x - p.width / 2, p.y); ctx.lineTo(p.x - p.width / 2, p.y + 15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x + p.width / 2 + 8, p.y + 5); ctx.lineTo(p.x + p.width / 2, p.y); ctx.lineTo(p.x + p.width / 2, p.y + 15); ctx.closePath(); ctx.fill();
    // Cockpit
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(p.x, p.y - 5, 8, 0, Math.PI * 2); ctx.fill();
    // Weapon hardpoints
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffff00'; ctx.fillRect(p.x - 15, p.y + 10, 4, 8); ctx.fillRect(p.x + 11, p.y + 10, 4, 8);
    ctx.restore();
}

function drawPlayerShip2(p) {
    ctx.save();
    // Engine glow (more aggressive orange/red)
    ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 22;
    const glowIntensity = 0.7 + 0.3 * Math.sin(Date.now() / 90);
    ctx.globalAlpha = glowIntensity;
    // Engine flames
    const flameHeight = 18 + 6 * Math.sin(Date.now() / 70);
    const gradient = ctx.createLinearGradient(0, p.y + p.height / 2, 0, p.y + p.height / 2 + flameHeight);
    gradient.addColorStop(0, '#ffdd00'); gradient.addColorStop(0.5, '#ff8c00'); gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.moveTo(p.x - 10, p.y + p.height / 2); ctx.lineTo(p.x, p.y + p.height / 2 + flameHeight); ctx.lineTo(p.x + 10, p.y + p.height / 2); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    // Main ship body (darker, more angular)
    const bodyGradient = ctx.createLinearGradient(0, p.y - p.height / 2, 0, p.y + p.height / 2);
    bodyGradient.addColorStop(0, '#cccccc'); bodyGradient.addColorStop(0.5, '#888888'); bodyGradient.addColorStop(1, '#555555');
    ctx.fillStyle = bodyGradient;
    // Ship hull (aggressive, forward-swept wings)
    ctx.beginPath(); ctx.moveTo(p.x, p.y - p.height / 2); ctx.lineTo(p.x - p.width / 2, p.y + p.height / 2); ctx.lineTo(p.x, p.y + p.height / 4); ctx.lineTo(p.x + p.width / 2, p.y + p.height / 2); ctx.closePath(); ctx.fill();
    // Red accents
    ctx.fillStyle = '#ff1744'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 10); ctx.lineTo(p.x - 5, p.y + 5); ctx.lineTo(p.x + 5, p.y + 5); ctx.closePath(); ctx.fill();
    // Cockpit
    ctx.fillStyle = '#ff8c00'; ctx.shadowColor = '#ff8c00'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawPlayerShip3(p) { // Aegis Defender
    ctx.save();
    // Engine glow (stable blue)
    ctx.shadowColor = '#2979ff'; ctx.shadowBlur = 25;
    const glowIntensity = 0.8 + 0.2 * Math.sin(Date.now() / 120);
    ctx.globalAlpha = glowIntensity;
    // Engine flames
    const flameHeight = 12 + 4 * Math.sin(Date.now() / 90);
    const gradient = ctx.createLinearGradient(0, p.y + p.height / 2, 0, p.y + p.height / 2 + flameHeight);
    gradient.addColorStop(0, '#82b1ff'); gradient.addColorStop(0.5, '#2979ff'); gradient.addColorStop(1, 'rgba(41, 121, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(p.x - 12, p.y + p.height / 2, 24, flameHeight);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    // Main ship body (bulkier, armored look)
    const bodyGradient = ctx.createLinearGradient(0, p.y - p.height / 2, 0, p.y + p.height / 2);
    bodyGradient.addColorStop(0, '#e0e0e0'); bodyGradient.addColorStop(0.5, '#9e9e9e'); bodyGradient.addColorStop(1, '#616161');
    ctx.fillStyle = bodyGradient;
    // Ship hull (wide, defensive posture)
    ctx.beginPath(); ctx.moveTo(p.x, p.y - p.height / 2); ctx.lineTo(p.x - p.width / 2, p.y - 10); ctx.lineTo(p.x - p.width / 2, p.y + p.height / 2); ctx.lineTo(p.x + p.width / 2, p.y + p.height / 2); ctx.lineTo(p.x + p.width / 2, p.y - 10); ctx.closePath(); ctx.fill();
    // Blue armor plating
    ctx.fillStyle = '#2979ff'; ctx.fillRect(p.x - p.width / 2, p.y - 15, p.width, 10);
    // Cockpit
    ctx.fillStyle = '#00e5ff'; ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawPlayerShip4(p) { // For Teleport Dash
    ctx.save();
    // Sharp, angular design
    ctx.shadowColor = '#d500f9'; ctx.shadowBlur = 20;
    // Body
    const bodyGradient = ctx.createLinearGradient(0, p.y - p.height / 2, 0, p.y + p.height / 2);
    bodyGradient.addColorStop(0, '#f3e5f5'); bodyGradient.addColorStop(0.5, '#ab47bc'); bodyGradient.addColorStop(1, '#4a148c');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - p.height / 2); ctx.lineTo(p.x - p.width / 2, p.y + p.height / 2); ctx.lineTo(p.x + p.width / 2, p.y + p.height / 2); ctx.closePath(); ctx.fill();
    // Engine (subtle, as if powered by magic)
    const glowIntensity = 0.5 + 0.5 * Math.sin(Date.now() / 80);
    ctx.globalAlpha = glowIntensity;
    ctx.fillStyle = '#e1bee7';
    ctx.beginPath(); ctx.arc(p.x, p.y + p.height / 2, 10, 0, Math.PI, false); ctx.fill();
    ctx.restore();
}

function drawPlayerShip5(p) { // For Drone Support
    ctx.save();
    // Utilitarian, carrier-like design
    ctx.shadowColor = '#00e676'; ctx.shadowBlur = 20;
    // Body
    const bodyGradient = ctx.createLinearGradient(0, p.y - p.height / 2, 0, p.y + p.height / 2);
    bodyGradient.addColorStop(0, '#a5d6a7'); bodyGradient.addColorStop(0.5, '#4caf50'); bodyGradient.addColorStop(1, '#1b5e20');
    ctx.fillStyle = bodyGradient;
    ctx.beginPath(); ctx.moveTo(p.x - p.width / 2, p.y - p.height / 4); ctx.lineTo(p.x + p.width / 2, p.y - p.height / 4); ctx.lineTo(p.x + p.width / 3, p.y + p.height / 2); ctx.lineTo(p.x - p.width / 3, p.y + p.height / 2); ctx.closePath(); ctx.fill();
    // Cockpit
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(p.x, p.y - 5, 8, 0, Math.PI * 2); ctx.fill();
    // Drone bays
    ctx.fillStyle = '#388e3c'; ctx.fillRect(p.x - 18, p.y + 10, 8, 12); ctx.fillRect(p.x + 10, p.y + 10, 8, 12);
    ctx.restore();
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
    const ship = ships[playerShipId];
    if (ship && typeof ship.draw === 'function') {
        ship.draw(player);
    }
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
    const gazeBtn = document.getElementById('gazeBtn'); // Represents button 2
    const novaBtn = document.getElementById('novaBtn'); // Represents button 3
    const buttons = [beamBtn, gazeBtn, novaBtn];

    const currentShip = ships[playerShipId];
    if (!currentShip) return;

    for (let i = 0; i < 3; i++) {
        if (buttons[i]) {
            const move = specialMoves[currentShip.specialMoveIds[i]];
            buttons[i].classList.toggle('active', move.active);
        }
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
    removeMobileControls();
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
                                } else if (controlMode === 'mobile') {
                                    setupMobileControls();
                                }

                                // CRITICAL FIX: Restart the game loop
                                lastFrameTime = Date.now(); // Reset delta time to prevent a huge jump
                                if (animationFrameId === null) {
                                    animationFrameId = requestAnimationFrame(gameLoop);
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
    playerHomingMissiles = [];
    friendlyDrones = [];
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
    soundManager.playMusic('boss');
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

    // Slow down projectiles if temporal shield is active
    const slowProjectiles = (projectiles, speedAttr) => {
        if (specialMoves.energyShield.active) {
            projectiles.forEach(p => {
                const dist = Math.hypot(p.x - player.x, p.y - player.y);
                if (dist < 200) { // Shield radius
                    p.y += p[speedAttr] * 0.4; // Slow down
                } else {
                    p.y += p[speedAttr];
                }
            });
        } else { projectiles.forEach(p => p.y += p[speedAttr]); }
    };

    // Player homing missiles vs enemies
    for (let i = playerHomingMissiles.length - 1; i >= 0; i--) {
        const missile = playerHomingMissiles[i];
        let missileRemoved = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (checkCollision(missile, enemy)) {
                createExplosion(enemy.x, enemy.y);
                enemies.splice(j, 1);
                enemiesKilled++;
                score += bonusRoundActive ? 200 : 100;
                credits += 15; updateCreditsDisplay();
                registerKill();
                playerHomingMissiles.splice(i, 1);
                missileRemoved = true;
                break;
            }
        }
    }
    
    // Enemy bullets
    slowProjectiles(enemyBullets, 'speed');
    enemyBullets = enemyBullets.filter(b => b.y <= canvas.height + b.height);
    
    // Boss bullets
    // Temporal shield doesn't slow horizontal movement, only vertical
    bossBullets.forEach(b => { b.x += b.speedX; });
    slowProjectiles(bossBullets, 'speedY');
    bossBullets = bossBullets.filter(b => b.y <= canvas.height + b.height && b.x >= -b.width && b.x <= canvas.width + b.width);
    
    // Boss missiles
    // Temporal shield doesn't slow horizontal movement, only vertical
    bossMissiles.forEach(m => { m.x += m.speedX; });
    slowProjectiles(bossMissiles, 'speedY');
    bossMissiles = bossMissiles.filter(m => m.y <= canvas.height + m.height && m.x >= -m.width && m.x <= canvas.width + m.width);
}

function updateHomingMissiles() {
    for (let i = playerHomingMissiles.length - 1; i >= 0; i--) {
        const m = playerHomingMissiles[i];
        m.life--;

        // Remove if life expires or target is gone, and try to find a new target
        if (m.life <= 0 || !m.target || m.target.health <= 0) {
            m.target = findClosestEnemy(m.x, m.y); // Find a new target
            if (!m.target || m.life <= 0) { // If no new target or life is up, remove missile
                playerHomingMissiles.splice(i, 1);
                continue;
            }
        }
        
        // Homing logic
        const dx = m.target.x - m.x;
        const dy = m.target.y - m.y;
        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - m.angle;
        
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        m.angle += Math.sign(angleDiff) * Math.min(m.turnSpeed, Math.abs(angleDiff));
        
        // Movement
        m.x += Math.cos(m.angle) * m.speed;
        m.y += Math.sin(m.angle) * m.speed;
    }
}

function updateFriendlyDrones() {
    for (let i = friendlyDrones.length - 1; i >= 0; i--) {
        const drone = friendlyDrones[i];
        drone.life--;
        if (drone.life <= 0) {
            createExplosion(drone.x, drone.y, 15);
            friendlyDrones.splice(i, 1);
            continue;
        }
        // Movement (lerp to position)
        drone.x += (drone.targetX - drone.x) * 0.1;
        drone.y += (drone.targetY - drone.y) * 0.1;
        // Shooting
        if (Date.now() - drone.lastShot > drone.shotCooldown) { shootDroneBullet(drone); drone.lastShot = Date.now(); }
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
    
    // Player Homing Missiles
    playerHomingMissiles.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(m.angle + Math.PI / 2); // Align with direction of travel
        // Missile Body
        const missileGradient = ctx.createLinearGradient(0, -m.height / 2, 0, m.height / 2);
        missileGradient.addColorStop(0, '#ffeb3b');
        missileGradient.addColorStop(1, '#ff8c00');
        ctx.fillStyle = missileGradient;
        ctx.beginPath();
        ctx.moveTo(0, -m.height / 2); ctx.lineTo(-m.width / 2, m.height / 2); ctx.lineTo(m.width / 2, m.height / 2);
        ctx.closePath(); ctx.fill();
        // Thruster Glow
        ctx.fillStyle = '#ff1744'; ctx.shadowColor = '#ff1744'; ctx.shadowBlur = 10;
        ctx.fillRect(-m.width / 2, m.height / 2, m.width, 4);
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

function drawFriendlyDrones() {
    friendlyDrones.forEach(drone => {
        ctx.save();
        ctx.shadowColor = '#00e676';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(drone.x, drone.y, drone.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#00e676';
        ctx.stroke();
        ctx.restore();
    });
}

// Explosion effects
function createExplosion(x, y, size = 20) {
    soundManager.play('explosion');
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
        if (explosion.type === 'lightning') {
            ctx.globalAlpha = alpha * 0.9;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = explosion.thickness;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 15;
            
            ctx.beginPath();
            ctx.moveTo(explosion.startX, explosion.startY);
            
            const dx = explosion.endX - explosion.startX;
            const dy = explosion.endY - explosion.startY;
            const distance = Math.hypot(dx, dy);
            const segments = Math.max(5, Math.floor(distance / 20));

            for (let i = 1; i <= segments; i++) {
                const progress = i / segments;
                const midX = explosion.startX + dx * progress + (Math.random() - 0.5) * 20;
                const midY = explosion.startY + dy * progress + (Math.random() - 0.5) * 20;
                ctx.lineTo(midX, midY);
            }
            ctx.stroke();

        } else if (explosion.type === 'teleport_out') {
            // Imploding purple particles
            ctx.fillStyle = '#ab47bc';
            ctx.shadowColor = '#f3e5f5';
            ctx.shadowBlur = 20;
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                const dist = size * alpha; // Particles move inwards
                ctx.beginPath();
                ctx.arc(explosion.x + Math.cos(angle) * dist, explosion.y + Math.sin(angle) * dist, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (explosion.type === 'teleport_in' || explosion.type === 'disintegration') {
            // Exploding purple particles (disintegration is just a cosmetic name for the same effect)
            ctx.fillStyle = '#d500f9';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 15;
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                const dist = size * (1 - alpha); // Particles move outwards
                ctx.beginPath();
                ctx.arc(explosion.x + Math.cos(angle) * dist, explosion.y + Math.sin(angle) * dist, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        } else { // Regular explosion
            ctx.globalAlpha = alpha;
            
            ctx.fillStyle = `hsl(${30 + (1 - alpha) * 30}, 100%, 50%)`;
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}

function updateAndDrawWaveParticles() {
    for (let i = waveParticles.length - 1; i >= 0; i--) {
        const p = waveParticles[i];
        p.life--;
        if (p.life <= 0) {
            waveParticles.splice(i, 1);
            continue;
        }
        p.x += p.vx;
        p.y += p.vy;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 50; // Fade out
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
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
            boss.health -= (comboActive ? 15 : 10); // Apply combo damage
            playerBullets.splice(i, 1);
            updateBossHealth();
            if (boss.health <= 0) {
                createExplosion(boss.x, boss.y, 50);
                boss = null;
                bossDefeated = true;
                document.getElementById('bossHealth').style.display = 'none';
                score += 1000;
                soundManager.play('bossDefeat');
                // Clear all boss projectiles so player can't be hit during transition
                bossBullets = [];
                bossMissiles = [];
                // Bonus round every 3 levels
                if ((level % 3 === 0) && !bonusRoundActive) {
                    setTimeout(() => {
                        startBonusRound();
                        setTimeout(() => {
                            endBonusRound(); // This will now handle the next step
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
            if (specialMoves.energyShield.active || (player.invincibleUntil && Date.now() < player.invincibleUntil)) {
                // Shield deflects bullet
                createExplosion(bullet.x, bullet.y, 5);
                enemyBullets.splice(i, 1);
                continue;
            }
            if (!bonusRoundActive) {
                soundManager.play('playerHit');
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
            if (specialMoves.energyShield.active || (player.invincibleUntil && Date.now() < player.invincibleUntil)) {
                // Shield deflects bullet
                createExplosion(bullet.x, bullet.y, 5);
                bossBullets.splice(i, 1);
                continue;
            }
            if (!bonusRoundActive) {
                soundManager.play('playerHit');
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
            if (specialMoves.energyShield.active || (player.invincibleUntil && Date.now() < player.invincibleUntil)) {
                // Shield deflects missile
                createExplosion(missile.x, missile.y, 10);
                bossMissiles.splice(i, 1);
                continue;
            }
            if (!bonusRoundActive) {
                soundManager.play('playerHit');
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
function findClosestEnemy(x, y) {
    let closestEnemy = null;
    let minDistance = Infinity;

    // Check regular enemies
    enemies.forEach(enemy => {
        if (!enemy.health || enemy.health <= 0) return;
        const distance = Math.hypot(x - enemy.x, y - enemy.y);
        if (distance < minDistance) {
            minDistance = distance;
            closestEnemy = enemy;
        }
    });

    // If boss is present and closer, target it
    if (boss && boss.health > 0) {
        const distance = Math.hypot(x - boss.x, y - boss.y);
        if (distance < minDistance) {
            closestEnemy = boss;
        }
    }
    return closestEnemy;
}

const beamMoveDiv = document.getElementById('beamMove');
const gazeMoveDiv = document.getElementById('gazeMove');
const novaMoveDiv = document.getElementById('novaMove');
const beamCooldownDiv = document.getElementById('beamCooldown');

// --- SPECIAL MOVES ACTIVATION ---
document.addEventListener('keydown', function(e) {
    if (e.repeat) return;
    if (controlModal.style.display !== 'none') return;
    const currentShip = ships[playerShipId];
    if (e.key === '1') activateSpecialMove(currentShip.specialMoveIds[0], e.key);
    if (e.key === '2') activateSpecialMove(currentShip.specialMoveIds[1], e.key);
    if (e.key === '3') activateSpecialMove(currentShip.specialMoveIds[2], e.key);
});

function triggerScreenShake(intensity, duration) {
    // Don't override a stronger shake
    if (screenShake.intensity > intensity) return;
    screenShake.intensity = intensity;
    screenShake.duration = duration;
    screenShake.timer = duration;
}
function activateSpecialMove(moveId, key) {
    let now = Date.now();
    const move = specialMoves[moveId];
    if (now - move.lastUsed < move.cooldown || move.active) return;

    soundManager.play(moveId); // Assumes sound name matches moveId

    if (moveId === 'teleportDash') {
        // Create a teleport-out visual effect at the player's old position
        createExplosion(player.x, player.y, 40, 'teleport_out');
        // Teleport player to bottom-middle
        player.x = canvas.width / 2;
        player.y = canvas.height - 80;
        // The wave effect will be handled in updateSpecialMoves
        // Create a teleport-in visual effect and start the screen shake
        createExplosion(player.x, player.y, 50, 'teleport_in');
        triggerScreenShake(6, 1500); // Shake the screen for the duration of the pulse
    } else if (moveId === 'droneSupport') {
        // Spawn two drones
        friendlyDrones.push({ x: player.x - 50, y: player.y, width: 20, height: 20, targetX: player.x - 50, targetY: player.y, life: move.duration / (1000/60), lastShot: 0, shotCooldown: 500 });
        friendlyDrones.push({ x: player.x + 50, y: player.y, width: 20, height: 20, targetX: player.x + 50, targetY: player.y, life: move.duration / (1000/60), lastShot: 0, shotCooldown: 500 });
    }

    move.active = true;
    move.timer = move.duration;
    move.lastUsed = now;

    // Handle instant-effect moves that don't need an 'active' state
    if (moveId === 'missileStrike') {
        const targets = [...enemies]; // Target all on-screen enemies
        if (boss) {
            targets.push(boss); // And the boss
        }
        if (targets.length === 0) {
            move.lastUsed = -Infinity; // Refund cooldown if no targets
            return; 
        }
        targets.forEach((target, i) => {
            setTimeout(() => {
                if (!gameRunning || !target || target.health <= 0) return;
                soundManager.play('missileLaunch');
                playerHomingMissiles.push({
                    x: player.x + (i % 2 === 0 ? -20 : 20), y: player.y, 
                    width: 10, height: 22, speed: 5, turnSpeed: 0.04, 
                    life: 240, target: target, angle: -Math.PI / 2, damage: 50
                });
            }, i * 100);
        });
        // This move is instant, so we don't set it to active.
        // We set lastUsed at the top, and that's it.
        move.active = false; 
        return;
    }
}

function activateBeam() { activateSpecialMove('beam'); }
function activateGaze() { activateSpecialMove('gaze'); }
function activatePlasmaWave() {
    // This now just activates the move. The effect happens at the end of the animation.
    activateSpecialMove('plasmaWave');
}

/*
// This is the old Plasma Wave logic, which is now replaced by the function above.
// I'm keeping it here commented out just in case you want to reference it.
function activatePlasmaWave_OLD() {
    activateSpecialMove('plasmaWave');
    if (boss) {
        const distance = Math.hypot(player.x - boss.x, player.y - boss.y);
        if (distance < radius + boss.width) { // A more generous radius for the boss
            // Damage is 30% at level 1, decreasing by 1% per level, min 15%
            const damagePercent = Math.max(0.15, 0.30 - (level - 1) * 0.01);
            const damage = boss.maxHealth * damagePercent;
            boss.health -= damage;
            updateBossHealth();
            // Add a visual indicator for the damage
            createExplosion(boss.x, boss.y, 40);
            if (boss.health <= 0) {
                // Handle boss defeat logic
                createExplosion(boss.x, boss.y, 60);
                boss = null;
                bossDefeated = true;
                document.getElementById('bossHealth').style.display = 'none';
                score += 1000;
                soundManager.play('bossDefeat');
                bossBullets = [];
                bossMissiles = [];
            }
        }
    }
}
*/

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
            for (let angle = -40; angle <= 40; angle += 20) {
                let rad = angle * Math.PI / 180;
                playerBullets.push({
                    x: player.x,
                    y: player.y - player.height/2,
                    width: 6,
                    height: 12,
                    speed: 10,
                    damage: 10,
                    vx: Math.sin(rad) * 4,
                    vy: -Math.cos(rad) * 6,
                    special: 'gaze'
                });
            }
            specialMoves.gaze._lastFire = Date.now();
        }
        if (specialMoves.gaze.timer <= 0) {
            specialMoves.gaze.active = false;
        }
    }
    // Plasma Wave
    if (specialMoves.plasmaWave.active) {
        specialMoves.plasmaWave.timer -= dt;
        
        const move = specialMoves.plasmaWave;
        const progress = 1 - (move.timer / move.duration); // Goes from 0 to 1

        // --- Part 1: Charging animation around the ship ---
        ctx.save();
        const radius = 20 + 40 * progress; // Sphere grows as it charges
        const alpha = 0.5 + 0.5 * progress;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 30;

        // Draw a crackling energy ball
        const gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.6, 'rgba(0, 255, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 128, 255, 0.3)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw small lightning arcs flickering around the sphere
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            let angle = Math.random() * Math.PI * 2;
            let endX = player.x + Math.cos(angle) * (radius + 5 + Math.random() * 10);
            let endY = player.y + Math.sin(angle) * (radius + 5 + Math.random() * 10);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        ctx.restore();

        // --- Part 2: When timer ends, unleash the lightning! ---
        if (move.timer <= 0) {
            move.active = false; // End the move

            // 1. Destroy ALL enemies on screen with lightning bolts
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                createLightningBolt(player.x, player.y, enemy.x, enemy.y);
                createExplosion(enemy.x, enemy.y, 30);
                score += 100;
                registerKill();
            }
            enemies = [];

            // 2. Damage boss with a big lightning bolt
            if (boss) {
                createLightningBolt(player.x, player.y, boss.x, boss.y, 5); // Thicker bolt for boss
                const damagePercent = Math.max(0.15, 0.30 - (level - 1) * 0.01);
                const damage = boss.maxHealth * damagePercent;
                boss.health -= damage;
                updateBossHealth();
                createExplosion(boss.x, boss.y, 40);
                if (boss.health <= 0) {
                    createExplosion(boss.x, boss.y, 60);
                    boss = null;
                    bossDefeated = true;
                    document.getElementById('bossHealth').style.display = 'none';
                    score += 1000;
                    soundManager.play('bossDefeat');
                    bossBullets = [];
                    bossMissiles = [];
                }
            }

            // 3. Clear all bullets on screen
            enemyBullets = [];
            bossBullets = [];
            bossMissiles = [];
        }
    }
    // Energy Shield
    if (specialMoves.energyShield.active) {
        specialMoves.energyShield.timer -= dt;
        if (specialMoves.energyShield.timer <= 0) {
            specialMoves.energyShield.active = false;
        }
    }
    // Teleport Dash
    const voidPulse = specialMoves.teleportDash;
    if (voidPulse.active) {
        voidPulse.timer -= dt;
        const progress = 1 - (voidPulse.timer / voidPulse.duration); // 0 to 1
        const waveY = canvas.height - (canvas.height * progress);

        // --- Draw the wave ---
        ctx.save();
        const waveHeight = 80; // How thick the wave front is
        const waveFrontY = waveY - waveHeight / 2;

        // Create a gradient for the main wave body
        const gradient = ctx.createLinearGradient(0, waveFrontY, 0, waveFrontY + waveHeight);
        gradient.addColorStop(0, 'rgba(171, 71, 188, 0)'); // Fade at the top
        gradient.addColorStop(0.5, 'rgba(171, 71, 188, 0.7)'); // Core color
        gradient.addColorStop(1, 'rgba(106, 27, 154, 0.5)'); // Darker trail
        ctx.fillStyle = gradient;
        ctx.fillRect(0, waveFrontY, canvas.width, waveHeight);

        // Add a bright, crackling leading edge
        ctx.shadowColor = '#f3e5f5';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, waveY);
        for (let x = 0; x < canvas.width; x += 20) {
            ctx.lineTo(x, waveY + Math.sin(x / 50 + Date.now() / 100) * 10);
            const mainWiggle = Math.sin(x / 50 + Date.now() / 100) * 10;
            const fastWiggle = Math.sin(x / 15 + Date.now() / 60) * 4; // More chaotic crackle
            ctx.lineTo(x, waveY + mainWiggle + fastWiggle);
        }
        ctx.stroke();
        ctx.restore();

        // --- Collision and destruction ---
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (enemy.y < waveY + 20) { // Check if enemy is behind the wave
                createExplosion(enemy.x, enemy.y, 30);
                createExplosion(enemy.x, enemy.y, 30, 'disintegration'); // New disintegration effect
                enemies.splice(i, 1);
                score += 100;
                registerKill();
            }
        }

        // Damage the boss if it's hit
        if (boss && !boss.hitByVoidPulse && boss.y < waveY + 20) {
            const damage = boss.maxHealth * 0.35; // 35% of max health
            boss.health -= damage;
            boss.hitByVoidPulse = true; // Flag to ensure it's only hit once per pulse
            createExplosion(boss.x, boss.y, 60);
            updateBossHealth();
        }

        if (voidPulse.timer <= 0) {
            voidPulse.active = false;
            if (boss) boss.hitByVoidPulse = false; // Reset flag for next use
            waveParticles = []; // Clear any remaining particles
        }

        // Spawn new particles at the wave front
        if (Math.random() > 0.4) {
            waveParticles.push({
                x: Math.random() * canvas.width,
                y: waveY + (Math.random() - 0.5) * 20,
                vy: -Math.random() * 2 - 1,
                vx: (Math.random() - 0.5) * 2,
                life: 40 + Math.random() * 40,
                size: Math.random() * 3 + 1,
                color: `rgba(234, 179, 255, ${Math.random() * 0.5 + 0.5})`
            });
        }
    }
    // Drone Support
    if (specialMoves.droneSupport.active) {
        specialMoves.droneSupport.timer -= dt;
        if (specialMoves.droneSupport.timer <= 0) {
            specialMoves.droneSupport.active = false;
        }
    }
}

function createLightningBolt(startX, startY, endX, endY, thickness = 2) {
    // This function will draw a lightning bolt for a single frame.
    // We'll add it to the explosions array to render it temporarily.
    explosions.push({
        x: startX, y: startY, // Not really used, but keeps object structure consistent
        life: 10, // Lasts for 10 frames
        maxLife: 10,
        type: 'lightning',
        startX, startY, endX, endY, thickness
    });
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
    soundManager.playMusic('bonus');
    bonusRoundTimer = 20000;
    bonusBar.style.opacity = '1';
    setTimeout(() => {
        bonusBar.style.opacity = '0';
    }, 2500);
}
function endBonusRound() {
    bonusRoundActive = false;
    soundManager.playMusic('background');
    bonusBar.style.opacity = '0';
    doLevelTransition(level + 1);
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

function shootDroneBullet(drone) {
    const target = findClosestEnemy(drone.x, drone.y);
    if (!target) return;
    const dx = target.x - drone.x;
    const dy = target.y - drone.y;
    const dist = Math.hypot(dx, dy);
    playerBullets.push({
        x: drone.x, y: drone.y, width: 5, height: 5, damage: 8,
        vx: (dx / dist) * 7,
        vy: (dy / dist) * 7,
        special: 'gaze' // Re-use gaze visuals for performance
    });
}
// --- POWERUP SYSTEM ---
let attackBoostStacks = 0;
let defenseBoostStacks = 0;

function collectPowerup(type) {
    soundManager.play('powerup');
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
            soundManager.play('playerHit'); // Boss hit sound
            playerBullets.splice(i, 1);
            updateBossHealth();
            if (boss.health <= 0) {
                createExplosion(boss.x, boss.y, 50);
                boss = null;
                bossDefeated = true;
                document.getElementById('bossHealth').style.display = 'none';
                score += 1000;
                soundManager.playMusic('background'); // Switch back to normal music
                soundManager.play('bossDefeat');
                // Clear all boss projectiles so player can't be hit during transition
                bossBullets = [];
                bossMissiles = [];
                // Bonus round every 3 levels
                if ((level % 3 === 0) && !bonusRoundActive) {
                    setTimeout(() => {
                        startBonusRound();
                        setTimeout(() => {
                            // endBonusRound will now handle the next step
                            // (either intermission or level transition)
                            endBonusRound(); 
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
            if (specialMoves.energyShield.active) {
                // Shield deflects bullet
                createExplosion(bullet.x, bullet.y, 5);
                enemyBullets.splice(i, 1);
                continue;
            }
            if (!bonusRoundActive) {
                soundManager.play('playerHit');
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
            if (specialMoves.energyShield.active) {
                // Shield deflects bullet
                createExplosion(bullet.x, bullet.y, 5);
                bossBullets.splice(i, 1);
                continue;
            }
            if (!bonusRoundActive) {
                soundManager.play('playerHit');
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
            if (specialMoves.energyShield.active) {
                // Shield deflects missile
                createExplosion(missile.x, missile.y, 10);
                bossMissiles.splice(i, 1);
                continue;
            }
            if (!bonusRoundActive) {
                soundManager.play('playerHit');
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

    // Player homing missiles vs enemies/boss
    for (let i = playerHomingMissiles.length - 1; i >= 0; i--) {
        const missile = playerHomingMissiles[i];
        let missileRemoved = false;

        // Check against regular enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            // Skip collision check if missile just spawned inside the player
            if (checkCollision(missile, player)) {
                // This prevents the missile from instantly colliding with an enemy that is on top of the player
                // A more robust solution might check the missile's age, but this is a simple and effective fix.
                continue;
            }
            if (checkCollision(missile, enemy)) {
                createExplosion(enemy.x, enemy.y, 40); // Big explosion
                enemies.splice(j, 1);
                score += 100;
                registerKill();
                playerHomingMissiles.splice(i, 1);
                missileRemoved = true;
                break;
            }
        }
        if (missileRemoved) continue;

        // Check against boss
        if (boss && checkCollision(missile, boss)) {
            // Skip collision check if missile just spawned inside the player
            if (checkCollision(missile, player)) {
                continue;
            }

            boss.health -= missile.damage || 50; // Use missile damage, or default
            updateBossHealth();
            createExplosion(missile.x, missile.y, 40); // Big explosion on boss
            playerHomingMissiles.splice(i, 1);
            
            if (boss.health <= 0) {
                createExplosion(boss.x, boss.y, 60);
                boss = null;
                bossDefeated = true;
                document.getElementById('bossHealth').style.display = 'none';
                score += 1000;
                soundManager.play('bossDefeat');
            }
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

    // Apply screen shake if active
    if (screenShake.timer > 0) {
        screenShake.timer -= dt;
        const shakeX = (Math.random() - 0.5) * screenShake.intensity * (screenShake.timer / screenShake.duration);
        const shakeY = (Math.random() - 0.5) * screenShake.intensity * (screenShake.timer / screenShake.duration);
        ctx.save();
        ctx.translate(shakeX, shakeY);
    }

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
    updateFriendlyDrones();
    updatePlayer();
    updateEnemies();
    updateBullets();
    updateHomingMissiles();
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
    drawFriendlyDrones();
    drawBullets();
    drawExplosions();
    updateAndDrawWaveParticles();
    drawPowerups();
    if (typeof boss !== 'undefined' && boss) drawBoss();
    if (specialMoves.energyShield.active) drawTemporalShieldEffect();
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

    // Restore from screen shake
    if (screenShake.timer > 0) {
        ctx.restore();
    } else { screenShake.intensity = 0; }

    // Continue game loop
    animationFrameId = requestAnimationFrame(gameLoop);
};

function updateHighScoreDisplay() {
    const highScoreEl = document.getElementById('highScoreDisplay');
    if (highScoreEl) {
        highScoreEl.textContent = `High Score: ${highScore}`;
    }
}

function drawTemporalShieldEffect() {
    ctx.save();
    const shieldRadius = 80;
    const pulse = Math.sin(Date.now() / 200) * 5;
    const gradient = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, shieldRadius + pulse);
    gradient.addColorStop(0, 'rgba(0, 229, 255, 0)');
    gradient.addColorStop(0.7, 'rgba(0, 229, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 229, 255, 0.5)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(player.x, player.y, shieldRadius + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(Date.now() / 150) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

// --- NEW SHIP SELECTION LOGIC ---
const shipSelectScreen = document.getElementById('shipSelectScreen');

function showShipSelector() {
    populateShipSelector();
    shipSelectScreen.style.display = 'flex';
}

function populateShipSelector() {
    const grid = document.getElementById('shipGrid');
    grid.innerHTML = '';
    for (const shipId in ships) {
        const ship = ships[shipId];
        const card = document.createElement('div');
        card.className = 'ship-card';
        card.dataset.shipId = ship.id;

        card.innerHTML = `
            <canvas width="120" height="120" id="ship-canvas-${ship.id}"></canvas>
            <h3>${ship.name}</h3>
            <p>Unique Move: <span class="unique-move">${specialMoves[ship.specialMoveIds[2]].name}</span></p>
        `;

        grid.appendChild(card);

        // Draw the ship preview on its little canvas
        const shipCanvas = document.getElementById(`ship-canvas-${ship.id}`);
        const shipCtx = shipCanvas.getContext('2d');
        ctx = shipCtx; // Temporarily switch context for drawing function
        ship.draw({ x: 60, y: 60, width: ship.width, height: ship.height });
        ctx = canvas.getContext('2d'); // Switch back to main context
    }
}

function updateShipUI() {
    const currentShip = ships[playerShipId];
    if (!currentShip) return;

    const moveIds = currentShip.specialMoveIds;
    const icons = { gaze: '💥', beam: '🔥', missileStrike: '🚀', plasmaWave: '💫', energyShield: '⏳', teleportDash: '🌀', droneSupport: '🛰️' };

    for (let i = 0; i < 3; i++) {
        const moveId = moveIds[i];
        const move = specialMoves[moveId];
        const div = document.getElementById(`specialMove${i + 1}`);
        if (div) {
            div.querySelector('.special-icon').textContent = icons[moveId] || '❔';
            div.querySelector('.special-name').textContent = move.name;
        }
    }

    // Update global controls info
    const keybindsSpan = document.getElementById('specialMoveKeybinds');
    if (keybindsSpan) {
        keybindsSpan.textContent = `[1] ${specialMoves[moveIds[0]].name} [2] ${specialMoves[moveIds[1]].name} [3] ${specialMoves[moveIds[2]].name}`;
    }
}

// Ship Definitions
const ships = {
    'ship1': { id: 'ship1', name: 'Interceptor', draw: drawPlayerShip1, width: 40, height: 60, specialMoveIds: ['gaze', 'beam', 'missileStrike'] },
    'ship2': { id: 'ship2', name: 'Striker', draw: drawPlayerShip2, width: 45, height: 55, specialMoveIds: ['gaze', 'beam', 'plasmaWave'] },
    'ship3': { id: 'ship3', name: 'Aegis', draw: drawPlayerShip3, width: 50, height: 50, specialMoveIds: ['gaze', 'beam', 'energyShield'] },
    'ship4': { id: 'ship4', name: 'Phantom', draw: drawPlayerShip4, width: 40, height: 50, specialMoveIds: ['gaze', 'beam', 'teleportDash'] }, // teleportDash is now Void Pulse
    'ship5': { id: 'ship5', name: 'Carrier', draw: drawPlayerShip5, width: 48, height: 52, specialMoveIds: ['gaze', 'beam', 'droneSupport'] },
};

// Make sure the control modal is visible when the page loads
window.addEventListener('DOMContentLoaded', () => {
    // Initialize the sound manager.
    // Sounds and music will be generated on the fly, no loading needed.
    soundManager.init();

    // Initialize DOM elements
    controlModal = document.getElementById('controlModal');
    keyboardBtn = document.getElementById('keyboardBtn');
    mouseBtn = document.getElementById('mouseBtn');
    mobileBtn = document.getElementById('mobileBtn');
    instructionsDiv = document.querySelector('.instructions');
    restartBtn = document.getElementById('restartBtn');
    const muteBtn = document.getElementById('muteBtn'); // This was missing

    updateHighScoreDisplay();
    
    // Add a single, reliable event listener for the entire ship selection grid.
    // This uses "event delegation" to handle clicks on any ship card.
    const shipGrid = document.getElementById('shipGrid');
    if (shipGrid) {
        shipGrid.addEventListener('click', (event) => {
            // Find the ship card that was clicked on, even if the user clicks an inner element like the text or canvas.
            const card = event.target.closest('.ship-card');
            if (!card) return; // Exit if the click was not on a card.

            const selectedShipId = card.dataset.shipId;
            const selectedShip = ships[selectedShipId];

            if (selectedShip) {
                playerShipId = selectedShipId;
                player.width = selectedShip.width;
                player.height = selectedShip.height;
                shipSelectScreen.style.display = 'none';
                updateShipUI();
                restartGame();
            }
        });
    }

    // Set up event listeners
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            // Restarting from game over should show control modal again
            controlModal.style.display = 'flex';
            document.getElementById('gameOver').style.display = 'none';
            document.getElementById('restartBtn').style.display = 'none';
        });
    }

    // Mute button logic
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            const isMuted = soundManager.toggleMute();
            muteBtn.textContent = isMuted ? '🔇' : '🔊';
        });
    }
    
    if (keyboardBtn) {
        keyboardBtn.addEventListener('click', () => {
            controlMode = 'keyboard';
            controlModal.style.display = 'none';
            showShipSelector();
        });
    }
    
    if (mouseBtn) {
        mouseBtn.addEventListener('click', () => {
            controlMode = 'mouse';
            controlModal.style.display = 'none';
            showShipSelector();
        });
    }
    
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            controlMode = 'mobile';
            controlModal.style.display = 'none';
            showShipSelector();
        });
    }
    
    // Auto-detect mobile and show appropriate controls
    if (isMobile && !controlMode) {
        controlMode = 'mobile';
        setupMobileControls();
        if (controlModal) {
            controlModal.style.display = 'none';
        }
        showShipSelector();
    } else if (controlModal) {
        // On desktop, show the control selection modal
        controlModal.style.display = 'flex';
    }
}); 
