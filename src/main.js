import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";

const app = document.getElementById("app");
const loadingScreen = document.getElementById("loading-screen");
const transitionScreen = document.getElementById("transition-screen");
const roomBanner = document.getElementById("room-banner");
const tooltip = document.getElementById("tooltip");

const loadingStartedAt = performance.now();
const minLoadingMs = 1200;

const scene = new THREE.Scene();
const clock = new THREE.Clock();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xfffafc, 1);
app.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 2.6, 10.2);
camera.lookAt(0, 1.7, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.7, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.03;
controls.rotateSpeed = 0.45;
controls.zoomSpeed = 0.5;
controls.panSpeed = 0.24;
controls.minDistance = 7.6;
controls.maxDistance = 11.2;
controls.minAzimuthAngle = -0.35;
controls.maxAzimuthAngle = 0.35;
controls.minPolarAngle = 0.95;
controls.maxPolarAngle = 1.4;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.addEventListener("change", () => {
  const limits = activeCameraProfile.clampTarget;
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, limits.xMin, limits.xMax);
  controls.target.y = THREE.MathUtils.clamp(controls.target.y, limits.yMin, limits.yMax);
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, limits.zMin, limits.zMax);
  if (activeRoomKey === "pink") {
    camera.position.z = Math.max(camera.position.z, activeCameraProfile.minCameraZ);
  }
});

const roomWidth = 10;
const roomHeight = 5;
const roomDepth = 8;
const doorWidth = 1.35;
const doorHeight = 2.6;
const outlineMaterials = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const zeroVelocity = new THREE.Vector2(0, 0);
const pinkFloorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pinkFloorPlaneHit = new THREE.Vector3();

const heartGeometry = new THREE.ExtrudeGeometry(createHeartShape(), {
  depth: 0.18,
  bevelEnabled: false,
  steps: 1
});
heartGeometry.translate(0, 0, -0.09);
const hearts = [];
const floorPulses = [];
const floorTapState = {
  lastAt: 0,
  point: new THREE.Vector3()
};

const walkSfxPaths = [
  "assets/audio/sfx/walk_hop_1.wav",
  "assets/audio/sfx/walk_hop_2.wav"
];
const petSfxPaths = [
  "assets/audio/sfx/pet_soft_1.wav",
  "assets/audio/sfx/pet_soft_2.wav"
];

let activeRoomKey = "pink";
let activeRoom = null;
let hoveredDoor = null;
let isTransitioning = false;
let audioUnlocked = false;
let loadingScreenHidden = false;

const roomNames = {
  pink: "Oyachi's Room",
  brown: "Closet"
};

const oyachi = {
  sprite: null,
  shadow: null,
  shadowMaterial: null,
  textures: null,
  baseHeight: 0.08,
  squash: 0,
  stretch: 0,
  scaleY: 1,
  targetX: 0,
  targetZ: 0,
  holdUntil: 0,
  nextActionAt: 0,
  nextStepAt: 0,
  walkSpeed: 0.62,
  velocity: new THREE.Vector2(),
  moving: false,
  phase: "idle"
};

const cameraProfiles = {
  pink: {
    position: new THREE.Vector3(0, 2.6, 10.2),
    target: new THREE.Vector3(0, 1.7, 0),
    minDistance: 7.6,
    maxDistance: 11.2,
    minAzimuthAngle: -0.35,
    maxAzimuthAngle: 0.35,
    minPolarAngle: 0.95,
    maxPolarAngle: 1.4,
    enableRotate: true,
    enablePan: true,
    enableZoom: true,
    clampTarget: {
      xMin: -1.2,
      xMax: 1.2,
      yMin: 1.1,
      yMax: 2.3,
      zMin: -1.2,
      zMax: 1.2
    },
    minCameraZ: 6.8
  },
  brown: {
    position: new THREE.Vector3(1.78, 1.82, 3.08),
    target: new THREE.Vector3(0.22, 1.34, 0.35),
    minDistance: 2.85,
    maxDistance: 6.4,
    minAzimuthAngle: -1.35,
    maxAzimuthAngle: 0.92,
    minPolarAngle: 0.88,
    maxPolarAngle: 1.48,
    enableRotate: true,
    enablePan: false,
    enableZoom: true,
    clampTarget: {
      xMin: -2.4,
      xMax: 1.2,
      yMin: 1.35,
      yMax: 2.05,
      zMin: -0.55,
      zMax: 1.15
    },
    minCameraZ: 2.85
  }
};

