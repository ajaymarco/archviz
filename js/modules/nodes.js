
let nodes = [];
let connections = [];
let nodeIdCounter = 0;
let selectedNode = null;
let connectingFrom = null;
let canvasOffset = { x: 0, y: 0 };
let nodeCache = new Map();
let zoom = 1;
let isPanning = false;
let panStart = { x: 0, y: 0 };

const nodeTemplates = {
    'number': {
        title: 'Number',
        icon: '#',
        inputs: [],
        outputs: ['Value'],
        params: { value: 1 },
        color: '#18a'
    },
    'box': {
        title: 'Box',
        icon: '▢',
        inputs: [],
        outputs: ['Geometry'],
        params: { width: 5, height: 5, depth: 5, x: 0, y: 2.5, z: 0 },
        color: '#4a90e2'
    },
    'cylinder': {
        title: 'Cylinder',
        icon: '◯',
        inputs: [],
        outputs: ['Geometry'],
        params: { radius: 2, height: 5, segments: 32, x: 0, y: 2.5, z: 0 },
        color: '#5c7cfa'
    },
    'sphere': {
        title: 'Sphere',
        icon: '●',
        inputs: [],
        outputs: ['Geometry'],
        params: { radius: 3, segments: 32, x: 0, y: 3, z: 0 },
        color: '#748ffc'
    },
    'plane': {
        title: 'Plane',
        icon: '▬',
        inputs: [],
        outputs: ['Geometry'],
        params: { width: 20, height: 20, x: 0, y: 0, z: 0 },
        color: '#868e96'
    },
    'wall': {
        title: 'Wall',
        icon: '▯',
        inputs: ['Curve'],
        outputs: ['Geometry'],
        params: { height: 3, thickness: 0.2 },
        color: '#adb5bd'
    },
    'window': {
        title: 'Window',
        icon: '⬚',
        inputs: ['Wall'],
        outputs: ['Geometry'],
        params: { width: 2, height: 1.5, depth: 0.3, x: 0, y: 1.5, z: 0 },
        color: '#74c0fc'
    },
    'door': {
        title: 'Door',
        icon: '▭',
        inputs: ['Wall'],
        outputs: ['Geometry'],
        params: { width: 1, height: 2.2, depth: 0.1, x: 0, y: 1.1, z: 0 },
        color: '#a0785d'
    },
    'stairs': {
        title: 'Stairs',
        icon: '≡',
        inputs: [],
        outputs: ['Geometry'],
        params: { steps: 10, width: 3, stepHeight: 0.2, stepDepth: 0.3, x: 0, y: 0, z: 0 },
        color: '#868e96'
    },
    'roof': {
        title: 'Roof',
        icon: '△',
        inputs: [],
        outputs: ['Geometry'],
        params: { width: 12, length: 10, height: 3, x: 0, y: 5, z: 0 },
        color: '#c92a2a'
    },
    'array': {
        title: 'Array',
        icon: '▦',
        inputs: ['Geometry'],
        outputs: ['Geometry'],
        params: { countX: 3, countY: 1, countZ: 1, offsetX: 5, offsetY: 0, offsetZ: 0 },
        color: '#7950f2'
    },
    'transform': {
        title: 'Transform',
        icon: '⤨',
        inputs: ['Geometry', 'Transform'],
        outputs: ['Geometry'],
        params: { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, rotZ: 0, scale: 1 },
        color: '#f76707'
    },
    'material': {
        title: 'Material',
        icon: '🎨',
        inputs: ['Geometry'],
        outputs: ['Geometry'],
        params: { color: '#4a90e2', metalness: 0.3, roughness: 0.5 },
        color: '#f06595'
    },
    'output': {
        title: 'Output',
        icon: '→',
        inputs: ['Geometry'],
        outputs: [],
        params: {},
        color: '#00e5ff'
    },
    'subtract': {
        title: 'Subtract',
        icon: '−',
        inputs: ['A', 'B'],
        outputs: ['Result'],
        params: {},
        color: '#e67e22'
    },
    'union': {
        title: 'Union',
        icon: '+',
        inputs: ['A', 'B'],
        outputs: ['Result'],
        params: {},
        color: '#2ecc71'
    },
    'intersect': {
        title: 'Intersect',
        icon: '∩',
        inputs: ['A', 'B'],
        outputs: ['Result'],
        params: {},
        color: '#f1c40f'
    },
    'load_dxf': {
        title: 'Load DXF',
        icon: '📁',
        inputs: [],
        outputs: ['Geometry'],
        params: { file: null },
        color: '#9b59b6'
    },
    'extrude': {
        title: 'Extrude',
        icon: '⇧',
        inputs: ['Geometry'],
        outputs: ['Geometry'],
        params: { height: 3 },
        color: '#1abc9c'
    },
    'vector': {
        title: 'Vector',
        icon: 'V',
        inputs: [],
        outputs: ['Vector3'],
        params: { x: 0, y: 0, z: 0 },
        color: '#f39c12'
    },
    'compose_transform': {
        title: 'Compose Transform',
        icon: 'T',
        inputs: ['Translation', 'Rotation', 'Scale'],
        outputs: ['Transform'],
        params: {},
        color: '#f39c12'
    },
    'merge': {
        title: 'Merge',
        icon: '⧉',
        inputs: ['Geometry 1', 'Geometry 2'],
        outputs: ['Geometry'],
        params: {},
        color: '#20c997',
        dynamicInputs: true
    }
};

