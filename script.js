// ============================================================
//  Warshall's Algorithm — Transitive Closure Visualizer
//  script.js
// ============================================================

// ----- ENTRY POINT -----
// Called when the user clicks "Compute"
function runWarshall() {
  // Clear any previous output and error messages
  clearOutput();

  const input = document.getElementById('matrix-input').value.trim();

  // Parse the user input into a 2D array (matrix)
  const matrix = parseMatrix(input);
  if (!matrix) return; // parseMatrix shows an error if input is invalid

  const n = matrix.length; // number of nodes

  // Show the output section (was hidden initially)
  document.getElementById('output-section').classList.remove('hidden');

  // 1. Display the initial matrix
  renderMatrix(matrix, 'initial-matrix');

  // 2. Run Warshall's algorithm step by step and collect snapshots
  const steps = warshallSteps(matrix, n);

  // 3. Render each step
  renderSteps(steps, n);

  // 4. Display the final transitive closure (last step's matrix)
  const finalMatrix = steps[steps.length - 1].matrix;
  renderMatrix(finalMatrix, 'final-matrix');
}


// ----- PARSE INPUT -----
// Converts the textarea string into a 2D array of 0s and 1s.
// Input format: rows separated by commas, values by spaces.
// e.g. "0 1 0, 0 0 1, 0 0 0"  →  [[0,1,0],[0,0,1],[0,0,0]]
function parseMatrix(input) {
  // Remove existing error messages
  const existingErr = document.querySelector('.error-msg');
  if (existingErr) existingErr.remove();

  const rows = input.split(',').map(r => r.trim()).filter(r => r.length > 0);

  if (rows.length === 0) {
    showError('Please enter a valid adjacency matrix.');
    return null;
  }

  const matrix = [];

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split(/\s+/).map(Number);

    // Validate: all values must be 0 or 1
    for (const val of cols) {
      if (isNaN(val) || (val !== 0 && val !== 1)) {
        showError(`Invalid value "${val}" at row ${i + 1}. Only 0 and 1 are allowed.`);
        return null;
      }
    }

    // Validate: all rows must have the same length (square matrix)
    if (i > 0 && cols.length !== matrix[0].length) {
      showError('All rows must have the same number of columns (square matrix required).');
      return null;
    }

    matrix.push(cols);
  }

  // Validate: number of rows must equal number of columns
  if (matrix.length !== matrix[0].length) {
    showError('Matrix must be square (n×n).');
    return null;
  }

  return matrix;
}


// ----- WARSHALL'S ALGORITHM (STEP-BY-STEP) -----
// Returns an array of step objects, one per k iteration.
// Each step stores: { k, matrix, changedCells }
//   - k          : the current intermediate node (0-indexed)
//   - matrix     : deep copy of the matrix AFTER this k iteration
//   - changedCells: set of "i,j" strings for cells that flipped 0→1
function warshallSteps(original, n) {
  // Deep copy the original so we don't mutate it
  let mat = deepCopy(original);
  const steps = [];

  // Outer loop: k is the intermediate vertex
  for (let k = 0; k < n; k++) {
    const changedCells = new Set();

    // Middle loop: i is the source vertex
    for (let i = 0; i < n; i++) {

      // Inner loop: j is the destination vertex
      for (let j = 0; j < n; j++) {

        // Core Warshall update rule:
        // Is there a path from i to j through k?
        const newVal = mat[i][j] || (mat[i][k] && mat[k][j]);

        if (newVal && !mat[i][j]) {
          // This cell changed from 0 → 1
          changedCells.add(`${i},${j}`);
        }

        mat[i][j] = newVal ? 1 : 0;
      }
    }

    // Store a snapshot of the matrix after this k pass
    steps.push({
      k: k,               // k value (0-indexed)
      matrix: deepCopy(mat),
      changedCells: changedCells
    });
  }

  return steps;
}


// ----- RENDER MATRICES -----

// Renders a plain matrix (no highlights) into a container by id
function renderMatrix(matrix, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = buildTableHTML(matrix, new Set(), -1);
}

// Renders all k-step blocks into #steps-container
function renderSteps(steps, n) {
  const container = document.getElementById('steps-container');
  container.innerHTML = '';

  steps.forEach(step => {
    const block = document.createElement('div');
    block.className = 'step-block';

    // Label: "Iteration k = 1  (intermediate vertex: node 1)"
    const label = document.createElement('div');
    label.className = 'step-label';
    label.textContent = `Iteration k = ${step.k + 1}  (via node ${step.k + 1})`;
    block.appendChild(label);

    // The matrix table for this step
    const tableWrapper = document.createElement('div');
    tableWrapper.innerHTML = buildTableHTML(step.matrix, step.changedCells, step.k);
    block.appendChild(tableWrapper);

    // Note about what changed
    const note = document.createElement('div');
    note.className = 'step-note';
    if (step.changedCells.size === 0) {
      note.textContent = 'No new paths found in this iteration.';
    } else {
      const positions = [...step.changedCells]
        .map(pos => {
          const [r, c] = pos.split(',');
          return `(${parseInt(r) + 1},${parseInt(c) + 1})`;
        })
        .join(', ');
      note.textContent = `New paths found at cell(s): ${positions}`;
    }
    block.appendChild(note);

    container.appendChild(block);
  });
}


// ----- BUILD HTML TABLE -----
// Builds an HTML string for a matrix table.
//   changedCells : Set of "i,j" strings for cells that changed this step
//   activeK      : the current k index (-1 means no highlight)
function buildTableHTML(matrix, changedCells, activeK) {
  const n = matrix.length;
  let html = '<table class="matrix">';

  for (let i = 0; i < n; i++) {
    html += '<tr>';

    for (let j = 0; j < n; j++) {
      const val = matrix[i][j];
      const key = `${i},${j}`;

      // Determine CSS classes for this cell
      let cssClass = val === 1 ? 'one' : 'zero';

      if (changedCells.has(key)) {
        // Cell changed 0→1 in this step — highlight in red-ish
        cssClass = 'changed';
      } else if (activeK >= 0 && (i === activeK || j === activeK)) {
        // Cells in the active k row/column — highlight in yellow
        cssClass += ' active-k';
      }

      html += `<td class="${cssClass}">${val}</td>`;
    }

    html += '</tr>';
  }

  html += '</table>';
  return html;
}


// ----- UTILITIES -----

// Deep copies a 2D array
function deepCopy(matrix) {
  return matrix.map(row => [...row]);
}

// Shows an error message inside the input card
function showError(message) {
  const section = document.getElementById('input-section');
  const err = document.createElement('p');
  err.className = 'error-msg';
  err.textContent = '⚠ ' + message;
  section.appendChild(err);
}

// Clears all previous output and error messages
function clearOutput() {
  document.getElementById('output-section').classList.add('hidden');
  document.getElementById('initial-matrix').innerHTML = '';
  document.getElementById('steps-container').innerHTML = '';
  document.getElementById('final-matrix').innerHTML = '';

  const existingErr = document.querySelector('.error-msg');
  if (existingErr) existingErr.remove();
}
