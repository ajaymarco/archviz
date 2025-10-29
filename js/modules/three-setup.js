
let scene, camera, renderer;
let gridHelper, axesHelper;
let selectedObject = null;
const selectionMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, depthTest: false });

function initViewport(onViewportClick) {
    const canvas = document.getElementById('viewport');
    const container = canvas.parentElement;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(20, 15, 20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
    directionalLight2.position.set(-10, 5, -10);
    scene.add(directionalLight2);

    // Grid
    gridHelper = new THREE.GridHelper(30, 30, 0xaaaaaa, 0x444444);
    scene.add(gridHelper);

    // Axes
    axesHelper = new THREE.AxesHelper(8);
    scene.add(axesHelper);

    setupOrbitControls(canvas);

    canvas.addEventListener('click', onViewportClick);

    animate();
    return { scene, camera, renderer };
}

function setupOrbitControls(canvas) {
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    let rotation = { x: -0.5, y: 0.8 };
    const radius = 30;

    canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            isDragging = true;
            previousMouse = { x: e.clientX, y: e.clientY };
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMouse.x;
            const deltaY = e.clientY - previousMouse.y;

            rotation.y += deltaX * 0.005;
            rotation.x += deltaY * 0.005;
            rotation.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotation.x));

            updateCamera();
            previousMouse = { x: e.clientX, y: e.clientY };
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const currentRadius = camera.position.length();
        const newRadius = Math.max(5, Math.min(60, currentRadius + e.deltaY * 0.05));
        camera.position.multiplyScalar(newRadius / currentRadius);
    });

    function updateCamera() {
        camera.position.x = radius * Math.cos(rotation.x) * Math.sin(rotation.y);
        camera.position.y = radius * Math.sin(rotation.x);
        camera.position.z = radius * Math.cos(rotation.x) * Math.cos(rotation.y);
        camera.lookAt(0, 0, 0);
    }

    updateCamera();
}

function animate() {
    requestAnimationFrame(animate);

    // Render main scene
    renderer.autoClear = true;
    renderer.render(scene, camera);

    // Render selection overlay
    if (selectedObject) {
        renderer.autoClear = false;
        const originalMaterial = selectedObject.material;
        selectedObject.material = selectionMaterial;
        renderer.render(scene, camera);
        selectedObject.material = originalMaterial;
    }
}

function setView(view) {
    const distance = 30;
    switch (view) {
        case 'top':
            camera.position.set(0, distance, 0);
            break;
        case 'front':
            camera.position.set(0, 5, distance);
            break;
        case 'side':
            camera.position.set(distance, 5, 0);
            break;
        case 'iso':
            camera.position.set(20, 15, 20);
            break;
    }
    camera.lookAt(0, 0, 0);
}

function toggleGrid(show) {
    gridHelper.visible = show;
}

function toggleAxes(show) {
    axesHelper.visible = show;
}

function getScene() {
    return scene;
}

function getCamera() {
    return camera;
}

function getRenderer() {
    return renderer;
}

function setSelectedObject(object) {
    selectedObject = object;
}

export {
    initViewport,
    setView,
    toggleGrid,
    toggleAxes,
    getScene,
    getCamera,
    getRenderer,
    setSelectedObject
};
