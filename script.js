// Find the canvas from index.html and get its 2D drawing tools.
const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const restartButton = document.getElementById("restartButton");
const crystalCounter = document.getElementById("crystalCounter");
const levelMessage = document.getElementById("levelMessage");
const menuOverlay = document.getElementById("menuOverlay");
const mainMenu = document.getElementById("mainMenu");
const shopMenu = document.getElementById("shopMenu");
const levelsMenu = document.getElementById("levelsMenu");
const openShopButton = document.getElementById("openShopButton");
const openLevelsButton = document.getElementById("openLevelsButton");
const resumeButton = document.getElementById("resumeButton");
const backButton = document.getElementById("backButton");
const levelsBackButton = document.getElementById("levelsBackButton");
const shopMessage = document.getElementById("shopMessage");
const upgradeButtons = document.querySelectorAll(".upgrade-button");
const levelButtons = document.querySelectorAll(".level-button");
const touchMenuButton = document.getElementById("touchMenuButton");
const touchLeftButton = document.getElementById("touchLeftButton");
const touchRightButton = document.getElementById("touchRightButton");
const touchJumpButton = document.getElementById("touchJumpButton");
const touchMineButton = document.getElementById("touchMineButton");

// The world is much larger than the visible canvas. The camera shows one part.
const world = {
  width: canvas.width * 5,
  height: canvas.height * 5,
};
const camera = {
  x: 0,
  y: 0,
  zoom: 2,
};

// Make predictable random numbers so the crystals stay in the same places.
let randomSeed = 12345;
function seededRandom() {
  randomSeed = (randomSeed * 16807) % 2147483647;
  return (randomSeed - 1) / 2147483646;
}

// This object stores the player's position, size, and movement speed.
const player = {
  x: 80,
  y: 0,
  width: 36,
  height: 36,
  speed: 5,
  velocityY: 0,
  isOnGround: false,
  walkCycle: 0,
  direction: 1,
  isDying: false,
  deathTimer: 0,
  jumpPrepareTimer: 0,
  landingBend: 0,
  pickaxeSwing: 0,
  isCompleting: false,
  airJumps: 0,
  dashTimer: 0,
  doubleJumpQueued: false,
  doubleJumpDelay: 0,
  isCelebrating: false,
  celebrationTimer: 0,
};

// Each shop item unlocks a new control for the miner.
const upgrades = {
  doubleJump: { label: "Double Jump", cost: 500, owned: false, control: "Press Space again in midair" },
  climb: { label: "Platform Phase", cost: 750, owned: false, control: "Jump upward through platforms" },
  dash: { label: "Dash", cost: 400, owned: false, control: "Press Shift" },
  tripleMultiplier: { label: "Triple Crystal Round", cost: 50, owned: false, repeatable: true, control: "Earn x3 crystals this round" },
};
let menuOpen = false;

// The floor is a simple rectangle near the bottom of the canvas.
const floor = {
  x: 0,
  y: world.height - 350,
  width: world.width,
  height: 70,
};
// The low ceiling gives the cave a tighter, underground feeling.
const roofY = floor.y - 290;

// Create a one-time, naturally scattered collection of cave crystals.
const crystals = [];
for (let crystalNumber = 0; crystalNumber < 650; crystalNumber += 1) {
  crystals.push({
    x: seededRandom() * world.width,
    y: floor.y + 5 + seededRandom() * (floor.height - 12),
    size: 3 + Math.floor(seededRandom() * 5),
  });
}

// These uneven lines become permanent cracks in the cave walls.
const wallCracks = [];
for (let crackNumber = 0; crackNumber < 85; crackNumber += 1) {
  wallCracks.push({
    x: seededRandom() * world.width,
    y: roofY + 20 + seededRandom() * (floor.y - roofY - 100),
    length: 50 + seededRandom() * 85,
    direction: seededRandom() > 0.5 ? 1 : -1,
  });
}

// A few jagged rock spikes decorate the cave floor.
const floorSpikes = [
  { x: 620, width: 32, height: 26 },
  { x: 1340, width: 42, height: 34 },
  { x: 2260, width: 30, height: 24 },
  { x: 3160, width: 46, height: 38 },
  { x: 4100, width: 35, height: 28 },
  { x: 4980, width: 40, height: 32 },
];

// This long, tightly packed spike trench must be crossed using the platforms.
const spikeTrench = {
  x: 3550,
  width: 896,
  spikeWidth: 28,
};
for (let spikeNumber = 0; spikeNumber < spikeTrench.width / spikeTrench.spikeWidth; spikeNumber += 1) {
  floorSpikes.push({
    x: spikeTrench.x + spikeNumber * spikeTrench.spikeWidth,
    width: spikeTrench.spikeWidth,
    height: 48,
  });
}

// Glowing pools and falling rocks add different kinds of cave danger.
const acidPools = [
  { x: 1220, width: 90 },
  { x: 2520, width: 100 },
  { x: 5130, width: 70 },
];
const fallingRocks = [
  { x: 1450, y: roofY + 18, size: 24, velocityY: 0 },
  { x: 2920, y: roofY + 80, size: 28, velocityY: 0 },
  { x: 4720, y: roofY + 45, size: 22, velocityY: 0 },
];

// These solid rock ledges give the miner places to jump onto.
const platforms = [
  { x: 420, y: floor.y - 60, width: 155, height: 18 },
  { x: 700, y: floor.y - 85, width: 160, height: 18 },
  { x: 985, y: floor.y - 55, width: 150, height: 18 },
  { x: 1260, y: floor.y - 75, width: 165, height: 18 },
  { x: 1565, y: floor.y - 60, width: 155, height: 18 },
  { x: 1850, y: floor.y - 85, width: 165, height: 18 },
  // These high ledges are above the normal jump height and require Double Jump.
  { x: 2180, y: floor.y - 120, width: 130, height: 18 },
  { x: 2860, y: floor.y - 120, width: 140, height: 18 },
  { x: 3260, y: floor.y - 120, width: 130, height: 18 },
  // These are the three platforms that form the safe route across the trench.
  { x: 3540, y: floor.y - 70, width: 180, height: 18 },
  { x: 3830, y: floor.y - 85, width: 180, height: 18 },
  { x: 4120, y: floor.y - 70, width: 180, height: 18 },
  { x: 4680, y: floor.y - 120, width: 140, height: 18 },
];

// Level 2 adds more hazards and tighter ledges for a slightly harder run.
const levelTwoSpikes = [
  ...floorSpikes,
  { x: 900, width: 36, height: 32 },
  { x: 1740, width: 36, height: 32 },
];
const levelTwoAcidPools = [
  ...acidPools,
  { x: 1080, width: 70 },
  { x: 1970, width: 75 },
  { x: 3350, width: 70 },
];
const levelTwoPlatforms = [
  ...platforms,
  { x: 2350, y: floor.y - 90, width: 125, height: 18 },
  { x: 3090, y: floor.y - 70, width: 145, height: 18 },
  { x: 3440, y: floor.y - 65, width: 110, height: 18 },
];
const levelTwoFallingRocks = [
  ...fallingRocks,
  { x: 1170, y: roofY + 55, size: 24, velocityY: 0 },
  { x: 3460, y: roofY + 25, size: 26, velocityY: 0 },
];

