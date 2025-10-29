import { initViewport, setView, toggleGrid, toggleAxes, getScene, getCamera, getRenderer, setSelectedObject } from './modules/three-setup.js';
import {
    updateViewportStats,
    updateGeometryList,
    showNodeProperties,
    populateContextMenu,
    zoomCanvas,
    resetZoom,
    updateStats
} from './modules/ui.js';
import {
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
} from './modules/nodes.js';

let sceneObjects = [];

function onViewportClick(event) {
    const canvas = document.getElementById('viewport');
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, getCamera());
    const intersects = raycaster.intersectObjects(sceneObjects, true);

    if (intersects.length > 0) {
        const firstIntersect = intersects[0].object;
        const selectableObject = traverseToFindSelectable(firstIntersect);
        selectObject(selectableObject);
    } else {
        selectObject(null);
    }
}

function traverseToFindSelectable(object) {
    if (object.userData.nodeId !== undefined) {
        return object;
    }
    if (object.parent) {
        return traverseToFindSelectable(object.parent);
    }
    return null;
}

function selectObject(object) {
    setSelectedObject(object);

    if (object && object.userData.nodeId !== undefined) {
        const node = getNodes().find(n => n.id === object.userData.nodeId);
        if (node && (!getSelectedNode() || getSelectedNode().id !== node.id)) {
            selectNode(node, false, selectObject);
        }
    } else if (!object && getSelectedNode()) {
        selectNode(null, false, selectObject);
    }
}

async function generateModel() {
    const scene = getScene();
    sceneObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
    sceneObjects = [];

    const executedOutputs = new Map();
    const sortedNodes = topologicalSort(getNodes(), getConnections());

    if (!sortedNodes) {
        console.error("Execution halted due to cycle in graph.");
        return;
    }

    for (const node of sortedNodes) {
        const hash = await getNodeStateHash(node, executedOutputs);
        const nodeCache = new Map();
        if (nodeCache.has(hash)) {
            executedOutputs.set(node.id, nodeCache.get(hash));
            continue;
        }

        const result = await executeNode(node, executedOutputs);
        executedOutputs.set(node.id, result);
        nodeCache.set(hash, result);

        if (node.type === 'output' && result) {
            scene.add(result);
            sceneObjects.push(result);
        }
    }

    if (sceneObjects.length === 0) {
        for (const result of executedOutputs.values()) {
            if (result && result.isObject3D) {
                const isUsedAsInput = getConnections().some(c => c.from.nodeId === result.userData.nodeId);
                if (!isUsedAsInput) {
                    scene.add(result);
                    sceneObjects.push(result);
                }
            }
        }
    }

    updateViewportStats(sceneObjects);
    updateGeometryList(sceneObjects, removeSceneObject);
}

function removeSceneObject(idx) {
    const scene = getScene();
    if (idx >= 0 && idx < sceneObjects.length) {
        const obj = sceneObjects[idx];
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
        sceneObjects.splice(idx, 1);
        updateGeometryList(sceneObjects, removeSceneObject);
        updateViewportStats(sceneObjects);
    }
}

function clearAll() {
    if (confirm('Clear all nodes and scene objects?')) {
        getNodes().forEach(node => {
            const nodeEl = document.getElementById(`node-${node.id}`);
            if (nodeEl) nodeEl.remove();
        });
        setNodes([]);
        setConnections([]);
        document.getElementById('connections-svg').innerHTML = '';

        const scene = getScene();
        sceneObjects.forEach(obj => {
            scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        sceneObjects = [];

        updateStats(getNodes(), getConnections());
        updateViewportStats(sceneObjects);
        updateGeometryList(sceneObjects, removeSceneObject);

        document.getElementById('node-properties').style.display = 'none';
        setSelectedNode(null);
    }
}
function addNodeFromContextMenu(type) {
    const contextMenu = document.getElementById('context-menu');
    const canvasContainer = document.getElementById('canvas-container');
    const rect = canvasContainer.getBoundingClientRect();
    const x = (parseInt(contextMenu.style.left, 10) - rect.left) / 1;
    const y = (parseInt(contextMenu.style.top, 10) - rect.top) / 1;
    createNode(type, x, y, () => updateStats(getNodes(), getConnections()));
    contextMenu.style.display = 'none';
}

window.addEventListener('load', () => {
    const { scene, camera, renderer } = initViewport(onViewportClick);

    document.querySelectorAll('.palette-node').forEach(node => {
        node.addEventListener('dragstart', (e) => {
            const type = e.currentTarget.dataset.type;
            e.dataTransfer.setData('nodeType', type);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    const canvasContainer = document.getElementById('canvas-container');
    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const nodeType = e.dataTransfer.getData('nodeType');
        if (nodeType && getNodeTemplates()[nodeType]) {
            const rect = canvasContainer.getBoundingClientRect();
            const x = (e.clientX - rect.left) / 1;
            const y = (e.clientY - rect.top) / 1;
            createNode(nodeType, x, y, () => updateStats(getNodes(), getConnections()));
        }
    });

    canvasContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const contextMenu = document.getElementById('context-menu');
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;
        populateContextMenu(getNodeTemplates(), addNodeFromContextMenu);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' && getSelectedNode()) {
            let connections = getConnections();
            connections = connections.filter(c =>
                c.from.nodeId !== getSelectedNode().id && c.to.nodeId !== getSelectedNode().id
            );
            setConnections(connections);

            const nodeEl = document.getElementById(`node-${getSelectedNode().id}`);
            if (nodeEl) nodeEl.remove();

            let nodes = getNodes();
            nodes = nodes.filter(n => n.id !== getSelectedNode().id);
            setNodes(nodes);
            setSelectedNode(null);

            updateConnections();
            updateStats(getNodes(), getConnections());
            document.getElementById('node-properties').style.display = 'none';
        }

        if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            generateModel();
        }
    });

    window.addEventListener('resize', () => {
        const container = document.getElementById('viewport').parentElement;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        updateConnections();
    });

    window.generateModel = generateModel;
    window.clearAll = clearAll;
    window.setView = setView;
    window.toggleGrid = toggleGrid;
    window.toggleAxes = toggleAxes;
    window.zoomCanvas = (direction) => {
        let zoom = 1;
        let canvasOffset = { x: 0, y: 0 };
        const canvas = document.getElementById('canvas');
        zoom = zoomCanvas(direction, zoom, canvas, canvasOffset, updateConnections);
    };
    window.resetZoom = () => {
        const canvas = document.getElementById('canvas');
        const { zoom, canvasOffset } = resetZoom(canvas, updateConnections);
    };
    window.updateNodeParam = updateNodeParam;
    window.removeSceneObject = removeSceneObject;
    window.addNodeFromContextMenu = addNodeFromContextMenu;
});
