// Animate the world from black and white to color after picking the final flower
function animateWorldColorization() {
  let anim = window._worldColorAnim;
  if (!anim.active) return;
  // Make blooming animation slower
  anim.t += 0.0045;
  // Animate sky color
  let skyColor = new THREE.Color().lerpColors(new THREE.Color('#222'), new THREE.Color('#e0eafc'), Math.min(anim.t, 1));
  scene.background = skyColor;
  // Animate ground color
  let grassColor = new THREE.Color().lerpColors(new THREE.Color(0x444444), new THREE.Color(0xb3e6b3), Math.min(anim.t, 1));
  ground.material.color.copy(grassColor);

  // Animate flowers growing and appearing across the terrain
  let flowerAppearT = Math.max(0, anim.t - 0.2);
  for (let i = 0; i < flowerStemInstancedMesh.count; i++) {
    if (flowerBloomState[i] === 2) continue;  // Skip fully bloomed flowers
    let stagger = (i % 100) * 0.002 + Math.floor(i/100)*0.01;
    let appear = flowerAppearT - stagger;
    if (appear > 0.01) {
      let scale = Math.min(1, Math.max(0.001, appear*2));
      
      // Get flower position from stem matrix
      let stemMatrix = new THREE.Matrix4();
      flowerStemInstancedMesh.getMatrixAt(i, stemMatrix);
      let stemPos = new THREE.Vector3();
      stemMatrix.decompose(stemPos, new THREE.Quaternion(), new THREE.Vector3());
      
      // Update stem
      stemMatrix.makeTranslation(stemPos.x, 0.25, stemPos.z);
      stemMatrix.scale(new THREE.Vector3(scale, scale, scale));
      flowerStemInstancedMesh.setMatrixAt(i, stemMatrix);

      // Update petals
      for (let p = 0; p < flowerPetalInstancedMeshes.length; p++) {
        let angle = (p / flowerPetalInstancedMeshes.length) * Math.PI * 2;
        let px = stemPos.x + Math.sin(angle) * 0.16;
        let pz = stemPos.z + Math.cos(angle) * 0.16;
        let petalMatrix = new THREE.Matrix4();
        petalMatrix.makeTranslation(px, 0.5, pz);
        petalMatrix.multiply(new THREE.Matrix4().makeRotationY(angle));
        petalMatrix.multiply(new THREE.Matrix4().makeScale(scale, scale*0.5, scale*0.7));
        flowerPetalInstancedMeshes[p].setMatrixAt(i, petalMatrix);
      }

      // Update center
      let centerMatrix = new THREE.Matrix4();
      centerMatrix.makeTranslation(stemPos.x, 0.5, stemPos.z);
      centerMatrix.scale(new THREE.Vector3(scale, scale, scale));
      flowerCenterInstancedMesh.setMatrixAt(i, centerMatrix);

      if (scale === 1) flowerBloomState[i] = 2;
    }
  }

  // Update all instance matrices
  flowerStemInstancedMesh.instanceMatrix.needsUpdate = true;
  for (let p = 0; p < flowerPetalInstancedMeshes.length; p++) {
    flowerPetalInstancedMeshes[p].instanceMatrix.needsUpdate = true;
  }
  flowerCenterInstancedMesh.instanceMatrix.needsUpdate = true;

  // End animation after t=1.2
  if (anim.t > 1.2) {
    anim.active = false;
    document.getElementById('message').textContent = 'The world is full of color! Explore and enjoy!';
  }
}

// Minimal mergeBufferGeometries helper (Three.js compatible)
function mergeBufferGeometries(geometries) {
  const merged = THREE.BufferGeometryUtils ? THREE.BufferGeometryUtils.mergeBufferGeometries(geometries) : null;
  if (merged) return merged;
  // Fallback: manual merge for simple geometries
  let mergedGeometry = new THREE.BufferGeometry();
  let positions = [], normals = [], uvs = [], indices = [];
  let indexOffset = 0;
  for (let geo of geometries) {
    if (!geo) continue;
    const pos = geo.attributes.position.array;
    positions.push(...pos);
    if (geo.attributes.normal) normals.push(...geo.attributes.normal.array);
    if (geo.attributes.uv) uvs.push(...geo.attributes.uv.array);
    if (geo.index) {
      for (let idx of geo.index.array) indices.push(idx + indexOffset);
    } else {
      for (let i = 0; i < pos.length / 3; i++) indices.push(i + indexOffset);
    }
    indexOffset += pos.length / 3;
  }
  mergedGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  if (normals.length) mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
  if (uvs.length) mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));

  mergedGeometry.setIndex(indices);
  return mergedGeometry;
}
// 3D Flower Adventure using Three.js

// 3D Flower Adventure - Enhanced Human Avatar, Flower Field, and Cutscenes
let scene, camera, renderer;
let genie, genieDialogueIndex = 0, genieDialogueActive = false;
let avatar, ground;
let flowerStemInstancedMesh, flowerPetalInstancedMeshes = [], flowerCenterInstancedMesh, flowerBloomState = [];
let cutscene = null, cutsceneTimer = 0;
let riddle1Solved = false, riddle2Solved = false;
let riddle1, riddle2, leverState = false, colorButtonState = 0;
let keys = {};

// Paper and Quiz state
let paper = null;
let hasPickedUpPaper = false;
let quizActive = false;
let currentQuizQuestion = 0;
let quizScore = 0;

// Ensure basketball-related variables are declared at the top of the script
let basketballActive = false;
let basketballScore = 0;
let basketballBall, basketballHoop, basketballBackboard;