function createNode(type, x, y, updateStats) {
    const template = nodeTemplates[type];
    if (!template) return;

    const node = {
        id: nodeIdCounter++,
        type,
        x,
        y,
        ...template
    };

    nodes.push(node);
    renderNode(node);
    updateStats();
}

function renderNode(node) {
    const canvas = document.getElementById('canvas');
    const nodeEl = document.createElement('div');
    nodeEl.className = 'workflow-node';
    nodeEl.id = `node-${node.id}`;
    nodeEl.style.left = `${node.x}px`;
    nodeEl.style.top = `${node.y}px`;

    let paramsHTML = '';
    if (node.params && Object.keys(node.params).length > 0) {
        Object.entries(node.params).forEach(([key, value]) => {
            const inputType = key === 'file' ? 'file' : typeof value === 'number' ? 'number' :
                key === 'color' ? 'color' : 'text';
            const step = typeof value === 'number' && value < 1 ? '0.1' : '1';

            paramsHTML += `
                <div class="node-param">
                    <div class="port input">
                        <div class="port-dot" data-node="${node.id}" data-port="${key}" data-type="param-input"></div>
                        <div class="param-label">${key}</div>
                    </div>
                    <input type="${inputType}"
                           class="param-input"
                           ${inputType === 'file' ? '' : `value="${value}"`}
                           step="${step}"
                           data-param="${key}"
                           onchange="updateNodeParam(${node.id}, '${key}', this.value, '${inputType}')">
                </div>
            `;
        });
    }

    let portsHTML = '';
    if (node.inputs && node.inputs.length > 0) {
        portsHTML += '<div class="node-ports">';
        node.inputs.forEach((input, idx) => {
            portsHTML += `
                <div class="port input">
                    <div class="port-dot" data-node="${node.id}" data-port="${idx}" data-type="input"></div>
                    <div class="port-label">${input}</div>
                </div>
            `;
        });
        portsHTML += '</div>';
    }

    if (node.outputs && node.outputs.length > 0) {
        portsHTML += '<div class="node-ports">';
        node.outputs.forEach((output, idx) => {
            portsHTML += `
                <div class="port output">
                    <div class="port-label">${output}</div>
                    <div class="port-dot" data-node="${node.id}" data-port="${idx}" data-type="output"></div>
                </div>
            `;
        });
        portsHTML += '</div>';
    }

    nodeEl.innerHTML = `
        <div class="node-header">
            <span class="node-header-icon">${node.icon}</span>
            <span class="node-header-title">${node.title}</span>
        </div>
        <div class="node-body">
            ${paramsHTML}
            ${portsHTML}
        </div>
    `;

    if (node.dynamicInputs) {
        const addButton = document.createElement('button');
        addButton.textContent = '+ Add Input';
        addButton.className = 'btn';
        addButton.style.width = '100%';
        addButton.style.marginTop = '10px';
        addButton.onclick = () => addDynamicInput(node.id);
        const body = nodeEl.querySelector('.node-body');
        body.appendChild(addButton);
    }

    canvas.appendChild(nodeEl);
    makeNodeDraggable(nodeEl, node);

    // Port connections
    nodeEl.querySelectorAll('.port-dot').forEach(dot => {
        dot.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            handlePortClick(dot);
        });
    });

    // Node selection
    nodeEl.addEventListener('click', (e) => {
        if (!e.target.classList.contains('port-dot') &&
            !e.target.classList.contains('param-input')) {
            selectNode(node);
        }
    });
}