// World 3 is the hardest route. Extra ledges keep every new hazard jumpable.
const levelThreeSpikes = [
  ...levelTwoSpikes,
  { x: 2050, width: 34, height: 30 },
  { x: 2780, width: 34, height: 30 },
  { x: 4510, width: 36, height: 32 },
];
const levelThreeAcidPools = [
  ...levelTwoAcidPools,
  { x: 2650, width: 55 },
  { x: 4490, width: 60 },
];
const levelThreePlatforms = [
  // The later ledges shift farther right, asking for increasingly better timing.
  // Each gap stays small enough to clear with the current jump strength.
  ...levelTwoPlatforms.map((platform) => {
    const laterCourseOffset =
      platform.x >= 4120 ? 30 : platform.x >= 3830 ? 15 : 0;
    return { ...platform, x: platform.x + laterCourseOffset };
  }),
  // These stepping stones make the new hazards challenging but reachable.
  { x: 1990, y: floor.y - 68, width: 105, height: 18 },
  { x: 2630, y: floor.y - 65, width: 100, height: 18 },
  { x: 4420, y: floor.y - 65, width: 105, height: 18 },
];
const levelThreeFallingRocks = [
  ...levelTwoFallingRocks,
  { x: 2090, y: roofY + 35, size: 23, velocityY: 0 },
  { x: 4380, y: roofY + 65, size: 24, velocityY: 0 },
];

// World 4 is a volcanic finale with a few extra obstacles and safe stepping routes.
const levelFourSpikes = [
  ...levelThreeSpikes,
  { x: 2390, width: 32, height: 28 },
  { x: 4800, width: 34, height: 30 },
];
const levelFourAcidPools = [
  ...levelThreeAcidPools,
  { x: 2310, width: 55 },
  { x: 4750, width: 55 },
];
const levelFourPlatforms = [
  ...levelThreePlatforms,
  { x: 2260, y: floor.y - 65, width: 100, height: 18 },
  { x: 4690, y: floor.y - 68, width: 105, height: 18 },
];
const levelFourFallingRocks = [
  ...levelThreeFallingRocks,
  { x: 2390, y: roofY + 45, size: 25, velocityY: 0 },
  { x: 4780, y: roofY + 30, size: 24, velocityY: 0 },
];

let currentLevel = 1;
let activeFloorSpikes = floorSpikes;
let activeAcidPools = acidPools;
let activePlatforms = platforms;
let activeFallingRocks = fallingRocks;

// Each world has its own cave colors, making World 2 feel like a new place.
const worldThemes = {
  1: {
    wall: "#141a25",
    roof: "#080b10",
    crack: "#353e4d",
    floor: "#6f7378",
    acid: "#4dce6f",
    platform: "#59616c",
    fallingRock: "#8b929c",
    spike: "#78899d",
    door: "#39275a",
    doorGlow: "#b767ff",
  },
  2: {
    wall: "#21172e",
    roof: "#0c0712",
    crack: "#6d3c86",
    floor: "#4d4058",
    acid: "#ff7b35",
    platform: "#62506e",
    fallingRock: "#a178a8",
    spike: "#a46378",
    door: "#57233b",
    doorGlow: "#ff9a52",
  },
  3: {
    wall: "#073d56",
    roof: "#020d1b",
    crack: "#36d7ff",
    floor: "#174a63",
    acid: "#48fff1",
    platform: "#1d7791",
    fallingRock: "#54bad2",
    spike: "#35a8c7",
    door: "#075276",
    doorGlow: "#7cffff",
  },
  4: {
    wall: "#3a1512",
    roof: "#160403",
    crack: "#ff9e3d",
    floor: "#663328",
    acid: "#ff4d18",
    platform: "#8a4931",
    fallingRock: "#d17a4e",
    spike: "#d85b39",
    door: "#782414",
    doorGlow: "#ffd06a",
  },
};

// The exit door waits near the far-right end of the cave.
const exitDoor = {
  x: world.width - 130,
  y: floor.y - 82,
  width: 58,
  height: 82,
};

// Generate breakable rocks in new places on every page reload.
const breakableRocks = [];
let rockAttempts = 0;
while (breakableRocks.length < 16 && rockAttempts < 500) {
  rockAttempts += 1;
  const goesOnPlatform = Math.random() < 0.3;
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  const x = goesOnPlatform
    ? platform.x + 20 + Math.random() * (platform.width - 50)
    : 220 + Math.random() * (world.width - 440);
  const y = goesOnPlatform ? platform.y - 30 : floor.y - 30;
  const isNearHazard = !goesOnPlatform && (
    floorSpikes.some((spike) => x + 50 > spike.x && x - 50 < spike.x + spike.width) ||
    acidPools.some((pool) => x + 50 > pool.x && x - 50 < pool.x + pool.width)
  );
  const isNearAnotherRock = breakableRocks.some((rock) => Math.abs(x - rock.x) < 120);

  if (!isNearHazard && !isNearAnotherRock) {
    // One out of fifteen rocks is rare and contains a green crystal worth ten.
    const isRare = Math.random() < 1 / 15;
    breakableRocks.push({
      x,
      y,
      size: 30,
      broken: false,
      crystalColor: isRare ? "#72ff8d" : "#b767ff",
      crackColor: isRare ? "#72ff8d" : "#b767ff",
      crystalValue: isRare ? 10 : 1,
    });
  }
}

// A crystal appears when a glowing-crack rock breaks.
const looseCrystals = [];
let crystalTotal = 0;
let crystalMultiplier = 1;
let tripleMultiplierActive = false;

// Save progress in the browser so deaths and reloads do not erase crystals.
const progressVersion = "powers-reset-1";
// Use this once to remove owned abilities while keeping every shop item buyable.
const removedUpgradeVersion = "remove-all-upgrades-1";
function loadSavedProgress() {
  try {
    // This version resets old saved powers and crystals once, but keeps the shop available.
    if (localStorage.getItem("crystalQuestProgressVersion") !== progressVersion) {
      crystalTotal = 0;
      for (const name of Object.keys(upgrades)) {
        upgrades[name].owned = false;
      }
      localStorage.setItem("crystalQuestProgressVersion", progressVersion);
      localStorage.setItem("crystalQuestRemovedUpgradeVersion", removedUpgradeVersion);
      saveProgress();
      return;
    }

    crystalTotal = Number(localStorage.getItem("crystalQuestCrystals")) || 0;
    const savedUpgrades = JSON.parse(localStorage.getItem("crystalQuestUpgrades") || "{}");
    for (const name of Object.keys(upgrades)) {
      upgrades[name].owned = savedUpgrades[name] === true;
    }

    // Remove all currently owned powers one time only.
    // The shop entries remain available and can be purchased again later.
    if (localStorage.getItem("crystalQuestRemovedUpgradeVersion") !== removedUpgradeVersion) {
      for (const name of Object.keys(upgrades)) {
        upgrades[name].owned = false;
      }
      localStorage.setItem("crystalQuestRemovedUpgradeVersion", removedUpgradeVersion);
      saveProgress();
    }
  } catch {
    // The game still works if the browser does not allow local storage.
  }
}

