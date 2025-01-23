// DOM Elements
const loadNotebookButton = document.getElementById('load-notebook');
const notebookInput = document.getElementById('notebook-input');
const fetchNotebookButton = document.getElementById('fetch-notebook');
const notebookUrlInput = document.getElementById('notebook-url');
const notebookContent = document.getElementById('notebook-content');
const sampleButtons = document.querySelectorAll('.sample-button');

// Button click opens file dialog
loadNotebookButton.addEventListener('click', () => {
    notebookInput.click();
});

// Handle file selection
notebookInput.addEventListener('change', (event) => {
    const file = event.target.files[0];

    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const notebookData = JSON.parse(e.target.result);
                renderNotebook(notebookData);
            } catch (err) {
                notebookContent.innerHTML = `<p style="color: red;">Error: Invalid .ipynb file</p>`;
                console.error("Error parsing .ipynb file:", err);
            }
        };
        reader.readAsText(file);
    } else {
        notebookContent.innerHTML = `<p style="color: red;">No file selected.</p>`;
    }
});

// Handle fetching .ipynb from URL
fetchNotebookButton.addEventListener('click', () => {
    const url = notebookUrlInput.value.trim();

    if (!url) {
        notebookContent.innerHTML = `<p style="color: red;">Please enter a valid URL.</p>`;
        return;
    }

    fetchNotebook(url);
});

// Handle sample notebook buttons
sampleButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const url = button.dataset.url;
        fetchNotebook(url);
    });
});

// Fetch notebook from URL
function fetchNotebook(url) {
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch notebook. Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            renderNotebook(data);
        })
        .catch(err => {
            notebookContent.innerHTML = `<p style="color: red;">Error: Unable to fetch notebook from the provided URL.</p>`;
            console.error("Error fetching .ipynb file:", err);
        });
}

// Render notebook content
function renderNotebook(notebookData) {
    notebookContent.innerHTML = ''; // Clear previous content
    const dependencies = new Set();

    if (!notebookData.cells || !Array.isArray(notebookData.cells)) {
        notebookContent.innerHTML = `<p style="color: red;">Error: Invalid notebook structure</p>`;
        return;
    }

    notebookData.cells.forEach((cell, cellIndex) => {
        const cellElement = document.createElement('div');
        cellElement.classList.add('cell');

        if (cell.cell_type === 'markdown') {
            cellElement.classList.add('markdown');
            cellElement.innerHTML = marked.parse(cell.source.join('')); // Render markdown
        } else if (cell.cell_type === 'code') {
            cellElement.classList.add('code');

            const code = cell.source.join('');
            const textarea = document.createElement('textarea');
            textarea.classList.add('code-editor');
            textarea.textContent = code;

            const outputDiv = document.createElement('div');
            outputDiv.classList.add('output');

            // Render pre-saved outputs from the notebook
            if (cell.outputs) {
                cell.outputs.forEach(output => {
                    if (output.output_type === 'stream') {
                        const outputText = document.createElement('pre');
                        outputText.textContent = output.text.join('');
                        outputDiv.appendChild(outputText);
                    } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
                        const outputText = document.createElement('pre');
                        outputText.textContent = JSON.stringify(output.data, null, 2);
                        outputDiv.appendChild(outputText);
                    }
                });
            }

            // Automatically execute code with py-repl
            const pyRepl = document.createElement('py-repl');
            pyRepl.innerHTML = code;

            // Append elements
            cellElement.appendChild(textarea);
            cellElement.appendChild(pyRepl);
            cellElement.appendChild(outputDiv);
        } else {
            cellElement.textContent = 'Unsupported cell type';
        }

        notebookContent.appendChild(cellElement);
    });

    // Add dependencies to <py-env>
    updatePyEnv(getAllDependencies(notebookData.cells));
}

// Parse dependencies from all cells
function getAllDependencies(cells) {
    const dependencies = new Set();

    cells.forEach(cell => {
        if (cell.cell_type === 'code') {
            const code = cell.source.join('');
            parseDependencies(code).forEach(dep => dependencies.add(dep));
        }
    });

    return Array.from(dependencies);
}

// Parse dependencies from Python code
function parseDependencies(code) {
    const importRegex = /^\s*(?:from\s+(\S+)|import\s+(\S+))/gm;
    const deps = new Set();
    let match;

    while ((match = importRegex.exec(code)) !== null) {
        const moduleName = match[1] || match[2];
        if (moduleName) {
            deps.add(moduleName.split('.')[0]); // Use top-level module
        }
    }

    return Array.from(deps);
}

// Update <py-env> dynamically
function updatePyEnv(dependencies) {
    let pyEnv = document.querySelector('py-env');
    if (pyEnv) {
        pyEnv.remove(); // Remove old py-env
    }

    pyEnv = document.createElement('py-env');
    pyEnv.innerHTML = dependencies.map(dep => `- ${dep}`).join('\n');
    document.body.appendChild(pyEnv);
}

