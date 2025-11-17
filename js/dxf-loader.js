import * as THREE from 'three';
import { DxfParser } from 'dxf-parser';

export function loadDxf(file, scene) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const fileContent = event.target.result;
        const parser = new DxfParser();
        try {
            const dxf = parser.parseSync(fileContent);
            if (dxf) {
                // Clear previous DXF objects
                const oldDxfObject = scene.getObjectByName('dxf-object');
                if (oldDxfObject) {
                    scene.remove(oldDxfObject);
                }

                const dxfObject = new THREE.Group();
                dxfObject.name = 'dxf-object';

                const material = new THREE.LineBasicMaterial({ color: 0xffffff });

                for (const entity of dxf.entities) {
                    if (entity.type === 'LINE') {
                        const points = [];
                        points.push(new THREE.Vector3(entity.vertices[0].x, entity.vertices[0].y, 0));
                        points.push(new THREE.Vector3(entity.vertices[1].x, entity.vertices[1].y, 0));
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        const line = new THREE.Line(geometry, material);
                        dxfObject.add(line);
                    } else if (entity.type === 'LWPOLYLINE') {
                        const points = [];
                        for (const vertex of entity.vertices) {
                            points.push(new THREE.Vector3(vertex.x, vertex.y, 0));
                        }
                        if (entity.flags === 1) { // Closed polyline
                            points.push(points[0]);
                        }
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        const line = new THREE.Line(geometry, material);
                        dxfObject.add(line);
                    }
                }
                scene.add(dxfObject);
            }
        } catch (err) {
            console.error(err);
            alert('Error parsing DXF file.');
        }
    };
    reader.readAsText(file);
}