// Quiz questions
const QUIZ_QUESTIONS = [
  {
    question: "What is your favorite color?",
    answers: ["Blue", "Red", "Green"],
    correctIndex: 0
  },
  {
    question: "What is your favorite food?",
    answers: ["Pizza", "Burger", "Pasta"],
    correctIndex: 1
  },
  {
    question: "What is your favorite animal?",
    answers: ["Dog", "Cat", "Bird"],
    correctIndex: 2
  },
  {
    question: "What is your favorite season?",
    answers: ["Spring", "Summer", "Winter"],
    correctIndex: 1
  },
  {
    question: "What is your favorite hobby?",
    answers: ["Reading", "Gaming", "Sports"],
    correctIndex: 1
  },
  {
    question: "What is your favorite music genre?",
    answers: ["Pop", "Rock", "Jazz"],
    correctIndex: 0
  },
  {
    question: "What is your favorite time of day?",
    answers: ["Morning", "Afternoon", "Night"],
    correctIndex: 2
  },
  {
    question: "What is your favorite drink?",
    answers: ["Coffee", "Tea", "Juice"],
    correctIndex: 0
  },
  {
    question: "What is your favorite movie genre?",
    answers: ["Action", "Comedy", "Drama"],
    correctIndex: 1
  },
  {
    question: "What is your favorite place?",
    answers: ["Beach", "Mountain", "City"],
    correctIndex: 0
  }
];

// Genie dialogue lines
const GENIE_DIALOGUE = [
  "Hey anush (I didn't know if I should say hey anush or hey twin), as you can see this is me sayed. I didn't have much time to work on the charachter. I just kept it as a cone and sphere.",
  "We will work toghether now on getting you to your birthday gift. There are a few things you need to do. You can move with the arrows as you can see. You will get the rest on instructions as time comes",
  "First thing we have to do is check out this paper there, I seen it but I was waiting for you to pull up"
];

init();
animate();

function createHumanAvatar() {
  const group = new THREE.Group();
  // Roblox-style blocky body, all white
  const whiteMat = new THREE.MeshLambertMaterial({color: 0xffffff});
  // Torso (box)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.22), whiteMat);
  torso.position.set(0, 1.32, 0);
  group.add(torso);
  // Legs (boxes)
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), whiteMat);
  legL.position.set(-0.1, 0.65, 0);
  group.add(legL);
  const legR = legL.clone(); legR.position.x = 0.1;
  group.add(legR);
  // Arms (boxes, attached directly to torso)
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.48, 0.15), whiteMat);
  armL.position.set(-0.265, 1.32, 0);
  group.add(armL);
  const armR = armL.clone(); armR.position.x = 0.265;
  group.add(armR);
  group.armL = armL;
  group.armR = armR;
  // Hands (cylinders, blocky style, attached to arms)
  const handL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.11, 16), whiteMat);
  handL.position.set(-0.265, 1.05, 0);
  handL.rotation.z = Math.PI/2;
  group.add(handL);
  const handR = handL.clone(); handR.position.x = 0.265;
  group.add(handR);
  // Head (Roblox-style: box, sits flush on torso, lowered to remove gap)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), whiteMat);
  head.position.set(0, 1.38, 0);
  group.add(head);
  group.head = head;
  // Face (Roblox-style: flat features)
  // Eyes (flat black cylinders, moved down with head)
  const eyeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16);
  const eyeMat = new THREE.MeshLambertMaterial({color: 0x222222});
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat); eyeL.position.set(-0.07, 2.26, 0.18); eyeL.rotation.x = Math.PI/2;
  const eyeR = eyeL.clone(); eyeR.position.x = 0.07;
  group.add(eyeL, eyeR);
  // Smile (flat, wide, pink box, moved down with head)
  const smile = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.02), new THREE.MeshLambertMaterial({color: 0xf48fb1}));
  smile.position.set(0, 2.21, 0.18);
  group.add(smile);
  // Realistic hair: many strands using BufferGeometry and LineSegments (static, not animated, moved down with head)
  const hairStrandCount = 40000;
  const hairGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(hairStrandCount * 6);
  // True hemisphere using spherical coordinates for even root distribution
  const r = 0.285;
  for (let i = 0; i < hairStrandCount; i++) {
    // Fibonacci sphere, restrict phi to [0, PI/1.1] for upper hemisphere
    const phi = Math.acos(1 - Math.random());
    const phiBiased = phi * Math.pow(Math.random(), 0.5);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    // Lower the root of the hair to cover the neck area
    const y0 = 2.02 + Math.cos(phiBiased) * r; // was 2.12, now 2.02
    const x0 = Math.cos(theta) * Math.sin(phiBiased) * r + (Math.random()-0.5)*0.008;
    const z0 = Math.sin(theta) * Math.sin(phiBiased) * r + (Math.random()-0.5)*0.008;
    // Make strands longer, especially in the back
    let strandLen = 0.32 + Math.random() * 0.22;
    // Extra length for lower hemisphere (back)
    if (phiBiased > Math.PI/2) strandLen += 0.13;
    const x1 = x0 + (Math.random()-0.5)*0.03;
    const y1 = y0 - strandLen;
    const z1 = z0 + (Math.random()-0.5)*0.03;
    positions.set([x0, y0, z0, x1, y1, z1], i*6);
  }
  hairGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const hairMaterial = new THREE.LineBasicMaterial({color: 0x222222, linewidth: 2});
  const hairLines = new THREE.LineSegments(hairGeometry, hairMaterial);
  group.add(hairLines);
  group.hairLines = hairLines;
  // Add a scalp cap for better coverage (moved down with head)
  const scalp = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 18, 12, 0, Math.PI*2, 0, Math.PI/1.1),
    new THREE.MeshLambertMaterial({color: 0x222222, transparent: true, opacity: 0.92})
  );
  scalp.position.y = 2.02;
  group.add(scalp);
  group.position.set(0, 0, -15);
  return group;
}

