/* global THREE */

// SECTION: Scene setup
let scene, camera, renderer, controls;
let arcticTerrain, gridHelper;

init();
animate();

function init() {
  const container = document.getElementById("globe-container");
  
  // Obtener dimensiones reales del contenedor
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02030a);

  // Camera - vista isométrica/aérea
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  camera.position.set(0, 12, 12);
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1.5);
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Asegurar que el canvas llene el contenedor
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  
  container.appendChild(renderer.domElement);

  // SECTION: Iluminación optimizada para relieve
  const ambientLight = new THREE.AmbientLight(0x6688bb, 0.4);
  scene.add(ambientLight);

  // Luz principal desde arriba-lateral
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(10, 15, 8);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  scene.add(mainLight);

  // Luz rasante para resaltar relieve
  const rimLight = new THREE.DirectionalLight(0xaaccff, 0.8);
  rimLight.position.set(-12, 3, -5);
  scene.add(rimLight);

  // Luz de relleno desde abajo
  const fillLight = new THREE.DirectionalLight(0x4488cc, 0.3);
  fillLight.position.set(0, -5, 8);
  scene.add(fillLight);

  // SECTION: Cargar heightmap del Ártico
  const textureLoader = new THREE.TextureLoader();
  
  textureLoader.load('dem.png', function(heightmap) {
    console.log('Heightmap del Ártico cargado');
    
    // SECTION: Geometría plana del Ártico
    const planeSize = 10; // Tamaño del plano
    const segments = 512; // Alta resolución para el detalle
    
    const terrainGeometry = new THREE.PlaneGeometry(
      planeSize, 
      planeSize, 
      segments, 
      segments
    );

    // Material con heightmap
    const terrainMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8f4ff, // Blanco azulado para hielo/nieve
      roughness: 0.75,
      metalness: 0.15,
      displacementMap: heightmap,
      displacementScale: 0.2, // Exageración vertical moderada
      map: heightmap, // Usar el heightmap como textura de color
      side: THREE.DoubleSide,
    });

    arcticTerrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    arcticTerrain.rotation.x = -Math.PI / 2; // Rotar para que sea horizontal
    arcticTerrain.receiveShadow = true;
    arcticTerrain.castShadow = true;
    scene.add(arcticTerrain);

    // SECTION: Plano base (océano)
    const oceanGeometry = new THREE.PlaneGeometry(planeSize * 1.2, planeSize * 1.2);
    const oceanMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a2850,
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0.8,
    });
    
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.3; // Debajo del terreno
    ocean.receiveShadow = true;
    scene.add(ocean);

    // SECTION: Borde del mapa
    const edgesGeometry = new THREE.EdgesGeometry(terrainGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ 
      color: 0x4de2ff, 
      transparent: true, 
      opacity: 0.3 
    });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.rotation.x = -Math.PI / 2;
    edges.position.y = 0.01;
    scene.add(edges);

  }, undefined, function(error) {
    console.error('Error cargando el heightmap:', error);
  });

  // SECTION: Grid de referencia (opcional)
  const gridHelper2 = new THREE.GridHelper(12, 20, 0x2244aa, 0x112255);
  gridHelper2.position.y = -0.31;
  scene.add(gridHelper2);

  // SECTION: Starfield backdrop
  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 3000;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 100;
    positions[i + 1] = (Math.random() - 0.5) * 100;
    positions[i + 2] = (Math.random() - 0.5) * 100;
  }

  starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
  });

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  // SECTION: Orbit controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.panSpeed = 0.8;
  controls.minDistance = 6;
  controls.maxDistance = 30;
  controls.rotateSpeed = 0.6;
  controls.maxPolarAngle = Math.PI / 2 - 0.1; // No ir debajo del plano

  // Reset on double click
  renderer.domElement.addEventListener("dblclick", () => {
    camera.position.set(0, 12, 12);
    controls.target.set(0, 0, 0);
  });

  // SECTION: Resize handling
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  const container = document.getElementById("globe-container");
  if (!container) return;

  const width = container.clientWidth;
  const height = container.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

// SECTION: Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Rotación suave opcional
  if (arcticTerrain) {
    arcticTerrain.rotation.z += 0.0003; // Muy sutil
  }

  if (controls) {
    controls.update();
  }

  renderer.render(scene, camera);
}
