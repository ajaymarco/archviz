// Application State
const app = {
    scene: null,
    camera: null,
    renderer: null,
    objects: [],
    selectedObject: null,
    currentTool: 'wall',
    currentMode: 'model',
    gridEnabled: true,
    snapEnabled: false,
    measureMode: false,
    history: [],
    historyIndex: -1,
    dimensions: { width: 5, height: 3, depth: 0.2 },
    material: { roughness: 0.7, metalness: 0, color: 0xcccccc }
};

// Initialize Scene
function initScene() {
    const canvas = document.getElementById('canvas');
    const viewport = canvas.parentElement;

    app.scene = new THREE.Scene();
    app.scene.background = new THREE.Color(0x0a0a0a);
    app.scene.fog = new THREE.Fog(0x0a0a0a, 80, 200);

    // Camera
    app.camera = new THREE.PerspectiveCamera(50, viewport.clientWidth / viewport.clientHeight, 0.1, 1000);
    app.camera.position.set(25, 20, 25);
    app.camera.lookAt(0, 0, 0);

    // Renderer
    app.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    app.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    app.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    app.renderer.shadowMap.enabled = true;
    app.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    app.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    app.renderer.toneMappingExposure = 1.2;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    app.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(50, 60, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.bias = -0.0001;
    app.scene.add(sun);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.9,
        metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    app.scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(100, 100, 0x1a1a1a, 0x111111);
    grid.material.opacity = 0.5;
    grid.material.transparent = true;
    app.scene.add(grid);
    app.gridHelper = grid;

    // Setup interactions
    setupControls();

    // Resize handler
    window.addEventListener('resize', () => {
        app.camera.aspect = viewport.clientWidth / viewport.clientHeight;
        app.camera.updateProjectionMatrix();
        app.renderer.setSize(viewport.clientWidth, viewport.clientHeight);
    });

    // Start animation
    animate();

    // Welcome message
    showToast('Welcome! Click viewport to create objects, or use AI commands');
}

// Controls Setup
function setupControls() {
    const canvas = document.getElementById('canvas');
    let isDragging = false;
    let previousMouse = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    canvas.addEventListener('mousedown', (e) => {
        previousMouse = { x: e.clientX, y: e.clientY };

        if (e.button === 1 || e.button === 2 || e.altKey) {
            isDragging = true;
            canvas.style.cursor = 'grabbing';
        } else if (e.button === 0) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, app.camera);
            const intersects = raycaster.intersectObjects(app.objects, true);

            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj.parent && !app.objects.includes(obj)) {
                    obj = obj.parent;
                }
                selectObject(obj);
            } else {
                const groundIntersects = raycaster.intersectObjects(
                    app.scene.children.filter(c => c.geometry && c.geometry.type === 'PlaneGeometry')
                );
                if (groundIntersects.length > 0) {
                    createObject(groundIntersects[0].point);
                }
            }
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousMouse.x;
            const deltaY = e.clientY - previousMouse.y;

            const radius = app.camera.position.length();
            const theta = Math.atan2(app.camera.position.x, app.camera.position.z);
            const phi = Math.acos(app.camera.position.y / radius);

            const newTheta = theta - deltaX * 0.005;
            const newPhi = Math.max(0.1, Math.min(Math.PI - 0.1, phi + deltaY * 0.005));

            app.camera.position.x = radius * Math.sin(newPhi) * Math.sin(newTheta);
            app.camera.position.y = radius * Math.cos(newPhi);
            app.camera.position.z = radius * Math.sin(newPhi) * Math.cos(newTheta);
            app.camera.lookAt(0, 0, 0);

            previousMouse = { x: e.clientX, y: e.clientY };
        }

        // Snap point indicator
        if (app.snapEnabled && !isDragging) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, app.camera);
            const intersects = raycaster.intersectObjects(app.objects, true);

            const snapPoint = document.getElementById('snap-point');
            if (intersects.length > 0) {
                snapPoint.classList.add('active');
                snapPoint.style.left = e.clientX + 'px';
                snapPoint.style.top = e.clientY + 'px';
            } else {
                snapPoint.classList.remove('active');
            }
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        canvas.style.cursor = 'crosshair';
    });

    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.05;
        const direction = e.deltaY > 0 ? 1 : -1;

        const newRadius = app.camera.position.length() * (1 + direction * zoomSpeed);
        const clampedRadius = Math.max(5, Math.min(150, newRadius));

        app.camera.position.normalize().multiplyScalar(clampedRadius);
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Animation Loop
function animate() {
    requestAnimationFrame(animate);
    app.renderer.render(app.scene, app.camera);
    updateStats();
}