function createFlower(x, z) {
  // Standalone flower mesh for the final flower (not instanced)
  const group = new THREE.Group();
  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  const stemMat = new THREE.MeshLambertMaterial({color: 0x4caf50});
  const stemMesh = new THREE.Mesh(stemGeo, stemMat);
  stemMesh.position.y = 0.25;
  group.add(stemMesh);
  // Petal
  const petalGeo = new THREE.SphereGeometry(0.13, 8, 8);
  const petalMat = new THREE.MeshLambertMaterial({color: 0xff69b4});
  const petalMesh = new THREE.Mesh(petalGeo, petalMat);
  petalMesh.position.set(0, 0.5, 0.18);
  group.add(petalMesh);
  // Center
  const centerGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const centerMat = new THREE.MeshLambertMaterial({color: 0xffeb3b});
  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  centerMesh.position.set(0, 0.5, 0);
  group.add(centerMesh);
  group.position.set(x, 0, z);
  return group;
}

function initPaper() {
    // Create the paper
    const paperGeometry = new THREE.PlaneGeometry(1, 1.4);
    const paperMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xf5f5dc, // Beige color
        side: THREE.DoubleSide
    });
    paper = new THREE.Mesh(paperGeometry, paperMaterial);
    paper.position.set(0, 0.2, -12);
    paper.rotation.x = -Math.PI / 4;
    paper.rotation.y = Math.PI;
    scene.add(paper);
}

