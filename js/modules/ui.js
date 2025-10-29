
function updateViewportStats(sceneObjects) {
    let totalPolygons = 0;
    sceneObjects.forEach(obj => {
        obj.traverse((child) => {
            if (child.geometry && child.geometry.attributes.position) {
                totalPolygons += child.geometry.attributes.position.count / 3;
            }
        });
    });
    document.getElementById('poly-count').textContent = `Polygons: ${Math.floor(totalPolygons)}`;
    document.getElementById('object-count').textContent = `Objects: ${sceneObjects.length}`;
}

function updateGeometryList(sceneObjects, removeSceneObject) {
    const list = document.getElementById('geometry-list');

    if (sceneObjects.length === 0) {
        list.innerHTML = '<div class="empty-state">No objects yet.<br>Create a workflow and click Generate!</div>';
        return;
    }

    let html = '';
    sceneObjects.forEach((obj, idx) => {
        const typeName = obj.type === 'Group' ? `Group (${obj.children.length} items)` :
            obj.geometry ? obj.geometry.type.replace('Geometry', '') : 'Object';
        html += `
            <div class="geometry-item">
                <span>${typeName} #${idx}</span>
                <button class="delete-btn" onclick="removeSceneObject(${idx})">Delete</button>
            </div>
        `;
    });

    list.innerHTML = html;
}

function showNodeProperties(node, updateNodeParamLive) {
    const propSection = document.getElementById('node-properties');
    const propContent = document.getElementById('properties-content');

    propSection.style.display = 'block';

    let html = `<div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--node-border);">
                            <div style="font-size: 13px; font-weight: 600; color: var(--accent);">${node.title} #${node.id}</div>
                            <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px;">Type: ${node.type}</div>
                        </div>`;

    if (node.params && Object.keys(node.params).length > 0) {
        Object.entries(node.params).forEach(([key, value]) => {
            if (typeof value === 'number') {
                const max = key.includes('segments') ? 64 : key.includes('steps') ? 30 : 50;
                const step = value < 1 ? 0.1 : 1;
                html += `
                            <div class="prop-group">
                                <label class="prop-label">
                                    <span>${key}</span>
                                    <span class="prop-value">${value}</span>
                                </label>
                                <input type="range" class="prop-slider"
                                       min="0" max="${max}" step="${step}" value="${value}"
                                       oninput="updateNodeParamLive(${node.id}, '${key}', this.value)">
                            </div>
                        `;
            } else if (key === 'color') {
                html += `
                            <div class="prop-group">
                                <label class="prop-label">${key}</label>
                                <input type="color" class="prop-input" value="${value}"
                                       onchange="updateNodeParamLive(${node.id}, '${key}', this.value)">
                            </div>
                        `;
            } else {
                html += `
                            <div class="prop-group">
                                <label class="prop-label">${key}</label>
                                <input type="text" class="prop-input" value="${value}"
                                       onchange="updateNodeParamLive(${node.id}, '${key}', this.value)">
                            </div>
                        `;
            }
        });
    }

    propContent.innerHTML = html;
}

function populateContextMenu(nodeTemplates, addNodeFromContextMenu) {
    const contextMenu = document.getElementById('context-menu');
    let menuHTML = '';
    for (const type in nodeTemplates) {
        const template = nodeTemplates[type];
        menuHTML += `
            <div class="context-menu-item" onclick="addNodeFromContextMenu('${type}')">
                <span class="context-menu-icon">${template.icon}</span>
                <span>${template.title}</span>
            </div>
        `;
    }
    contextMenu.innerHTML = menuHTML;
}

function zoomCanvas(direction, zoom, canvas, canvasOffset, updateConnections) {
    if (direction === 'in') {
        zoom = Math.min(zoom + 0.1, 2);
    } else {
        zoom = Math.max(zoom - 0.1, 0.5);
    }
    canvas.style.transform = `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`;
    document.getElementById('zoom-level').textContent = `${Math.round(zoom * 100)}%`;
    updateConnections();
    return zoom;
}

function resetZoom(canvas, updateConnections) {
    const zoom = 1;
    const canvasOffset = { x: 0, y: 0 };
    canvas.style.transform = 'translate(0px, 0px) scale(1)';
    document.getElementById('zoom-level').textContent = '100%';
    updateConnections();
    return { zoom, canvasOffset };
}

function updateStats(nodes, connections) {
    document.getElementById('node-count').textContent = nodes.length;
    document.getElementById('connection-count').textContent = connections.length;
}

export {
    updateViewportStats,
    updateGeometryList,
    showNodeProperties,
    populateContextMenu,
    zoomCanvas,
    resetZoom,
    updateStats
};