// Object Creation
function createObject(position) {
    const dim = app.dimensions;
    const mat = app.material;
    let geometry, material, mesh;

    switch(app.currentTool) {
        case 'wall':
            geometry = new THREE.BoxGeometry(dim.width, dim.height, dim.depth);
            break;
        case 'floor':
            geometry = new THREE.BoxGeometry(dim.width, dim.depth, dim.width);
            break;
        case 'door':
            geometry = new THREE.BoxGeometry(1, 2.2, 0.1);
            break;
        case 'window':
            geometry = new THREE.BoxGeometry(1.5, 1.2, 0.1);
            break;
        case 'stairs':
            const stairGroup = new THREE.Group();
            for (let i = 0; i < 12; i++) {
                const step = new THREE.Mesh(
                    new THREE.BoxGeometry(2.5, 0.15, 0.3),
                    new THREE.MeshStandardMaterial({
                        color: 0x888888,
                        roughness: 0.8
                    })
                );
                step.position.set(0, i * 0.15, i * 0.3);
                step.castShadow = true;
                step.receiveShadow = true;
                stairGroup.add(step);
            }
            mesh = stairGroup;
            mesh.position.copy(position);
            mesh.position.y = 0;
            break;
        case 'column':
            geometry = new THREE.CylinderGeometry(0.3, 0.3, dim.height, 16);
            break;
        default:
            geometry = new THREE.BoxGeometry(dim.width, dim.height, dim.depth);
    }

    if (!mesh) {
        material = new THREE.MeshStandardMaterial({
            color: mat.color,
            roughness: mat.roughness,
            metalness: mat.metalness
        });
        mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);

        if (app.currentTool === 'floor') {
            mesh.position.y = dim.depth / 2;
        } else {
            mesh.position.y = dim.height / 2;
        }
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = {
        type: app.currentTool,
        name: `${app.currentTool} ${app.objects.length + 1}`,
        dimensions: { ...dim },
        material: { ...mat }
    };

    app.scene.add(mesh);
    app.objects.push(mesh);

    addToHistory(`Created ${app.currentTool}`, mesh);
    selectObject(mesh);
    showToast(`Created ${app.currentTool}`);
}

// Object Selection
function selectObject(obj) {
    if (app.selectedObject && app.selectedObject.material) {
        if (app.selectedObject.material.emissive) {
            app.selectedObject.material.emissive.setHex(0x000000);
        }
    }

    app.selectedObject = obj;

    if (obj.material && obj.material.emissive) {
        obj.material.emissive.setHex(0x222222);
    }

    // Update property panel
    if (obj.userData.dimensions) {
        document.getElementById('width').value = obj.userData.dimensions.width;
        document.getElementById('height').value = obj.userData.dimensions.height;
        document.getElementById('depth').value = obj.userData.dimensions.depth;
        updateDimensionDisplay();
    }

    updatePropertyDisplay();
    showToast(`Selected: ${obj.userData.name}`);
}

