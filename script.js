/* global THREE */

// SECTION: Scene setup
let scene, camera, renderer, controls;
let globe, atmosphere, halo;

init();
animate();

function init() {
  const container = document.getElementById("globe-container");
  const { width, height } = container.getBoundingClientRect();

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
  camera.position.set(0, 0, 7.5);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1.5);
  renderer.setSize(width, height);
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // Lights
  const ambientLight = new THREE.AmbientLight(0xbcc7ff, 0.7);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.15);
  directionalLight.position.set(5, 7, 3);
  scene.add(directionalLight);

  // SECTION: Tile system
  const ZOOM = 12;
  const TILE_URL = "tiles_mde/{z}/{x}/{y}.png";

  function uvToTile(u, v, zoom) {
    const tiles = Math.pow(2, zoom);
    const x = Math.floor(u * tiles);
    const y = Math.floor((1 - v) * tiles);
    return { x, y };
  }

  function createTiledGlobe() {
    const radius = 3;
    const segmentsX = 32; // número de parches horizontales
    const segmentsY = 16; // número de parches verticales

    const group = new THREE.Group();

    for (let i = 0; i < segmentsX; i++) {
      for (let j = 0; j < segmentsY; j++) {

        const geom = new THREE.SphereGeometry(
          radius,
          8, 8,
          (i / segmentsX) * Math.PI * 2,
          (1 / segmentsX) * Math.PI * 2,
          (j / segmentsY) * Math.PI,
          (1 / segmentsY) * Math.PI
        );

        const u = (i + 0.5) / segmentsX;
        const v = (j + 0.5) / segmentsY;

        const { x, y } = uvToTile(u, v, ZOOM);

        const url = TILE_URL
          .replace("{z}", ZOOM)
          .replace("{x}", x)
          .replace("{y}", y);

        const tex = new THREE.TextureLoader().load(url);

        const mat = new THREE.MeshBasicMaterial({
          map: tex,
        });

        const mesh = new THREE.Mesh(geom, mat);
        group.add(mesh);
      }
    }

    return group;
  }

  // SECTION: Create globe with all tiles
  globe = createTiledGlobe();
  scene.add(globe);

  // SECTION: Atmosphere glow
  const atmosphereGeometry = new THREE.SphereGeometry(3 * 1.08, 64, 64);
  const atmosphereMaterial = new THREE.MeshBasicMaterial({
    color: 0x4de2ff,
    transparent: true,
    opacity: 0.22,
    side: THREE.BackSide,
  });

  atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  scene.add(atmosphere);

  // Extra halo
  const haloGeometry = new THREE.SphereGeometry(3 * 1.16, 64, 64);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  });

  halo = new THREE.Mesh(haloGeometry, haloMaterial);
  scene.add(halo);

  // SECTION: Starfield
  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount * 3; i += 3) {
    const r = 60;
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i] = r * Math.sin(phi) * Math.cos(theta);
    positions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i + 2] = r * Math.cos(phi);
  }

  starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    transparent: true,
    opacity: 0.7,
  });

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  // SECTION: Orbit controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.panSpeed = 0.4;
  controls.minDistance = 4.1;
  controls.maxDistance = 12;
  controls.rotateSpeed = 0.55;

  globe.rotation.x = THREE.MathUtils.degToRad(23.4);

  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI - 0.2;

  renderer.domElement.addEventListener("dblclick", () => {
    camera.position.set(0, 0, 7.5);
    controls.target.set(0, 0, 0);
  });

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const container = document.getElementById("globe-container");
  if (!container) return;

  const { width, height } = container.getBoundingClientRect();

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

// SECTION: Animation loop
function animate() {
  requestAnimationFrame(animate);

  if (globe) globe.rotation.y += 0.0009;
  if (atmosphere) atmosphere.rotation.y += 0.0004;
  if (halo) halo.rotation.y += 0.0002;

  if (controls) controls.update();

  renderer.render(scene, camera);
}
