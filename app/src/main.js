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
const costumesMenu = document.getElementById("costumes-menu");
const costumesMenuToggle = document.getElementById("costumes-menu-toggle");

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
const gardenWidth = 16;
const gardenDepth = 12;
const doorWidth = 1.35;
const doorHeight = 2.6;
const outlineMaterials = [];

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
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
const gardenPetals = [];
const flowerStemGeometry = new THREE.CylinderGeometry(0.014, 0.014, 1, 6);
const flowerBloomGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 8);
const flowerCenterGeometry = new THREE.CylinderGeometry(0.024, 0.024, 0.024, 7);
const oyachiMoveDirection = new THREE.Vector2();
const oyachiInstantVelocity = new THREE.Vector2();
const floorTapState = {
  lastAt: 0,
  point: new THREE.Vector3()
};

const runtimeAssetBase = window.location.protocol === "views:" ? "assets://" : "../../assets/";
const assetPath = (path) => `${runtimeAssetBase}${path}`;

const walkSfxPaths = [
  assetPath("audio/sfx/walk_hop_1.wav"),
  assetPath("audio/sfx/walk_hop_2.wav")
];
const petSfxPaths = [
  assetPath("audio/sfx/pet_soft_1.wav"),
  assetPath("audio/sfx/pet_soft_2.wav")
];

let activeRoomKey = "pink";
let activeRoom = null;
let hoveredDoor = null;
let isTransitioning = false;
let audioUnlocked = false;
let loadingScreenHidden = false;
let costumesMenuMinimized = false;

const roomNames = {
  pink: "Oyachi's Room",
  brown: "Closet",
  garden: "Garden"
};

const pinkBlockers = [
  { x: 2.405, z: -1.613, radius: 1.02 },
  { x: 3.293, z: 2.552, radius: 0.95 }
];

const bedZone = {
  x: -2.795,
  z: -1.929,
  rotationY: 5.6025,
  halfX: 1.03,
  halfZ: 0.58,
  liftY: 0.44
};