let activeCameraProfile = cameraProfiles.pink;
let cameraTween = null;

function createHeartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.35);
  s.bezierCurveTo(0, 0.65, -0.45, 0.75, -0.55, 0.4);
  s.bezierCurveTo(-0.62, 0.12, -0.42, -0.14, 0, -0.45);
  s.bezierCurveTo(0.42, -0.14, 0.62, 0.12, 0.55, 0.4);
  s.bezierCurveTo(0.45, 0.75, 0, 0.65, 0, 0.35);
  return s;
}

function randomOf(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function tryUnlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
}

function playSfx(paths, volume = 0.28) {
  if (!audioUnlocked) return;
  const audio = new Audio(randomOf(paths));
  audio.volume = volume;
  audio.play().catch(() => {});
}

function showRoomBanner(text) {
  roomBanner.textContent = text;
  roomBanner.classList.remove("show");
  void roomBanner.offsetWidth;
  roomBanner.classList.add("show");
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function startCameraTween(profile, duration = 0.42) {
  controls.enabled = false;
  cameraTween = {
    fromPos: camera.position.clone(),
    fromTarget: controls.target.clone(),
    toPos: profile.position.clone(),
    toTarget: profile.target.clone(),
    duration,
    elapsed: 0
  };
}

function updateCameraTween(delta) {
  if (!cameraTween) return;
  cameraTween.elapsed += delta;
  const t = THREE.MathUtils.clamp(cameraTween.elapsed / cameraTween.duration, 0, 1);
  const eased = easeInOutCubic(t);

  camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, eased);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);

  if (t >= 1) {
    cameraTween = null;
    controls.enabled = true;
  }
}

function applyCameraProfile(key, immediate = false, tween = false) {
  activeCameraProfile = cameraProfiles[key];
  controls.enableRotate = activeCameraProfile.enableRotate;
  controls.enablePan = activeCameraProfile.enablePan;
  controls.enableZoom = activeCameraProfile.enableZoom;
  controls.minDistance = activeCameraProfile.minDistance;
  controls.maxDistance = activeCameraProfile.maxDistance;
  controls.minAzimuthAngle = activeCameraProfile.minAzimuthAngle;
  controls.maxAzimuthAngle = activeCameraProfile.maxAzimuthAngle;
  controls.minPolarAngle = activeCameraProfile.minPolarAngle;
  controls.maxPolarAngle = activeCameraProfile.maxPolarAngle;

  if (immediate) {
    camera.position.copy(activeCameraProfile.position);
    controls.target.copy(activeCameraProfile.target);
    controls.update();
    cameraTween = null;
  } else if (tween) {
    startCameraTween(activeCameraProfile);
  }
}

function createDoor({ side, z, label, color }) {
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(doorWidth, doorHeight),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
  );
  door.position.y = 1.3;
  door.position.z = z;

  if (side === "right") {
    door.rotation.y = -Math.PI / 2;
    door.position.x = roomWidth / 2 - 0.005;
  } else {
    door.rotation.y = Math.PI / 2;
    door.position.x = -roomWidth / 2 + 0.005;
  }

  const halfW = doorWidth / 2;
  const halfH = doorHeight / 2;
  const outlineGeometry = new LineGeometry();
  outlineGeometry.setPositions([
    -halfW, -halfH, 0,
    halfW, -halfH, 0,
    halfW, halfH, 0,
    -halfW, halfH, 0,
    -halfW, -halfH, 0
  ]);

  const outlineMaterial = new LineMaterial({
    color: 0xffffff,
    linewidth: 5,
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight)
  });
  outlineMaterials.push(outlineMaterial);

  const outline = new Line2(outlineGeometry, outlineMaterial);
  outline.position.copy(door.position);
  outline.rotation.copy(door.rotation);
  outline.computeLineDistances();
  outline.visible = false;

  door.userData.label = label;
  door.userData.outline = outline;
  return { door, outline };
}

