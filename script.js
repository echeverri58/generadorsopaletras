document.addEventListener('DOMContentLoaded', function() {
            // Variables globales
            let wordSearchGrid = []; // Holds the 2D array for the word search grid letters
            let wordList = [];       // Holds the list of words to be found
            let foundWords = [];     // Holds the words that have been successfully found by the user
            let wordPositions = {};  // Stores the coordinates and direction of placed words { WORD: {start, direction, cells} }
            let isSolutionShown = false; // Tracks if the solution is currently displayed

            // --- Interactive Word Selection Variables ---
            let isSelecting = false;        // True when the user is actively dragging to select cells
            let selectionStartCell = null;  // DOM element of the cell where selection started
            let selectedCells = [];         // Array of DOM elements representing the current selection path
            
            // Elementos del DOM
            const wordListTextarea = document.getElementById('wordList');
            const wordCountSpan = document.getElementById('wordCount');
            const clearWordsBtn = document.getElementById('clearWords');
            const generateBtn = document.getElementById('generateBtn');
            const exportBtn = document.getElementById('exportBtn');
            const emptyState = document.getElementById('emptyState');
            const puzzlePreview = document.getElementById('puzzlePreview');
            const wordSearchGridDiv = document.getElementById('wordSearchGrid');
            const wordListPreview = document.getElementById('wordListPreview');
            const previewTitle = document.getElementById('previewTitle');
            const creatorNameInput = document.getElementById('creatorName');
            const headerImageInput = document.getElementById('headerImage');
            const headerImagePreviewContainer = document.getElementById('headerImagePreviewContainer');
            const headerImagePreview = document.getElementById('headerImagePreview');
            const creatorNamePreviewContainer = document.getElementById('creatorNamePreviewContainer');
            const creatorNamePreview = document.getElementById('creatorNamePreview');
            const solutionBtn = document.getElementById('solutionBtn');
            
            // Event listeners
            wordListTextarea.addEventListener('input', updateWordCount);
            clearWordsBtn.addEventListener('click', clearWordList);
            generateBtn.addEventListener('click', generateWordSearch);
            exportBtn.addEventListener('click', exportToPDF);
            headerImageInput.addEventListener('change', handleImageUpload);
            solutionBtn.addEventListener('click', toggleSolution);
            
            // Funciones principales
            function updateWordCount() {
                const words = getWordList();
                wordCountSpan.textContent = `${words.length} palabra${words.length !== 1 ? 's' : ''}`;
            }
            
            function clearWordList() {
                wordListTextarea.value = '';
                updateWordCount();
            }
            
            function handleImageUpload(event) {
                const file = event.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        headerImagePreview.src = e.target.result;
                        headerImagePreviewContainer.classList.remove('hidden');
                        headerImagePreviewContainer.style.display = ''; // Asegura que sea visible
                    }
                    reader.readAsDataURL(file);
                } else {
                    // Opcional: Limpiar si no es imagen válida o se deselecciona
                    headerImagePreview.src = '#';
                    headerImagePreviewContainer.classList.add('hidden');
                    headerImagePreviewContainer.style.display = 'none';
                    
                    // Limpiar el input por si el usuario quiere subir la misma imagen de nuevo tras un error
                    headerImageInput.value = '';
                }
            }
            
            function getWordList() {
                const text = wordListTextarea.value.trim();
                if (!text) return [];
                
                return text.split('\n')
                    .map(word => word.trim().toUpperCase())
                    .filter(word => word.length > 0);
            }
            
            function generateWordSearch() {
                wordList = getWordList();
                
                if (wordList.length === 0) {
                    alert('Por favor, ingresa al menos una palabra.');
                    return;
                }
                
                // Validar palabras
                const invalidWords = wordList.filter(word => !/^[A-ZÁÉÍÓÚÑ]+$/i.test(word));
                if (invalidWords.length > 0) {
                    alert(`Las siguientes palabras contienen caracteres no permitidos: ${invalidWords.join(', ')}`);
                    return;
                }
                
                // Obtener tamaño de la cuadrícula
                const gridSize = document.querySelector('input[name="gridSize"]:checked').value;
                let size;
                
                switch(gridSize) {
                    case 'small': size = 10; break;
                    case 'medium': size = 15; break;
                    case 'large': size = 20; break;
                }
                
                // Validar que las palabras no sean más largas que el tamaño de la cuadrícula
                const tooLongWords = wordList.filter(word => word.length > size);
                if (tooLongWords.length > 0) {
                    alert(`Las siguientes palabras son demasiado largas para el tamaño seleccionado (${size}x${size}): ${tooLongWords.join(', ')}`);
                    return;
                }
                
                // Obtener configuración de direcciones
                const directions = {
                    horizontal: document.getElementById('directionHorizontal').checked,
                    vertical: document.getElementById('directionVertical').checked,
                    diagonal: document.getElementById('directionDiagonal').checked,
                    reverse: document.getElementById('directionReverse').checked
                };
                
                // Generar la sopa de letras cuadrada
                wordSearchGrid = generateSquareGrid(size, wordList, directions);
                
                // Mostrar la previsualización
                displayWordSearch();
                
                // Habilitar botón de exportación
                exportBtn.disabled = false;
                
                // Resetear estado de solución
                isSolutionShown = false;
                solutionBtn.innerHTML = '<i class="fas fa-lightbulb text-xl"></i>';
            }
            
            function generateSquareGrid(size, words, directions) {
                // Inicializar cuadrícula cuadrada vacía
                let grid = Array(size).fill().map(() => Array(size).fill(''));
                
                // Reiniciar almacenamiento de posiciones
                wordPositions = {};
                
                // Ordenar palabras de más larga a más corta para colocarlas primero
                words.sort((a, b) => b.length - a.length);
                
                // Intentar colocar cada palabra
                for (const word of words) {
                    if (!placeWordInSquareGrid(grid, word, directions)) {
                        console.warn(`No se pudo colocar la palabra: ${word}`);
                    }
                }
                
                // Rellenar espacios vacíos con letras aleatorias
                fillEmptyCells(grid);
                
                return grid;
            }
            
            function placeWordInSquareGrid(grid, word, directions) {
                const size = grid.length;
                const wordLength = word.length;
                
                // Generar todas las posibles direcciones
                const possibleDirections = [];
                
                if (directions.horizontal) {
                    possibleDirections.push({dr: 0, dc: 1}); // Derecha
                    if (directions.reverse) possibleDirections.push({dr: 0, dc: -1}); // Izquierda
                }
                if (directions.vertical) {
                    possibleDirections.push({dr: 1, dc: 0}); // Abajo
                    if (directions.reverse) possibleDirections.push({dr: -1, dc: 0}); // Arriba
                }
                if (directions.diagonal) {
                    possibleDirections.push({dr: 1, dc: 1}); // Diagonal derecha abajo
                    if (directions.reverse) {
                        possibleDirections.push({dr: -1, dc: -1}); // Diagonal izquierda arriba
                        possibleDirections.push({dr: 1, dc: -1}); // Diagonal izquierda abajo
                        possibleDirections.push({dr: -1, dc: 1}); // Diagonal derecha arriba
                    }
                }
                
                // Mezclar direcciones para mayor aleatoriedad
                shuffleArray(possibleDirections);
                
                // Generar todas las posibles posiciones iniciales
                const positions = [];
                for (let row = 0; row < size; row++) {
                    for (let col = 0; col < size; col++) {
                        positions.push({row, col});
                    }
                }
                
                // Mezclar posiciones para mayor aleatoriedad
                shuffleArray(positions);
                
                // Intentar colocar la palabra en cada posición y dirección posible
                for (const position of positions) {
                    for (const direction of possibleDirections) {
                        const {dr, dc} = direction;
                        const {row, col} = position;
                        
                        // Verificar si la palabra cabe en esta dirección
                        const endRow = row + (wordLength - 1) * dr;
                        const endCol = col + (wordLength - 1) * dc;
                        
                        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) {
                            continue; // No cabe en esta dirección
                        }
                        
                        // Verificar si la palabra puede colocarse sin conflictos
                        let canPlace = true;
                        for (let i = 0; i < wordLength; i++) {
                            const currentRow = row + i * dr;
                            const currentCol = col + i * dc;
                            const cell = grid[currentRow][currentCol];
                            
                            if (cell !== '' && cell !== word[i]) {
                                canPlace = false;
                                break;
                            }
                        }
                        
                        // Si se puede colocar, hacerlo
                        if (canPlace) {
                            // Almacenar las posiciones de la palabra
                            wordPositions[word] = {
                                start: {row, col},
                                direction: {dr, dc},
                                cells: []
                            };
                            
                            for (let i = 0; i < wordLength; i++) {
                                const currentRow = row + i * dr;
                                const currentCol = col + i * dc;
                                grid[currentRow][currentCol] = word[i];
                                
                                // Guardar referencia a las celdas de esta palabra
                                wordPositions[word].cells.push({
                                    row: currentRow,
                                    col: currentCol
                                });
                            }
                            return true;
                        }
                    }
                }
                
                return false;
            }
            
            function shuffleArray(array) {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            }
            
            function fillEmptyCells(grid) {
                const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑ';
                for (let row = 0; row < grid.length; row++) {
                    for (let col = 0; col < grid[row].length; col++) {
                        if (grid[row][col] === '') {
                            grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
                        }
                    }
                }
            }
            
            function displayWordSearch() {
                // Ocultar estado vacío y mostrar previsualización
                emptyState.classList.add('hidden');
                puzzlePreview.classList.remove('hidden');
                
                // Aplicar título
                const title = document.getElementById('puzzleTitle').value || 'Sopa de Letras';
                previewTitle.textContent = title;
                
                // Mostrar nombre del creador si existe
                const creatorName = creatorNameInput.value.trim();
                if (creatorName) {
                    creatorNamePreview.textContent = creatorName;
                    creatorNamePreviewContainer.classList.remove('hidden');
                    creatorNamePreviewContainer.style.display = ''; // Asegurar visibilidad
                } else {
                    creatorNamePreviewContainer.classList.add('hidden');
                    creatorNamePreviewContainer.style.display = 'none'; // Ocultar si no hay nombre
                }
                
                // Asegurarse de que la imagen SÓLO se muestre si ya hay una cargada
                if (!headerImagePreview.src || headerImagePreview.src.endsWith('#')) {
                    headerImagePreviewContainer.classList.add('hidden');
                    headerImagePreviewContainer.style.display = 'none';
                } else {
                    headerImagePreviewContainer.classList.remove('hidden');
                    headerImagePreviewContainer.style.display = ''; // Mantenerla visible si ya está cargada
                }
                
                // Aplicar estilo de fuente
                const fontFamily = document.getElementById('fontFamily').value;
                const fontSize = document.getElementById('fontSize').value;
                const showGridLines = document.getElementById('showGridLines').checked;
                
                previewTitle.style.fontFamily = fontFamily;
                wordSearchGridDiv.style.fontFamily = fontFamily;
                wordSearchGridDiv.style.fontSize = fontSize;
                
                // Limpiar cuadrícula existente
                wordSearchGridDiv.innerHTML = '';
                
                // Crear tabla para la cuadrícula cuadrada
                const table = document.createElement('table');
                table.className = showGridLines ? 'word-search-table' : 'word-search-table no-grid-lines';
                
                // Crear filas y celdas
                for (let row = 0; row < wordSearchGrid.length; row++) {
                    const tr = document.createElement('tr');
                    
                    for (let col = 0; col < wordSearchGrid[row].length; col++) {
                        const td = document.createElement('td');
                        td.className = 'word-search-cell';
                        td.textContent = wordSearchGrid[row][col];
                        td.dataset.row = row;
                        td.dataset.col = col;
                        
                        tr.appendChild(td);
                    }
                    
                    table.appendChild(tr);
                }
                
                wordSearchGridDiv.appendChild(table);
                
                // Mostrar lista de palabras
                wordListPreview.innerHTML = '';
                wordList.forEach(word => {
                    const wordElement = document.createElement('div');
                    wordElement.className = 'word-item p-1 rounded';
                    wordElement.textContent = word;
                    wordElement.dataset.word = word;
                    wordListPreview.appendChild(wordElement);
                });
                
                // Reiniciar palabras encontradas
                foundWords = [];
                
                // Ocultar solución si está visible
                if (isSolutionShown) {
                    toggleSolution(); // Reset solution state if it was shown during a previous generation
                }

                // Add event listeners for cell selection to each cell in the grid
                const allCells = table.getElementsByTagName('td');
                for (let cell of allCells) {
                    // Handles the start of a potential word selection
                    cell.addEventListener('mousedown', (event) => {
                        isSelecting = true;                       // Set selection flag
                        selectionStartCell = event.target;        // Record the starting cell
                        selectedCells = [event.target];           // Initialize selected cells array with the start cell
                        event.target.style.backgroundColor = '#ADD8E6'; // Apply temporary highlight (lightblue)
                        event.preventDefault();                   // Prevent default text selection behavior
                    });

                    // Handles the dragging part of word selection
                    cell.addEventListener('mousemove', (event) => {
                        if (isSelecting) { // Only proceed if selection is active
                            const currentCell = event.target;
                            // Check if the mouse has moved to a new cell that is not already the last one selected
                            if (selectedCells[selectedCells.length - 1] !== currentCell) {
                                // Ensure the target is a TD (a cell) and not already in the current selection path
                                if (currentCell.tagName === 'TD' && !selectedCells.find(c => c === currentCell)) {
                                    selectedCells.push(currentCell);            // Add cell to selection path
                                    currentCell.style.backgroundColor = '#ADD8E6'; // Apply temporary highlight
                                }
                            }
                        }
                    });
                }
            }

            // Document-level mouseup listener to finalize selection and check for words
            document.addEventListener('mouseup', () => {
                if (isSelecting) { // Only proceed if a selection was active
                    isSelecting = false; // End the selection process
                    
                    let wordWasFound = false; // Flag to track if the current selection matches a word

                    // Only attempt to check for a word if more than one cell is selected (words usually have >1 letter)
                    if (selectedCells.length > 1) {
                        const foundWordStr = checkWordSelection(); // Check if the selection matches any word
                        
                        if (foundWordStr) { // If a word was found
                            wordWasFound = true;
                            // console.log("Found word in mouseup:", foundWordStr); // Kept for easier debugging if needed later

                            // Apply permanent highlight (light green) to the cells of the found word
                            selectedCells.forEach(cell => {
                                cell.style.backgroundColor = '#90EE90'; 
                            });

                            // Mark the word as found in the word list displayed to the user
                            const wordElementInList = document.querySelector(`#wordListPreview .word-item[data-word='${foundWordStr}']`);
                            if (wordElementInList) {
                                wordElementInList.classList.add('found');
                            }
                        }
                    }

                    // Clear temporary highlighting ONLY if a word was NOT found with the current selection
                    // This prevents clearing permanent highlights of already found words if they are part of a new, failed selection.
                    if (!wordWasFound) {
                        selectedCells.forEach(cell => {
                            // Check if the cell has the temporary highlight color (lightblue)
                            if (cell.style.backgroundColor === 'rgb(173, 216, 230)') { 
                                cell.style.backgroundColor = ''; // Reset background to default
                            }
                        });
                    }
                    
                    // Reset selection state variables for the next selection attempt
                    selectionStartCell = null;
                    selectedCells = []; 
                }
            });

            /**
             * Checks if the currently selected cells form a valid word from the word list.
             * Compares the selected sequence of letters (forwards and backwards) against the
             * words in `wordList` and verifies their coordinates against `wordPositions`.
             * @returns {string|false} The found word string if a match is successful, otherwise false.
             */
            function checkWordSelection() {
                if (!selectedCells || selectedCells.length === 0) {
                    return false; // No cells selected
                }

                // Get the string of letters from the selected cells, both forwards and backwards
                const selectedStringForward = selectedCells.map(cell => cell.textContent).join('');
                const selectedStringBackward = selectedStringForward.split('').reverse().join('');

                // Iterate through the list of words to find
                for (const word of wordList) {
                    if (foundWords.includes(word)) {
                        continue; // Skip if this word has already been found
                    }

                    const wordData = wordPositions[word]; // Get the stored position data for this word
                    if (!wordData || !wordData.cells) {
                        continue; // Word wasn't placed in the grid or data is missing
                    }

                    // Length of selected path must match the length of the word being checked
                    if (word.length !== selectedCells.length) {
                        continue;
                    }
                    
                    let match = false;
                    // Try matching the forward selection string with the word
                    if (word === selectedStringForward) {
                        match = compareCellCoordinates(selectedCells, wordData.cells, false);
                    }
                    
                    // If no forward match, try matching the backward selection string
                    if (!match && word === selectedStringBackward) {
                        match = compareCellCoordinates(selectedCells, wordData.cells, true);
                    }

                    if (match) {
                        console.log("Found word:", word); // Log successful find (useful for confirmation)
                        foundWords.push(word);           // Add to list of found words
                        return word;                     // Return the found word
                    }
                }
                return false; // No match found
            }

            /**
             * Compares the coordinates of the selected cells with the stored coordinates of a word.
             * @param {Array<HTMLElement>} selection - Array of selected TD cell elements.
             * @param {Array<Object>} storedCells - Array of {row, col} objects for the target word from wordPositions.
             * @param {boolean} isReversed - True if the selection string was reversed (user selected word backwards).
             * @returns {boolean} True if all cell coordinates match, false otherwise.
             */
            function compareCellCoordinates(selection, storedCells, isReversed) {
                if (selection.length !== storedCells.length) {
                    return false; // Should not happen if length check done in checkWordSelection
                }
                for (let i = 0; i < selection.length; i++) {
                    const selectedCell = selection[i]; // Current cell from user's drag selection
                    // If user selected backward, compare their first cell to word's last, etc.
                    const storedCellInfo = isReversed ? storedCells[selection.length - 1 - i] : storedCells[i];
                    
                    // Compare coordinates (dataset values are strings, convert to int for comparison)
                    if (parseInt(selectedCell.dataset.row) !== storedCellInfo.row ||
                        parseInt(selectedCell.dataset.col) !== storedCellInfo.col) {
                        return false; // Coordinate mismatch
                    }
                }
                return true; // All coordinates matched
            }
            
            function toggleSolution() {
                const cells = document.querySelectorAll('#wordSearchGrid td.word-search-cell');
                
                if (!isSolutionShown) {
                    // Mostrar solución
                    cells.forEach(cell => {
                        cell.classList.remove('solution-cell', 'reveal-animation');
                    });
                    
                    // Resaltar las palabras encontradas
                    wordList.forEach(word => {
                        if (wordPositions[word]) {
                            wordPositions[word].cells.forEach(pos => {
                                const cell = document.querySelector(`td[data-row="${pos.row}"][data-col="${pos.col}"]`);
                                if (cell) {
                                    cell.classList.add('solution-cell', 'reveal-animation');
                                }
                            });
                        }
                    });
                    
                    solutionBtn.innerHTML = '<i class="fas fa-eye-slash text-xl"></i>';
                    solutionBtn.setAttribute('title', 'Ocultar solución');
                } else {
                    // Ocultar solución
                    cells.forEach(cell => {
                        cell.classList.remove('solution-cell', 'reveal-animation');
                    });
                    
                    solutionBtn.innerHTML = '<i class="fas fa-lightbulb text-xl"></i>';
                    solutionBtn.setAttribute('title', 'Mostrar solución');
                }
                
                isSolutionShown = !isSolutionShown;
            }
            
            function exportToPDF() {
                // Obtener elementos a exportar
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm'
                });
                
                // Capturar el contenido como imagen usando html2canvas
                const element = document.getElementById('puzzlePreview');
                
                // Ajustar temporalmente el ancho para la exportación
                const originalWidth = element.style.width;
                element.style.width = '210mm';
                
                // Ocultar el botón de solución temporalmente para la exportación
                solutionBtn.style.display = 'none';
                
                html2canvas(element, {
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: true
                }).then(canvas => {
                    // Restaurar el ancho original y mostrar el botón de solución
                    element.style.width = originalWidth;
                    solutionBtn.style.display = '';
                    
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = 210; // A4 width in mm
                    const pageHeight = 295; // A4 height in mm
                    const imgHeight = canvas.height * imgWidth / canvas.width;
                    
                    doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                    
                    // Agregar nombre del creador si existe
                    const creatorName = creatorNameInput.value.trim();
                    const generatedByText = 'Generado con Generador de Sopas de Letras Cuadradas';
                    let footerTextY = pageHeight - 10; // Posición Y para el texto del pie
                    
                    if (creatorName) {
                        doc.setFontSize(9);
                        doc.setTextColor(120);
                        doc.text(`Elaborado por: ${creatorName}`, 105, footerTextY, { align: 'center' });
                        footerTextY -= 5; // Mover el siguiente texto un poco más arriba
                    }
                    
                    // Agregar texto genérico de generación (ajustando su posición Y si se añadió el nombre)
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(generatedByText, 105, footerTextY, { align: 'center' });
                    
                    // Descargar el PDF
                    doc.save('sopa-de-letras-cuadrada.pdf');
                });
            }
        });