const oyachi = {
  sprite: null,
  shadow: null,
  shadowMaterial: null,
  textures: null,
  facing: 1,
  tilt: 0,
  bedLift: 0,
  baseHeight: 0.08,
  squash: 0,
  stretch: 0,
  scaleY: 1,
  targetX: 0,
  targetZ: 0,
  holdUntil: 0,
  nextActionAt: 0,
  nextStepAt: 0,
  hopState: "idle",
  hopTimer: 0,
  hopDuration: 0.12,
  hopFrom: new THREE.Vector2(),
  hopTo: new THREE.Vector2(),
  hopLift: 0,
  hopLean: 0,
  hopLand: 0,
  hopMin: 0.13,
  hopMax: 0.26,
  walkSpeedMin: 0.59,
  walkSpeedMax: 0.76,
  walkSpeed: 0.67,
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
  },
  garden: {
    position: new THREE.Vector3(9.8, 2.9, 0.55),
    target: new THREE.Vector3(0.15, 1.15, 0.2),
    minDistance: 7.8,
    maxDistance: 14.2,
    minAzimuthAngle: 0.95,
    maxAzimuthAngle: 2.05,
    minPolarAngle: 0.9,
    maxPolarAngle: 1.38,
    enableRotate: true,
    enablePan: false,
    enableZoom: true,
    clampTarget: {
      xMin: -4.6,
      xMax: 4.6,
      yMin: 0.85,
      yMax: 1.85,
      zMin: -4.2,
      zMax: 4.4
    },
    minCameraZ: -999
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

function createDoor({
  side,
  z,
  x = 0,
  label,
  toRoom,
  color,
  roomWidthRef = roomWidth,
  roomDepthRef = roomDepth
}) {
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(doorWidth, doorHeight),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
  );
  door.position.set(x, 1.3, z);

  if (side === "right") {
    door.rotation.y = -Math.PI / 2;
    door.position.x = roomWidthRef / 2 - 0.005;
  } else if (side === "left") {
    door.rotation.y = Math.PI / 2;
    door.position.x = -roomWidthRef / 2 + 0.005;
  } else if (side === "back") {
    door.rotation.y = 0;
    door.position.z = -roomDepthRef / 2 + 0.005;
  } else if (side === "front") {
    door.rotation.y = Math.PI;
    door.position.z = roomDepthRef / 2 - 0.005;
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
  door.userData.toRoom = toRoom;
  door.userData.outline = outline;
  return { door, outline };
}

function createRoom({ wallColor, floorColor, withCarpet, doors }) {
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

  const doorObjects = [];
  for (const doorConfig of doors) {
    const doorPack = createDoor({
      color: 0x3a2b30,
      ...doorConfig
    });
    room.add(doorPack.door);
    room.add(doorPack.outline);
    doorObjects.push(doorPack.door);
  }

  return {
    room,
    doors: doorObjects,
    floors: [floor]
  };
}

function createSimpleFlower(petalColor, centerColor) {
  const group = new THREE.Group();
  const stemHeight = THREE.MathUtils.randFloat(0.2, 0.34);

  const stem = new THREE.Mesh(
    flowerStemGeometry,
    new THREE.MeshBasicMaterial({ color: 0x75b84d })
  );
  stem.scale.y = stemHeight;
  stem.position.y = stemHeight * 0.5;
  group.add(stem);

  const bloomBase = new THREE.Mesh(
    flowerBloomGeometry,
    new THREE.MeshBasicMaterial({ color: petalColor })
  );
  bloomBase.position.y = stemHeight + 0.01;
  group.add(bloomBase);

  const center = new THREE.Mesh(
    flowerCenterGeometry,
    new THREE.MeshBasicMaterial({ color: centerColor })
  );
  center.position.y = stemHeight + 0.024;
  group.add(center);

  return group;
}

function plantFlowerPatch(room, centerX, centerZ, radius, count) {
  const petalPalette = [0xff8fba, 0xfff1a6, 0xc6ecff, 0xffcaa4, 0xe2beff, 0xffb9d4, 0xffa7c5];
  const centerPalette = [0xffe66f, 0xffd15f, 0xfff0b8];

  for (let i = 0; i < count; i += 1) {
    let placed = false;

    for (let attempt = 0; attempt < 10 && !placed; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const spread = Math.sqrt(Math.random()) * radius;
      const x = centerX + Math.cos(angle) * spread;
      const z = centerZ + Math.sin(angle) * spread;

      const onSteppingPath = x > -0.95 && x < 0.95 && z > -1.45 && z < 4.95;
      if (onSteppingPath) continue;

      const flower = createSimpleFlower(randomOf(petalPalette), randomOf(centerPalette));
      flower.position.set(x, 0.003, z);
      flower.rotation.y = Math.random() * Math.PI * 2;
      flower.scale.setScalar(THREE.MathUtils.randFloat(0.78, 1.22));
      room.add(flower);
      placed = true;
    }
  }
}

function seedGardenPetals(room) {
  while (gardenPetals.length) {
    const petal = gardenPetals.pop();
    room.remove(petal.mesh);
    petal.mesh.geometry.dispose();
    petal.mesh.material.dispose();
  }

  const petalColors = [0xffe2ef, 0xffd4ec, 0xfff4d8, 0xe4f5ff];
  for (let i = 0; i < 56; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(THREE.MathUtils.randFloat(0.03, 0.06), 7),
      new THREE.MeshBasicMaterial({
        color: randomOf(petalColors),
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.3, 0.75),
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );

    const radius = THREE.MathUtils.randFloat(0.8, 5.8);
    const angle = Math.random() * Math.PI * 2;
    const baseY = THREE.MathUtils.randFloat(0.38, 1.28);
    mesh.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
    room.add(mesh);

    gardenPetals.push({
      mesh,
      angle,
      radius,
      speed: THREE.MathUtils.randFloat(0.12, 0.38),
      baseY,
      driftX: THREE.MathUtils.randFloat(0.05, 0.2),
      driftZ: THREE.MathUtils.randFloat(0.04, 0.16),
      phase: Math.random() * Math.PI * 2
    });
  }
}

function createGardenRoom() {
  const room = new THREE.Group();

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(gardenWidth, gardenDepth),
    new THREE.MeshBasicMaterial({ color: 0x9edc80, side: THREE.DoubleSide })
  );
  grass.rotation.x = -Math.PI / 2;
  room.add(grass);

  const innerLawn = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xb6e8a0, side: THREE.DoubleSide })
  );
  innerLawn.rotation.x = -Math.PI / 2;
  innerLawn.position.y = 0.002;
  room.add(innerLawn);

  const steppingStones = [
    [-0.1, 4.6],
    [0.05, 3.4],
    [-0.12, 2.25],
    [0.16, 1.12],
    [-0.08, 0.12],
    [0.24, -0.98]
  ];
  for (const [x, z] of steppingStones) {
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.47, 0.08, 14),
      new THREE.MeshBasicMaterial({ color: 0xdde6d0 })
    );
    stone.position.set(x, 0.04, z);
    stone.rotation.y = Math.random() * Math.PI;
    room.add(stone);
  }

  const patchSpecs = [
    { x: -5.25, z: -3.95, r: 1.7, c: 20 },
    { x: 5.1, z: -4.05, r: 1.62, c: 19 },
    { x: -5.65, z: 4.0, r: 1.58, c: 18 },
    { x: 5.45, z: 3.9, r: 1.65, c: 19 },
    { x: -2.35, z: -5.15, r: 1.35, c: 14 },
    { x: 2.45, z: -5.2, r: 1.3, c: 14 },
    { x: -3.1, z: 5.18, r: 1.25, c: 13 },
    { x: 3.2, z: 5.08, r: 1.22, c: 12 },
    { x: -0.4, z: -4.85, r: 0.95, c: 10 },
    { x: 0.65, z: 4.82, r: 0.98, c: 10 }
  ];
  for (const patch of patchSpecs) {
    plantFlowerPatch(room, patch.x, patch.z, patch.r, patch.c);
  }

  seedGardenPetals(room);

  const doorPack = createDoor({
    side: "front",
    z: 0,
    label: "Oyachi's Room",
    toRoom: "pink",
    roomWidthRef: gardenWidth,
    roomDepthRef: gardenDepth,
    color: 0x3a2b30
  });
  room.add(doorPack.door);
  room.add(doorPack.outline);

  return {
    room,
    doors: [doorPack.door],
    floors: [grass, innerLawn]
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
  doors: [
    { side: "right", z: 0.75, label: "Closet", toRoom: "brown" },
    { side: "back", x: 0.2, z: 0, label: "Garden", toRoom: "garden" }
  ]
});