function createRoom({ wallColor, floorColor, withCarpet, doorSide, doorLabel }) {
  const room = new THREE.Group();

  const wallMaterial = new THREE.MeshBasicMaterial({
    color: wallColor,
    side: THREE.DoubleSide
  });

  const floorMaterial = new THREE.MeshBasicMaterial({
    color: floorColor,
    side: THREE.DoubleSide
  });

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    floorMaterial
  );
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);

  if (withCarpet) {
    const carpet = new THREE.Mesh(
      new THREE.CircleGeometry(1.45, 48),
      new THREE.MeshBasicMaterial({ color: 0xe9a9c3, side: THREE.DoubleSide })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.002, 0.35);
    room.add(carpet);
  }

  const backWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomHeight),
    wallMaterial
  );
  backWall.position.set(0, roomHeight / 2, -roomDepth / 2);
  room.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomDepth, roomHeight),
    wallMaterial
  );
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
  room.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomDepth, roomHeight),
    wallMaterial
  );
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
  room.add(rightWall);

  const doorPack = createDoor({
    side: doorSide,
    z: 0.75,
    label: doorLabel,
    color: 0x3a2b30
  });
  room.add(doorPack.door);
  room.add(doorPack.outline);

  return {
    room,
    doors: [doorPack.door],
    floors: [floor]
  };
}

function createFurniturePart(width, height, depth, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshBasicMaterial({ color })
  );
  mesh.position.set(x, y, z);
  return mesh;
}

function createPinkFurniture(kind) {
  const group = new THREE.Group();
  const c = {
    base: 0xe9a3c5,
    dark: 0xd884aa,
    light: 0xf7cde0,
    accent: 0xf3b7d2,
    leaf: 0xe6a8c4
  };

  if (kind === "bed") {
    group.add(createFurniturePart(2.16, 0.24, 1.2, c.dark, 0, 0.12, 0));
    group.add(createFurniturePart(2.04, 0.14, 1.08, c.base, 0, 0.3, 0));
    group.add(createFurniturePart(1.98, 0.18, 1.02, c.light, 0, 0.46, 0));
    group.add(createFurniturePart(0.22, 0.94, 1.2, c.dark, -0.97, 0.47, 0));
    const pillowA = createFurniturePart(0.7, 0.12, 0.3, 0xffffff, -0.53, 0.57, -0.26);
    pillowA.scale.set(0.7, 0.95, 1.52);
    const pillowB = createFurniturePart(0.7, 0.12, 0.3, 0xffffff, -0.53, 0.57, 0.24);
    pillowB.scale.set(0.7, 0.95, 1.52);
    group.add(pillowA);
    group.add(pillowB);
  } else if (kind === "table") {
    group.add(createFurniturePart(1.12, 0.12, 0.68, c.base, 0, 0.62, 0));
    group.add(createFurniturePart(0.12, 0.58, 0.12, c.dark, 0.45, 0.29, 0.24));
    group.add(createFurniturePart(0.12, 0.58, 0.12, c.dark, -0.45, 0.29, 0.24));
    group.add(createFurniturePart(0.12, 0.58, 0.12, c.dark, 0.45, 0.29, -0.24));
    group.add(createFurniturePart(0.12, 0.58, 0.12, c.dark, -0.45, 0.29, -0.24));
  } else if (kind === "dresser") {
    group.add(createFurniturePart(1.08, 1.02, 0.56, c.base, 0, 0.51, 0));
    group.add(createFurniturePart(0.95, 0.24, 0.6, c.light, 0, 0.23, 0.03));
    group.add(createFurniturePart(0.95, 0.24, 0.6, c.light, 0, 0.51, 0.03));
    group.add(createFurniturePart(0.95, 0.24, 0.6, c.light, 0, 0.79, 0.03));
    group.add(createFurniturePart(1.14, 0.08, 0.6, c.dark, 0, 1.02, 0));
  } else if (kind === "plant") {
    group.add(createFurniturePart(0.44, 0.34, 0.44, c.accent, 0, 0.17, 0));
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.66, 7),
      new THREE.MeshBasicMaterial({ color: c.leaf })
    );
    leaf.position.set(0, 0.66, 0);
    group.add(leaf);
  } else {
    group.add(createFurniturePart(0.5, 0.14, 0.5, c.base, 0, 0.46, 0));
    group.add(createFurniturePart(0.18, 0.46, 0.18, c.dark, 0, 0.23, 0));
  }

  group.userData.kind = kind;
  group.userData.type = "pink-furniture";
  return group;
}

