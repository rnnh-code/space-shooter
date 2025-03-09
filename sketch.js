// Space Shooter Game

// Supabase configuration
const SUPABASE_URL = 'https://gpgzrfrtxxdecziiuiry.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZ3pyZnJ0eHhkZWN6aWl1aXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0ODg2NTUsImV4cCI6MjA1NzA2NDY1NX0.SCyB5DTbxB8MQISAuaD4p7lXRBq68ebkNIjbRd8ypjw';
let supabase;
// Flag to track if Supabase is available
let supabaseAvailable = false;

// Game objects
let player;
let enemies = [];
let bullets = [];
let stars = [];
let explosions = [];
let powerUps = [];
let score = 0;
let lives = 3;
let gameOver = false;
let screenShake = 0;
let showLeaderboard = false;
let leaderboardData = [];
let leaderboardLoaded = false;

// Player upgrade states
let playerUpgrades = {
  firepower: 1,  // 1=normal, 2=double, 3=triple, 4=laser, 5=three-pronged
  shield: 0,     // 0=none, 1=active
  speed: 1,      // speed multiplier
  laserCharge: 0, // charge for laser shots
  timeWarp: 0,    // 0=inactive, 1=active
  timeWarpDuration: 0, // duration counter for time warp
  quantumShield: 0,    // 0=inactive, 1=active
  quantumShieldDuration: 0 // duration counter for quantum shield
};

// DOM elements
let leaderboardModal = null;
let leaderboardViewModal = null;
let finalScoreElement = null;
let playerEmailInput = null;
let playerNameInput = null;
let emailErrorElement = null;
let submitMessageElement = null;
let leaderboardTable = null;
let leaderboardBody = null;
let leaderboardLoading = null;

// Debug flag
let debugMode = false;

// Setup function runs once at the beginning
function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Initialize Supabase client with error handling
  try {
    if (typeof window.supabase !== 'undefined') {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      supabaseAvailable = true;
      console.log('Supabase initialized successfully');
    } else {
      console.error('Supabase library not found');
    }
  } catch (error) {
    console.error('Failed to initialize Supabase:', error);
  }
  
  // Initialize DOM elements safely
  try {
    leaderboardModal = document.getElementById('leaderboardModal');
    leaderboardViewModal = document.getElementById('leaderboardViewModal');
    finalScoreElement = document.getElementById('finalScore');
    playerEmailInput = document.getElementById('playerEmail');
    playerNameInput = document.getElementById('playerName');
    emailErrorElement = document.getElementById('emailError');
    submitMessageElement = document.getElementById('submitMessage');
    leaderboardTable = document.getElementById('leaderboardTable');
    leaderboardBody = document.getElementById('leaderboardBody');
    leaderboardLoading = document.getElementById('leaderboardLoading');
    
    // Add event listeners for leaderboard buttons
    if (document.getElementById('submitScore')) {
      document.getElementById('submitScore').addEventListener('click', submitScore);
    }
    if (document.getElementById('viewLeaderboard')) {
      document.getElementById('viewLeaderboard').addEventListener('click', viewLeaderboard);
    }
    if (document.getElementById('closeModal')) {
      document.getElementById('closeModal').addEventListener('click', closeLeaderboardModal);
    }
    if (document.getElementById('closeLeaderboardView')) {
      document.getElementById('closeLeaderboardView').addEventListener('click', closeLeaderboardViewModal);
    }
    
    // Add focus handlers to prevent game from capturing keyboard events
    if (playerEmailInput) {
      playerEmailInput.addEventListener('focus', () => {
        noLoop(); // Pause the game loop when input is focused
      });
      playerEmailInput.addEventListener('blur', () => {
        loop(); // Resume the game loop when input loses focus
      });
    }
    if (playerNameInput) {
      playerNameInput.addEventListener('focus', () => {
        noLoop();
      });
      playerNameInput.addEventListener('blur', () => {
        loop();
      });
    }
    
    console.log('DOM elements initialized successfully');
  } catch (error) {
    console.error('Error initializing DOM elements:', error);
  }
  
  // Create player ship
  player = {
    x: width / 2,
    y: height - 100,
    size: 40,
    speed: 8,
    color: color(0, 255, 0),
    shieldActive: false,
    shieldTime: 0,
    vibration: 0
  };
  
  // Create initial enemies
  for (let i = 0; i < 5; i++) {
    spawnEnemy();
  }
  
  // Create stars for background (increase number for denser starfield)
  for (let i = 0; i < 200; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      speed: random(0.5, 2),
      twinkle: random(0.01, 0.05),
      brightness: random(150, 255),
      twinkleDirection: random() > 0.5 ? 1 : -1
    });
  }
  
  // Add more detailed planets for a richer solar system
  for (let i = 0; i < 8; i++) {  // Increase number of planets
    // Create more variety in planet appearances
    let planetSize = random(12, 25);  // Larger planets
    
    // Create more interesting planet colors
    let planetColors = [
      color(255, 100, 50),  // Mars-like
      color(200, 170, 100),  // Saturn-like
      color(100, 140, 200),  // Neptune-like
      color(150, 220, 150),  // Alien green
      color(220, 180, 130),  // Gas giant
      color(80, 80, 120),    // Cold planet
      color(180, 120, 210),  // Purple planet
      color(255, 200, 50)    // Yellow sun-like
    ];
    
    stars.push({
      x: random(width),
      y: random(height),
      size: planetSize,
      speed: random(0.05, 0.2),  // Slower movement
      isPlanet: true,
      color: planetColors[i % planetColors.length],
      orbitAngle: random(TWO_PI),
      orbitSpeed: random(0.0005, 0.003),
      orbitDistance: random(15, 40),
      hasMoon: random() > 0.4,  // More likely to have moons
      moonAngle: random(TWO_PI),
      moonSpeed: random(0.01, 0.03),
      hasRings: random() > 0.6,  // Add rings to some planets
      rotationSpeed: random(0.001, 0.005)
    });
  }
}

// Draw function runs continuously
function draw() {
  background(0);
  
  // Time warp visual effect
  if (playerUpgrades.timeWarp > 0) {
    // Add a subtle time warp overlay
    push();
    noStroke();
    fill(128, 0, 255, 20);
    rect(0, 0, width, height);
    
    // Add time distortion particles
    for (let i = 0; i < 5; i++) {
      let x = random(width);
      let y = random(height);
      let size = random(2, 8);
      fill(128, 0, 255, random(100, 200));
      ellipse(x, y, size);
    }
    pop();
  }
  
  // Quantum Shield visual effect
  if (playerUpgrades.quantumShield > 0) {
    // Add a subtle quantum shield overlay
    push();
    noStroke();
    fill(0, 200, 255, 10);
    rect(0, 0, width, height);
    pop();
  }
  
  // Apply screen shake effect
  if (screenShake > 0) {
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
    screenShake *= 0.9; // Reduce shake over time
    if (screenShake < 0.5) screenShake = 0;
  }
  
  // Draw stars
  drawStars();
  
  // Check if game is over
  if (gameOver) {
    displayGameOver();
    return;
  }
  
  // Move and display player
  movePlayer();
  displayPlayer();
  
  // Handle enemies
  updateEnemies();
  
  // Handle bullets
  updateBullets();
  
  // Handle explosions
  updateExplosions();
  
  // Handle power-ups
  updatePowerUps();
  
  // Update player shield
  updatePlayerShield();
  
  // Display score and lives
  displayHUD();
}