function makeNodeDraggable(element, node) {
    let isDragging = false;
    let dragStartX, dragStartY;

    const header = element.querySelector('.node-header');

    header.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            isDragging = true;
            dragStartX = e.clientX - node.x * zoom;
            dragStartY = e.clientY - node.y * zoom;
            e.stopPropagation();
        }
    });

    const handleMouseMove = (e) => {
        if (isDragging) {
            node.x = (e.clientX - dragStartX) / zoom;
            node.y = (e.clientY - dragStartY) / zoom;
            element.style.left = `${node.x}px`;
            element.style.top = `${node.y}px`;
            updateConnections();
        }
    };

    const handleMouseUp = () => {
        isDragging = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

function handlePortClick(dot) {
    const nodeId = parseInt(dot.dataset.node);
    const port = dot.dataset.port;
    const type = dot.dataset.type;

    if (!connectingFrom) {
        connectingFrom = { nodeId, port, type };
        dot.style.transform = 'scale(1.5)';
    } else {
        if (connectingFrom.type !== type && connectingFrom.nodeId !== nodeId) {
            const connection = connectingFrom.type === 'output'
                ? { from: connectingFrom, to: { nodeId, port, type } }
                : { from: { nodeId, port, type }, to: connectingFrom };

            // Prevent multiple connections to the same input port
            if (!connections.some(c => c.to.nodeId === connection.to.nodeId && c.to.port === connection.to.port)) {
                connections.push(connection);
                if (connection.to.type === 'param-input') {
                    const inputEl = document.querySelector(`#node-${connection.to.nodeId} [data-param="${connection.to.port}"]`);
                    if (inputEl) inputEl.disabled = true;
                }
            }
            updateConnections();
            updateStats();
        }

        document.querySelectorAll('.port-dot').forEach(d => {
            d.style.transform = '';
        });
        connectingFrom = null;
    }
}

function addDynamicInput(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
        const newPortIndex = node.inputs.length;
        node.inputs.push(`Geometry ${newPortIndex + 1}`);

        const nodeEl = document.getElementById(`node-${nodeId}`);
        nodeEl.remove();
        renderNode(node);
        updateConnections();
        nodeCache.clear();
    }
}

function updateConnections() {
    const connectionsSvg = document.getElementById('connections-svg');
    const canvasContainer = document.getElementById('canvas-container');
    connectionsSvg.innerHTML = '';

    connections.forEach((conn, index) => {
        const fromNode = nodes.find(n => n.id === conn.from.nodeId);
        const toNode = nodes.find(n => n.id === conn.to.nodeId);

        if (!fromNode || !toNode) return;

        const fromSelector = `#node-${fromNode.id} .port.output .port-dot[data-port="${conn.from.port}"]`;
        const toSelector = `#node-${toNode.id} .port-dot[data-port="${conn.to.port}"]`;

        const fromEl = document.querySelector(fromSelector);
        const toEl = document.querySelector(toSelector);

        if (!fromEl || !toEl) return;

        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const containerRect = canvasContainer.getBoundingClientRect();

        const x1 = fromRect.left + fromRect.width / 2 - containerRect.left;
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top;
        const x2 = toRect.left + toRect.width / 2 - containerRect.left;
        const y2 = toRect.top + toRect.height / 2 - containerRect.top;

        const dx = x2 - x1;
        const controlOffset = Math.abs(dx) * 0.5;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'connection-path');
        if (selectedNode && (conn.from.nodeId === selectedNode.id || conn.to.nodeId === selectedNode.id)) {
            path.classList.add('selected');
        }
        path.setAttribute('d', `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`);
        path.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            connections.splice(index, 1);
            if (conn.to.type === 'param-input') {
                const inputEl = document.querySelector(`#node-${conn.to.nodeId} [data-param="${conn.to.port}"]`);
                if (inputEl) inputEl.disabled = false;
            }
            nodeCache.clear(); // Invalidate cache on connection change
            updateConnections();
            updateStats();
        });
        connectionsSvg.appendChild(path);
    });
}