// Tool Selection
function selectTool(tool) {
    app.currentTool = tool;

    document.querySelectorAll('.tool-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.tool-item').classList.add('active');

    // Set default dimensions
    const presets = {
        wall: { width: 5, height: 3, depth: 0.2 },
        floor: { width: 8, height: 0.1, depth: 8 },
        door: { width: 1, height: 2.2, depth: 0.1 },
        window: { width: 1.5, height: 1.2, depth: 0.1 },
        stairs: { width: 2.5, height: 1.8, depth: 3.6 },
        column: { width: 0.6, height: 3, depth: 0.6 }
    };

    if (presets[tool]) {
        app.dimensions = presets[tool];
        updateDimensionInputs();
    }

    showToast(`Tool: ${tool}`);
}

// Mode Switching
function switchMode(mode) {
    app.currentMode = mode;

    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    showToast(`Mode: ${mode}`);
}

// Property Updates
function updatePosition(axis, value) {
    const val = parseFloat(value);
    document.getElementById(`pos-${axis}-val`).textContent = val.toFixed(2) + 'm';

    if (app.selectedObject) {
        app.selectedObject.position[axis] = val;
    }
}

function updateDimension(prop, value) {
    const val = parseFloat(value);
    app.dimensions[prop] = val;
    document.getElementById(`${prop}-val`).textContent = val.toFixed(2) + 'm';

    if (app.selectedObject && app.selectedObject.scale) {
        const baseScale = app.selectedObject.userData.dimensions || { width: 5, height: 3, depth: 0.2 };

        if (prop === 'width') app.selectedObject.scale.x = val / baseScale.width;
        if (prop === 'height') app.selectedObject.scale.y = val / baseScale.height;
        if (prop === 'depth') app.selectedObject.scale.z = val / baseScale.depth;
    }
}

function updateMaterialProp(prop, value) {
    const val = parseFloat(value);
    app.material[prop] = val;
    document.getElementById(`${prop}-val`).textContent = val.toFixed(2);

    if (app.selectedObject && app.selectedObject.material) {
        app.selectedObject.material[prop] = val;
    }
}

function updateDimensionDisplay() {
    const dim = app.dimensions;
    document.getElementById('width-val').textContent = dim.width.toFixed(2) + 'm';
    document.getElementById('height-val').textContent = dim.height.toFixed(2) + 'm';
    document.getElementById('depth-val').textContent = dim.depth.toFixed(2) + 'm';
}

function updateDimensionInputs() {
    const dim = app.dimensions;
    document.getElementById('width').value = dim.width;
    document.getElementById('height').value = dim.height;
    document.getElementById('depth').value = dim.depth;
    updateDimensionDisplay();
}

function updatePropertyDisplay() {
    if (app.selectedObject) {
        const pos = app.selectedObject.position;
        document.getElementById('pos-x').value = pos.x;
        document.getElementById('pos-y').value = pos.y;
        document.getElementById('pos-z').value = pos.z;
        document.getElementById('pos-x-val').textContent = pos.x.toFixed(2) + 'm';
        document.getElementById('pos-y-val').textContent = pos.y.toFixed(2) + 'm';
        document.getElementById('pos-z-val').textContent = pos.z.toFixed(2) + 'm';
    }
}

// Material Application
function applyMaterial(materialType) {
    const materials = {
        concrete: { color: 0xaaaaaa, roughness: 0.9, metalness: 0.1 },
        wood: { color: 0x8b4513, roughness: 0.7, metalness: 0 },
        glass: { color: 0x87ceeb, roughness: 0.1, metalness: 0.9 },
        metal: { color: 0xcccccc, roughness: 0.3, metalness: 1.0 },
        stone: { color: 0x696969, roughness: 0.8, metalness: 0.1 },
        paint: { color: 0xffffff, roughness: 0.6, metalness: 0 },
        brass: { color: 0xdaa520, roughness: 0.4, metalness: 0.8 },
        brick: { color: 0x8b0000, roughness: 0.9, metalness: 0 }
    };

    const mat = materials[materialType];
    if (mat) {
        app.material = mat;

        if (app.selectedObject && app.selectedObject.material) {
            Object.assign(app.selectedObject.material, mat);
        }

        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        event.target.classList.add('active');

        showToast(`Applied ${materialType} material`);
    }
}