function addPinkFurniturePlacement(kind, x, z, rotationY, scale) {
  const object = createPinkFurniture(kind);
  object.position.set(x, 0, z);
  object.rotation.y = rotationY;
  object.scale.setScalar(scale);
  pinkRoom.room.add(object);
}

function seedPinkRoomFurniture() {
  addPinkFurniturePlacement("bed", -2.795, -1.929, 5.6025, 1.02);
  addPinkFurniturePlacement("dresser", 2.405, -1.613, 5.4454, 1.48);
  addPinkFurniturePlacement("table", 3.293, 2.552, 0.6807, 1.45);
}

function addClosetBoxes(room) {
  const boxColors = [0xb78f66, 0xa9805c, 0xc49b74, 0x9f7755];
  const boxSpecs = [
    { size: [0.95, 0.58, 0.72], pos: [-2.65, -2.75], rot: 0.02 },
    { size: [0.82, 0.46, 0.66], pos: [-1.78, -2.62], rot: -0.08 },
    { size: [0.72, 0.4, 0.56], pos: [2.58, -2.18], rot: -0.04 },
    { size: [0.9, 0.54, 0.68], pos: [2.24, -1.42], rot: 0.06 },
    { size: [0.68, 0.36, 0.58], pos: [-2.82, -1.2], rot: 0.12 }
  ];

  boxSpecs.forEach((spec, index) => {
    const material = new THREE.MeshBasicMaterial({ color: boxColors[index % boxColors.length] });
    const geometry = new THREE.BoxGeometry(spec.size[0], spec.size[1], spec.size[2]);
    const box = new THREE.Mesh(geometry, material);
    box.position.set(spec.pos[0], spec.size[1] * 0.5 + 0.002, spec.pos[1]);
    box.rotation.y = spec.rot;
    room.add(box);
  });
}

const pinkRoom = createRoom({
  wallColor: 0xf4e1ea,
  floorColor: 0xfac7dd,
  withCarpet: true,
  doorSide: "right",
  doorLabel: "Closet"
});

const brownRoom = createRoom({
  wallColor: 0xf2dfcf,
  floorColor: 0xe6c9a8,
  withCarpet: false,
  doorSide: "left",
  doorLabel: "Oyachi's Room"
});

addClosetBoxes(brownRoom.room);
seedPinkRoomFurniture();

brownRoom.room.visible = false;
scene.add(pinkRoom.room);
scene.add(brownRoom.room);

const rooms = {
  pink: pinkRoom,
  brown: brownRoom
};

activeRoom = rooms[activeRoomKey];