function updateNodeParam(nodeId, paramName, value, inputType) {
    const node = nodes.find(n => n.id === nodeId);
    if (node && node.params) {
        if (inputType === 'file') {
            const file = event.target.files[0];
            node.params[paramName] = file; // Store the file object directly
        } else if (inputType === 'number') {
            node.params[paramName] = parseFloat(value) || 0;
        } else {
            node.params[paramName] = value;
        }

        if (selectedNode && selectedNode.id === nodeId) {
            showNodeProperties(node);
        }
        nodeCache.clear(); // Invalidate cache on param change
    }
}

function selectNode(node, fromViewport = true, selectObjectCallback) {
    document.querySelectorAll('.workflow-node').forEach(el => el.classList.remove('selected'));

    if (!node) {
        selectedNode = null;
        document.getElementById('node-properties').style.display = 'none';
        if (fromViewport) selectObjectCallback(null);
        return;
    }

    selectedNode = node;
    const nodeEl = document.getElementById(`node-${node.id}`);
    if (nodeEl) nodeEl.classList.add('selected');

    showNodeProperties(node);
    updateConnections();

    if (fromViewport) {
        const correspondingObject = sceneObjects.find(obj => obj.userData.nodeId === node.id);
        selectObjectCallback(correspondingObject || null);
    }
}

function topologicalSort(nodes, connections) {
    const inDegree = new Map(nodes.map(node => [node.id, 0]));
    const adj = new Map(nodes.map(node => [node.id, []]));

    for (const conn of connections) {
        const from = conn.from.nodeId;
        const to = conn.to.nodeId;
        if (adj.has(from) && inDegree.has(to)) {
            adj.get(from).push(to);
            inDegree.set(to, inDegree.get(to) + 1);
        }
    }

    const queue = nodes.filter(node => inDegree.get(node.id) === 0).map(node => node.id);
    const sorted = [];

    while (queue.length > 0) {
        const u = queue.shift();
        const node = nodes.find(n => n.id === u);
        sorted.push(node);

        if (adj.has(u)) {
            for (const v of adj.get(u)) {
                if (inDegree.has(v)) {
                    inDegree.set(v, inDegree.get(v) - 1);
                    if (inDegree.get(v) === 0) {
                        queue.push(v);
                    }
                }
            }
        }
    }

    if (sorted.length !== nodes.length) {
        console.error("Cycle detected in graph");
        return null; // Cycle detected
    }

    return sorted;
}

async function getNodeStateHash(node, executedOutputs) {
    const inputs = connections.filter(c => c.to.nodeId === node.id);
    const inputHashes = await Promise.all(inputs.map(async conn => {
        const sourceNode = nodes.find(n => n.id === conn.from.nodeId);
        return sourceNode ? executedOutputs.get(sourceNode.id) : null;
    }));

    // For file inputs, we need a unique identifier like file name + size + last modified
    const params = {};
    for (const key in node.params) {
        if (node.params[key] instanceof File) {
            const file = node.params[key];
            params[key] = `${file.name}-${file.size}-${file.lastModified}`;
        } else {
            params[key] = node.params[key];
        }
    }

    return JSON.stringify({ params, inputs: inputHashes });
}