// Lighting
function setTimeOfDay(time) {
    const settings = {
        dawn: { sunColor: 0xffd89b, intensity: 0.5, ambient: 0.3, fogColor: 0x4a4a6a },
        day: { sunColor: 0xffffff, intensity: 0.8, ambient: 0.4, fogColor: 0x0a0a0a },
        sunset: { sunColor: 0xff6b6b, intensity: 0.6, ambient: 0.3, fogColor: 0x2a1a1a },
        night: { sunColor: 0x4169e1, intensity: 0.2, ambient: 0.2, fogColor: 0x000000 }
    };

    const setting = settings[time];
    if (setting) {
        app.scene.children.forEach(child => {
            if (child instanceof THREE.DirectionalLight) {
                child.color.setHex(setting.sunColor);
                child.intensity = setting.intensity;
            }
            if (child instanceof THREE.AmbientLight) {
                child.intensity = setting.ambient;
            }
        });

        app.scene.fog.color.setHex(setting.fogColor);
        app.scene.background.setHex(setting.fogColor);

        document.querySelectorAll('.property-group:last-child .color-swatch').forEach(s => s.classList.remove('active'));
        event.target.classList.add('active');

        showToast(`Time: ${time}`);
    }
}

// View Controls
function setView(view) {
    const views = {
        'top': { x: 0, y: 50, z: 0.1 },
        'bottom': { x: 0, y: -50, z: 0.1 },
        'left': { x: -50, y: 10, z: 0.1 },
        'right': { x: 50, y: 10, z: 0.1 },
        'perspective': { x: 25, y: 20, z: 25 }
    };

    if (views[view]) {
        app.camera.position.set(views[view].x, views[view].y, views[view].z);
        app.camera.lookAt(0, 0, 0);
        showToast(`View: ${view}`);
    }
}

function resetView() {
    app.camera.position.set(25, 20, 25);
    app.camera.lookAt(0, 0, 0);
    showToast('View reset');
}

// Toggles
function toggleGrid() {
    app.gridEnabled = !app.gridEnabled;
    if (app.gridHelper) {
        app.gridHelper.visible = app.gridEnabled;
    }
    document.getElementById('grid-btn').classList.toggle('active');
}

function toggleSnap() {
    app.snapEnabled = !app.snapEnabled;
    document.getElementById('snap-btn').classList.toggle('active');
    showToast(`Snap: ${app.snapEnabled ? 'ON' : 'OFF'}`);
}

function toggleMeasure() {
    app.measureMode = !app.measureMode;
    document.getElementById('measure-btn').classList.toggle('active');
    showToast(`Measure: ${app.measureMode ? 'ON' : 'OFF'}`);
}

function toggleWireframe() {
    app.objects.forEach(obj => {
        obj.traverse(child => {
            if (child.material) {
                child.material.wireframe = !child.material.wireframe;
            }
        });
    });
    showToast('Wireframe toggled');
}

function toggleXRay() {
    app.objects.forEach(obj => {
        obj.traverse(child => {
            if (child.material) {
                child.material.transparent = !child.material.transparent;
                child.material.opacity = child.material.transparent ? 0.5 : 1.0;
            }
        });
    });
    showToast('X-Ray toggled');
}

// Procedural Generation
function generateRoom() {
    const roomSize = 8;
    const wallHeight = 3;

    showLoading();

    setTimeout(() => {
        // Floor
        app.currentTool = 'floor';
        app.dimensions = { width: roomSize, height: 0.1, depth: roomSize };
        createObject(new THREE.Vector3(0, 0, 0));

        // Walls
        app.currentTool = 'wall';
        app.dimensions = { width: roomSize, height: wallHeight, depth: 0.2 };

        createObject(new THREE.Vector3(0, 0, roomSize/2));
        createObject(new THREE.Vector3(0, 0, -roomSize/2));

        app.dimensions = { width: 0.2, height: wallHeight, depth: roomSize };
        createObject(new THREE.Vector3(roomSize/2, 0, 0));
        createObject(new THREE.Vector3(-roomSize/2, 0, 0));

        hideLoading();
        showToast('Room generated!');
        addToHistory('Generated room', null);
    }, 800);
}