const brownRoom = createRoom({
  wallColor: 0xf2dfcf,
  floorColor: 0xe6c9a8,
  withCarpet: false,
  doors: [
    { side: "left", z: 0.75, label: "Oyachi's Room", toRoom: "pink" }
  ]
});

const gardenRoom = createGardenRoom();

addClosetBoxes(brownRoom.room);
seedPinkRoomFurniture();

brownRoom.room.visible = false;
gardenRoom.room.visible = false;
scene.add(pinkRoom.room);
scene.add(brownRoom.room);
scene.add(gardenRoom.room);

const rooms = {
  pink: pinkRoom,
  brown: brownRoom,
  garden: gardenRoom
};

activeRoom = rooms[activeRoomKey];

function setRoom(key, { immediateCamera = false } = {}) {
  activeRoomKey = key;
  activeRoom = rooms[activeRoomKey];
  for (const roomKey of Object.keys(rooms)) {
    rooms[roomKey].room.visible = roomKey === key;
  }
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
      oyachi.sprite.material.color.setHex(0xffffff);
      oyachi.targetX = -0.95;
      oyachi.targetZ = 0.35;
      oyachi.phase = "idle";
      oyachi.velocity.set(0, 0);
      oyachi.bedLift = 0;
      oyachi.nextActionAt = performance.now() + 1200;
    } else if (key === "garden") {
      oyachi.sprite.position.x = 0.88;
      oyachi.sprite.position.z = gardenDepth / 2 - 1.25;
      oyachi.sprite.material.color.setHex(0xffffff);
      oyachi.targetX = 0.88;
      oyachi.targetZ = gardenDepth / 2 - 1.25;
      oyachi.phase = "idle";
      oyachi.velocity.set(0, 0);
      oyachi.bedLift = 0;
      oyachi.nextActionAt = performance.now() + 900;
    } else {
      oyachi.sprite.position.x = 0;
      oyachi.sprite.position.z = 0;
      oyachi.sprite.material.color.setHex(0xffffff);
      oyachi.targetX = 0;
      oyachi.targetZ = 0;
      oyachi.phase = "idle";
      oyachi.velocity.set(0, 0);
      oyachi.bedLift = 0;
      oyachi.nextActionAt = performance.now() + 280 + Math.random() * 340;
    }

    oyachi.hopState = "idle";
    oyachi.hopTimer = 0;
    oyachi.hopLift = 0;
    oyachi.hopLean = 0;
    oyachi.hopLand = 0;
    oyachi.velocity.set(0, 0);
    oyachi.moving = false;
  }

  updateCostumesMenuVisibility();

}