function init() {
  // Create scene and renderer first
  scene = new THREE.Scene();
  // Start with black and white world
  scene.background = new THREE.Color('#222');

  // Create message container
  const messageContainer = document.createElement('div');
  messageContainer.id = 'message';
  messageContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 16px;
    z-index: 1000;
    text-align: center;
  `;
  document.body.appendChild(messageContainer);
  messageContainer.textContent = 'A new adventure begins...';

  // Create paper dialogue element
  const paperDialogue = document.createElement('div');
  paperDialogue.id = 'paper-dialogue';
  paperDialogue.style.cssText = `
    position: absolute;
    min-width: 140px;
    background: rgba(0,0,0,0.85);
    color: #fff;
    padding: 10px 16px;
    border-radius: 12px;
    font-family: Arial, sans-serif;
    font-size: 1.2em;
    font-weight: bold;
    text-align: center;
    display: none;
    pointer-events: none;
    z-index: 1000;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  `;
  paperDialogue.textContent = 'Press K to read';
  document.body.appendChild(paperDialogue);

  // Create genie dialogue popup
  const dialoguePopup = document.createElement('div');
  dialoguePopup.id = 'genie-dialogue-popup';
  dialoguePopup.style.cssText = `
    position: absolute;
    min-width: 220px;
    background: rgba(30,40,60,0.92);
    color: #fff;
    padding: 16px 18px;
    border-radius: 16px;
    font-family: monospace;
    font-size: 1.15em;
    text-align: center;
    display: none;
    pointer-events: none;
    z-index: 1000;
  `;
  document.body.appendChild(dialoguePopup);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 4, 12);

  renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lighting (white, but dim for b&w effect)
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.4);
  dir.position.set(10, 20, 10);
  scene.add(dir);

  // Create the genie first (since dialogue depends on it)
  createGenie();

  // Initialize paper
  initPaper();

  // Ground (much bigger, light grey)
  const groundGeo = new THREE.BoxGeometry(400, 1, 400);
  const groundMat = new THREE.MeshLambertMaterial({color: 0xf0f0f0}); // Very light grey
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.5;
  scene.add(ground);

  // Avatar (human form)
  avatar = createHumanAvatar();
  scene.add(avatar);

  // Flower field: instanced mesh for performance
  const flowerCountX = 96, flowerCountZ = 96, flowerSpacing = 4;
  const totalFlowers = flowerCountX * flowerCountZ;
  // Flower geometry (stem, multiple petals, center as separate instanced meshes)
  const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
  const stemMat = new THREE.MeshLambertMaterial({color: 0x4caf50});
  const petalGeo = new THREE.SphereGeometry(0.09, 8, 8); // smaller, more petal-like
  const petalMat = new THREE.MeshLambertMaterial({color: 0xff69b4});
  const centerGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const centerMat = new THREE.MeshLambertMaterial({color: 0xffeb3b});
  // Create instanced meshes with maximum possible flowers
  flowerStemInstancedMesh = new THREE.InstancedMesh(stemGeo, stemMat, totalFlowers);
  flowerCenterInstancedMesh = new THREE.InstancedMesh(centerGeo, centerMat, totalFlowers);
  flowerStemInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flowerCenterInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  
  // Multiple petals per flower (6 petals arranged in a circle)
  const PETAL_COUNT = 6;
  flowerPetalInstancedMeshes = [];
  for (let p = 0; p < PETAL_COUNT; p++) {
    let mesh = new THREE.InstancedMesh(petalGeo, petalMat, totalFlowers);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    flowerPetalInstancedMeshes.push(mesh);
  }
  flowerStemInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flowerCenterInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(flowerStemInstancedMesh);
  scene.add(flowerCenterInstancedMesh);
  // Store bloom state for each flower
  flowerBloomState = [];
  let idx = 0;
  // Initialize all matrices to ensure proper updates
  const identityMatrix = new THREE.Matrix4();
  for (let i = 0; i < totalFlowers; i++) {
    flowerStemInstancedMesh.setMatrixAt(i, identityMatrix);
    flowerCenterInstancedMesh.setMatrixAt(i, identityMatrix);
    for (let p = 0; p < PETAL_COUNT; p++) {
      flowerPetalInstancedMeshes[p].setMatrixAt(i, identityMatrix);
    }
  }
  
  // Place flowers across the terrain
  for (let ix = 0; ix < flowerCountX; ix++) {
    for (let iz = 0; iz < flowerCountZ; iz++) {
      let x = -190 + ix * flowerSpacing + (Math.random()-0.5)*1.5;
      let z = -190 + iz * flowerSpacing + (Math.random()-0.5)*1.5;
      // Avoid placing flowers around the glass
      if (z > 120 && Math.abs(x) < 40) continue;
      
      // Stem
      let stemMatrix = new THREE.Matrix4();
      stemMatrix.setPosition(x, 0, z);
      stemMatrix.scale(new THREE.Vector3(0.001, 0.001, 0.001));
      flowerStemInstancedMesh.setMatrixAt(idx, stemMatrix);
      
      // Petals (arranged in a circle)
      for (let p = 0; p < PETAL_COUNT; p++) {
        let angle = (p / PETAL_COUNT) * Math.PI * 2;
        let px = x + Math.sin(angle) * 0.16;
        let pz = z + Math.cos(angle) * 0.16;
        let petalMatrix = new THREE.Matrix4();
        petalMatrix.setPosition(px, 0.5, pz);
        // Petal faces outward
        petalMatrix.multiply(new THREE.Matrix4().makeRotationY(angle));
        // Flatten petal
        petalMatrix.multiply(new THREE.Matrix4().makeScale(1, 0.5, 0.7));
        // Start hidden
        petalMatrix.scale(new THREE.Vector3(0.001, 0.001, 0.001));
        flowerPetalInstancedMeshes[p].setMatrixAt(idx, petalMatrix);
      }
      
      // Center (offset above stem)
      let centerMatrix = new THREE.Matrix4();
      centerMatrix.setPosition(x, 0.5, z);
      centerMatrix.scale(new THREE.Vector3(0.001, 0.001, 0.001));
      flowerCenterInstancedMesh.setMatrixAt(idx, centerMatrix);
      
      flowerBloomState[idx] = 0; // 0 = hidden, 1 = blooming, 2 = fully visible
      idx++;
    }
  }
  // Update the count and force matrix updates for all meshes
  const actualFlowerCount = idx;
  console.log(`Placed ${actualFlowerCount} flowers out of ${totalFlowers} possible`);
  
  flowerStemInstancedMesh.count = actualFlowerCount;
  flowerCenterInstancedMesh.count = actualFlowerCount;
  for (let p = 0; p < flowerPetalInstancedMeshes.length; p++) {
    flowerPetalInstancedMeshes[p].count = actualFlowerCount;
  }
  
  // Force matrix updates
  flowerStemInstancedMesh.instanceMatrix.needsUpdate = true;
  flowerCenterInstancedMesh.instanceMatrix.needsUpdate = true;
  for (let p = 0; p < flowerPetalInstancedMeshes.length; p++) {
    flowerPetalInstancedMeshes[p].instanceMatrix.needsUpdate = true;
  }

  // Place a single flower in a glass container behind the door
  const glassGeo = new THREE.CylinderGeometry(3, 3, 7, 32);
  const glassMat = new THREE.MeshLambertMaterial({color: 0xcccccc, transparent: true, opacity: 0.35});
  let glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, 3.5, 135);
  scene.add(glass);
  scene.glass = glass;

  // Create and add the final flower (standalone mesh)
  let finalFlower = createFlower(0, 135);
  finalFlower.isFinal = true;
  finalFlower.position.y = 0.5;
  scene.add(finalFlower);
  scene.finalFlower = finalFlower;

  window.addEventListener('resize', onWindowResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  // Animation state for world colorization
  window._worldColorAnim = {
    active: false,
    t: 0
  };

  // Intro cutscene
  cutscene = 'intro';
  cutsceneTimer = 0;

  // Create quiz UI
  createQuizUI();
}

function animate() {
  requestAnimationFrame(animate);
  // No hair animation
  if (avatar) animateLimbs();
  if (cutscene) handleCutscene();
  else {
    handleInput();
    updateCamera();
    if (window._worldColorAnim.active) animateWorldColorization();
    updateGenieDialogue();
    updateGeniePosition(); // Update genie position to follow player
  }
  // Update paper dialogue position
  updatePaperDialogue();

  if (basketballActive) checkBallPickupZone();
  updateBasketballBall();

  renderer.render(scene, camera);
}

// Move updateBasketballBall function above animate to ensure it is defined before being called
function updateBasketballBall() {
    if (!basketballActive || !basketballBall) return;

    // Simple physics
    basketballBall.position.add(basketballBall.userData.velocity);

    // Gravity
    basketballBall.userData.velocity.y -= 0.012;

    // Friction
    basketballBall.userData.velocity.multiplyScalar(0.98);

    // Floor collision
    if (basketballBall.position.y < 0.12) {
        basketballBall.position.y = 0.12;
        basketballBall.userData.velocity.y *= -0.4;
        basketballBall.userData.velocity.x *= 0.7;
        basketballBall.userData.velocity.z *= 0.7;
    }

    // Check if ball goes through hoop
    if (
        basketballBall.position.y > 1.7 &&
        basketballBall.position.y < 2.1 &&
        Math.abs(basketballBall.position.x) < 0.22 &&
        Math.abs(basketballBall.position.z + 8.05) < 0.18 &&
        basketballBall.userData.velocity.z < 0
    ) {
        basketballScore++;
        showBasketballUI();
        resetBasketballBall();
        if (basketballScore >= 5) {
            winBasketballChallenge();
        }
    }

    // Reset if ball goes too far
    if (
        basketballBall.position.y < -2 ||
        Math.abs(basketballBall.position.x) > 5 ||
        Math.abs(basketballBall.position.z) > 12
    ) {
        resetBasketballBall();
    }
}

function animateLimbs() {
  // Animate arms and legs only when moving
  const t = performance.now() * 0.003;
  let isMoving = false;
  if (keys['ArrowLeft'] || keys['a'] || keys['ArrowRight'] || keys['d'] || keys['ArrowUp'] || keys['w'] || keys['ArrowDown'] || keys['s']) {
    isMoving = true;
  }
  // Arms swing
  if (avatar.armL && avatar.armR) {
    if (isMoving) {
      avatar.armL.rotation.x = Math.sin(t) * 0.5;
      avatar.armR.rotation.x = -Math.sin(t) * 0.5;
    } else {
      avatar.armL.rotation.x = 0;
      avatar.armR.rotation.x = 0;
    }
  }
  // Legs swing
  if (avatar.children[0] && avatar.children[1]) {
    if (isMoving) {
      avatar.children[0].rotation.x = -Math.sin(t) * 0.4; // legL
      avatar.children[1].rotation.x = Math.sin(t) * 0.4;  // legR
    } else {
      avatar.children[0].rotation.x = 0;
      avatar.children[1].rotation.x = 0;
    }
  }
}



function handleInput() {
  // Genie dialogue trigger: if close to genie, start dialogue
  if (!genieDialogueActive && Math.abs(avatar.position.x - genie.position.x) < 2.2 && Math.abs(avatar.position.z - genie.position.z) < 2.2) {
    genieDialogueActive = true;
    genieDialogueIndex = 0;
    showGenieDialogue(GENIE_DIALOGUE[0]);
    playGenieRoboticSound();
  }
  let moved = false;
  if (keys['ArrowLeft'] || keys['a']) { avatar.position.x += 0.22; moved = true; }
  if (keys['ArrowRight'] || keys['d']) { avatar.position.x -= 0.22; moved = true; }
  if (keys['ArrowUp'] || keys['w']) { avatar.position.z += 0.22; moved = true; }
  if (keys['ArrowDown'] || keys['s']) { avatar.position.z -= 0.22; moved = true; }
  // World boundaries (keep avatar within ground)
  avatar.position.x = Math.max(-195, Math.min(195, avatar.position.x));
  avatar.position.z = Math.max(-195, Math.min(195, avatar.position.z));
}

function updateCamera() {
  // Third-person camera: behind and above the avatar, looking forward
  const camTarget = new THREE.Vector3(
    avatar.position.x,
    avatar.position.y + 1.5,
    avatar.position.z
  );
  // Camera offset (behind and above)
  const offset = new THREE.Vector3(0, 2.5, -5);
  offset.applyAxisAngle(new THREE.Vector3(0,1,0), 0); // can add yaw for shoulder cam
  const desiredPos = camTarget.clone().add(offset);
  camera.position.lerp(desiredPos, 0.15);
  camera.lookAt(camTarget);
}

function handleCutscene() {
  if (cutscene === 'intro') {
    // Pan from above to player
    cutsceneTimer++;
    camera.position.set(0, 10 - cutsceneTimer*0.08, -15 + cutsceneTimer*0.2);
    camera.lookAt(0, 1.5, -15);
    if (cutsceneTimer > 60) {
      cutscene = null;
      document.getElementById('message').textContent = 'WASD/Arrows to move, Space to interact/throw, R to restart';
    } else {
      document.getElementById('message').textContent = 'A new adventure begins...';
    }
  } else if (cutscene === 'win') {
    cutsceneTimer++;
    camera.position.x += (0 - camera.position.x) * 0.05;
    camera.position.z += (24 - camera.position.z) * 0.05;
    camera.position.y += (5 - camera.position.y) * 0.05;
    camera.lookAt(0, 1.5, 24);
    if (cutsceneTimer > 80) {
      document.getElementById('message').textContent = 'You reached the flower field! 🌸🎉';
    } else {
      document.getElementById('message').textContent = 'Wow! So many flowers!';
    }
  }
}

function onKeyDown(e) {
  // Handle paper pickup
  if (e.key.toLowerCase() === 'k' && paper && !hasPickedUpPaper) {
    // Get distance between avatar and paper in all dimensions
    const dx = avatar.position.x - paper.position.x;
    const dy = avatar.position.y - paper.position.y;
    const dz = avatar.position.z - paper.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Check if player is within pickup radius (3 units in any direction)
    if (distance < 3) {
        hasPickedUpPaper = true;
        scene.remove(paper);
        paper = null;
        // Hide the "Press K" dialogue and show first quiz question
        const paperDialogue = document.getElementById('paper-dialogue');
        if (paperDialogue) paperDialogue.style.display = 'none';
        showQuizQuestion();
    }
  }

  // Handle existing dialogue
  if (genieDialogueActive && e.key === ' ') {
    genieDialogueIndex++;
    if (genieDialogueIndex < GENIE_DIALOGUE.length) {
      showGenieDialogue(GENIE_DIALOGUE[genieDialogueIndex]);
      playGenieRoboticSound();
    } else {
      hideGenieDialogue();
      genieDialogueActive = false;
    }
    return;
  }
  keys[e.key] = true;
  if (cutscene) return;
  // Interact with the flower in the glass container behind the door
  if (e.key === ' ' && scene.finalFlower &&
      Math.abs(avatar.position.x - scene.finalFlower.position.x) < 3.5 &&
      Math.abs(avatar.position.z - scene.finalFlower.position.z) < 3.5 &&
      !window._worldColorAnim.active) {
    document.getElementById('message').textContent = 'You picked the magical flower! Watch the world bloom...';
    window._worldColorAnim.active = true;
    window._worldColorAnim.t = 0;
    // Door removed
    // Hide the glass and flower after picking
    scene.glass.visible = false;
    scene.finalFlower.visible = false;
  }
  // Restart (minimal: reset avatar position and cutscene)
  if (e.key === 'r') {
    avatar.position.set(0, 0, -15);
    cutscene = 'intro';
    cutsceneTimer = 0;
    document.getElementById('message').textContent = 'WASD/Arrows to move, Space to interact, R to restart';
  }
}

// Genie dialogue popup logic
function showGenieDialogue(text) {
  let popup = document.getElementById('genie-dialogue-popup');
  popup.textContent = text;
  popup.style.display = 'block';
  // Position above genie in screen space
  let pos = genie.position.clone();
  pos.y += 2.1;
  let vector = pos.project(camera);
  let x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  let y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  popup.style.left = (x - popup.offsetWidth/2) + 'px';
  popup.style.top = (y - popup.offsetHeight - 18) + 'px';
}

function hideGenieDialogue() {
  document.getElementById('genie-dialogue-popup').style.display = 'none';
}

function updateGenieDialogue() {
  if (!genie || !avatar) return;
  
  // Update genie position to follow player
  const desiredDistance = 5; // Increase the distance from 3 to 5
  const followSpeed = 0.02;

  // Get direction from genie to player
  const dx = avatar.position.x - genie.position.x;
  const dz = avatar.position.z - genie.position.z;
  const currentDistance = Math.sqrt(dx * dx + dz * dz);

  // Only move if we're too far from the player
  if (currentDistance > desiredDistance) {
    // Calculate target position (keeping desired distance)
    const angle = Math.atan2(dz, dx);
    const targetX = avatar.position.x - Math.cos(angle) * desiredDistance;
    const targetZ = avatar.position.z - Math.sin(angle) * desiredDistance;

    // Smoothly move towards target position
    genie.position.x += (targetX - genie.position.x) * followSpeed;
    genie.position.z += (targetZ - genie.position.z) * followSpeed;

    // Add floating animation
    const floatHeight = Math.sin(performance.now() * 0.002) * 0.1;
    genie.position.y = 0.2 + floatHeight;

    // Make genie face the player
    genie.rotation.y = angle - Math.PI / 2;
  }

  // Update dialogue position
  if (!genieDialogueActive) return;
  const popup = document.getElementById('genie-dialogue-popup');
  if (popup.style.display === 'none') return;
  
  let pos = genie.position.clone();
  pos.y += 2.1;
  let vector = pos.project(camera);
  let x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  let y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  popup.style.left = (x - popup.offsetWidth/2) + 'px';
  popup.style.top = (y - popup.offsetHeight - 18) + 'px';
}

// Update genie position to follow player
function updateGeniePosition() {
  if (!genie || !avatar) return;
  
  // Desired distance from player
  const desiredDistance = 5; // Increase the distance from 3 to 5
  const minDistance = 4; // Adjust minimum distance accordingly
  const followSpeed = 0.02;

  // Get direction from genie to player
  const dx = avatar.position.x - genie.position.x;
  const dz = avatar.position.z - genie.position.z;
  const currentDistance = Math.sqrt(dx * dx + dz * dz);

  // Only move if we're too far from the player
  if (currentDistance > desiredDistance) {
    // Calculate target position (keeping desired distance)
    const angle = Math.atan2(dz, dx);
    const targetX = avatar.position.x - Math.cos(angle) * desiredDistance;
    const targetZ = avatar.position.z - Math.sin(angle) * desiredDistance;

    // Smoothly move towards target position
    genie.position.x += (targetX - genie.position.x) * followSpeed;
    genie.position.z += (targetZ - genie.position.z) * followSpeed;

    // Add floating animation
    const floatHeight = Math.sin(performance.now() * 0.002) * 0.1;
    genie.position.y = 0.2 + floatHeight;

    // Make genie face the player
    genie.rotation.y = angle - Math.PI / 2;
  }
}

// Placeholder for robotic sound effect
function playGenieRoboticSound() {
  // TODO: Play robotic sound here (e.g., using Web Audio API or <audio> element)
  // For now, just log to console
  console.log('Genie: [robotic sound]');
}

function onKeyUp(e) {
  keys[e.key] = false;
}



function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Quiz UI and interaction handling
function createQuizUI() {
    const quizContainer = document.createElement('div');
    quizContainer.id = 'quizContainer';
    quizContainer.style.cssText = `
        display: none;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
        font-family: Arial, sans-serif;
        min-width: 300px;
        z-index: 1000;
    `;
    document.body.appendChild(quizContainer);
}

function showQuizQuestion() {
    if (currentQuizQuestion >= QUIZ_QUESTIONS.length) {
        endQuiz();
        return;
    }

    const question = QUIZ_QUESTIONS[currentQuizQuestion];
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.style.display = 'block';
    
    quizContainer.innerHTML = `
        <h2>Question ${currentQuizQuestion + 1}/${QUIZ_QUESTIONS.length}</h2>
        <p>${question.question}</p>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
            ${question.answers.map((answer, index) => `
                <button 
                    style="padding: 10px; margin: 5px; background: #444; border: none; color: white; cursor: pointer; border-radius: 5px;"
                    onclick="handleQuizAnswer(${index})"
                    onmouseover="this.style.background='#666'"
                    onmouseout="this.style.background='#444'"
                >${answer}</button>
            `).join('')}
        </div>
    `;
}

function handleQuizAnswer(answerIndex) {
    const question = QUIZ_QUESTIONS[currentQuizQuestion];
    if (answerIndex === question.correctIndex) {
        quizScore++;
    }
    currentQuizQuestion++;
    showQuizQuestion();
}

function endQuiz() {
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.innerHTML = `
        <h2>Quiz Complete!</h2>
        <p>You scored ${quizScore} out of ${QUIZ_QUESTIONS.length}!</p>
        <button 
            id="startBasketballButton"
            style="padding: 10px; margin: 5px; background: #444; border: none; color: white; cursor: pointer; border-radius: 5px;"
        >Basketball Challenge!</button>
    `;
    document.getElementById('startBasketballButton').addEventListener('click', startBasketballChallenge);
// Basketball challenge variables
let basketballActive = false;
let basketballScore = 0;
let basketballBall, basketballHoop, basketballBackboard;

function startBasketballChallenge() {
    basketballActive = true;
    basketballScore = 0;
    closeQuiz();
    createBasketballHoop();
    createBasketballBall();
    showBasketballUI();
    createPickupButton();
}

function createBasketballHoop() {
    // Backboard
    basketballBackboard = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 0.05),
        new THREE.MeshLambertMaterial({color: 0xffffff})
    );
    basketballBackboard.position.set(0, 2.2, -8);
    scene.add(basketballBackboard);
    // Hoop (torus)
    basketballHoop = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.03, 16, 100),
        new THREE.MeshLambertMaterial({color: 0xff6600})
    );
    basketballHoop.position.set(0, 1.9, -8.05);
    basketballHoop.rotation.x = Math.PI/2;
    scene.add(basketballHoop);
}

function createBasketballBall() {
    basketballBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 16, 12),
        new THREE.MeshLambertMaterial({color: 0xffa500})
    );
    basketballBall.position.set(0, 1.2, -6.5);
    basketballBall.userData.velocity = new THREE.Vector3(0,0,0);
    scene.add(basketballBall);
    console.log('Basketball ball created at position:', basketballBall.position.toArray());
}

function showBasketballUI() {
    let ui = document.getElementById('basketball-ui');
    if (!ui) {
        ui = document.createElement('div');
        ui.id = 'basketball-ui';
        ui.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1.2em;
            z-index: 1001;
        `;
        document.body.appendChild(ui);
    }
    ui.innerHTML = `Basketball Score: <b>${basketballScore}</b> / 5`;
    ui.style.display = 'block';
}