function setRoom(key, { immediateCamera = false } = {}) {
  activeRoomKey = key;
  activeRoom = rooms[activeRoomKey];
  rooms.pink.room.visible = key === "pink";
  rooms.brown.room.visible = key === "brown";
  applyCameraProfile(key, immediateCamera, !immediateCamera);
  if (hoveredDoor) {
    hoveredDoor.userData.outline.visible = false;
  }
  hoveredDoor = null;
  tooltip.classList.remove("visible");

  if (oyachi.sprite) {
    if (key === "brown") {
      oyachi.sprite.position.x = -0.95;
      oyachi.sprite.position.z = 0.35;
      oyachi.sprite.material.color.setHex(0xf7efe8);
      oyachi.targetX = -0.95;
      oyachi.targetZ = 0.35;
      oyachi.phase = "idle";
      oyachi.velocity.set(0, 0);
      oyachi.nextActionAt = performance.now() + 1200;
    } else {
      oyachi.sprite.material.color.setHex(0xffffff);
      oyachi.nextActionAt = performance.now() + 600;
    }
  }

}

function transitionToRoom(key) {
  if (isTransitioning || key === activeRoomKey) return;
  isTransitioning = true;
  transitionScreen.classList.add("active");
  window.setTimeout(() => {
    setRoom(key);
    showRoomBanner(roomNames[key]);
    window.setTimeout(() => {
      transitionScreen.classList.remove("active");
      isTransitioning = false;
    }, 220);
  }, 220);
}

function updatePointer(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function clearDoorHover() {
  if (hoveredDoor) {
    hoveredDoor.userData.outline.visible = false;
  }
  hoveredDoor = null;
  tooltip.classList.remove("visible");
}

function chooseOyachiTarget(now = performance.now()) {
  if (activeRoomKey === "brown") {
    oyachi.targetX = THREE.MathUtils.randFloat(-0.55, 0.55);
    oyachi.targetZ = THREE.MathUtils.randFloat(0.05, 0.85);
  } else {
    oyachi.targetX = THREE.MathUtils.randFloat(-roomWidth / 2 + 1.25, roomWidth / 2 - 1.25);
    oyachi.targetZ = THREE.MathUtils.randFloat(-roomDepth / 2 + 1.05, roomDepth / 2 - 1.05);
  }
  oyachi.phase = "moving";
  oyachi.nextActionAt = now + 1800 + Math.random() * 2200;
}

function commandOyachiTo(x, z, now = performance.now()) {
  if (!oyachi.sprite || activeRoomKey === "brown") return;
  const marginX = 1.25;
  const marginZ = 1.05;
  oyachi.targetX = THREE.MathUtils.clamp(x, -roomWidth / 2 + marginX, roomWidth / 2 - marginX);
  oyachi.targetZ = THREE.MathUtils.clamp(z, -roomDepth / 2 + marginZ, roomDepth / 2 - marginZ);
  oyachi.phase = "moving";
  oyachi.nextActionAt = now + 1600;
}

function spawnFloorPulse(point) {
  const pulse = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.13, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  pulse.rotation.x = -Math.PI / 2;
  pulse.position.set(point.x, 0.018, point.z);
  pulse.scale.setScalar(0.55);
  scene.add(pulse);
  floorPulses.push({ mesh: pulse, age: 0, life: 0.55 });
}

function spawnFloorPulsePair(point) {
  spawnFloorPulse(point);
  const followPoint = point.clone();
  window.setTimeout(() => {
    spawnFloorPulse(followPoint);
  }, 180);
}

function spawnHearts(origin) {
  const topY = oyachi.sprite
    ? oyachi.sprite.position.y + oyachi.sprite.scale.y * 0.92
    : origin.y + 1.2;

  for (let i = 0; i < 4; i += 1) {
    const mat = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0xf6a6c9 : 0xffffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(heartGeometry, mat);
    const angle = (i / 4) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
    const radius = 0.26 + Math.random() * 0.16;
    mesh.position.copy(origin);
    mesh.position.x += Math.cos(angle) * radius;
    mesh.position.y = topY + Math.random() * 0.18;
    mesh.position.z += Math.sin(angle) * radius * 0.85;
    mesh.scale.set(0.03, 0.2, 0.03);
    mesh.rotation.set(Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.35);
    scene.add(mesh);
    hearts.push({
      mesh,
      life: 1,
      age: 0,
      startScale: 0.2 + Math.random() * 0.06,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.25,
        0.65 + Math.random() * 0.45,
        (Math.random() - 0.5) * 0.15
      )
    });
  }
}