function saveProgress() {
  try {
    const savedUpgrades = {};
    for (const name of Object.keys(upgrades)) {
      savedUpgrades[name] = upgrades[name].owned;
    }
    localStorage.setItem("crystalQuestCrystals", String(crystalTotal));
    localStorage.setItem("crystalQuestUpgrades", JSON.stringify(savedUpgrades));
    localStorage.setItem("crystalQuestProgressVersion", progressVersion);
  } catch {
    // The game still works if the browser does not allow local storage.
  }
}

// Dust motes drift slowly through the cave and remain in fixed starting places.
const dustMotes = [];
for (let dustNumber = 0; dustNumber < 90; dustNumber += 1) {
  dustMotes.push({
    x: seededRandom() * world.width,
    y: roofY + 20 + seededRandom() * (floor.y - roofY - 35),
    size: 1 + seededRandom() * 2,
    phase: seededRandom() * Math.PI * 2,
  });
}

// These short-lived particles appear when the miner lands after falling.
const landingPebbles = [];
let animationTime = 0;
let levelStartedAt = performance.now();
let levelCompleted = false;
// Run at a stable, deliberately relaxed 30 updates each second on every display.
const fixedUpdateMs = 1000 / 30;
let previousFrameTime = null;
let pendingUpdateTime = 0;

// Update the number shown in the top-right corner.
function updateCrystalCounter() {
  crystalCounter.textContent = `Crystals: ${crystalTotal}`;
  saveProgress();
}

// Show either the main menu or the shop inside the menu overlay.
function showMenuScreen(screen) {
  mainMenu.classList.toggle("hidden", screen !== "main");
  shopMenu.classList.toggle("hidden", screen !== "shop");
  levelsMenu.classList.toggle("hidden", screen !== "levels");
}

// Switch the active layout, hazards, and platforms for the chosen level.
function selectLevel(levelNumber) {
  currentLevel = levelNumber;
  activeFloorSpikes = currentLevel === 4 ? levelFourSpikes : currentLevel === 3 ? levelThreeSpikes : currentLevel === 2 ? levelTwoSpikes : floorSpikes;
  activeAcidPools = currentLevel === 4 ? levelFourAcidPools : currentLevel === 3 ? levelThreeAcidPools : currentLevel === 2 ? levelTwoAcidPools : acidPools;
  activePlatforms = currentLevel === 4 ? levelFourPlatforms : currentLevel === 3 ? levelThreePlatforms : currentLevel === 2 ? levelTwoPlatforms : platforms;
  activeFallingRocks = currentLevel === 4 ? levelFourFallingRocks : currentLevel === 3 ? levelThreeFallingRocks : currentLevel === 2 ? levelTwoFallingRocks : fallingRocks;

  for (const rock of activeFallingRocks) {
    rock.y = roofY + 12;
    rock.velocityY = 0;
  }
  restartGame();
  menuOpen = false;
  menuOverlay.classList.add("hidden");
}

function updateShopButtons() {
  for (const button of upgradeButtons) {
    const upgrade = upgrades[button.dataset.upgrade];
    if (upgrade.repeatable) {
      button.disabled = tripleMultiplierActive;
      button.textContent = tripleMultiplierActive
        ? "Triple Crystal Round active — x3 rewards"
        : `${upgrade.label} — ${upgrade.cost} crystals`;
      continue;
    }
    button.disabled = upgrade.owned;
    button.textContent = upgrade.owned
      ? `${upgrade.label} unlocked — ${upgrade.control}`
      : `${upgrade.label} — ${upgrade.cost} crystals`;
  }
}

function toggleMenu() {
  menuOpen = !menuOpen;
  menuOverlay.classList.toggle("hidden", !menuOpen);
  showMenuScreen("main");
  if (menuOpen) updateShopButtons();
}

function buyUpgrade(name) {
  const upgrade = upgrades[name];
  if (upgrade.owned || (upgrade.repeatable && tripleMultiplierActive)) return;
  if (crystalTotal < upgrade.cost) {
    shopMessage.textContent = "You need more crystals.";
    return;
  }

  crystalTotal -= upgrade.cost;
  if (upgrade.repeatable) {
    crystalMultiplier = 3;
    tripleMultiplierActive = true;
    shopMessage.textContent = "Triple Crystal Round active for this level run!";
    updateCrystalCounter();
    updateShopButtons();
    return;
  }
  upgrade.owned = true;
  shopMessage.textContent = `${upgrade.label} unlocked! ${upgrade.control}.`;
  updateCrystalCounter();
  updateShopButtons();
}

openShopButton.addEventListener("click", () => {
  showMenuScreen("shop");
  updateShopButtons();
});
openLevelsButton.addEventListener("click", () => showMenuScreen("levels"));
resumeButton.addEventListener("click", toggleMenu);
backButton.addEventListener("click", () => showMenuScreen("main"));
levelsBackButton.addEventListener("click", () => showMenuScreen("main"));
for (const button of upgradeButtons) {
  button.addEventListener("click", () => buyUpgrade(button.dataset.upgrade));
}
for (const button of levelButtons) {
  button.addEventListener("click", () => selectLevel(Number(button.dataset.level)));
}

// Complete the level and reward faster runs with a larger crystal bonus.
function completeLevel() {
  if (levelCompleted) return;

  levelCompleted = true;
  player.isCompleting = false;
  const elapsedSeconds = Math.floor((performance.now() - levelStartedAt) / 1000);
  const timeBonus = Math.max(5, 100 - elapsedSeconds * 2);
  const awardedBonus = timeBonus * crystalMultiplier;
  crystalTotal += awardedBonus;
  updateCrystalCounter();
  levelMessage.textContent = `Mission Passed: Respect! Time bonus: +${awardedBonus} crystals`;
  levelMessage.classList.add("show");
  crystalMultiplier = 1;
  tripleMultiplierActive = false;
  menuOpen = true;
  menuOverlay.classList.remove("hidden");
  showMenuScreen("main");
  updateShopButtons();
}

// Make two tiny victory hops at the exit before showing the completion menu.
function startCompletionCelebration() {
  player.isCelebrating = true;
  player.celebrationTimer = 36;
  player.velocityY = 0;
  player.isOnGround = true;
}

// These values control how falling and jumping feel.
const gravity = 0.6;
const jumpStrength = -10;

// Remember which keys are currently being held down.
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
};