function hideBasketballUI() {
    let ui = document.getElementById('basketball-ui');
    if (ui) ui.style.display = 'none';
}

// Add a button for picking up the basketball
function createPickupButton() {
    let pickupButton = document.getElementById('pickup-button');
    if (!pickupButton) {
        pickupButton = document.createElement('button');
        pickupButton.id = 'pickup-button';
        pickupButton.textContent = 'Pick Up Ball';
        pickupButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            font-size: 1em;
            background: #444;
            color: #fff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            z-index: 1001;
        `;
        document.body.appendChild(pickupButton);
        pickupButton.addEventListener('click', function() {
            const distance = avatar.position.distanceTo(basketballBall.position);
            const pickupRadius = 3; // Define the radius within which the ball can be picked up
            if (distance <= pickupRadius) {
                resetBasketballBall();
            } else {
                alert('You are too far from the ball to pick it up!');
            }
        });
    }
}

// Automatically pick up the ball when the player enters a specific zone
function checkBallPickupZone() {
    if (!basketballBall) {
        console.error('Basketball ball is not initialized.');
        return;
    }
    const distance = avatar.position.distanceTo(basketballBall.position);
    const pickupRadius = 3; // Define the radius within which the ball is automatically picked up
    console.log('Distance to basketball ball:', distance);
    if (distance <= pickupRadius) {
        console.log('Ball is within pickup radius. Resetting ball.');
        resetBasketballBall();
    }
}

// Add debugging logs to shootBasketball
function shootBasketball() {
    if (!basketballBall) {
        console.error('Basketball ball is not initialized. Cannot shoot.');
        return;
    }
    if (shotsRemaining <= 0) {
        console.warn('No shots remaining.');
        return;
    }

    // Set trajectory to always go through the hoop
    const hoopPosition = new THREE.Vector3(0, 1.9, -8.05);
    const direction = hoopPosition.clone().sub(basketballBall.position).normalize();
    basketballBall.userData.velocity.copy(direction.multiplyScalar(0.25));

    shotsRemaining--;
    console.log('Shot taken. Shots remaining:', shotsRemaining);
    if (shotsRemaining === 0) {
        endBasketballGame();
    }
}

function endBasketballGame() {
    basketballActive = false;
    hideBasketballUI();
    alert('Game Over! You have taken all 5 shots.');
}

// Ensure all shots go in the hoop
function shootBasketball() {
    if (!basketballBall) return;
    // Set trajectory to always go through the hoop
    const hoopPosition = new THREE.Vector3(0, 1.9, -8.05);
    const direction = hoopPosition.clone().sub(basketballBall.position).normalize();
    basketballBall.userData.velocity.copy(direction.multiplyScalar(0.25));
}

// Change shooting trigger to Enter key
window.addEventListener('keydown', function(e) {
    if (basketballActive && e.code === 'Enter') {
        shootBasketball();
    }
});

// Function to update basketball ball physics and interactions
function updateBasketballBall() {
    if (!basketballActive || !basketballBall) return;

    // Simple physics
    basketballBall.position.add(basketballBall.userData.velocity);

    // Gravity
    basketballBall.userData.velocity.y -= 0.012;

    // Friction
    basketballBall.userData.velocity.multiplyScalar(0.98);

    // Floor collision
    if (basketballBall.position.y < 0.12) {
        basketballBall.position.y = 0.12;
        basketballBall.userData.velocity.y *= -0.4;
        basketballBall.userData.velocity.x *= 0.7;
        basketballBall.userData.velocity.z *= 0.7;
    }

    // Check if ball goes through hoop
    if (
        basketballBall.position.y > 1.7 &&
        basketballBall.position.y < 2.1 &&
        Math.abs(basketballBall.position.x) < 0.22 &&
        Math.abs(basketballBall.position.z + 8.05) < 0.18 &&
        basketballBall.userData.velocity.z < 0
    ) {
        basketballScore++;
        showBasketballUI();
        resetBasketballBall();
        if (basketballScore >= 5) {
            winBasketballChallenge();
        }
    }

    // Reset if ball goes too far
    if (
        basketballBall.position.y < -2 ||
        Math.abs(basketballBall.position.x) > 5 ||
        Math.abs(basketballBall.position.z) > 12
    ) {
        resetBasketballBall();
    }
}

function resetBasketballBall() {
    basketballBall.position.set(0, 1.2, -6.5);
    basketballBall.userData.velocity.set(0,0,0);
}

function winBasketballChallenge() {
    basketballActive = false;
    hideBasketballUI();
    showBasketballWinMessage();
    // Remove hoop and ball
    scene.remove(basketballBall);
    scene.remove(basketballHoop);
    scene.remove(basketballBackboard);
}

function showBasketballWinMessage() {
    let winDiv = document.getElementById('basketball-win');
    if (!winDiv) {
        winDiv = document.createElement('div');
        winDiv.id = 'basketball-win';
        winDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #222;
            color: #fff;
            padding: 32px 48px;
            border-radius: 16px;
            font-size: 2em;
            z-index: 1002;
            text-align: center;
        `;
        document.body.appendChild(winDiv);
    }
    winDiv.innerHTML = `<h2>🏀 You got 5 baskets! Happy Birthday! 🎉</h2><button id='closeBasketballWin' style='margin-top:20px;padding:10px 20px;font-size:1em;border-radius:8px;background:#444;color:#fff;border:none;cursor:pointer;'>Close</button>`;
    winDiv.style.display = 'block';
    document.getElementById('closeBasketballWin').onclick = function() {
        winDiv.style.display = 'none';
    };
}
// Call updateBasketballBall in your main animation loop
// Example: function animate() { ... updateBasketballBall(); ... }
}

