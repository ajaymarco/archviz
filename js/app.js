import { initThree } from './three-setup.js';
import { loadDxf } from './dxf-loader.js';

document.addEventListener('DOMContentLoaded', () => {
    const projectManager = document.getElementById('project-manager');
    const editor = document.getElementById('editor');
    const newProjectBtn = document.getElementById('new-project-btn');
    const backToProjectsBtn = document.getElementById('back-to-projects-btn');
    const modeToolbar = document.getElementById('mode-toolbar');
    const viewportContainer = document.getElementById('viewport-container');
    const loadDxfBtn = document.getElementById('load-dxf-btn');
    const dxfInput = document.getElementById('dxf-input');

    let threeApp;

    function showProjectManager() {
        projectManager.style.display = 'flex';
        editor.classList.add('hidden');
    }

    function showEditor() {
        projectManager.style.display = 'none';
        editor.classList.remove('hidden');
        if (!threeApp) {
            threeApp = initThree(viewportContainer);
        }
    }

    // Event Listeners
    newProjectBtn.addEventListener('click', showEditor);
    backToProjectsBtn.addEventListener('click', showProjectManager);

    // Initial State
    showProjectManager();

    // DXF Loading
    loadDxfBtn.addEventListener('click', () => {
        dxfInput.click();
    });

    dxfInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && threeApp) {
            loadDxf(file, threeApp.scene);
        }
    });

    // Handle Mode Switching
    modeToolbar.addEventListener('click', (e) => {
        if (e.target.classList.contains('mode-btn')) {
            // Remove active class from all buttons
            modeToolbar.querySelectorAll('.mode-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            // Add active class to the clicked button
            e.target.classList.add('active');

            const mode = e.target.dataset.mode;
            console.log(`Switched to ${mode} mode.`);

            // Show/hide model tools
            const modelTools = document.getElementById('model-tools');
            if (mode === 'model') {
                modelTools.style.display = 'block';
            } else {
                modelTools.style.display = 'none';
            }
        }
    });

    // Placeholder for modeling tools
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tool = e.target.dataset.tool;
            console.log(`Selected tool: ${tool}`);
        });
    });

    // Set initial mode
    document.querySelector('.mode-btn[data-mode="model"]').click();
});