// Start a jump for either the keyboard Space key or the mobile Jump button.
function tryJump() {
  const wasPreparingJump = player.jumpPrepareTimer > 0;
  if (player.isOnGround && player.jumpPrepareTimer === 0) {
    player.jumpPrepareTimer = 6;
  }
  if (upgrades.doubleJump.owned && wasPreparingJump) {
    player.doubleJumpQueued = true;
  }
  if (upgrades.doubleJump.owned && !player.isOnGround && player.airJumps === 0) {
    player.velocityY = jumpStrength;
    player.airJumps = 1;
  }
}

// Listen for a key being pressed.
window.addEventListener("keydown", (event) => {
  // Option opens or closes the pause menu.
  if (event.code === "AltLeft" || event.code === "AltRight") {
    event.preventDefault();
    if (event.repeat) return;
    toggleMenu();
    return;
  }
  if (menuOpen) return;

  // Stop arrow keys and Space from scrolling the page while playing.
  if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "ArrowLeft") keys.ArrowLeft = true;
  if (event.code === "ArrowRight") keys.ArrowRight = true;

  if (event.code === "ShiftLeft" || event.code === "ShiftRight") {
    if (upgrades.dash.owned && player.isOnGround) player.dashTimer = 8;
  }
  // Press either Command key to start a short pickaxe swing.
  if (event.code === "MetaLeft" || event.code === "MetaRight") {
    player.pickaxeSwing = 16;
  }

  if (event.code === "Space") tryJump();
});

// Listen for a key being released.
window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft") keys.ArrowLeft = false;
  if (event.code === "ArrowRight") keys.ArrowRight = false;
});

// Hold an on-screen arrow to move. Pointer events cover phones and tablets.
function bindTouchMovement(button, keyName) {
  const startMoving = (event) => {
    event.preventDefault();
    keys[keyName] = true;
  };
  const stopMoving = (event) => {
    event.preventDefault();
    keys[keyName] = false;
  };
  button.addEventListener("pointerdown", startMoving);
  button.addEventListener("pointerup", stopMoving);
  button.addEventListener("pointercancel", stopMoving);
  button.addEventListener("pointerleave", stopMoving);
}

bindTouchMovement(touchLeftButton, "ArrowLeft");
bindTouchMovement(touchRightButton, "ArrowRight");
touchMenuButton.addEventListener("click", toggleMenu);
touchJumpButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!menuOpen) tryJump();
});
touchMineButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  if (!menuOpen) player.pickaxeSwing = 16;
});

// Put the player back at the starting position.
function restartGame() {
  player.x = 80;
  player.y = floor.y - player.height;
  player.velocityY = 0;
  player.isOnGround = true;
  player.walkCycle = 0;
  player.isDying = false;
  player.deathTimer = 0;
  player.jumpPrepareTimer = 0;
  player.landingBend = 0;
  player.pickaxeSwing = 0;
  updateCrystalCounter();
  player.isCompleting = false;
  player.airJumps = 0;
  player.dashTimer = 0;
  player.doubleJumpQueued = false;
  player.doubleJumpDelay = 0;
  player.isCelebrating = false;
  player.celebrationTimer = 0;
  levelCompleted = false;
  levelStartedAt = performance.now();
  levelMessage.classList.remove("show");
}

// Start a short death animation instead of instantly returning to the start.
function startDeathAnimation() {
  if (player.isDying) return;

  player.isDying = true;
  player.deathTimer = 36;
  player.velocityY = -6;
}

// Create a small puff of cave dust and pebbles at the miner's feet.
function createLandingPebbles() {
  for (let pebbleNumber = 0; pebbleNumber < 8; pebbleNumber += 1) {
    landingPebbles.push({
      x: player.x + player.width / 2,
      y: player.y + player.height,
      velocityX: (Math.random() - 0.5) * 2.6,
      velocityY: -Math.random() * 1.8,
      life: 22,
    });
  }
}

// Move landing particles until they fade away.
function updateLandingPebbles() {
  for (let index = landingPebbles.length - 1; index >= 0; index -= 1) {
    const pebble = landingPebbles[index];
    pebble.x += pebble.velocityX;
    pebble.y += pebble.velocityY;
    pebble.velocityY += 0.08;
    pebble.life -= 1;

    if (pebble.life <= 0) {
      landingPebbles.splice(index, 1);
    }
  }
}

// Break the first nearby rock when the swinging pickaxe reaches it.
function tryToBreakRock() {
  if (player.pickaxeSwing !== 8) return;

  const pickaxeReach = player.direction === 1 ? player.x + 48 : player.x - 18;
  const nearbyRock = breakableRocks.find((rock) =>
    !rock.broken &&
    Math.abs(rock.x + rock.size / 2 - pickaxeReach) < 30 &&
    Math.abs(rock.y + rock.size / 2 - (player.y + 20)) < 35,
  );

  if (nearbyRock) {
    nearbyRock.broken = true;
    looseCrystals.push({
      x: nearbyRock.x + nearbyRock.size / 2 - 7,
      y: nearbyRock.y,
      size: 14,
      velocityY: -2.4,
      color: nearbyRock.crystalColor,
      value: nearbyRock.crystalValue,
    });
  }
}

// Lift new crystals out of broken rocks, then collect them when the miner touches them.
function updateLooseCrystals() {
  for (let index = looseCrystals.length - 1; index >= 0; index -= 1) {
    const crystal = looseCrystals[index];
    crystal.velocityY += 0.16;
    crystal.y += crystal.velocityY;

    // A released crystal can settle on a platform instead of always falling through it.
    if (crystal.velocityY >= 0) {
      for (const platform of activePlatforms) {
        const restsOnPlatform =
          crystal.x + crystal.size > platform.x &&
          crystal.x < platform.x + platform.width &&
          crystal.y + crystal.size >= platform.y &&
          crystal.y + crystal.size - crystal.velocityY <= platform.y;
        if (restsOnPlatform) {
          crystal.y = platform.y - crystal.size;
          crystal.velocityY = 0;
          break;
        }
      }
    }

    if (crystal.y + crystal.size >= floor.y) {
      crystal.y = floor.y - crystal.size;
      crystal.velocityY = 0;
    }

    const minerTouchesCrystal =
      player.x < crystal.x + crystal.size &&
      player.x + player.width > crystal.x &&
      player.y < crystal.y + crystal.size &&
      player.y + player.height > crystal.y;
    if (minerTouchesCrystal) {
      looseCrystals.splice(index, 1);
      crystalTotal += crystal.value * crystalMultiplier;
      updateCrystalCounter();
    }
  }
}

// The pickaxe is only a drawing, never part of the miner's collision area.
// Keeping a small inset also makes a hit require the miner's body to touch a hazard.
function getMinerBodyHitbox() {
  return {
    left: player.x + 5,
    right: player.x + player.width - 5,
    top: player.y + 3,
    bottom: player.y + player.height,
  };
}