// Function to draw stars and planets
function drawStars() {
  // Add a subtle space glow for a more realistic space background
  for (let i = 0; i < 3; i++) {
    fill(30, 0, 60, 5);
    noStroke();
    ellipse(width/2, height/2, width * (1 + i*0.5), height * (1 + i*0.5));
  }
  
  // Add distant nebula effects
  noStroke();
  for (let i = 0; i < 3; i++) {
    fill(random([color(50, 0, 100, 10), color(100, 20, 40, 10), color(10, 40, 80, 10)]));
    ellipse(random(width), random(height), random(100, 300), random(80, 200));
  }
  
  for (let star of stars) {
    // Update position
    star.y += star.speed;
    if (star.y > height) {
      star.y = 0;
      star.x = random(width);
    }
    
    if (star.isPlanet) {
      // Draw planet with enhanced visuals
      push();
      translate(star.x, star.y);
      
      // Add subtle orbital movement
      star.orbitAngle += star.orbitSpeed;
      let orbitX = cos(star.orbitAngle) * star.orbitDistance;
      let orbitY = sin(star.orbitAngle) * star.orbitDistance;
      translate(orbitX, orbitY);
      
      // Planet glow effect
      for (let i = 3; i > 0; i--) {
        noFill();
        stroke(star.color.levels[0], star.color.levels[1], star.color.levels[2], 50/i);
        strokeWeight(i);
        ellipse(0, 0, star.size + i*3);
      }
      
      // Draw the planet
      fill(star.color);
      noStroke();
      ellipse(0, 0, star.size);
      
      // Add surface detail with gradient
      noStroke();
      fill(star.color.levels[0] * 0.8, star.color.levels[1] * 0.8, star.color.levels[2] * 0.8);
      arc(0, 0, star.size, star.size, 0, PI);
      
      // Add planet rings for some planets
      if (star.hasRings) {
        push();
        noFill();
        rotate(PI/6);
        stroke(200, 200, 220, 150);
        strokeWeight(1);
        ellipse(0, 0, star.size * 2.2, star.size * 0.6);
        stroke(180, 180, 200, 100);
        ellipse(0, 0, star.size * 2.5, star.size * 0.7);
        pop();
      }
      
      // Draw moon if planet has one
      if (star.hasMoon) {
        star.moonAngle += star.moonSpeed;
        let moonX = cos(star.moonAngle) * star.size * 1.2;
        let moonY = sin(star.moonAngle) * star.size * 0.6;
        
        // Moon glow
        noFill();
        stroke(200, 200, 220, 100);
        strokeWeight(1);
        ellipse(moonX, moonY, star.size/3.5);
        
        // Moon body
        fill(200, 200, 220);
        noStroke();
        ellipse(moonX, moonY, star.size/4);
        
        // Moon detail
        fill(170, 170, 190);
        ellipse(moonX + star.size/16, moonY - star.size/16, star.size/10);
      }
      
      pop();
    } else {
      // Draw enhanced twinkling stars
      star.brightness += star.twinkle * star.twinkleDirection;
      if (star.brightness > 255 || star.brightness < 150) {
        star.twinkleDirection *= -1;
      }
      
      // Star glow
      noStroke();
      fill(255, 255, 255, star.brightness * 0.2);
      ellipse(star.x, star.y, star.size * 2);
      
      // Star core
      fill(255, 255, 255, star.brightness);
      ellipse(star.x, star.y, star.size);
      
      // Star sparkle
      if (random() < 0.02) {
        stroke(255, 255, 255, 200);
        strokeWeight(0.5);
        let sparkleSize = random(3, 7);
        line(star.x - sparkleSize, star.y, star.x + sparkleSize, star.y);
        line(star.x, star.y - sparkleSize, star.x, star.y + sparkleSize);
      }
    }
  }
}

// Move the player based on keyboard input
function movePlayer() {
  // Apply speed boost if active
  let currentSpeed = player.speed * playerUpgrades.speed;
  
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // Left arrow or A
    player.x -= currentSpeed;
  }
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // Right arrow or D
    player.x += currentSpeed;
  }
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) { // Up arrow or W
    player.y -= currentSpeed;
  }
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { // Down arrow or S
    player.y += currentSpeed;
  }
  
  // Keep player on screen
  player.x = constrain(player.x, 0 + player.size/2, width - player.size/2);
  player.y = constrain(player.y, 0 + player.size/2, height - player.size/2);
}