function generateBuilding() {
    showLoading();

    setTimeout(() => {
        const floors = 3;
        const floorHeight = 3.5;
        const buildingWidth = 12;
        const buildingDepth = 10;

        for (let i = 0; i < floors; i++) {
            app.currentTool = 'floor';
            app.dimensions = { width: buildingWidth, height: 0.2, depth: buildingDepth };
            createObject(new THREE.Vector3(0, i * floorHeight, 0));

            // Facade
            for (let j = 0; j < 3; j++) {
                app.currentTool = 'window';
                createObject(new THREE.Vector3(
                    -buildingWidth/2 + buildingWidth/4 * (j+0.5),
                    i * floorHeight + floorHeight/2,
                    buildingDepth/2 + 0.2
                ));
            }
        }

        hideLoading();
        showToast('Building generated!');
        addToHistory('Generated building', null);
    }, 1200);
}

function generateFacade() {
    showLoading();

    setTimeout(() => {
        const width = 15;
        const height = 12;
        const windowRows = 3;
        const windowCols = 5;

        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                app.currentTool = 'window';
                createObject(new THREE.Vector3(
                    -width/2 + (col + 0.5) * (width / windowCols),
                    (row + 0.5) * (height / windowRows),
                    0
                ));
            }
        }

        hideLoading();
        showToast('Facade generated!');
        addToHistory('Generated facade', null);
    }, 1000);
}

// Library Objects
function addObject(category, type) {
    const objects = {
        'furniture-chair': { w: 0.6, h: 0.9, d: 0.6, color: 0x8b4513 },
        'furniture-table': { w: 1.5, h: 0.8, d: 1.0, color: 0x654321 },
        'lighting-lamp': { w: 0.3, h: 2.0, d: 0.3, color: 0xffff00 },
        'vegetation-tree': { w: 2, h: 6, d: 2, color: 0x228b22 },
        'vegetation-plant': { w: 0.4, h: 0.6, d: 0.4, color: 0x32cd32 }
    };

    const key = `${category}-${type}`;
    const obj = objects[key];

    if (obj) {
        app.dimensions = { width: obj.w, height: obj.h, depth: obj.d };
        app.material.color = obj.color;

        const pos = new THREE.Vector3(
            Math.random() * 10 - 5,
            0,
            Math.random() * 10 - 5
        );

        createObject(pos);
        showToast(`Added ${type}`);
    }
}

// AI Command Processing
function handleAICommand(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('ai-input');
        const command = input.value.trim();

        if (command) {
            executeCommand(command);
            input.value = '';
        }
    }
}

function executeCommand(command) {
    const cmd = command.toLowerCase();

    showLoading();

    setTimeout(() => {
        if (cmd.includes('room') || cmd.includes('space')) {
            generateRoom();
        }
        else if (cmd.includes('building')) {
            generateBuilding();
        }
        else if (cmd.includes('window')) {
            app.currentTool = 'window';
            const width = parseFloat(cmd.match(/(\d+\.?\d*)\s*m/)?.[1]) || 1.5;
            app.dimensions.width = width;
            createObject(new THREE.Vector3(0, 1.5, 0));
        }
        else if (cmd.includes('wall')) {
            app.currentTool = 'wall';
            const length = parseFloat(cmd.match(/(\d+\.?\d*)\s*m/)?.[1]) || 5;
            app.dimensions.width = length;
            createObject(new THREE.Vector3(0, 0, 0));
        }
        else if (cmd.includes('wood')) {
            applyMaterial('wood');
        }
        else if (cmd.includes('glass')) {
            applyMaterial('glass');
        }
        else if (cmd.includes('concrete')) {
            applyMaterial('concrete');
        }
        else if (cmd.includes('metal')) {
            applyMaterial('metal');
        }
        else if (cmd.includes('light')) {
            addLighting();
        }
        else if (cmd.includes('furnish')) {
            furnishRoom();
        }
        else {
            showToast('Processing: ' + command);
        }

        hideLoading();
        addToHistory(command, null);
    }, 500);
}