function petOyachi() {
  const now = performance.now();
  oyachi.holdUntil = now + 540;
  oyachi.squash = 0.22;
  oyachi.stretch = 0.07;
  oyachi.sprite.material.map = oyachi.textures.pet;
  oyachi.sprite.material.needsUpdate = true;
  playSfx(petSfxPaths, 0.28);
  spawnHearts(oyachi.sprite.position);
}

function updateHearts(delta) {
  for (let i = hearts.length - 1; i >= 0; i -= 1) {
    const heart = hearts[i];
    heart.age += delta;
    heart.life -= delta * 0.9;
    if (heart.life <= 0) {
      scene.remove(heart.mesh);
      heart.mesh.material.dispose();
      hearts.splice(i, 1);
      continue;
    }

    const popT = THREE.MathUtils.clamp(heart.age / 0.22, 0, 1);
    const pop = Math.sin(popT * Math.PI * 0.5);
    const scale = heart.startScale * (0.65 + pop * 0.9);
    const squashY = 0.65 + pop * 0.55;
    heart.mesh.scale.set(scale * 0.9, scale * squashY, scale * 0.9);

    heart.mesh.position.addScaledVector(heart.velocity, delta);
    heart.mesh.rotation.y += delta * 1.1;
    heart.mesh.rotation.x += delta * 0.35;
    heart.mesh.material.opacity = heart.life;
  }
}

function updateFloorPulses(delta) {
  for (let i = floorPulses.length - 1; i >= 0; i -= 1) {
    const pulse = floorPulses[i];
    pulse.age += delta;
    const t = THREE.MathUtils.clamp(pulse.age / pulse.life, 0, 1);
    if (t >= 1) {
      scene.remove(pulse.mesh);
      pulse.mesh.geometry.dispose();
      pulse.mesh.material.dispose();
      floorPulses.splice(i, 1);
      continue;
    }

    const scale = 0.55 + t * 1.85;
    pulse.mesh.scale.setScalar(scale);
    pulse.mesh.material.opacity = 0.95 * (1 - t);
  }
}