// Display the player ship - Futuristic Cyber Cruiser design
function displayPlayer() {
  push();
  
  // Apply vibration effect when hit
  if (player.vibration > 0) {
    translate(random(-3, 3), random(-3, 3));
    player.vibration--;
  }
  
  // Draw shield if active
  if (player.shieldActive) {
    // Hexagonal shield for cyber look
    noFill();
    stroke(0, 150, 255, 150 + sin(frameCount * 0.1) * 50);
    strokeWeight(3);
    beginShape();
    for (let i = 0; i < 6; i++) {
      let angle = TWO_PI / 6 * i - PI/6;
      let sx = player.x + cos(angle) * player.size * 0.9;
      let sy = player.y + sin(angle) * player.size * 0.9;
      vertex(sx, sy);
    }
    endShape(CLOSE);
  }
  
  // Draw quantum shield if active
  if (playerUpgrades.quantumShield > 0) {
    // Multiple layered hexagonal shields that rotate
    push();
    translate(player.x, player.y);
    
    // Outer glow effect
    for (let j = 0; j < 3; j++) {
      let pulseSize = 1.0 + sin(frameCount * 0.05 + j) * 0.2;
      let rotation = frameCount * 0.02 * (j % 2 === 0 ? 1 : -1); // Alternate rotation direction
      
      for (let i = 3; i > 0; i--) {
        noFill();
        stroke(0, 200, 255, 150/i);
        strokeWeight(i);
        
        beginShape();
        for (let a = 0; a < TWO_PI; a += PI/3) {
          let r = player.size * (1.0 + j*0.4) * pulseSize;
          let x = cos(a + rotation) * r;
          let y = sin(a + rotation) * r;
          vertex(x, y);
        }
        endShape(CLOSE);
      }
    }
    
    // Energy particles orbiting the shield
    for (let i = 0; i < 12; i++) {
      let angle = frameCount * 0.1 + i * (PI/6);
      let orbitRadius = player.size * 2.2;
      let x = cos(angle) * orbitRadius;
      let y = sin(angle) * orbitRadius;
      
      // Particle trail
      for (let t = 0; t < 3; t++) {
        let trailAngle = angle - t * 0.2;
        let trailX = cos(trailAngle) * orbitRadius;
        let trailY = sin(trailAngle) * orbitRadius;
        
        fill(0, 200, 255, 100 - t * 30);
        noStroke();
        ellipse(trailX, trailY, 4 - t);
      }
    }
    
    pop();
    
    // Add quantum shield glow
    stroke(0, 200, 255, 50 + sin(frameCount * 0.2) * 30);
    strokeWeight(6);
    noFill();
    ellipse(player.x, player.y, player.size * 2.8);
  }
  
  // Add regular shield glow if active
  if (player.shieldActive) {
    stroke(0, 150, 255, 50 + sin(frameCount * 0.2) * 30);
    strokeWeight(8);
    beginShape();
    for (let i = 0; i < 6; i++) {
      let angle = TWO_PI / 6 * i - PI/6;
      let sx = player.x + cos(angle) * player.size * 0.9;
      let sy = player.y + sin(angle) * player.size * 0.9;
      vertex(sx, sy);
    }
    endShape(CLOSE);
  }
  
  // Cyber Cruiser base - glowing outline effect
  let pulseRate = frameCount * 0.1;
  let glowIntensity = 150 + sin(pulseRate) * 50;
  
  // Draw the neon glow outline first
  noFill();
  stroke(0, 255, 200, glowIntensity);
  strokeWeight(4);
  
  // Main ship body - sleek futuristic shape
  beginShape();
  vertex(player.x, player.y - player.size * 0.6); // Top point
  vertex(player.x + player.size * 0.4, player.y - player.size * 0.2); // Right shoulder
  vertex(player.x + player.size * 0.5, player.y + player.size * 0.3); // Right wing
  vertex(player.x + player.size * 0.2, player.y + player.size * 0.1); // Right indent
  vertex(player.x, player.y + player.size * 0.4); // Bottom point
  vertex(player.x - player.size * 0.2, player.y + player.size * 0.1); // Left indent
  vertex(player.x - player.size * 0.5, player.y + player.size * 0.3); // Left wing
  vertex(player.x - player.size * 0.4, player.y - player.size * 0.2); // Left shoulder
  endShape(CLOSE);
  
  // Draw solid ship with cyber colors
  fill(20, 20, 40); // Dark base
  stroke(0, 255, 200);
  strokeWeight(2);
  
  // Main ship body - same shape
  beginShape();
  vertex(player.x, player.y - player.size * 0.6); // Top point
  vertex(player.x + player.size * 0.4, player.y - player.size * 0.2); // Right shoulder
  vertex(player.x + player.size * 0.5, player.y + player.size * 0.3); // Right wing
  vertex(player.x + player.size * 0.2, player.y + player.size * 0.1); // Right indent
  vertex(player.x, player.y + player.size * 0.4); // Bottom point
  vertex(player.x - player.size * 0.2, player.y + player.size * 0.1); // Left indent
  vertex(player.x - player.size * 0.5, player.y + player.size * 0.3); // Left wing
  vertex(player.x - player.size * 0.4, player.y - player.size * 0.2); // Left shoulder
  endShape(CLOSE);
  
  // Cockpit/windshield
  fill(0, 200, 255, 200);
  noStroke();
  beginShape();
  vertex(player.x, player.y - player.size * 0.3);
  vertex(player.x + player.size * 0.2, player.y - player.size * 0.1);
  vertex(player.x, player.y + player.size * 0.1);
  vertex(player.x - player.size * 0.2, player.y - player.size * 0.1);
  endShape(CLOSE);
  
  // Add visual upgrades based on firepower
  if (playerUpgrades.firepower >= 2) {
    // Dual energy cannons
    fill(255, 255, 0, glowIntensity);
    noStroke();
    // Left cannon
    ellipse(player.x - player.size * 0.3, player.y, player.size * 0.1);
    // Right cannon
    ellipse(player.x + player.size * 0.3, player.y, player.size * 0.1);
    
    // Energy glow
    fill(255, 255, 0, 50);
    ellipse(player.x - player.size * 0.3, player.y, player.size * 0.2);
    ellipse(player.x + player.size * 0.3, player.y, player.size * 0.2);
  }
  
  if (playerUpgrades.firepower >= 3) {
    // Central advanced cannon
    fill(255, 100, 0, glowIntensity);
    noStroke();
    ellipse(player.x, player.y - player.size * 0.4, player.size * 0.15);
    
    // Energy glow
    fill(255, 100, 0, 50);
    ellipse(player.x, player.y - player.size * 0.4, player.size * 0.3);
  }
  
  // Speed boost visual - energy trail
  if (playerUpgrades.speed > 1) {
    noFill();
    for (let i = 0; i < 3; i++) {
      let trailOpacity = 150 - i * 40;
      let trailSize = i * 5;
      stroke(0, 200, 255, trailOpacity);
      strokeWeight(2);
      beginShape();
      vertex(player.x - player.size * 0.2 - trailSize, player.y + player.size * 0.4 + trailSize);
      vertex(player.x, player.y + player.size * 0.6 + trailSize);
      vertex(player.x + player.size * 0.2 + trailSize, player.y + player.size * 0.4 + trailSize);
      endShape();
    }
  }
  
  // Add holographic elements that pulse
  stroke(0, 255, 200, 100 + sin(frameCount * 0.2) * 50);
  strokeWeight(1);
  noFill();
  
  // Decorative tech lines
  line(player.x - player.size * 0.3, player.y - player.size * 0.2, 
       player.x - player.size * 0.1, player.y - player.size * 0.2);
  line(player.x + player.size * 0.1, player.y - player.size * 0.2, 
       player.x + player.size * 0.3, player.y - player.size * 0.2);
       
  // Small details
  for (let i = -2; i <= 2; i++) {
    if (i !== 0) {
      let x = player.x + i * player.size * 0.1;
      let y = player.y + player.size * 0.2;
      point(x, y);
    }
  }
  
  pop();
}

// Create a new enemy
function spawnEnemy() {
  enemies.push({
    x: random(50, width - 50),
    y: random(-300, -50),
    size: random(20, 40),
    speed: random(2, 4),
    color: color(random(100, 255), random(50), random(50)),
    type: floor(random(3)), // 0=basic, 1=shooter, 2=boss
    tentacleAngle: random(TWO_PI),
    tentacleSpeed: random(0.02, 0.05),
    health: floor(random(1, 4))
  });
}

// Update all enemies
function updateEnemies() {
  // Calculate time warp effect - slow down enemies if time warp is active
  let timeWarpMultiplier = playerUpgrades.timeWarp > 0 ? 0.3 : 1.0;
  
  for (let i = enemies.length - 1; i >= 0; i--) {
    let enemy = enemies[i];
    
    // Move the enemy (affected by time warp)
    enemy.y += enemy.speed * timeWarpMultiplier;
    
    // Update tentacle animation (affected by time warp)
    enemy.tentacleAngle += enemy.tentacleSpeed * timeWarpMultiplier;
    
    // Check if enemy is out of screen
    if (enemy.y > height + 50) {
      enemies.splice(i, 1);
      spawnEnemy();
      continue;
    }
    
    // Check collision with player
    let d = dist(player.x, player.y, enemy.x, enemy.y);
    if (d < (player.size/2 + enemy.size/2)) {
      // Player was hit by enemy
      if (player.shieldActive || playerUpgrades.quantumShield > 0) {
        // Shield absorbs the hit
        
        // Different effects based on shield type
        if (playerUpgrades.quantumShield > 0) {
          // Quantum shield effect (more dramatic)
          createExplosion(enemy.x, enemy.y, color(0, 200, 255), 30);
          score += 8; // Bonus points for quantum shield
          // Quantum shield stays active
        } else {
          // Regular shield gets depleted
          player.shieldActive = false;
          playerUpgrades.shield = 0;
          createExplosion(enemy.x, enemy.y, color(0, 100, 255), 20);
        }
        
        enemies.splice(i, 1);
        spawnEnemy();
        screenShake = 5;
      } else {
        createExplosion(enemy.x, enemy.y, enemy.color, 15);
        enemies.splice(i, 1);
        spawnEnemy();
        lives--;
        
        // Add screen shake and player vibration
        screenShake = 10;
        player.vibration = 15;
        
        if (lives <= 0) {
          gameOver = true;
        }
        continue;
      }
    }
    
    // Display the enemy based on type
    displayEnemy(enemy);
  }
  
  // Spawn new enemies occasionally
  if (frameCount % 120 === 0) {
    spawnEnemy();
  }
}