function addLighting() {
    const light1 = new THREE.PointLight(0xffffff, 1.5, 30);
    light1.position.set(3, 4, 3);
    light1.castShadow = true;
    app.scene.add(light1);

    const light2 = new THREE.PointLight(0xffffff, 1.2, 30);
    light2.position.set(-3, 4, -3);
    light2.castShadow = true;
    app.scene.add(light2);

    showToast('Lighting added');
}

function furnishRoom() {
    addObject('furniture', 'chair');
    setTimeout(() => addObject('furniture', 'table'), 200);
    setTimeout(() => addObject('furniture', 'chair'), 400);
    setTimeout(() => addObject('vegetation', 'plant'), 600);
    showToast('Room furnished!');
}

// History Management
function addToHistory(action, object) {
    const timeline = document.getElementById('timeline-content');
    const item = document.createElement('div');
    item.className = 'timeline-item';

    const icons = {
        wall: '▭', floor: '⬜', door: '▯', window: '▢',
        stairs: '⚏', column: '⬮', default: '✨'
    };

    const icon = icons[app.currentTool] || icons.default;

    item.innerHTML = `
        <div class="timeline-icon">${icon}</div>
        <div class="timeline-label">${action}</div>
    `;

    timeline.appendChild(item);
    timeline.scrollLeft = timeline.scrollWidth;

    app.history.push({ action, object, timestamp: Date.now() });
    app.historyIndex = app.history.length - 1;
}

function undo() {
    if (app.historyIndex > 0) {
        app.historyIndex--;
        const prevState = app.history[app.historyIndex];
        // This is a simplified undo/redo. A real implementation would need to
        // handle object creation/deletion and property changes more robustly.
        if (prevState.object) {
            app.scene.remove(app.selectedObject);
            app.objects.pop();
            app.scene.add(prevState.object);
            app.objects.push(prevState.object);
            selectObject(prevState.object);
        }
        showToast('Undo');
    }
}

function redo() {
    if (app.historyIndex < app.history.length - 1) {
        app.historyIndex++;
        const nextState = app.history[app.historyIndex];
        if (nextState.object) {
            app.scene.remove(app.selectedObject);
            app.objects.pop();
            app.scene.add(nextState.object);
            app.objects.push(nextState.object);
            selectObject(nextState.object);
        }
        showToast('Redo');
    }
}

function clearHistory() {
    if (confirm('Clear all history?')) {
        app.history = [];
        app.historyIndex = -1;
        document.getElementById('timeline-content').innerHTML = `
            <div class="timeline-item active">
                <div class="timeline-icon">🏁</div>
                <div class="timeline-label">Start</div>
            </div>
        `;
        showToast('History cleared');
    }
}