function updateOyachi(delta) {
  if (!oyachi.sprite) return;
  const now = performance.now();

  if (activeRoomKey === "brown") {
    oyachi.phase = "idle";
    oyachi.targetX = -0.95;
    oyachi.targetZ = 0.35;
    oyachi.sprite.position.x += (oyachi.targetX - oyachi.sprite.position.x) * 0.18;
    oyachi.sprite.position.z += (oyachi.targetZ - oyachi.sprite.position.z) * 0.18;
    oyachi.velocity.set(0, 0);
  }

  if (now > oyachi.holdUntil) {
    oyachi.sprite.material.map = oyachi.textures.idle;
    oyachi.sprite.material.needsUpdate = true;
  }

  if (activeRoomKey !== "brown" && oyachi.phase === "idle" && now >= oyachi.nextActionAt) {
    if (Math.random() < 0.28) {
      oyachi.nextActionAt = now + 850 + Math.random() * 1650;
    } else {
      chooseOyachiTarget(now);
    }
  }

  const toTarget = new THREE.Vector2(
    oyachi.targetX - oyachi.sprite.position.x,
    oyachi.targetZ - oyachi.sprite.position.z
  );
  const distance = toTarget.length();

  oyachi.moving = activeRoomKey !== "brown" && oyachi.phase === "moving" && distance > 0.03;
  if (oyachi.moving) {
    toTarget.normalize();
    const desiredVelocity = toTarget.multiplyScalar(oyachi.walkSpeed);
    const accel = 1 - Math.exp(-delta * 7.4);
    oyachi.velocity.lerp(desiredVelocity, accel);

    oyachi.sprite.position.x += oyachi.velocity.x * delta;
    oyachi.sprite.position.z += oyachi.velocity.y * delta;
    oyachi.sprite.center.x = oyachi.velocity.x < 0 ? 0.42 : 0.58;

    if (now >= oyachi.nextStepAt && oyachi.velocity.lengthSq() > 0.08) {
      playSfx(walkSfxPaths, 0.15);
      oyachi.nextStepAt = now + 430 + Math.random() * 160;
    }

    if (distance < 0.09 && oyachi.velocity.length() < 0.14) {
      oyachi.phase = "idle";
      oyachi.nextActionAt = now + 1100 + Math.random() * 2400;
    }
  } else {
    const drag = 1 - Math.exp(-delta * 10.5);
    oyachi.velocity.lerp(zeroVelocity, drag);
    oyachi.sprite.position.x += oyachi.velocity.x * delta;
    oyachi.sprite.position.z += oyachi.velocity.y * delta;
  }

  const walkPulse = oyachi.moving
    ? Math.max(0, Math.sin(now * 0.01)) * 0.055
    : 0;
  const idleBreath = oyachi.moving ? 0 : Math.sin(now * 0.0037) * 0.012;
  oyachi.sprite.position.y = oyachi.baseHeight + walkPulse + idleBreath;

  if (oyachi.shadow && oyachi.shadowMaterial) {
    const speedT = THREE.MathUtils.clamp(oyachi.velocity.length() / oyachi.walkSpeed, 0, 1);
    const stretch = walkPulse * 3.2 + speedT * 0.12;
    oyachi.shadow.position.set(oyachi.sprite.position.x, 0.014, oyachi.sprite.position.z + 0.02);
    oyachi.shadow.scale.set(1.04 + stretch, 0.8 + stretch * 0.62, 1);
    oyachi.shadowMaterial.opacity = THREE.MathUtils.clamp(
      0.35 - walkPulse * 1.45 + speedT * 0.03,
      0.22,
      0.4
    );
  }

  oyachi.squash += (0 - oyachi.squash) * 0.08;
  oyachi.stretch += (0 - oyachi.stretch) * 0.065;

  const baseScale = 1.02;
  oyachi.scaleY += ((oyachi.moving ? 0.985 : 1) - oyachi.scaleY) * 0.12;
  const breathScaleY = 1 + idleBreath * 2.8;
  const breathScaleX = 1 - idleBreath * 1.25;

  const squishX = 1 + oyachi.squash + oyachi.stretch * 0.5;
  const squishY = 1 - oyachi.squash + oyachi.stretch;
  oyachi.sprite.scale.set(
    baseScale * squishX * breathScaleX,
    baseScale * oyachi.textures.aspect * oyachi.scaleY * squishY * breathScaleY,
    1
  );
  oyachi.sprite.lookAt(camera.position);
}

async function loadOyachi() {
  const loader = new THREE.TextureLoader();
  const idle = await loader.loadAsync("assets/sprites/oyachi/idle-neutral.png");
  const pet = await loader.loadAsync("assets/sprites/oyachi/pet-squish.png");

  [idle, pet].forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
  });

  const aspect = idle.image.height / idle.image.width;
  const material = new THREE.SpriteMaterial({ map: idle, transparent: true });
  material.depthWrite = false;
  material.alphaTest = 0.05;
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.position.set(0, oyachi.baseHeight, 0.8);
  sprite.scale.set(1.05, 1.05 * aspect, 1);
  sprite.userData.type = "oyachi";

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x382932,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(sprite.position.x, 0.014, sprite.position.z + 0.02);
  shadow.scale.set(1, 0.82, 1);
  shadow.renderOrder = 1;
  sprite.renderOrder = 2;

  scene.add(shadow);
  scene.add(sprite);

  oyachi.sprite = sprite;
  oyachi.shadow = shadow;
  oyachi.shadowMaterial = shadowMaterial;
  oyachi.textures = { idle, pet, aspect };
  oyachi.phase = "idle";
  oyachi.nextActionAt = performance.now() + 900;
  oyachi.targetX = sprite.position.x;
  oyachi.targetZ = sprite.position.z;
}