// Display enemy with sinister appearance
function displayEnemy(enemy) {
  push();
  translate(enemy.x, enemy.y);
  
  // Update tentacle animation
  enemy.tentacleAngle += enemy.tentacleSpeed;
  
  // Draw the main body
  fill(enemy.color);
  stroke(255, 0, 0, 150);
  strokeWeight(1);
  
  // Different enemy types
  if (enemy.type === 0) { // Basic enemy - Demonic Eye
    // Glow effect
    for (let i = 4; i > 0; i--) {
      noFill();
      stroke(enemy.color.levels[0], enemy.color.levels[1], enemy.color.levels[2], 100/i);
      strokeWeight(i);
      ellipse(0, 0, enemy.size + i*3);
    }
    
    // Main body
    fill(enemy.color);
    ellipse(0, 0, enemy.size);
    
    // Evil eye with glow
    fill(255, 0, 0, 150); // Red glow
    ellipse(0, -enemy.size/8, enemy.size/1.8);
    fill(255);
    ellipse(0, -enemy.size/8, enemy.size/2);
    
    // Pupil that follows player
    let angle = atan2(player.y - enemy.y, player.x - enemy.x);
    let eyeX = cos(angle) * enemy.size/10;
    let eyeY = sin(angle) * enemy.size/10 - enemy.size/8;
    
    // Glowing pupil
    fill(255, 0, 0);
    ellipse(eyeX, eyeY, enemy.size/5);
    fill(0);
    ellipse(eyeX, eyeY, enemy.size/8);
    
    // Sinister tentacles with animation
    for (let a = 0; a < TWO_PI; a += PI/4) {
      // Wiggling tentacles
      let tentacleLength = enemy.size * 0.8;
      let segments = 3;
      let prevX = 0, prevY = 0;
      
      for (let s = 0; s < segments; s++) {
        let segmentAngle = a + sin(enemy.tentacleAngle + s) * 0.5;
        let segmentLength = tentacleLength / segments;
        let segmentX = prevX + cos(segmentAngle) * segmentLength;
        let segmentY = prevY + sin(segmentAngle) * segmentLength;
        
        // Gradient color for tentacles
        let alpha = 255 - (s * 50);
        stroke(enemy.color.levels[0], 0, enemy.color.levels[2], alpha);
        strokeWeight(3 - s);
        line(prevX, prevY, segmentX, segmentY);
        
        // Add spikes to tentacles
        if (s > 0 && s < segments-1) {
          let spikeLength = 5 - s;
          let spikeAngle = segmentAngle + PI/2;
          let spikeX = segmentX + cos(spikeAngle) * spikeLength;
          let spikeY = segmentY + sin(spikeAngle) * spikeLength;
          line(segmentX, segmentY, spikeX, spikeY);
        }
        
        prevX = segmentX;
        prevY = segmentY;
      }
    }
  } 
  else if (enemy.type === 1) { // Shooter enemy - Alien Predator
    // Glow effect
    for (let i = 3; i > 0; i--) {
      noFill();
      stroke(255, 0, 0, 100/i);
      strokeWeight(i);
      triangle(-enemy.size/2 - i*2, enemy.size/3 + i*2, 
               enemy.size/2 + i*2, enemy.size/3 + i*2, 
               0, -enemy.size/2 - i*2);
    }
    
    // Main body
    fill(enemy.color);
    triangle(-enemy.size/2, enemy.size/3, 
             enemy.size/2, enemy.size/3, 
             0, -enemy.size/2);
    
    // Alien texture
    stroke(0, 255, 0, 100);
    strokeWeight(0.5);
    for (let i = 0; i < 5; i++) {
      line(-enemy.size/2 + i*enemy.size/5, enemy.size/3, 
           0, -enemy.size/2 + i*enemy.size/10);
      line(enemy.size/2 - i*enemy.size/5, enemy.size/3, 
           0, -enemy.size/2 + i*enemy.size/10);
    }
    
    // Evil glowing eyes
    for (let i = 3; i > 0; i--) {
      fill(255, 255, 0, 150/i);
      noStroke();
      ellipse(-enemy.size/5, 0, enemy.size/5 + i*2);
      ellipse(enemy.size/5, 0, enemy.size/5 + i*2);
    }
    
    fill(255, 255, 0);
    ellipse(-enemy.size/5, 0, enemy.size/5);
    ellipse(enemy.size/5, 0, enemy.size/5);
    
    // Pupils that follow player
    let angle = atan2(player.y - enemy.y, player.x - enemy.x);
    let eyeXOffset = cos(angle) * enemy.size/15;
    let eyeYOffset = sin(angle) * enemy.size/15;
    
    fill(255, 0, 0);
    ellipse(-enemy.size/5 + eyeXOffset, eyeYOffset, enemy.size/10);
    ellipse(enemy.size/5 + eyeXOffset, eyeYOffset, enemy.size/10);
    
    // Sharp teeth
    fill(255);
    stroke(255, 0, 0);
    strokeWeight(0.5);
    for (let i = 0; i < 5; i++) {
      let toothX = -enemy.size/3 + i*enemy.size/6;
      triangle(toothX, enemy.size/4, 
               toothX + enemy.size/15, enemy.size/4, 
               toothX + enemy.size/30, enemy.size/2.5);
    }
  }
  else { // Boss enemy - Cosmic Horror
    // Pulsating aura
    let pulseSize = sin(frameCount * 0.1) * 5;
    
    for (let i = 5; i > 0; i--) {
      noFill();
      stroke(255, 0, 0, 150/i);
      strokeWeight(i);
      ellipse(0, 0, enemy.size + pulseSize + i*5);
    }
    
    // Spiked body with animation
    fill(enemy.color);
    beginShape();
    for (let a = 0; a < TWO_PI; a += PI/12) {
      let r = enemy.size/2;
      // Animate spikes
      if (a % (PI/4) < 0.01) {
        r = enemy.size/1.2 + sin(frameCount * 0.1 + a) * 5;
      }
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);
    
    // Inner details
    fill(0);
    ellipse(0, 0, enemy.size * 0.7);
    
    // Glowing runes
    stroke(255, 0, 0);
    strokeWeight(2);
    for (let a = 0; a < TWO_PI; a += PI/6) {
      let x = cos(a) * enemy.size/3;
      let y = sin(a) * enemy.size/3;
      point(x, y);
      line(x, y, x + cos(a + frameCount * 0.05) * 5, y + sin(a + frameCount * 0.05) * 5);
    }
    
    // Demonic face
    fill(255, 0, 0);
    arc(0, 0, enemy.size/1.8, enemy.size/1.8, 0, PI);
    
    // Sharp teeth
    fill(255);
    for (let i = 0; i < 8; i++) {
      let toothX = -enemy.size/3 + i*enemy.size/10;
      triangle(toothX, 0, 
               toothX + enemy.size/25, 0, 
               toothX + enemy.size/50, enemy.size/8);
    }
    
    // Glowing eyes
    for (let i = 3; i > 0; i--) {
      fill(255, 255, 0, 150/i);
      noStroke();
      ellipse(-enemy.size/6, -enemy.size/6, enemy.size/6 + i*2);
      ellipse(enemy.size/6, -enemy.size/6, enemy.size/6 + i*2);
    }
    
    fill(255, 0, 0);
    ellipse(-enemy.size/6, -enemy.size/6, enemy.size/6);
    ellipse(enemy.size/6, -enemy.size/6, enemy.size/6);
    
    // Pupils
    fill(0);
    ellipse(-enemy.size/6, -enemy.size/6, enemy.size/12);
    ellipse(enemy.size/6, -enemy.size/6, enemy.size/12);
    
    // Tentacles from the bottom
    stroke(enemy.color);
    strokeWeight(3);
    for (let a = -PI/4; a <= PI/4; a += PI/8) {
      let tentacleLength = enemy.size * 1.2;
      let segments = 5;
      let prevX = cos(a) * enemy.size/2;
      let prevY = sin(a) * enemy.size/2;
      
      for (let s = 0; s < segments; s++) {
        let segmentAngle = a + sin(enemy.tentacleAngle + s*0.5) * 0.5;
        let segmentLength = tentacleLength / segments;
        let segmentX = prevX + cos(segmentAngle) * segmentLength;
        let segmentY = prevY + sin(segmentAngle) * segmentLength;
        
        stroke(enemy.color.levels[0], 0, enemy.color.levels[2], 255 - (s * 40));
        strokeWeight(4 - s*0.5);
        line(prevX, prevY, segmentX, segmentY);
        
        prevX = segmentX;
        prevY = segmentY;
      }
    }
  }
  
  pop();
}