// Project Management
function saveProject() {
    showLoading();
    const projectData = {
        objects: app.objects.map(obj => ({
            type: obj.userData.type,
            position: obj.position.toArray(),
            scale: obj.scale.toArray(),
            material: {
                color: obj.material.color.getHex(),
                roughness: obj.material.roughness,
                metalness: obj.material.metalness
            }
        })),
        camera: {
            position: app.camera.position.toArray(),
            fov: app.camera.fov
        },
        timestamp: Date.now()
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'project.json';
    a.click();
    hideLoading();
    showToast('Project saved!');
}

function exportProject() {
    showLoading();
    const exporter = new THREE.GLTFExporter();
    exporter.parse(
        app.scene,
        function (result) {
            const blob = new Blob([result], { type: 'application/octet-stream' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'scene.glb';
            a.click();
            hideLoading();
            showToast('Exported to GLB!');
        },
        { binary: true }
    );
}

// Stats Update
function updateStats() {
    document.getElementById('stat-objects').textContent = app.objects.length;

    let totalPolygons = 0;
    app.objects.forEach(obj => {
        obj.traverse(child => {
            if (child.geometry && child.geometry.attributes.position) {
                totalPolygons += child.geometry.attributes.position.count / 3;
            }
        });
    });
    document.getElementById('stat-polygons').textContent = Math.floor(totalPolygons).toLocaleString();
}

// FPS Counter
let lastTime = performance.now();
let frameCount = 0;
setInterval(() => {
    const fps = Math.round(frameCount * 1000 / (performance.now() - lastTime));
    document.getElementById('stat-fps').textContent = fps;
    frameCount = 0;
    lastTime = performance.now();
}, 1000);

// UI Helpers
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('active');
    setTimeout(() => toast.classList.remove('active'), 3000);
}

function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Tool shortcuts
    if (e.key >= '1' && e.key <= '6') {
        const tools = ['wall', 'floor', 'door', 'window', 'stairs', 'column'];
        const tool = tools[parseInt(e.key) - 1];
        document.querySelectorAll('.tool-item')[parseInt(e.key) - 1].click();
    }

    // Action shortcuts
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
            e.preventDefault();
            saveProject();
        }
        if (e.key === 'z') {
            e.preventDefault();
            undo();
        }
        if (e.key === 'y') {
            e.preventDefault();
            redo();
        }
    }

    // Toggle shortcuts
    if (e.key === 'g') toggleGrid();
    if (e.key === 's' && !e.ctrlKey) toggleSnap();
    if (e.key === 'm') toggleMeasure();
    if (e.key === 'w') toggleWireframe();
    if (e.key === 'x') toggleXRay();

    // Delete
    if (e.key === 'Delete' && app.selectedObject) {
        app.scene.remove(app.selectedObject);
        const idx = app.objects.indexOf(app.selectedObject);
        if (idx > -1) app.objects.splice(idx, 1);
        app.selectedObject = null;
        showToast('Object deleted');
        addToHistory('Deleted object', null);
    }

    // Deselect
    if (e.key === 'Escape' && app.selectedObject) {
        if (app.selectedObject.material && app.selectedObject.material.emissive) {
            app.selectedObject.material.emissive.setHex(0x000000);
        }
        app.selectedObject = null;
        showToast('Deselected');
    }

    // Quick generate
    if (e.key === 'r' && !e.ctrlKey) {
        generateRoom();
    }
});

// Initialize
window.addEventListener('load', () => {
    initScene();

    // Try to load saved project
    const dxfInput = document.getElementById('dxf-input');
    const loadDxfBtn = document.getElementById('load-dxf-btn');

    loadDxfBtn.addEventListener('click', () => {
        dxfInput.click();
    });

    dxfInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dxfContent = e.target.result;
                const parser = new DxfParser();
                try {
                    const dxf = parser.parseSync(dxfContent);
                    const group = new THREE.Group();
                    dxf.entities.forEach((entity) => {
                        if (entity.type === 'LINE') {
                            const material = new THREE.LineBasicMaterial({ color: 0xffffff });
                            const points = [];
                            points.push(new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, entity.vertices[0].z || 0));
                            points.push(new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, entity.vertices[1].z || 0));
                            const geometry = new THREE.BufferGeometry().setFromPoints(points);
                            const line = new THREE.Line(geometry, material);
                            group.add(line);
                        }
                    });
                    app.scene.add(group);
                    app.objects.push(group);
                    addToHistory('Loaded DXF', group);
                    showToast('DXF loaded successfully!');
                } catch (err) {
                    console.error(err);
                    showToast('Error loading DXF file.');
                }
            };
            reader.readAsText(file);
        }
    });

    const saved = localStorage.getItem('archviz_project');
    if (saved) {
        setTimeout(() => {
            if (confirm('Load previous project?')) {
                // Load project logic here
                showToast('Project loaded');
            }
        }, 1000);
    }
});