async function executeNode(node, executedOutputs) {

    // Animate node
    const nodeEl = document.getElementById(`node-${node.id}`);
    if (nodeEl) {
        nodeEl.classList.add('executing');
        setTimeout(() => nodeEl.classList.remove('executing'), 600);
    }

    // Get inputs from already executed nodes
    const inputConnections = connections.filter(c => c.to.nodeId === node.id && c.to.type === 'input');
    const inputs = inputConnections.map(conn => executedOutputs.get(conn.from.nodeId));

    // Get params from connections or local values
    const p = {};
    if (node.params) {
        for (const key in node.params) {
            const paramConnection = connections.find(c => c.to.nodeId === node.id && c.to.port === key);
            if (paramConnection) {
                p[key] = executedOutputs.get(paramConnection.from.nodeId);
            } else {
                p[key] = node.params[key];
            }
        }
    }

    // Execute based on type
    let result = null;

    switch (node.type) {
        case 'number':
            result = p.value || 0;
            break;
        case 'box':
            const boxGeom = new THREE.BoxGeometry(p.width || 5, p.height || 5, p.depth || 5);
            const boxMat = new THREE.MeshStandardMaterial({
                color: node.color || 0x4a90e2,
                metalness: 0.3,
                roughness: 0.5
            });
            result = new THREE.Mesh(boxGeom, boxMat);
            result.position.set(p.x || 0, p.y || 2.5, p.z || 0);
            break;

        case 'cylinder':
            const cylGeom = new THREE.CylinderGeometry(
                p.radius || 2, p.radius || 2, p.height || 5, p.segments || 32
            );
            const cylMat = new THREE.MeshStandardMaterial({
                color: node.color || 0x5c7cfa,
                metalness: 0.3,
                roughness: 0.5
            });
            result = new THREE.Mesh(cylGeom, cylMat);
            result.position.set(p.x || 0, p.y || 2.5, p.z || 0);
            break;

        case 'sphere':
            const sphereGeom = new THREE.SphereGeometry(p.radius || 3, p.segments || 32, p.segments || 32);
            const sphereMat = new THREE.MeshStandardMaterial({
                color: node.color || 0x748ffc,
                metalness: 0.3,
                roughness: 0.5
            });
            result = new THREE.Mesh(sphereGeom, sphereMat);
            result.position.set(p.x || 0, p.y || 3, p.z || 0);
            break;

        case 'plane':
            const planeGeom = new THREE.PlaneGeometry(p.width || 20, p.height || 20);
            const planeMat = new THREE.MeshStandardMaterial({
                color: node.color || 0x868e96,
                metalness: 0.1,
                roughness: 0.9,
                side: THREE.DoubleSide
            });
            result = new THREE.Mesh(planeGeom, planeMat);
            result.rotation.x = -Math.PI / 2;
            result.position.set(p.x || 0, p.y || 0, p.z || 0);
            break;

        case 'wall':
            if (inputs[0]) {
                const curve = inputs[0];
                const wallShape = new THREE.Shape();
                const thickness = p.thickness || 0.2;
                wallShape.moveTo(0, -thickness / 2);
                wallShape.lineTo(0, thickness / 2);

                const extrudeSettings = {
                    steps: curve.points.length * 2,
                    extrudePath: curve
                };
                const wallGeometry = new THREE.ExtrudeGeometry(wallShape, extrudeSettings);
                const wallMaterial = new THREE.MeshStandardMaterial({ color: node.color || 0xcccccc });
                result = new THREE.Mesh(wallGeometry, wallMaterial);
            }
            break;
        case 'window':
            const windowGroup = new THREE.Group();
            const frameThickness = 0.05;
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

            // Frame parts
            const topFrame = new THREE.Mesh(
                new THREE.BoxGeometry(p.width || 2, frameThickness, p.depth || 0.3),
                frameMat
            );
            topFrame.position.y = (p.height || 1.5) / 2;
            windowGroup.add(topFrame);

            const bottomFrame = topFrame.clone();
            bottomFrame.position.y = -(p.height || 1.5) / 2;
            windowGroup.add(bottomFrame);

            const leftFrame = new THREE.Mesh(
                new THREE.BoxGeometry(frameThickness, p.height || 1.5, p.depth || 0.3),
                frameMat
            );
            leftFrame.position.x = -(p.width || 2) / 2;
            windowGroup.add(leftFrame);

            const rightFrame = leftFrame.clone();
            rightFrame.position.x = (p.width || 2) / 2;
            windowGroup.add(rightFrame);

            // Glass
            const glassMat = new THREE.MeshPhysicalMaterial({
                color: 0x88ccff,
                metalness: 0,
                roughness: 0.1,
                transparent: true,
                opacity: 0.4,
                transmission: 0.9
            });
            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(
                    (p.width || 2) - frameThickness * 2,
                    (p.height || 1.5) - frameThickness * 2,
                    0.02
                ),
                glassMat
            );
            windowGroup.add(glass);
            windowGroup.position.set(p.x || 0, p.y || 1.5, p.z || 0);
            result = windowGroup;
            break;

        case 'door':
            const doorGroup = new THREE.Group();
            const doorMat = new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                metalness: 0.2,
                roughness: 0.8
            });
            const doorPanel = new THREE.Mesh(
                new THREE.BoxGeometry(p.width || 1, p.height || 2.2, p.depth || 0.1),
                doorMat
            );
            doorGroup.add(doorPanel);

            const handleMat = new THREE.MeshStandardMaterial({
                color: 0xcccccc,
                metalness: 0.8,
                roughness: 0.2
            });
            const handle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.03, 0.15, 8),
                handleMat
            );
            handle.rotation.z = Math.PI / 2;
            handle.position.set((p.width || 1) * 0.4, 0, (p.depth || 0.1) / 2 + 0.05);
            doorGroup.add(handle);

            doorGroup.position.set(p.x || 0, p.y || 1.1, p.z || 0);
            result = doorGroup;
            break;

        case 'stairs':
            const stairsGroup = new THREE.Group();
            const stepMat = new THREE.MeshStandardMaterial({
                color: node.color || 0x999999,
                metalness: 0.2,
                roughness: 0.7
            });

            for (let i = 0; i < (p.steps || 10); i++) {
                const step = new THREE.Mesh(
                    new THREE.BoxGeometry(p.width || 3, p.stepHeight || 0.2, p.stepDepth || 0.3),
                    stepMat
                );
                step.position.set(
                    0,
                    i * (p.stepHeight || 0.2) + (p.stepHeight || 0.2) / 2,
                    i * (p.stepDepth || 0.3)
                );
                stairsGroup.add(step);
            }
            stairsGroup.position.set(p.x || 0, p.y || 0, p.z || 0);
            result = stairsGroup;
            break;

        case 'roof':
            const roofGroup = new THREE.Group();
            const roofMat = new THREE.MeshStandardMaterial({
                color: node.color || 0xc92a2a,
                metalness: 0.3,
                roughness: 0.7
            });

            const slopeLength = Math.sqrt((p.height || 3) ** 2 + ((p.length || 10) / 2) ** 2);
            const slopeAngle = Math.atan2(p.height || 3, (p.length || 10) / 2);

            const slope1 = new THREE.Mesh(
                new THREE.BoxGeometry(p.width || 12, 0.2, slopeLength),
                roofMat
            );
            slope1.rotation.x = slopeAngle;
            slope1.position.set(0, (p.height || 3) / 2, (p.length || 10) / 4);
            roofGroup.add(slope1);

            const slope2 = slope1.clone();
            slope2.rotation.x = -slopeAngle;
            slope2.position.z = -(p.length || 10) / 4;
            roofGroup.add(slope2);

            roofGroup.position.set(p.x || 0, p.y || 5, p.z || 0);
            result = roofGroup;
            break;

        case 'array':
            if (inputs[0]) {
                const arrayGroup = new THREE.Group();
                for (let x = 0; x < (p.countX || 3); x++) {
                    for (let y = 0; y < (p.countY || 1); y++) {
                        for (let z = 0; z < (p.countZ || 1); z++) {
                            const clone = inputs[0].clone();
                            clone.position.x += x * (p.offsetX || 5);
                            clone.position.y += y * (p.offsetY || 0);
                            clone.position.z += z * (p.offsetZ || 0);
                            arrayGroup.add(clone);
                        }
                    }
                }
                result = arrayGroup;
            }
            break;

        case 'transform':
            if (inputs[0]) {
                result = inputs[0].clone();
                if (inputs[1] && typeof inputs[1] === 'object') { // Transform input
                    const t = inputs[1];
                    if (t.translation) result.position.copy(t.translation);
                    if (t.rotation) result.rotation.set(t.rotation.x, t.rotation.y, t.rotation.z);
                    if (t.scale) result.scale.copy(t.scale);
                } else { // Manual params
                    result.position.set(p.x || 0, p.y || 0, p.z || 0);
                    result.rotation.set(
                        (p.rotX || 0) * Math.PI / 180,
                        (p.rotY || 0) * Math.PI / 180,
                        (p.rotZ || 0) * Math.PI / 180
                    );
                    result.scale.setScalar(p.scale || 1);
                }
            }
            break;
        case 'vector':
            result = new THREE.Vector3(p.x || 0, p.y || 0, p.z || 0);
            break;

        case 'compose_transform':
            result = {
                translation: inputs[0] || new THREE.Vector3(),
                rotation: inputs[1] ? new THREE.Euler(inputs[1].x * Math.PI / 180, inputs[1].y * Math.PI / 180, inputs[1].z * Math.PI / 180) : new THREE.Euler(),
                scale: inputs[2] || new THREE.Vector3(1, 1, 1)
            };
            break;
        case 'merge':
            const mergeGroup = new THREE.Group();
            inputs.forEach(input => {
                if (input) {
                    mergeGroup.add(input.clone());
                }
            });
            result = mergeGroup;
            break;
        case 'material':
            if (inputs[0]) {
                result = inputs[0].clone();
                const newMat = new THREE.MeshStandardMaterial({
                    color: p.color || '#4a90e2',
                    metalness: p.metalness || 0.3,
                    roughness: p.roughness || 0.5
                });
                result.traverse((child) => {
                    if (child.isMesh) {
                        child.material = newMat.clone();
                    }
                });
            }
            break;

        case 'output':
            result = inputs[0] || null;
            break;
        case 'subtract':
            if (inputs[0] && inputs[1]) {
                const csg = new ThreeCSG();
                csg.subtract(inputs[0], inputs[1]);
                result = csg.toMesh();
            }
            break;
        case 'union':
            if (inputs[0] && inputs[1]) {
                const csg = new ThreeCSG();
                csg.union(inputs[0], inputs[1]);
                result = csg.toMesh();
            }
            break;
        case 'intersect':
            if (inputs[0] && inputs[1]) {
                const csg = new ThreeCSG();
                csg.intersect(inputs[0], inputs[1]);
                result = csg.toMesh();
            }
            break;
        case 'extrude':
            if (inputs[0]) {
                const group = new THREE.Group();
                inputs[0].children.forEach(line => {
                    const points = line.geometry.attributes.position.array;
                    const shape = new THREE.Shape();
                    shape.moveTo(points[0], points[1]);
                    for (let i = 2; i < points.length; i += 3) {
                        shape.lineTo(points[i], points[i + 1]);
                    }

                    const extrudeSettings = { depth: p.height || 3, bevelEnabled: false };
                    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
                    const mesh = new THREE.Mesh(geometry, material);
                    group.add(mesh);
                });
                result = group;
            }
            break;
        case 'load_dxf':
            if (p.file) {
                try {
                    const fileContent = await p.file.text();
                    const parser = new DxfParser();
                    const dxf = parser.parseSync(fileContent);
                    if (dxf) {
                        const points = [];
                        // Simple stitch logic: assumes segments are somewhat ordered
                        dxf.entities.forEach(entity => {
                            if (entity.type === 'LINE') {
                                if (points.length === 0) {
                                    points.push(new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, 0));
                                    points.push(new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, 0));
                                } else {
                                    const lastPoint = points[points.length - 1];
                                    const p1 = new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, 0);
                                    const p2 = new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, 0);
                                    if (lastPoint.distanceTo(p1) < 0.1) {
                                        points.push(p2);
                                    } else {
                                        points.push(p1);
                                        points.push(p2);
                                    }
                                }
                            } else if (entity.type === 'LWPOLYLINE') {
                                entity.vertices.forEach(v => points.push(new THREE.Vector3(v.x, v.y, 0)));
                            }
                        });
                        result = new THREE.CatmullRomCurve3(points);
                    } else {
                        result = null;
                    }
                } catch (err) {
                    console.error("Error parsing DXF file:", err);
                    result = null;
                }
            }
            break;
    }
    if (result && result.isObject3D) {
        result.userData.nodeId = node.id;
    }
    return result;
}

function getNodes() {
    return nodes;
}

function getConnections() {
    return connections;
}

function getSelectedNode() {
    return selectedNode;
}

function setConnections(newConnections) {
    connections = newConnections;
}

function setNodes(newNodes) {
    nodes = newNodes;
}

function setSelectedNode(newNode) {
    selectedNode = newNode;
}

function getNodeTemplates() {
    return nodeTemplates;
}

export {
    createNode,
    renderNode,
    makeNodeDraggable,
    handlePortClick,
    addDynamicInput,
    updateConnections,
    updateNodeParam,
    selectNode,
    topologicalSort,
    getNodeStateHash,
    executeNode,
    getNodes,
    getConnections,
    getSelectedNode,
    setConnections,
    setNodes,
    setSelectedNode,
    getNodeTemplates
};