// Fire a bullet from the player's position
function fireBullet() {
  // Different bullet patterns based on firepower level
  switch(playerUpgrades.firepower) {
    case 1: // Normal single bullet
      bullets.push({
        x: player.x,
        y: player.y - player.size/2,
        size: 8,
        speed: 10,
        color: color(255, 255, 0),
        type: 'normal'
      });
      break;
      
    case 2: // Double bullets
      bullets.push({
        x: player.x - 10,
        y: player.y - player.size/3,
        size: 6,
        speed: 10,
        color: color(255, 200, 0),
        type: 'normal'
      });
      bullets.push({
        x: player.x + 10,
        y: player.y - player.size/3,
        size: 6,
        speed: 10,
        color: color(255, 200, 0),
        type: 'normal'
      });
      break;
      
    case 3: // Triple bullets
      bullets.push({
        x: player.x,
        y: player.y - player.size/2,
        size: 8,
        speed: 11,
        color: color(255, 150, 0),
        type: 'normal'
      });
      bullets.push({
        x: player.x - 12,
        y: player.y - player.size/3,
        size: 6,
        speed: 9,
        color: color(255, 150, 0),
        type: 'normal'
      });
      bullets.push({
        x: player.x + 12,
        y: player.y - player.size/3,
        size: 6,
        speed: 9,
        color: color(255, 150, 0),
        type: 'normal'
      });
      break;
      
    case 4: // Laser beam
      // Fire laser immediately without charging
      bullets.push({
        x: player.x,
        y: player.y - player.size/2,
        size: 12,
        speed: 15,
        color: color(0, 200, 255),
        type: 'laser',
        length: height, // Beam extends to top of screen
        width: 5,
        damage: 3
      });
      
      // Add screen shake for powerful laser
      screenShake = 5;
      break;
      
    case 5: // Three-pronged shooter
      // Center bullet
      bullets.push({
        x: player.x,
        y: player.y - player.size/2,
        size: 8,
        speed: 12,
        color: color(200, 100, 255),
        type: 'normal'
      });
      
      // Side bullets at angles
      bullets.push({
        x: player.x,
        y: player.y - player.size/3,
        size: 6,
        speed: 10,
        color: color(200, 100, 255),
        type: 'angled',
        angle: -PI/6, // 30 degrees left
        vx: -5,
        vy: -8
      });
      
      bullets.push({
        x: player.x,
        y: player.y - player.size/3,
        size: 6,
        speed: 10,
        color: color(200, 100, 255),
        type: 'angled',
        angle: PI/6, // 30 degrees right
        vx: 5,
        vy: -8
      });
      break;
  }
}

// Update all bullets
function updateBullets() {
  // Calculate time warp effect - slow down enemy bullets if time warp is active
  let timeWarpMultiplier = playerUpgrades.timeWarp > 0 ? 0.3 : 1.0;
  
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    
    // Handle different bullet types
    if (bullet.type === 'laser') {
      // Laser beams are special - they hit everything in their path
      // Draw laser beam effect
      push();
      stroke(bullet.color);
      strokeWeight(bullet.width);
      line(bullet.x, bullet.y, bullet.x, 0);
      
      // Add glow effect
      stroke(bullet.color.levels[0], bullet.color.levels[1], bullet.color.levels[2], 100);
      strokeWeight(bullet.width * 2);
      line(bullet.x, bullet.y, bullet.x, 0);
      pop();
      
      // Check all enemies in the laser's path
      for (let j = enemies.length - 1; j >= 0; j--) {
        let enemy = enemies[j];
        // Check if enemy is in the laser's vertical path
        if (abs(enemy.x - bullet.x) < (bullet.width + enemy.size/2) && enemy.y < bullet.y) {
          // Enemy was hit by laser
          enemy.health -= bullet.damage || 2;
          
          // Create hit effect
          createExplosion(enemy.x, enemy.y, color(0, 200, 255), 5);
          
          // If enemy is destroyed
          if (enemy.health <= 0) {
            // Create explosion
            createExplosion(enemy.x, enemy.y, enemy.color, 30);
            
            // Higher chance to spawn power-up for laser kills (40%)
            if (random() < 0.4) {
              spawnPowerUp(enemy.x, enemy.y);
            }
            
            // Remove enemy and add score
            enemies.splice(j, 1);
            score += 15 * (enemy.type + 1); // More points for laser kills
            spawnEnemy();
          }
        }
      }
      
      // Remove laser after one frame
      bullets.splice(i, 1);
      continue;
    } else if (bullet.type === 'angled') {
      // Move angled bullets along their trajectory (player bullets not affected by time warp)
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
    } else if (bullet.isEnemyBullet) {
      // Move enemy bullets (affected by time warp)
      bullet.y += bullet.speed * timeWarpMultiplier;
    } else {
      // Move normal player bullets straight up (not affected by time warp)
      bullet.y -= bullet.speed;
    }
    
    // Check if bullet is out of screen
    if (bullet.y < -10 || bullet.x < -10 || bullet.x > width + 10) {
      bullets.splice(i, 1);
      continue;
    }
    
    // Check collision with enemies for non-laser bullets
    for (let j = enemies.length - 1; j >= 0; j--) {
      let enemy = enemies[j];
      let d = dist(bullet.x, bullet.y, enemy.x, enemy.y);
      
      if (d < (bullet.size/2 + enemy.size/2)) {
        // Enemy was hit by bullet
        bullets.splice(i, 1);
        
        // Reduce enemy health
        enemy.health--;
        
        // Create small hit effect
        createExplosion(bullet.x, bullet.y, bullet.color, 5);
        
        // If enemy is destroyed
        if (enemy.health <= 0) {
          // Create explosion
          createExplosion(enemy.x, enemy.y, enemy.color, 20);
          
          // Chance to spawn power-up (30%)
          if (random() < 0.3) {
            spawnPowerUp(enemy.x, enemy.y);
          }
          
          // Remove enemy and add score
          enemies.splice(j, 1);
          score += 10 * (enemy.type + 1); // More points for stronger enemies
          spawnEnemy();
        }
        break;
      }
    }
    
    // Display the bullet if it still exists
    if (i >= 0 && bullets[i]) {
      push();
      if (bullet.type === 'angled') {
        // Draw angled bullets with rotation
        translate(bullet.x, bullet.y);
        rotate(bullet.angle || 0);
        fill(bullet.color);
        noStroke();
        ellipse(0, 0, bullet.size);
        
        // Add trail effect
        fill(bullet.color.levels[0], bullet.color.levels[1], bullet.color.levels[2], 100);
        ellipse(0, 5, bullet.size * 0.7);
      } else {
        // Draw normal bullets
        fill(bullet.color);
        noStroke();
        ellipse(bullet.x, bullet.y, bullet.size);
        
        // Add trail effect
        fill(bullet.color.levels[0], bullet.color.levels[1], bullet.color.levels[2], 100);
        ellipse(bullet.x, bullet.y + 10, bullet.size * 0.7);
      }
      pop();
    }
  }
}