// Return true when the miner's body touches any visible pointed floor rock.
function playerTouchesSpike() {
  const body = getMinerBodyHitbox();
  return activeFloorSpikes.some((spike) => {
    const overlapsHorizontally =
      body.right > spike.x && body.left < spike.x + spike.width;
    const reachesSpikeHeight = body.bottom > floor.y - spike.height;
    return overlapsHorizontally && reachesSpikeHeight;
  });
}

// Return true when the miner's body steps into a glowing cave pool.
function playerTouchesAcid() {
  const body = getMinerBodyHitbox();
  return activeAcidPools.some((pool) => {
    const overlapsHorizontally =
      body.right > pool.x && body.left < pool.x + pool.width;
    return overlapsHorizontally && body.bottom > floor.y - 8;
  });
}

// Return true when a falling rock overlaps the player's body.
function playerTouchesFallingRock() {
  const body = getMinerBodyHitbox();
  return activeFallingRocks.some((rock) =>
    body.left < rock.x + rock.size &&
    body.right > rock.x &&
    body.top < rock.y + rock.size &&
    body.bottom > rock.y,
  );
}

// Make each rock fall, then return it to the roof to fall again.
function updateFallingRocks() {
  // Higher worlds make rockfalls a little quicker without becoming unfair.
  const rockfallSpeedMultiplier = 1 + (currentLevel - 1) * 0.12;
  for (const rock of activeFallingRocks) {
    rock.velocityY += 0.18 * rockfallSpeedMultiplier;
    rock.y += rock.velocityY;

    if (rock.y + rock.size >= floor.y) {
      rock.y = roofY + 12;
      rock.velocityY = 0;
    }
  }
}

// Update the player's position once per animation frame.
function updatePlayer() {
  if (menuOpen) return;
  if (levelCompleted) return;

  // The miner makes two quick celebration hops before the menu appears.
  if (player.isCelebrating) {
    player.celebrationTimer -= 1;
    if (player.celebrationTimer <= 0) {
      player.isCelebrating = false;
      completeLevel();
    }
    return;
  }

  // Near the exit, the door gently pulls the miner into the doorway.
  if (player.isCompleting) {
    const targetX = exitDoor.x + exitDoor.width / 2 - player.width / 2;
    player.x += Math.sign(targetX - player.x) * 3;
    player.velocityY = 0;
    player.y = floor.y - player.height;

    if (Math.abs(targetX - player.x) <= 3) {
      player.x = targetX;
      startCompletionCelebration();
    }
    return;
  }

  // A defeated miner is briefly knocked upward before respawning.
  if (player.isDying) {
    player.velocityY += gravity * 0.55;
    player.y += player.velocityY;
    player.deathTimer -= 1;

    if (player.deathTimer <= 0) {
      restartGame();
    }
    return;
  }

  // Pause briefly in a crouch before launching the jump.
  if (player.jumpPrepareTimer > 0) {
    player.jumpPrepareTimer -= 1;
    if (player.jumpPrepareTimer === 0) {
      player.velocityY = jumpStrength;
      player.isOnGround = false;
      if (player.doubleJumpQueued) player.doubleJumpDelay = 8;
    }
    return;
  }

  // Activate a queued double jump shortly after the first takeoff.
  if (player.doubleJumpDelay > 0) {
    player.doubleJumpDelay -= 1;
    if (player.doubleJumpDelay === 0) {
      player.velocityY = jumpStrength;
      player.airJumps = 1;
      player.doubleJumpQueued = false;
    }
  }

  // The landing bend quickly relaxes while the miner stands or walks.
  if (player.landingBend > 0) {
    player.landingBend -= 1;
  }
  if (player.pickaxeSwing > 0) {
    player.pickaxeSwing -= 1;
    tryToBreakRock();
  }

  let isWalking = false;

  if (keys.ArrowLeft) {
    player.x -= player.speed;
    player.direction = -1;
    isWalking = true;
  }
  if (keys.ArrowRight) {
    player.x += player.speed;
    player.direction = 1;
    isWalking = true;
  }

  // Dash moves the miner farther in the direction they are facing.
  if (player.dashTimer > 0 && player.isOnGround) {
    player.x += player.direction * 10;
    player.dashTimer -= 1;
  }

  // Advance the animation only while the player is walking on the ground.
  if (isWalking && player.isOnGround) {
    player.walkCycle += 0.22;
  }

  // Keep the player inside the left and right sides of the canvas.
  player.x = Math.max(0, Math.min(player.x, world.width - player.width));

  // Gravity increases downward speed, then the speed changes the y position.
  player.velocityY += gravity;
  player.y += player.velocityY;
  const landingSpeed = player.velocityY;
  if (!player.isOnGround) player.dashTimer = 0;

  // When jumping upward, stop the player at the underside of a platform.
  if (player.velocityY < 0 && !upgrades.climb.owned) {
    for (const platform of activePlatforms) {
      const overlapsPlatform =
        player.x + player.width > platform.x && player.x < platform.x + platform.width;
      const previousTop = player.y - player.velocityY;
      const crossedPlatformBottom =
        player.y <= platform.y + platform.height && previousTop >= platform.y + platform.height;

      if (overlapsPlatform && crossedPlatformBottom) {
        player.y = platform.y + platform.height;
        player.velocityY = 0;
        break;
      }
    }
  }

  // Check for a landing on any platform while the player is falling.
  const playerBottom = player.y + player.height;
  player.isOnGround = false;
  if (player.velocityY >= 0) {
    for (const platform of activePlatforms) {
      const overlapsPlatform =
        player.x + player.width > platform.x && player.x < platform.x + platform.width;
      const crossedPlatformTop = playerBottom >= platform.y && playerBottom - player.velocityY <= platform.y;

      if (overlapsPlatform && crossedPlatformTop) {
        player.y = platform.y - player.height;
        player.velocityY = 0;
        player.isOnGround = true;
        player.airJumps = 0;
        if (landingSpeed > 2) {
          player.landingBend = 7;
          createLandingPebbles();
        }
        break;
      }
    }
  }

  // If the player reaches the floor, place them on top of it.
  if (player.y + player.height >= floor.y) {
    player.y = floor.y - player.height;
    player.velocityY = 0;
    player.isOnGround = true;
    player.airJumps = 0;
    if (landingSpeed > 2) {
      player.landingBend = 7;
      createLandingPebbles();
    }
  }

  // Every cave hazard sends the miner back to the start.
  if (playerTouchesSpike() || playerTouchesAcid() || playerTouchesFallingRock()) {
    startDeathAnimation();
  }

  // Reaching the area in front of the door starts the automatic exit movement.
  const isNearDoor =
    player.x + player.width > exitDoor.x - 90 &&
    player.x < exitDoor.x + exitDoor.width &&
    player.y + player.height > exitDoor.y;
  if (isNearDoor && !player.isDying) {
    player.isCompleting = true;
  }

}