function transitionToRoom(key) {
  if (isTransitioning || key === activeRoomKey) return;
  const fadeOutMs = 260;
  const holdMs = 180;
  const fadeInMs = 320;

  isTransitioning = true;
  transitionScreen.classList.add("active");
  window.setTimeout(() => {
    setRoom(key);
    window.setTimeout(() => {
      showRoomBanner(roomNames[key]);
      transitionScreen.classList.remove("active");
      window.setTimeout(() => {
        isTransitioning = false;
      }, fadeInMs);
    }, holdMs);
  }, fadeOutMs);
}

function updateCostumesMenuVisibility() {
  if (!costumesMenu) return;
  const visible = activeRoomKey === "brown";
  costumesMenu.classList.toggle("open", visible);
  costumesMenu.setAttribute("aria-hidden", String(!visible));
}

if (costumesMenuToggle && costumesMenu) {
  costumesMenuToggle.addEventListener("click", () => {
    costumesMenuMinimized = !costumesMenuMinimized;
    costumesMenu.classList.toggle("minimized", costumesMenuMinimized);
    costumesMenuToggle.textContent = costumesMenuMinimized ? "‹" : "›";
  });
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

function isPointOnBed(x, z) {
  const dx = x - bedZone.x;
  const dz = z - bedZone.z;
  const c = Math.cos(-bedZone.rotationY);
  const s = Math.sin(-bedZone.rotationY);
  const localX = dx * c - dz * s;
  const localZ = dx * s + dz * c;
  return Math.abs(localX) <= bedZone.halfX && Math.abs(localZ) <= bedZone.halfZ;
}

function pushOutsidePinkBlockers(x, z, radius = 0.34) {
  let nextX = x;
  let nextZ = z;

  for (let i = 0; i < 2; i += 1) {
    for (const blocker of pinkBlockers) {
      let dx = nextX - blocker.x;
      let dz = nextZ - blocker.z;
      let dist = Math.hypot(dx, dz);
      const minDist = blocker.radius + radius;
      if (dist >= minDist) continue;

      if (dist < 0.0001) {
        dx = 1;
        dz = 0;
        dist = 1;
      }

      const push = minDist - dist + 0.001;
      nextX += (dx / dist) * push;
      nextZ += (dz / dist) * push;
    }
  }

  return { x: nextX, z: nextZ };
}

function resolvePinkMovement(currentX, currentZ, intendedX, intendedZ) {
  const direct = pushOutsidePinkBlockers(intendedX, intendedZ);
  if (Math.abs(direct.x - intendedX) < 0.001 && Math.abs(direct.z - intendedZ) < 0.001) {
    return direct;
  }

  const slideX = pushOutsidePinkBlockers(intendedX, currentZ);
  const slideZ = pushOutsidePinkBlockers(currentX, intendedZ);
  const xMoved = Math.hypot(slideX.x - currentX, slideX.z - currentZ);
  const zMoved = Math.hypot(slideZ.x - currentX, slideZ.z - currentZ);

  if (xMoved >= zMoved && xMoved > 0.002) return slideX;
  if (zMoved > 0.002) return slideZ;
  return { x: currentX, z: currentZ };
}

function getRoomBounds(roomKey = activeRoomKey) {
  if (roomKey === "garden") {
    return {
      halfWidth: gardenWidth / 2,
      halfDepth: gardenDepth / 2,
      marginX: 1.3,
      marginZ: 1.3
    };
  }
  return {
    halfWidth: roomWidth / 2,
    halfDepth: roomDepth / 2,
    marginX: 1.25,
    marginZ: 1.05
  };
}

function clampPointToRoomBounds(x, z) {
  const bounds = getRoomBounds(activeRoomKey);
  return {
    x: THREE.MathUtils.clamp(x, -bounds.halfWidth + bounds.marginX, bounds.halfWidth - bounds.marginX),
    z: THREE.MathUtils.clamp(z, -bounds.halfDepth + bounds.marginZ, bounds.halfDepth - bounds.marginZ)
  };
}

function startOyachiHop(targetX, targetZ, moveDistance) {
  if (!oyachi.sprite) return false;

  oyachiMoveDirection.set(targetX - oyachi.sprite.position.x, targetZ - oyachi.sprite.position.z);
  const len = oyachiMoveDirection.length();
  if (len < 0.0001) return false;

  oyachiMoveDirection.multiplyScalar(1 / len);

  const hopLength = THREE.MathUtils.clamp(moveDistance, oyachi.hopMin, oyachi.hopMax);
  let nextX = oyachi.sprite.position.x + oyachiMoveDirection.x * hopLength;
  let nextZ = oyachi.sprite.position.z + oyachiMoveDirection.y * hopLength;

  if (activeRoomKey === "pink") {
    const resolved = resolvePinkMovement(oyachi.sprite.position.x, oyachi.sprite.position.z, nextX, nextZ);
    nextX = resolved.x;
    nextZ = resolved.z;
  }

  const bounded = clampPointToRoomBounds(nextX, nextZ);
  nextX = bounded.x;
  nextZ = bounded.z;

  oyachi.hopFrom.set(oyachi.sprite.position.x, oyachi.sprite.position.z);
  oyachi.hopTo.set(nextX, nextZ);
  oyachi.hopState = "prepare";
  oyachi.hopTimer = 0;
  oyachi.hopDuration = THREE.MathUtils.randFloat(0.075, 0.11);
  oyachi.hopLift = 0;
  oyachi.hopLean = 0;
  oyachi.hopLand = 0;

  if (Math.abs(nextX - oyachi.sprite.position.x) > 0.006) {
    oyachi.facing = nextX > oyachi.sprite.position.x ? 1 : -1;
  }

  return true;
}

function randomizeOyachiMoveStyle() {
  oyachi.walkSpeed = THREE.MathUtils.randFloat(oyachi.walkSpeedMin, oyachi.walkSpeedMax);

  const paceT = THREE.MathUtils.clamp(
    (oyachi.walkSpeed - oyachi.walkSpeedMin) / (oyachi.walkSpeedMax - oyachi.walkSpeedMin),
    0,
    1
  );

  oyachi.hopMin = THREE.MathUtils.lerp(0.11, 0.145, paceT);
  oyachi.hopMax = THREE.MathUtils.lerp(0.22, 0.3, paceT);
}

function chooseOyachiTarget(now = performance.now()) {
  randomizeOyachiMoveStyle();
  if (activeRoomKey === "brown") {
    oyachi.targetX = THREE.MathUtils.randFloat(-0.55, 0.55);
    oyachi.targetZ = THREE.MathUtils.randFloat(0.05, 0.85);
  } else {
    const bounds = getRoomBounds(activeRoomKey);
    oyachi.targetX = THREE.MathUtils.randFloat(-bounds.halfWidth + bounds.marginX, bounds.halfWidth - bounds.marginX);
    oyachi.targetZ = THREE.MathUtils.randFloat(-bounds.halfDepth + bounds.marginZ, bounds.halfDepth - bounds.marginZ);
  }
  oyachi.phase = "moving";
  oyachi.nextActionAt = now + 1800 + Math.random() * 2200;
}

function commandOyachiTo(x, z, now = performance.now()) {
  if (!oyachi.sprite || activeRoomKey === "brown") return;
  randomizeOyachiMoveStyle();
  const bounds = getRoomBounds(activeRoomKey);
  oyachi.targetX = THREE.MathUtils.clamp(x, -bounds.halfWidth + bounds.marginX, bounds.halfWidth - bounds.marginX);
  oyachi.targetZ = THREE.MathUtils.clamp(z, -bounds.halfDepth + bounds.marginZ, bounds.halfDepth - bounds.marginZ);
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

function spawnHearts(origin, followOyachiBody = true) {
  const useOyachiBody = followOyachiBody && !!oyachi.sprite;
  const bodyBaseY = useOyachiBody
    ? oyachi.sprite.position.y + oyachi.sprite.scale.y * 0.28
    : origin.y + 0.1;
  const topY = useOyachiBody
    ? oyachi.sprite.position.y + oyachi.sprite.scale.y * 0.92
    : origin.y + 0.55;
  const bodySpanY = Math.max(0.15, topY - bodyBaseY);

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
    mesh.position.y = bodyBaseY + Math.random() * bodySpanY;
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
  oyachi.phase = "idle";
  oyachi.velocity.set(0, 0);
  oyachi.moving = false;
  oyachi.targetX = oyachi.sprite.position.x;
  oyachi.targetZ = oyachi.sprite.position.z;
  oyachi.nextActionAt = now + 650;
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

function updateGardenPetals(delta) {
  const now = performance.now() * 0.001;

  for (const petal of gardenPetals) {
    petal.angle += delta * petal.speed;

    const driftX = Math.sin(now * 1.35 + petal.phase) * petal.driftX;
    const driftZ = Math.cos(now * 1.08 + petal.phase) * petal.driftZ;

    petal.mesh.position.x = Math.cos(petal.angle) * petal.radius + driftX;
    petal.mesh.position.z = Math.sin(petal.angle) * petal.radius + driftZ;
    petal.mesh.position.y = petal.baseY + Math.sin(now * 2.2 + petal.phase) * 0.08;

    petal.mesh.rotation.x = Math.sin(now * 2.8 + petal.phase) * 0.7;
    petal.mesh.rotation.y += delta * 0.6;

    petal.mesh.material.opacity = THREE.MathUtils.clamp(
      0.18 + 0.65 * (0.5 + 0.5 * Math.sin(now * 1.9 + petal.phase)),
      0.18,
      0.85
    );
  }

}

function updateOyachi(delta) {
  if (!oyachi.sprite) return;
  const now = performance.now();
  const prevX = oyachi.sprite.position.x;
  const prevZ = oyachi.sprite.position.z;

  if (activeRoomKey === "brown") {
    oyachi.phase = "idle";
    oyachi.targetX = -0.95;
    oyachi.targetZ = 0.35;
    oyachi.sprite.position.x += (oyachi.targetX - oyachi.sprite.position.x) * 0.18;
    oyachi.sprite.position.z += (oyachi.targetZ - oyachi.sprite.position.z) * 0.18;
    oyachi.velocity.set(0, 0);
    oyachi.hopState = "idle";
    oyachi.hopTimer = 0;
    oyachi.hopLift = 0;
    oyachi.hopLean = 0;
    oyachi.hopLand = 0;
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

  const wantsMove = activeRoomKey !== "brown" && oyachi.phase === "moving" && distance > 0.08;
  const hopping = oyachi.hopState !== "idle";

  if (!wantsMove && !hopping && oyachi.phase === "moving") {
    oyachi.phase = "idle";
    oyachi.nextActionAt = now + 900 + Math.random() * 2100;
  }

  if (wantsMove && !hopping) {
    startOyachiHop(oyachi.targetX, oyachi.targetZ, distance);
  }

  if (oyachi.hopState !== "idle") {
    oyachi.hopTimer += delta;
    const t = THREE.MathUtils.clamp(oyachi.hopTimer / oyachi.hopDuration, 0, 1);

    if (oyachi.hopState === "prepare") {
      oyachi.hopLift = 0;
      oyachi.hopLean = Math.sin(t * Math.PI * 0.5) * 0.02;
      oyachi.hopLand = 0;

      if (t >= 1) {
        oyachi.hopState = "air";
        oyachi.hopTimer = 0;
        oyachi.hopDuration = THREE.MathUtils.randFloat(0.14, 0.19);
        if (now >= oyachi.nextStepAt) {
          playSfx(walkSfxPaths, 0.14);
          oyachi.nextStepAt = now + 380 + Math.random() * 120;
        }
      }
    } else if (oyachi.hopState === "air") {
      const easeOut = 1 - Math.pow(1 - t, 2);
      oyachi.sprite.position.x = THREE.MathUtils.lerp(oyachi.hopFrom.x, oyachi.hopTo.x, easeOut);
      oyachi.sprite.position.z = THREE.MathUtils.lerp(oyachi.hopFrom.y, oyachi.hopTo.y, easeOut);
      oyachi.hopLift = Math.sin(t * Math.PI);
      oyachi.hopLean = (Math.sin(t * Math.PI * 2) * 0.018) + 0.01;
      oyachi.hopLand = 0;

      if (t >= 1) {
        oyachi.sprite.position.x = oyachi.hopTo.x;
        oyachi.sprite.position.z = oyachi.hopTo.y;
        oyachi.hopState = "land";
        oyachi.hopTimer = 0;
        oyachi.hopDuration = THREE.MathUtils.randFloat(0.09, 0.13);
      }
    } else if (oyachi.hopState === "land") {
      oyachi.hopLift = 0;
      oyachi.hopLean = 0;
      oyachi.hopLand = Math.sin(t * Math.PI);

      if (t >= 1) {
        oyachi.hopState = "pause";
        oyachi.hopTimer = 0;
        oyachi.hopDuration = THREE.MathUtils.randFloat(0.05, 0.09);
      }
    } else if (oyachi.hopState === "pause") {
      oyachi.hopLift = 0;
      oyachi.hopLean = Math.sin(t * Math.PI) * 0.008;
      oyachi.hopLand = 0;

      if (t >= 1) {
        const remaining = Math.hypot(oyachi.targetX - oyachi.sprite.position.x, oyachi.targetZ - oyachi.sprite.position.z);
        if (oyachi.phase === "moving" && remaining > 0.12) {
          startOyachiHop(oyachi.targetX, oyachi.targetZ, remaining);
        } else {
          oyachi.hopState = "idle";
          oyachi.hopTimer = 0;
          oyachi.phase = "idle";
          oyachi.nextActionAt = now + 950 + Math.random() * 2100;
        }
      }
    }
  } else {
    oyachi.hopLift = 0;
    oyachi.hopLean = 0;
    oyachi.hopLand = 0;
  }

  oyachi.moving = oyachi.hopState !== "idle";

  const movedX = oyachi.sprite.position.x - prevX;
  const movedZ = oyachi.sprite.position.z - prevZ;
  oyachiInstantVelocity.set(
    movedX / Math.max(delta, 0.0001),
    movedZ / Math.max(delta, 0.0001)
  );
  oyachi.velocity.lerp(oyachiInstantVelocity, 0.45);

  const speedNorm = THREE.MathUtils.clamp(oyachi.velocity.length() / oyachi.walkSpeed, 0, 1);

  const idleBreath = oyachi.moving ? 0 : Math.sin(now * 0.0037) * 0.012;
  const idleWobble = oyachi.moving ? 0 : Math.sin(now * 0.0028) * 0.018;
  const bedLiftTarget = activeRoomKey === "pink" && isPointOnBed(oyachi.sprite.position.x, oyachi.sprite.position.z)
    ? bedZone.liftY
    : 0;
  oyachi.bedLift += (bedLiftTarget - oyachi.bedLift) * 0.22;

  const hopHeight = oyachi.hopLift * (0.03 + speedNorm * 0.045);
  oyachi.sprite.position.y = oyachi.baseHeight + oyachi.bedLift + idleBreath + hopHeight;

  if (oyachi.shadow && oyachi.shadowMaterial) {
    const stretch = oyachi.hopLand * 0.14 + speedNorm * 0.08;
    const shadowY = oyachi.bedLift > 0.18 ? oyachi.bedLift + 0.012 : 0.014;
    oyachi.shadow.position.set(oyachi.sprite.position.x, shadowY, oyachi.sprite.position.z + 0.02);
    oyachi.shadow.scale.set(1.04 + stretch, 0.8 + stretch * 0.62, 1);
    oyachi.shadowMaterial.opacity = THREE.MathUtils.clamp(
      0.36 - hopHeight * 3.8 + speedNorm * 0.02,
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
  const prepareSquash = oyachi.hopState === "prepare" ? Math.sin(Math.min(1, oyachi.hopTimer / oyachi.hopDuration) * Math.PI * 0.5) : 0;
  const airStretch = oyachi.hopLift;
  const landSquash = oyachi.hopLand;
  const gaitSquashX = 1 + prepareSquash * 0.08 + landSquash * 0.12 - airStretch * 0.06;
  const gaitSquashY = 1 - prepareSquash * 0.1 - landSquash * 0.14 + airStretch * 0.09;
  const moveTilt = oyachi.moving
    ? THREE.MathUtils.clamp(oyachi.velocity.x / oyachi.walkSpeed, -1, 1) * 0.055 + oyachi.hopLean
    : 0;
  const targetTilt = moveTilt + idleWobble;
  oyachi.tilt += (targetTilt - oyachi.tilt) * 0.16;

  oyachi.sprite.scale.set(
    baseScale * squishX * gaitSquashX * breathScaleX * oyachi.facing,
    baseScale * oyachi.textures.aspect * oyachi.scaleY * squishY * gaitSquashY * breathScaleY,
    1
  );
  oyachi.sprite.material.rotation = oyachi.tilt;
  oyachi.sprite.lookAt(camera.position);
}

async function loadOyachi() {
  const loader = new THREE.TextureLoader();
  const idle = await loader.loadAsync(assetPath("sprites/oyachi/idle-neutral.png"));
  const pet = await loader.loadAsync(assetPath("sprites/oyachi/pet-squish.png"));

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
  oyachi.hopState = "idle";
  oyachi.hopTimer = 0;
  oyachi.hopLift = 0;
  oyachi.hopLean = 0;
  oyachi.hopLand = 0;
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
    const nextRoom = doorHits[0].object.userData.toRoom;
    if (nextRoom) transitionToRoom(nextRoom);
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
  } else if ((activeRoomKey === "pink" || activeRoomKey === "garden") && raycaster.ray.intersectPlane(pinkFloorPlane, pinkFloorPlaneHit)) {
    hitPoint = pinkFloorPlaneHit;
  }

  if (hitPoint && (activeRoomKey === "pink" || activeRoomKey === "garden")) {
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
  await Promise.all([loadOyachi()]);
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
  updateGardenPetals(delta);
  renderer.render(scene, camera);
}

animate();