// Create explosion particles
function createExplosion(x, y, color, particleCount) {
  for (let i = 0; i < particleCount; i++) {
    explosions.push({
      x: x,
      y: y,
      xSpeed: random(-3, 3),
      ySpeed: random(-3, 3),
      size: random(2, 8),
      color: color,
      alpha: 255,
      decay: random(5, 10)
    });
  }
}

// Update all explosions
function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    let explosion = explosions[i];
    
    // Move the particle
    explosion.x += explosion.xSpeed;
    explosion.y += explosion.ySpeed;
    
    // Fade out
    explosion.alpha -= explosion.decay;
    
    // Remove if faded out
    if (explosion.alpha <= 0) {
      explosions.splice(i, 1);
      continue;
    }
    
    // Display the particle
    fill(explosion.color.levels[0], explosion.color.levels[1], explosion.color.levels[2], explosion.alpha);
    noStroke();
    ellipse(explosion.x, explosion.y, explosion.size);
  }
}

// Spawn a power-up
function spawnPowerUp(x, y) {
  let type = floor(random(7)); // 0=firepower, 1=shield, 2=speed, 3=laser, 4=three-pronged, 5=time warp, 6=quantum shield
  
  // Colors for different power-up types
  let powerUpColor;
  switch(type) {
    case 0: // Firepower
      powerUpColor = color(255, 0, 0);
      break;
    case 1: // Shield
      powerUpColor = color(0, 100, 255);
      break;
    case 2: // Speed
      powerUpColor = color(0, 255, 255);
      break;
    case 3: // Laser
      powerUpColor = color(0, 200, 255);
      break;
    case 4: // Three-pronged
      powerUpColor = color(200, 100, 255);
      break;
    case 5: // Time Warp
      powerUpColor = color(128, 0, 255);
      break;
    case 6: // Quantum Shield
      powerUpColor = color(0, 200, 255);
      break;
  }
  
  powerUps.push({
    x: x,
    y: y,
    size: 20,
    speed: 2,
    type: type,
    color: powerUpColor,
    rotation: 0,
    rotationSpeed: random(-0.1, 0.1),
    pulseSize: 0,
    pulseDir: 1
  });
}