function closeQuiz() {
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.style.display = 'none';
    quizActive = false;
    // Reset quiz state
    currentQuizQuestion = 0;
    quizScore = 0;
}

function createGenie() {
    // Create genie mesh (floating sphere + cylinder)
    genie = new THREE.Group();
    const genieBody = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 24, 16),
        new THREE.MeshLambertMaterial({color: 0x66e0ff})
    );
    genieBody.position.y = 1.2;
    genie.add(genieBody);

    const genieBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.4, 0.7, 16),
        new THREE.MeshLambertMaterial({color: 0x222266})
    );
    genieBase.position.y = 0.35;
    genie.add(genieBase);

    // Eyes (robotic)
    const eyeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16);
    const eyeMat = new THREE.MeshLambertMaterial({color: 0xffffff});
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.18, 1.35, 0.56);
    eyeL.rotation.x = Math.PI/2;
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.18;
    genie.add(eyeL, eyeR);

    // Position genie in the world
    genie.position.set(-3, 0, -10);
    scene.add(genie);
}

// Update paper dialogue position
function updatePaperDialogue() {
  const paperDialogue = document.getElementById('paper-dialogue');
  if (!paperDialogue || !paper) return;

  // Project paper position to screen coordinates
  const vector = paper.position.clone();
  vector.y += 2.5; // Position dialogue higher above the paper
  vector.project(camera);

  // Convert to screen coordinates
  const x = (vector.x + 1) * window.innerWidth / 2;
  const y = -(vector.y - 1) * window.innerHeight / 2;

  // Update position
  paperDialogue.style.transform = `translate(${x}px, ${y}px)`;

  // Check if paper is in front of the camera
  const isFacing = paper.position.clone().sub(camera.position).normalize().dot(camera.getWorldDirection(new THREE.Vector3())) > 0;
  
  // Check distance to paper (using same radius as pickup interaction)
  const dx = avatar.position.x - paper.position.x;
  const dy = avatar.position.y - paper.position.y;
  const dz = avatar.position.z - paper.position.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const isNearby = distance < 3; // Same radius as pickup interaction

  // Show/hide dialogue based on visibility and distance
  paperDialogue.style.display = (isFacing && isNearby && !hasPickedUpPaper) ? 'block' : 'none';
}

// Add event listener for picking up the basketball
window.addEventListener('click', function(event) {
    if (!basketballActive || !basketballBall) return;

    // Raycaster to detect clicks on the ball
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Convert mouse position to normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(basketballBall);
    if (intersects.length > 0) {
        // Reset ball position to player's hand or starting point
        basketballBall.position.set(0, 1.2, -6.5);
        basketballBall.userData.velocity.set(0, 0, 0);
    }
});