function onPointerMove(event) {
  if (isTransitioning) return;

  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(activeRoom.doors, false);
  const hitDoor = hits.length ? hits[0].object : null;

  if (hoveredDoor && hoveredDoor !== hitDoor) {
    hoveredDoor.userData.outline.visible = false;
  }

  hoveredDoor = hitDoor;
  if (hoveredDoor) {
    hoveredDoor.userData.outline.visible = true;
    tooltip.textContent = hoveredDoor.userData.label;
    tooltip.classList.add("visible");
  } else {
    tooltip.classList.remove("visible");
  }
}

function onPointerLeave() {
  clearDoorHover();
}

function onPointerDown(event) {
  tryUnlockAudio();
  if (isTransitioning) return;
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);

  const doorHits = raycaster.intersectObjects(activeRoom.doors, false);
  if (doorHits.length) {
    if (activeRoomKey === "pink") {
      transitionToRoom("brown");
    } else {
      transitionToRoom("pink");
    }
    return;
  }

  if (oyachi.sprite) {
    const oyachiHit = raycaster.intersectObject(oyachi.sprite, false);
    if (oyachiHit.length) {
      petOyachi();
      return;
    }
  }

  const floorHits = raycaster.intersectObjects(activeRoom.floors, false);
  let hitPoint = null;
  if (floorHits.length) {
    hitPoint = floorHits[0].point;
  } else if (activeRoomKey === "pink" && raycaster.ray.intersectPlane(pinkFloorPlane, pinkFloorPlaneHit)) {
    hitPoint = pinkFloorPlaneHit;
  }

  if (hitPoint && activeRoomKey === "pink") {
    const now = performance.now();
    const tapDelay = now - floorTapState.lastAt;
    const tapDistance = floorTapState.point.distanceTo(hitPoint);

    if (tapDelay <= 300 && tapDistance <= 0.9) {
      spawnFloorPulsePair(hitPoint);
      commandOyachiTo(hitPoint.x, hitPoint.z, now);
      floorTapState.lastAt = 0;
      return;
    }

    floorTapState.lastAt = now;
    floorTapState.point.copy(hitPoint);
  }
}

renderer.domElement.addEventListener("pointermove", onPointerMove);
renderer.domElement.addEventListener("pointerleave", onPointerLeave);
renderer.domElement.addEventListener("pointerdown", onPointerDown);

function hideLoadingScreen() {
  if (loadingScreenHidden) return;
  loadingScreenHidden = true;

  const elapsed = performance.now() - loadingStartedAt;
  const waitMs = Math.max(0, minLoadingMs - elapsed);
  window.setTimeout(() => {
    loadingScreen.classList.add("hidden");
    window.setTimeout(() => loadingScreen.remove(), 280);
  }, waitMs);
  window.setTimeout(() => {
    showRoomBanner(roomNames[activeRoomKey]);
  }, waitMs + 120);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  for (const material of outlineMaterials) {
    material.resolution.set(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener("resize", onResize);

async function boot() {
  await loadOyachi();
  applyCameraProfile("pink", true);
  hideLoadingScreen();
}

boot().catch((error) => {
  console.error("Failed to initialize scene assets.", error);
  hideLoadingScreen();
});

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(0.05, clock.getDelta());
  updateCameraTween(delta);
  controls.update();
  updateOyachi(delta);
  updateHearts(delta);
  updateFloorPulses(delta);
  renderer.render(scene, camera);
}

animate();