// Keep the player near the center of the screen as they explore the large world.
function updateCamera() {
  camera.x = player.x - canvas.width / (2 * camera.zoom);
  camera.y = player.y - canvas.height / (2 * camera.zoom);

  // Do not let the camera look outside the world edges.
  camera.x = Math.max(0, Math.min(camera.x, world.width - canvas.width / camera.zoom));
  camera.y = Math.max(0, Math.min(camera.y, world.height - canvas.height / camera.zoom));
}

// Draw the cave scenery. This is called only inside the flashlight beam.
function drawCaveBackground() {
  const theme = worldThemes[currentLevel];
  // Distant rock walls give the cave depth.
  context.fillStyle = theme.wall;
  context.fillRect(0, 0, world.width, floor.y);

  // Azure Abyss has an unmistakable deep-blue, glowing water-cave atmosphere.
  if (currentLevel === 3) {
    const abyssGlow = context.createLinearGradient(0, roofY, 0, floor.y);
    abyssGlow.addColorStop(0, "#03152b");
    abyssGlow.addColorStop(0.5, "#07506b");
    abyssGlow.addColorStop(1, "#0a7890");
    context.fillStyle = abyssGlow;
    context.fillRect(0, roofY, world.width, floor.y - roofY);

    // Wide, luminous crystal veins turn the walls into an underwater-looking cavern.
    for (let veinNumber = 0; veinNumber < wallCracks.length; veinNumber += 7) {
      const vein = wallCracks[veinNumber];
      const height = 16 + (veinNumber % 4) * 7;
      context.globalAlpha = 0.45;
      context.fillStyle = "#4cf4ff";
      context.beginPath();
      context.moveTo(vein.x, vein.y);
      context.lineTo(vein.x + 10, vein.y + height);
      context.lineTo(vein.x + 2, vein.y + height * 2.2);
      context.lineTo(vein.x - 12, vein.y + height);
      context.closePath();
      context.fill();
    }
    context.globalAlpha = 1;
  }

  // Ember Forge is a hot, volcanic chamber rather than another dark rock cave.
  if (currentLevel === 4) {
    const forgeGlow = context.createLinearGradient(0, roofY, 0, floor.y);
    forgeGlow.addColorStop(0, "#1b0605");
    forgeGlow.addColorStop(0.58, "#5c1c12");
    forgeGlow.addColorStop(1, "#a33a1d");
    context.fillStyle = forgeGlow;
    context.fillRect(0, roofY, world.width, floor.y - roofY);

    // Molten seams across the walls give this world a fiery identity.
    context.strokeStyle = "#ff8b32";
    context.lineWidth = 3;
    for (let seamNumber = 2; seamNumber < wallCracks.length; seamNumber += 9) {
      const seam = wallCracks[seamNumber];
      context.globalAlpha = 0.55;
      context.beginPath();
      context.moveTo(seam.x, seam.y);
      context.lineTo(seam.x + seam.direction * 18, seam.y + 20);
      context.lineTo(seam.x - seam.direction * 9, seam.y + 48);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  // A dark roof sits much lower than the top of the map.
  context.fillStyle = theme.roof;
  context.fillRect(0, 0, world.width, roofY);

  // Irregular branching cracks add detail to the cave walls.
  context.strokeStyle = theme.crack;
  context.lineWidth = 4;
  context.lineCap = "round";
  for (const crack of wallCracks) {
    context.beginPath();
    context.moveTo(crack.x, crack.y);
    context.lineTo(crack.x + crack.direction * 8, crack.y + crack.length * 0.45);
    context.lineTo(crack.x - crack.direction * 5, crack.y + crack.length);
    context.moveTo(crack.x + crack.direction * 8, crack.y + crack.length * 0.45);
    context.lineTo(crack.x + crack.direction * 20, crack.y + crack.length * 0.6);
    context.stroke();
  }

  // Soft bubbles drift through World 3, separating it from the rocky Obsidian Depths.
  if (currentLevel === 3) {
    context.strokeStyle = "#9affff";
    context.lineWidth = 1.5;
    for (let bubbleNumber = 0; bubbleNumber < 30; bubbleNumber += 1) {
      const x = (bubbleNumber * 383 + 110) % world.width;
      const y = roofY + 25 + ((bubbleNumber * 67 + animationTime * 0.45) % (floor.y - roofY - 60));
      context.globalAlpha = 0.18 + (bubbleNumber % 3) * 0.08;
      context.beginPath();
      context.arc(x, y, 2 + (bubbleNumber % 4), 0, Math.PI * 2);
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  // Tiny rising embers make World 4 feel like a forge.
  if (currentLevel === 4) {
    context.fillStyle = "#ffd05a";
    for (let emberNumber = 0; emberNumber < 42; emberNumber += 1) {
      const x = (emberNumber * 271 + 70) % world.width;
      const y = floor.y - 18 - ((emberNumber * 43 + animationTime * 0.7) % 210);
      context.globalAlpha = 0.22 + (emberNumber % 4) * 0.1;
      context.fillRect(x, y, 2, 2);
    }
    context.globalAlpha = 1;
  }

  // The grey cave floor is lit wherever the flashlight reaches it.
  context.fillStyle = theme.floor;
  context.fillRect(floor.x, floor.y, floor.width, floor.height);

  // Bright green pools are dangerous to stand in.
  context.fillStyle = theme.acid;
  for (const pool of activeAcidPools) {
    context.fillRect(pool.x, floor.y - 7, pool.width, 7);
  }

  // Draw solid grey rock ledges above the floor.
  context.fillStyle = theme.platform;
  for (const platform of activePlatforms) {
    context.fillRect(platform.x, platform.y, platform.width, platform.height);
    if (currentLevel === 3) {
      context.fillStyle = "#89ffff";
      context.fillRect(platform.x, platform.y, platform.width, 3);
      context.fillStyle = theme.platform;
    }
    if (currentLevel === 4) {
      context.fillStyle = "#ffba4f";
      context.fillRect(platform.x, platform.y, platform.width, 3);
      context.fillStyle = theme.platform;
    }
  }

  // The glowing exit door marks the end of the level.
  context.fillStyle = theme.door;
  context.fillRect(exitDoor.x, exitDoor.y, exitDoor.width, exitDoor.height);
  context.strokeStyle = theme.doorGlow;
  context.lineWidth = 3;
  context.strokeRect(exitDoor.x, exitDoor.y, exitDoor.width, exitDoor.height);
  context.fillStyle = "#fff0a3";
  context.beginPath();
  context.arc(exitDoor.x + exitDoor.width - 12, exitDoor.y + exitDoor.height / 2, 3, 0, Math.PI * 2);
  context.fill();

  // Dark rocks with bright blue cracks can be broken by the miner's pickaxe.
  for (const rock of breakableRocks) {
    if (rock.broken) continue;

    context.fillStyle = "#3d4550";
    context.beginPath();
    context.moveTo(rock.x, rock.y + rock.size);
    context.lineTo(rock.x + 6, rock.y + 8);
    context.lineTo(rock.x + 20, rock.y);
    context.lineTo(rock.x + rock.size, rock.y + 12);
    context.lineTo(rock.x + rock.size - 4, rock.y + rock.size);
    context.closePath();
    context.fill();

    context.strokeStyle = rock.crackColor;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(rock.x + 9, rock.y + 8);
    context.lineTo(rock.x + 15, rock.y + 17);
    context.lineTo(rock.x + 12, rock.y + 25);
    context.moveTo(rock.x + 15, rock.y + 17);
    context.lineTo(rock.x + 23, rock.y + 12);
    context.stroke();
  }

  // Purple crystals rise out of broken rocks before the miner picks them up.
  for (const crystal of looseCrystals) {
    context.fillStyle = crystal.color;
    context.beginPath();
    context.moveTo(crystal.x + crystal.size / 2, crystal.y);
    context.lineTo(crystal.x + crystal.size, crystal.y + crystal.size / 2);
    context.lineTo(crystal.x + crystal.size / 2, crystal.y + crystal.size);
    context.lineTo(crystal.x, crystal.y + crystal.size / 2);
    context.closePath();
    context.fill();
  }

  // Falling rocks are rounder than the pointed floor hazards.
  context.fillStyle = theme.fallingRock;
  for (const rock of activeFallingRocks) {
    context.beginPath();
    context.arc(rock.x + rock.size / 2, rock.y + rock.size / 2, rock.size / 2, 0, Math.PI * 2);
    context.fill();
  }

  // Jagged grey rock spikes rise from the cave floor.
  context.fillStyle = theme.spike;
  for (const spike of activeFloorSpikes) {
    context.beginPath();
    context.moveTo(spike.x, floor.y);
    context.lineTo(spike.x + spike.width / 2, floor.y - spike.height);
    context.lineTo(spike.x + spike.width, floor.y);
    context.closePath();
    context.fill();

    // A bright ridge makes every dangerous point easy to see in the dark cave.
    context.strokeStyle = "rgba(255, 255, 255, 0.48)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(spike.x + 3, floor.y - 2);
    context.lineTo(spike.x + spike.width / 2, floor.y - spike.height + 2);
    context.stroke();
  }

  // Glowing crystals gently grow and dim to create a twinkling effect.
  for (const crystal of crystals) {
    const twinkle = (Math.sin(animationTime * 0.08 + crystal.x * 0.05) + 1) / 2;
    context.globalAlpha = 0.12 + twinkle * 0.15;
    context.fillStyle = "#3acaff";
    context.beginPath();
    context.arc(crystal.x + crystal.size / 2, crystal.y + crystal.size / 2, crystal.size + 5, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 0.65 + twinkle * 0.35;
    context.fillStyle = "#9cefff";
    context.fillRect(crystal.x, crystal.y, crystal.size + twinkle * 2, crystal.size + twinkle * 2);
  }
  context.globalAlpha = 1;

  // Dust motes slowly float through the cave air.
  context.fillStyle = "#c3cad3";
  for (const dust of dustMotes) {
    const driftX = dust.x + Math.sin(animationTime * 0.015 + dust.phase) * 8;
    const driftY = dust.y + Math.cos(animationTime * 0.012 + dust.phase) * 4;
    context.globalAlpha = 0.18;
    context.fillRect(driftX, driftY, dust.size, dust.size);
  }
  context.globalAlpha = 1;

  // Landing particles make jumps feel heavier and more physical.
  context.fillStyle = "#9ca4ae";
  for (const pebble of landingPebbles) {
    context.globalAlpha = pebble.life / 22;
    context.fillRect(pebble.x, pebble.y, 3, 3);
  }
  context.globalAlpha = 1;
}

// Draw the cave floor, sparkles, and a simple adult miner.
function drawGame() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Move and enlarge the world so the player gets a closer view.
  context.save();
  context.scale(camera.zoom, camera.zoom);
  context.translate(-camera.x, -camera.y);

  // The walking cycle makes the arms and legs alternate as the miner moves.
  const bodyBob = Math.abs(Math.sin(player.walkCycle)) * 2;
  const stepPhase = Math.sin(player.walkCycle);
  const legStride = stepPhase * 5 * player.direction;
  // Only the leg moving forward bends and lifts at the knee.
  const frontKneeLift = Math.max(0, stepPhase) * 7;
  const backKneeLift = Math.max(0, -stepPhase) * 7;
  const armSwing = Math.sin(player.walkCycle) * 3;
  // A full celebration contains exactly two small hops.
  const celebrationProgress = (36 - player.celebrationTimer) / 36;
  const celebrationHop = player.isCelebrating
    ? Math.abs(Math.sin(celebrationProgress * Math.PI * 2)) * 7
    : 0;
  const drawY = player.y + bodyBob - celebrationHop;

  // A circular vision field lets the miner see the cave on every side.
  const visionX = player.x + player.width / 2;
  const visionY = drawY + player.height / 2;
  const visionRadius = 200;

  // Only draw cave scenery inside the miner's vision field.
  context.save();
  context.beginPath();
  context.arc(visionX, visionY, visionRadius, 0, Math.PI * 2);
  context.clip();
  drawCaveBackground();
  context.restore();

  // A faint blue glow marks the edge of the visible area.
  context.fillStyle = "rgba(113, 214, 255, 0.10)";
  context.beginPath();
  context.arc(visionX, visionY, visionRadius, 0, Math.PI * 2);
  context.fill();

  // Spin and fade the miner during the brief death animation.
  context.save();
  // Squash the sprite for crouches and firm landings, with the feet anchored.
  const poseSquash = player.jumpPrepareTimer > 0
    ? 0.82
    : 1 - player.landingBend * 0.018;
  if (poseSquash < 1) {
    const feetX = player.x + player.width / 2;
    const feetY = player.y + player.height;
    context.translate(feetX, feetY);
    context.scale(1 + (1 - poseSquash) * 0.6, poseSquash);
    context.translate(-feetX, -feetY);
  }
  if (player.isDying) {
    const deathProgress = (36 - player.deathTimer) / 36;
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = drawY + player.height / 2;
    context.translate(playerCenterX, playerCenterY);
    context.rotate(deathProgress * Math.PI * 1.5 * player.direction);
    context.translate(-playerCenterX, -playerCenterY);
    context.globalAlpha = 1 - deathProgress * 0.7;
  }

  // Head: a side-profile face turns toward the direction the miner is walking.
  const faceX = player.direction === 1 ? player.x + 11 : player.x + 9;
  const helmetLampX = player.direction === 1 ? player.x + 22 : player.x + 8;
  const noseX = player.direction === 1 ? player.x + 27 : player.x + 7;
  context.fillStyle = "#c98b62";
  context.fillRect(faceX, drawY + 7, 16, 8);
  context.fillRect(noseX, drawY + 11, 3, 3);
  context.fillStyle = "#f4b400";
  context.fillRect(player.x + 7, drawY, 22, 8);
  context.fillRect(player.x + 5, drawY + 6, 26, 3);
  context.fillStyle = "#fff7b0";
  context.fillRect(helmetLampX, drawY + 2, 6, 4);
  context.fillStyle = "#382d28";
  context.fillRect(player.direction === 1 ? player.x + 23 : player.x + 12, drawY + 10, 2, 2);

  // Body: orange work shirt with blue denim overalls.
  context.fillStyle = "#e87820";
  context.fillRect(player.x + 6, drawY + 12, 24, 13);
  // Arms swing in opposite directions during each step.
  context.fillRect(player.x + 3, drawY + 15 + armSwing, 4, 10);
  context.fillRect(player.x + 29, drawY + 15 - armSwing, 4, 10);
  context.fillStyle = "#315d92";
  context.fillRect(player.x + 10, drawY + 13, 16, 12);

  // Draw the pickaxe from the miner's front hand, rotating it during a swing.
  const handX = player.direction === 1 ? player.x + 33 : player.x + 3;
  const handY = drawY + 20;
  const swingProgress = 1 - player.pickaxeSwing / 16;
  const rightSwingAngle = -1.45 + swingProgress * 1.25;
  const pickaxeAngle = player.direction === 1 ? rightSwingAngle : Math.PI - rightSwingAngle;
  const pickaxeEndX = handX + Math.cos(pickaxeAngle) * 17;
  const pickaxeEndY = handY + Math.sin(pickaxeAngle) * 17;

  context.strokeStyle = "#8b5a2b";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(handX, handY);
  context.lineTo(pickaxeEndX, pickaxeEndY);
  context.stroke();

  // A straight metal head sits across the end of the wooden handle.
  context.strokeStyle = "#c6d2da";
  context.lineWidth = 4;
  context.lineCap = "butt";
  const headAngle = pickaxeAngle + Math.PI / 2;
  context.beginPath();
  context.moveTo(
    pickaxeEndX + Math.cos(headAngle) * 6,
    pickaxeEndY + Math.sin(headAngle) * 6,
  );
  context.lineTo(
    pickaxeEndX - Math.cos(headAngle) * 6,
    pickaxeEndY - Math.sin(headAngle) * 6,
  );
  context.stroke();

  // Pointed metal tips extend from both ends of the pickaxe head.
  context.fillStyle = "#c6d2da";
  context.beginPath();
  context.moveTo(
    pickaxeEndX + Math.cos(headAngle) * 6 + Math.cos(pickaxeAngle) * 2,
    pickaxeEndY + Math.sin(headAngle) * 6 + Math.sin(pickaxeAngle) * 2,
  );
  context.lineTo(
    pickaxeEndX + Math.cos(headAngle) * 11,
    pickaxeEndY + Math.sin(headAngle) * 11,
  );
  context.lineTo(
    pickaxeEndX + Math.cos(headAngle) * 6 - Math.cos(pickaxeAngle) * 2,
    pickaxeEndY + Math.sin(headAngle) * 6 - Math.sin(pickaxeAngle) * 2,
  );
  context.moveTo(
    pickaxeEndX - Math.cos(headAngle) * 6 + Math.cos(pickaxeAngle) * 2,
    pickaxeEndY - Math.sin(headAngle) * 6 + Math.sin(pickaxeAngle) * 2,
  );
  context.lineTo(
    pickaxeEndX - Math.cos(headAngle) * 11,
    pickaxeEndY - Math.sin(headAngle) * 11,
  );
  context.lineTo(
    pickaxeEndX - Math.cos(headAngle) * 6 - Math.cos(pickaxeAngle) * 2,
    pickaxeEndY - Math.sin(headAngle) * 6 - Math.sin(pickaxeAngle) * 2,
  );
  context.fill();

  // Each leg moves through hip, knee, and ankle joints for a natural stride.
  context.strokeStyle = "#315d92";
  context.lineWidth = 7;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(player.x + 13, drawY + 25);
  context.lineTo(player.x + 13 + legStride * 0.45, drawY + 31 - frontKneeLift);
  context.lineTo(player.x + 13 + legStride, drawY + 36 - frontKneeLift * 0.8);
  context.moveTo(player.x + 23, drawY + 25);
  context.lineTo(player.x + 23 - legStride * 0.45, drawY + 31 - backKneeLift);
  context.lineTo(player.x + 23 - legStride, drawY + 36 - backKneeLift * 0.8);
  context.stroke();

  // Rounded knee joints sit at the bend in each denim leg.
  context.fillStyle = "#4d79ad";
  context.beginPath();
  context.arc(player.x + 13 + legStride * 0.45, drawY + 31 - frontKneeLift, 4, 0, Math.PI * 2);
  context.arc(player.x + 23 - legStride * 0.45, drawY + 31 - backKneeLift, 4, 0, Math.PI * 2);
  context.fill();

  // Longer rounded boots point in the direction the miner is walking.
  context.fillStyle = "#382d28";
  context.beginPath();
  context.ellipse(player.x + 13 + legStride + player.direction * 2, drawY + 35 - frontKneeLift * 0.8, 7, 3, 0, 0, Math.PI * 2);
  context.ellipse(player.x + 23 - legStride + player.direction * 2, drawY + 35 - backKneeLift * 0.8, 7, 3, 0, 0, Math.PI * 2);
  context.fill();
  // A thin straight edge gives each boot a flatter sole.
  context.fillRect(player.x + 6 + legStride + player.direction * 2, drawY + 36 - frontKneeLift * 0.8, 14, 2);
  context.fillRect(player.x + 16 - legStride + player.direction * 2, drawY + 36 - backKneeLift * 0.8, 14, 2);

  context.restore();

  // Restore normal canvas drawing for the next frame.
  context.restore();
}

// This loop draws as often as the display allows, but always simulates at 60 FPS.
function gameLoop(frameTime) {
  if (previousFrameTime === null) previousFrameTime = frameTime;
  // Limit a long tab pause so returning to the game cannot cause a huge catch-up jump.
  pendingUpdateTime += Math.min(frameTime - previousFrameTime, 100);
  previousFrameTime = frameTime;

  let updateCount = 0;
  while (pendingUpdateTime >= fixedUpdateMs && !menuOpen && updateCount < 6) {
    animationTime += 1;
    updateFallingRocks();
    updateLandingPebbles();
    updateLooseCrystals();
    updatePlayer();
    pendingUpdateTime -= fixedUpdateMs;
    updateCount += 1;
  }
  // Do not retain a large backlog when the game is paused in a menu.
  if (menuOpen) pendingUpdateTime = 0;

  updateCamera();
  drawGame();
  requestAnimationFrame(gameLoop);
}

// Restart when the player clicks the button, then start the game.
restartButton.addEventListener("click", restartGame);
loadSavedProgress();
restartGame();
requestAnimationFrame(gameLoop);