// Update all power-ups
function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    let powerUp = powerUps[i];
    
    // Move the power-up
    powerUp.y += powerUp.speed;
    powerUp.rotation += powerUp.rotationSpeed;
    
    // Pulse effect for size
    powerUp.pulseSize += 0.1 * powerUp.pulseDir;
    if (powerUp.pulseSize > 1.5 || powerUp.pulseSize < 0) {
      powerUp.pulseDir *= -1;
    }
    
    // Check if power-up is out of screen
    if (powerUp.y > height + 20) {
      powerUps.splice(i, 1);
      continue;
    }
    
    // Check collision with player
    let d = dist(player.x, player.y, powerUp.x, powerUp.y);
    if (d < (player.size/2 + powerUp.size/2)) {
      // Apply power-up effect
      applyPowerUp(powerUp.type);
      
      // Create pickup effect
      createExplosion(powerUp.x, powerUp.y, powerUp.color, 15);
      
      // Remove power-up
      powerUps.splice(i, 1);
      continue;
    }
    
    // Display the power-up
    push();
    translate(powerUp.x, powerUp.y);
    rotate(powerUp.rotation);
    
    // Draw glow effect
    noFill();
    for (let g = 3; g > 0; g--) {
      stroke(powerUp.color.levels[0], powerUp.color.levels[1], powerUp.color.levels[2], 100/g);
      strokeWeight(g);
      ellipse(0, 0, powerUp.size + 10 + powerUp.pulseSize * 5);
    }
    
    fill(powerUp.color);
    stroke(255);
    strokeWeight(2);
    
    switch(powerUp.type) {
      case 0: // Firepower
        beginShape();
        for (let a = 0; a < TWO_PI; a += PI/4) {
          let r = powerUp.size/2;
          if (a % (PI/2) < 0.01) r = powerUp.size/1.2;
          vertex(cos(a) * r, sin(a) * r);
        }
        endShape(CLOSE);
        fill(255);
        textAlign(CENTER, CENTER);
        text("F", 0, 0);
        break;
        
      case 1: // Shield
        ellipse(0, 0, powerUp.size);
        noFill();
        stroke(255, 255, 255, 150);
        ellipse(0, 0, powerUp.size * 1.3);
        fill(255);
        textAlign(CENTER, CENTER);
        text("S", 0, 0);
        break;
        
      case 2: // Speed
        triangle(-powerUp.size/2, powerUp.size/2, 
                 powerUp.size/2, powerUp.size/2, 
                 0, -powerUp.size/2);
        fill(255);
        textAlign(CENTER, CENTER);
        text(">", 0, 0);
        break;
        
      case 3: // Laser
        // Draw laser power-up
        rect(-powerUp.size/4, -powerUp.size/2, powerUp.size/2, powerUp.size);
        // Laser beam effect
        stroke(0, 200, 255, 200);
        strokeWeight(2);
        line(0, -powerUp.size/2 - 5, 0, -powerUp.size);
        fill(255);
        textAlign(CENTER, CENTER);
        text("L", 0, 0);
        break;
        
      case 4: // Three-pronged
        // Draw three-pronged power-up
        ellipse(0, 0, powerUp.size * 0.8);
        // Draw the three prongs
        stroke(200, 100, 255);
        strokeWeight(3);
        line(0, 0, 0, -powerUp.size/2);
        line(0, 0, -powerUp.size/3, -powerUp.size/3);
        line(0, 0, powerUp.size/3, -powerUp.size/3);
        fill(255);
        textAlign(CENTER, CENTER);
        text("3", 0, 0);
        break;
        
      case 5: // Time Warp
        // Draw time warp power-up (hourglass shape)
        fill(128, 0, 255);
        // Top triangle
        triangle(
          -powerUp.size/3, -powerUp.size/3,
          powerUp.size/3, -powerUp.size/3,
          0, 0
        );
        // Bottom triangle
        triangle(
          -powerUp.size/3, powerUp.size/3,
          powerUp.size/3, powerUp.size/3,
          0, 0
        );
        // Particles effect
        stroke(255, 255, 255, 150);
        strokeWeight(1);
        for (let i = 0; i < 4; i++) {
          let angle = frameCount * 0.1 + i * PI/2;
          let x = sin(angle) * powerUp.size/3;
          let y = cos(angle) * powerUp.size/3;
          point(x, y);
        }
        fill(255);
        textAlign(CENTER, CENTER);
        text("T", 0, 0);
        break;
        
      case 6: // Quantum Shield
        // Draw quantum shield power-up (hexagonal shield)
        // Outer glow effect
        for (let i = 3; i > 0; i--) {
          noFill();
          stroke(0, 200, 255, 150/i);
          strokeWeight(i);
          beginShape();
          for (let a = 0; a < TWO_PI; a += PI/3) {
            let r = powerUp.size/1.5;
            let x = cos(a) * r;
            let y = sin(a) * r;
            vertex(x, y);
          }
          endShape(CLOSE);
        }
        
        // Inner hexagon
        fill(0, 200, 255, 150);
        stroke(255);
        strokeWeight(2);
        beginShape();
        for (let a = 0; a < TWO_PI; a += PI/3) {
          let r = powerUp.size/2;
          let x = cos(a) * r;
          let y = sin(a) * r;
          vertex(x, y);
        }
        endShape(CLOSE);
        
        // Energy particles inside
        noStroke();
        for (let i = 0; i < 3; i++) {
          let angle = frameCount * 0.2 + i * TWO_PI/3;
          let dist = powerUp.size/4 * sin(frameCount * 0.1);
          let x = cos(angle) * dist;
          let y = sin(angle) * dist;
          fill(255, 255, 255, 200);
          ellipse(x, y, 3);
        }
        
        fill(255);
        textAlign(CENTER, CENTER);
        text("Q", 0, 0);
        break;
    }
    
    pop();
  }
}

// Apply power-up effect
function applyPowerUp(type) {
  // Create power-up acquisition effect
  screenShake = 3;
  
  switch(type) {
    case 0: // Firepower upgrade (double, triple)
      // Cycle through normal -> double -> triple
      if (playerUpgrades.firepower < 3) {
        playerUpgrades.firepower++;
      } else {
        // If already at triple, extend duration or add score
        score += 50;
      }
      break;
      
    case 1: // Shield
      player.shieldActive = true;
      playerUpgrades.shield = 1;
      player.shieldTime = 600; // 10 seconds at 60fps
      break;
      
    case 2: // Speed
      playerUpgrades.speed = 1.5;
      break;
      
    case 3: // Laser
      playerUpgrades.firepower = 4; // Laser mode
      playerUpgrades.laserCharge = 0; // Reset laser charge
      break;
      
    case 4: // Three-pronged shooter
      playerUpgrades.firepower = 5; // Three-pronged mode
      break;
      
    case 5: // Time Warp
      playerUpgrades.timeWarp = 1;
      playerUpgrades.timeWarpDuration = 300; // 5 seconds at 60fps
      break;
      
    case 6: // Quantum Shield
      playerUpgrades.quantumShield = 1;
      playerUpgrades.quantumShieldDuration = 420; // 7 seconds at 60fps
      break;
  }
  
  // Display power-up message
  let messages = [
    "Firepower Upgraded!",
    "Shield Activated!",
    "Speed Boosted!",
    "Laser Cannon Acquired!",
    "Three-Pronged Shooter Activated!",
    "Time Warp Activated!",
    "Quantum Shield Activated!"
  ];
  
  // TODO: Display message on screen
}

// Update player shield and other time-based power-ups
function updatePlayerShield() {
  // Update shield
  if (player.shieldActive) {
    player.shieldTime--;
    if (player.shieldTime <= 0) {
      player.shieldActive = false;
      playerUpgrades.shield = 0;
    }
  }
  
  // Update time warp
  if (playerUpgrades.timeWarp > 0) {
    playerUpgrades.timeWarpDuration--;
    if (playerUpgrades.timeWarpDuration <= 0) {
      playerUpgrades.timeWarp = 0;
    }
  }
  
  // Update quantum shield
  if (playerUpgrades.quantumShield > 0) {
    playerUpgrades.quantumShieldDuration--;
    if (playerUpgrades.quantumShieldDuration <= 0) {
      playerUpgrades.quantumShield = 0;
    }
  }
}

// Display score and lives
function displayHUD() {
  fill(255);
  textSize(24);
  textAlign(LEFT);
  text(`Score: ${score}`, 20, 40);
  text(`Lives: ${lives}`, 20, 70);
}

// Track if leaderboard has been shown for current game over
let leaderboardShownForCurrentGame = false;

// Display game over screen
function displayGameOver() {
  background(0, 0, 0, 150);
  
  // Create a starry background effect
  for (let i = 0; i < 50; i++) {
    fill(255, random(100, 255));
    ellipse(random(width), random(height), random(1, 3));
  }
  
  // Game over text with glow effect
  drawTextWithGlow('GAME OVER', width/2, height/2 - 60, 64, color(255, 0, 0));
  
  // Final score
  fill(255);
  textSize(32);
  textAlign(CENTER, CENTER);
  text(`Final Score: ${score}`, width/2, height/2 + 40);
  
  // Restart prompt with pulsing effect
  let pulseAmount = sin(frameCount * 0.1) * 10;
  textSize(24 + pulseAmount/10);
  fill(255, 255, 0);
  text('Press SPACE to restart', width/2, height/2 + 120);
  
  // Show leaderboard modal after a short delay (only once per game over)
  if (!leaderboardShownForCurrentGame && leaderboardModal && finalScoreElement) {
    setTimeout(() => {
      try {
        // Update final score in the modal
        finalScoreElement.textContent = score;
        
        // Clear previous inputs
        if (playerEmailInput) playerEmailInput.value = '';
        if (playerNameInput) playerNameInput.value = '';
        if (emailErrorElement) emailErrorElement.textContent = '';
        if (submitMessageElement) submitMessageElement.textContent = '';
        
        // Display the modal
        leaderboardModal.style.display = 'flex';
        showLeaderboard = true;
        leaderboardShownForCurrentGame = true;
      } catch (error) {
        console.error('Error showing leaderboard:', error);
      }
    }, 1500);
  }
}

// Helper function to draw text with glow effect
function drawTextWithGlow(txt, x, y, size, glowColor) {
  push();
  // Draw glow
  for (let i = 10; i > 0; i--) {
    fill(glowColor.levels[0], glowColor.levels[1], glowColor.levels[2], 255 / i);
    textSize(size + i);
    textAlign(CENTER, CENTER);
    text(txt, x, y);
  }
  // Draw main text
  fill(255);
  textSize(size);
  text(txt, x, y);
  pop();
}

// Reset the game
function resetGame() {
  // Clear all game objects
  enemies = [];
  bullets = [];
  explosions = [];
  powerUps = [];
  
  // Reset score and lives
  score = 0;
  lives = 3;
  gameOver = false;
  screenShake = 0;
  showLeaderboard = false;
  leaderboardShownForCurrentGame = false; // Reset this flag for next game over
  
  // Hide any open modals
  if (leaderboardModal) leaderboardModal.style.display = 'none';
  if (leaderboardViewModal) leaderboardViewModal.style.display = 'none';
  
  // Reset player position and properties
  player = {
    x: width / 2,
    y: height - 100,
    size: 40,
    speed: 8,
    color: color(0, 255, 0),
    shieldActive: false,
    shieldTime: 0,
    vibration: 0
  };
  
  // Reset player upgrades
  playerUpgrades = {
    firepower: 1,  // 1=normal, 2=double, 3=triple, 4=laser, 5=three-pronged
    shield: 0,     // 0=none, 1=active
    speed: 1,      // speed multiplier
    laserCharge: 0 // charge for laser shots
  };
  
  // Create initial enemies
  for (let i = 0; i < 5; i++) {
    spawnEnemy();
  }
}

// Handle keypresses
function keyPressed() {
  // Space bar to fire bullet or restart game
  if (keyCode === 32) { // Space
    if (gameOver) {
      // Check if a modal is visible
      let modalVisible = false;
      if (leaderboardModal && leaderboardModal.style.display === 'flex') {
        modalVisible = true;
      }
      if (leaderboardViewModal && leaderboardViewModal.style.display === 'flex') {
        modalVisible = true;
      }
      
      // Only restart if no modal is showing
      if (!modalVisible) {
        console.log('Restarting game');
        resetGame();
        loop(); // Ensure the game loop is running
        return false;
      }
    } else {
      fireBullet();
      return false;
    }
  }
  if (key === 's' || key === 'S') {
    saveCanvas('space_viral', 'png');
    sharePrompt = true;
    setTimeout(() => sharePrompt = false, 3000);
  }
  return false; // Prevent default behaviors
}

// Handle window resizing
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Leaderboard Functions

// Submit score to Supabase
async function submitScore() {
  // Check if Supabase is available
  if (!supabaseAvailable) {
    submitMessageElement.textContent = 'Leaderboard service unavailable. Please try again later.';
    return;
  }
  
  // Validate email
  const email = playerEmailInput.value.trim();
  const name = playerNameInput.value.trim() || 'Anonymous';
  
  // Simple email validation
  if (!validateEmail(email)) {
    emailErrorElement.textContent = 'Please enter a valid email address';
    return;
  }
  
  emailErrorElement.textContent = '';
  submitMessageElement.textContent = 'Submitting score...';
  
  try {
    console.log('Submitting to Supabase:', { 
      player_email: email, 
      player_name: name, 
      score: score, 
      date: new Date().toISOString() 
    });

    // Insert score into Supabase
    const { data, error } = await supabase
      .from('space')
      .insert([
        { 
          player_email: email,
          player_name: name,
          score: score,
          date: new Date().toISOString()
        }
      ]);
    
    if (error) throw error;
    
    console.log('✅ Score submitted successfully to Supabase!', data);
    submitMessageElement.textContent = 'Score submitted successfully!';
    setTimeout(() => {
      // Show the leaderboard after submission
      viewLeaderboard();
    }, 1500);
    
  } catch (error) {
    console.error('Error submitting score:', error);
    submitMessageElement.textContent = 'Error submitting score. Please try again.';
  }
}

// View leaderboard
async function viewLeaderboard() {
  // Hide the submission modal
  leaderboardModal.style.display = 'none';
  
  // Show the leaderboard modal
  leaderboardViewModal.style.display = 'flex';
  leaderboardLoading.style.display = 'block';
  leaderboardTable.style.display = 'none';
  
  if (!supabaseAvailable) {
    leaderboardBody.innerHTML = `<tr><td colspan="4">Leaderboard service unavailable. Please try again later.</td></tr>`;
    leaderboardLoading.style.display = 'none';
    leaderboardTable.style.display = 'table';
    return;
  }
  
  try {
    // Fetch leaderboard data from Supabase
    const { data, error } = await supabase
      .from('space')
      .select('player_name, score, date')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    // Store the leaderboard data
    leaderboardData = data;
    
    // Populate the leaderboard table
    populateLeaderboard();
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    leaderboardBody.innerHTML = `<tr><td colspan="4">Error loading leaderboard. Please try again.</td></tr>`;
    leaderboardLoading.style.display = 'none';
    leaderboardTable.style.display = 'table';
  }
}

// Populate leaderboard table
function populateLeaderboard() {
  // Clear existing entries
  leaderboardBody.innerHTML = '';
  
  if (leaderboardData.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="4">No scores yet. Be the first!</td></tr>`;
  } else {
    // Add each score to the table
    leaderboardData.forEach((entry, index) => {
      const row = document.createElement('tr');
      
      // Format date
      const scoreDate = new Date(entry.date);
      const formattedDate = scoreDate.toLocaleDateString();
      
      // Highlight the current player's score
      const isCurrentPlayer = entry.player_name === playerNameInput.value.trim() && 
                             entry.score === score;
      
      if (isCurrentPlayer) {
        row.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
        row.style.fontWeight = 'bold';
      }
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${entry.player_name}</td>
        <td>${entry.score}</td>
        <td>${formattedDate}</td>
      `;
      
      leaderboardBody.appendChild(row);
    });
  }
  
  // Hide loading, show table
  leaderboardLoading.style.display = 'none';
  leaderboardTable.style.display = 'table';
}

// Close leaderboard modal
function closeLeaderboardModal() {
  leaderboardModal.style.display = 'none';
  showLeaderboard = false;
}

// Close leaderboard view modal
function closeLeaderboardViewModal() {
  leaderboardViewModal.style.display = 'none';
  showLeaderboard = false;
}

// Email validation helper
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// New viral features
function showFakeRetweets() {
  fill(29, 161, 242);
  textSize(28);
  text(`🚀 ${floor(random(5000,10000))} IMPRESSIONS ON X`, width/2, 150);
}

function addTikTokFlair() {
  if(frameCount % 15 === 0) {
    emojis.push({
      x: random(width),
      y: height,
      icon: random(['🚀','👾','💥','🔥']),
      speed: random(2,5)
    });
  }
  textSize(24);
  emojis.forEach(e => {
    text(e.icon, e.x, e.y);
    e.y -= e.speed;
  });
}
