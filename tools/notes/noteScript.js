/* =========================================================
   LANTERN NOTES - Complete Rebuild
   ========================================================= */

// ===================== INITIALIZATION =====================

let workspaceId = localStorage.getItem('currentWorkspaceId') || 'guest';
let currentMode = 'writing'; // 'writing' or 'stylus'
let currentFolder = null;
let currentBook = null;
let folders = [];
let isDragging = false;
let lastMouseY = 0;
let isDrawing = false;
let drawingContext = null;
let isPanning = false;
let lastPanY = 0;
let isErasing = false;
let touchStartDistance = 0;
let lastTouchY = 0;
let scrollSensitivity = 1.5; // Multiplier for right-click drag speed
let currentStrokeIsErasing = false; // Track if current stroke is an erase operation
let lassoPoints = []; // Track points for lasso selection
let lassoActive = false; // Whether a lasso selection is active
let lassoCanvas = null; // Reference to canvas with active lasso
let lassoPageIndex = null; // Page index of active lasso

// ===================== STORAGE =====================

function getStorageKey(key) {
    return `${workspaceId}-lantern-notes-${key}`;
}

function saveFolders() {
    localStorage.setItem(getStorageKey('folders'), JSON.stringify(folders));
}

function loadFolders() {
    const stored = localStorage.getItem(getStorageKey('folders'));
    folders = stored ? JSON.parse(stored) : [];
    renderFolders();
}

// ===================== FOLDER MANAGEMENT =====================

function createFolder(name) {
    const folder = {
        id: Date.now().toString(),
        name: name,
        expanded: true,
        books: []
    };
    folders.push(folder);
    saveFolders();
    renderFolders();
    return folder;
}

function deleteFolder(folderId) {
    const index = folders.findIndex(f => f.id === folderId);
    if (index > -1) {
        folders.splice(index, 1);
        if (currentFolder && currentFolder.id === folderId) {
            currentFolder = null;
            currentBook = null;
            renderBookContainer();
        }
        saveFolders();
        renderFolders();
    }
}

function toggleFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
        folder.expanded = !folder.expanded;
        saveFolders();
        renderFolders();
    }
}

// ===================== BOOK MANAGEMENT =====================

function createBook(folderId, name) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return null;

    const book = {
        id: Date.now().toString(),
        name: name,
        pages: [createBlankPage()]
    };

    folder.books.push(book);
    saveFolders();
    renderFolders();
    return book;
}

function deleteBook(folderId, bookId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const index = folder.books.findIndex(b => b.id === bookId);
    if (index > -1) {
        folder.books.splice(index, 1);
        if (currentBook && currentBook.id === bookId) {
            currentBook = null;
            renderBookContainer();
        }
        saveFolders();
        renderFolders();
    }
}

function createBlankPage() {
    return {
        id: Date.now().toString(),
        content: '',
        drawingData: null
    };
}

function loadBook(folderId, bookId) {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    const book = folder.books.find(b => b.id === bookId);
    if (!book) return;

    currentFolder = folder;
    currentBook = book;
    renderBookContainer();
    renderFolders(); // Update active state
}

function saveCurrentPage() {
    if (!currentBook) return;

    const bookContainer = document.getElementById('book-container');
    const scrollTop = bookContainer.scrollTop;
    const pageIndex = Math.floor(scrollTop / bookContainer.clientHeight);

    if (pageIndex >= 0 && pageIndex < currentBook.pages.length) {
        const pageElement = bookContainer.querySelector(`[data-page-index="${pageIndex}"]`);
        if (pageElement) {
            const contentElement = pageElement.querySelector('.page-content');
            if (contentElement) {
                currentBook.pages[pageIndex].content = contentElement.innerHTML;
            }

            // Save canvas data if in stylus mode
            const canvas = pageElement.querySelector('.stylus-canvas');
            if (canvas) {
                currentBook.pages[pageIndex].drawingData = canvas.toDataURL();
            }
        }
    }

    saveFolders();
}

// ===================== RENDERING =====================

function renderFolders() {
    const foldersList = document.getElementById('folders-list');
    if (!foldersList) return;

    foldersList.innerHTML = '';

    if (folders.length === 0) {
        foldersList.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">
                No folders yet.<br>Click "Add New Folder" to start.
            </div>
        `;
        return;
    }

    folders.forEach(folder => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-item';

        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        folderHeader.innerHTML = `
            <svg class="folder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            <span class="folder-title">${folder.name}</span>
            <svg class="folder-toggle ${folder.expanded ? 'expanded' : ''}" 
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
        `;

        folderHeader.addEventListener('click', () => toggleFolder(folder.id));
        folderDiv.appendChild(folderHeader);

        // Books list
        const booksList = document.createElement('div');
        booksList.className = `books-list ${folder.expanded ? 'expanded' : ''}`;

        folder.books.forEach(book => {
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';
            if (currentBook && currentBook.id === book.id) {
                bookItem.classList.add('active');
            }
            bookItem.textContent = book.name;
            bookItem.addEventListener('click', () => loadBook(folder.id, book.id));
            booksList.appendChild(bookItem);
        });

        // Add book button
        const addBookBtn = document.createElement('button');
        addBookBtn.className = 'add-book-btn';
        addBookBtn.innerHTML = `
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Book
        `;
        addBookBtn.addEventListener('click', () => showNewBookModal(folder.id));
        booksList.appendChild(addBookBtn);

        folderDiv.appendChild(booksList);
        foldersList.appendChild(folderDiv);
    });
}

function renderBookContainer() {
    const container = document.getElementById('book-container');
    if (!container) return;

    if (!currentBook) {
        container.innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
                <h3>No Book Selected</h3>
                <p>Select a book from the sidebar or create a new one</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    const pagesWrapper = document.createElement('div');
    pagesWrapper.className = 'book-pages';

    currentBook.pages.forEach((page, index) => {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'book-page';
        pageDiv.setAttribute('data-page-index', index);

        // Content area
        const contentDiv = document.createElement('div');
        contentDiv.className = 'page-content';
        contentDiv.contentEditable = currentMode === 'writing';
        contentDiv.innerHTML = page.content || '';

        // Double-click to edit in writing mode
        contentDiv.addEventListener('dblclick', () => {
            if (currentMode === 'writing') {
                contentDiv.focus();
            }
        });

        // Auto-save on input
        contentDiv.addEventListener('input', () => {
            saveCurrentPage();
        });

        pageDiv.appendChild(contentDiv);

        // Stylus canvas
        const canvas = document.createElement('canvas');
        canvas.className = 'stylus-canvas';
        if (currentMode === 'stylus') {
            canvas.classList.add('active');
        }

        // Set canvas size to page size
        canvas.width = 1600;
        canvas.height = 2000;

        // Load drawing data if exists
        if (page.drawingData) {
            const img = new Image();
            img.onload = () => {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
            };
            img.src = page.drawingData;
        }

        // Drawing events - use pointer events for pen hardware detection
        canvas.addEventListener('pointerdown', startDrawing);
        canvas.addEventListener('pointermove', draw);
        canvas.addEventListener('pointerup', stopDrawing);
        canvas.addEventListener('pointerleave', stopDrawing);

        // Touch events for stylus (legacy support)
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', stopDrawing);

        pageDiv.appendChild(canvas);
        pagesWrapper.appendChild(pageDiv);
    });

    container.appendChild(pagesWrapper);

    // Setup infinite scroll
    container.addEventListener('scroll', handleScroll);

    // Right-click drag navigation
    container.addEventListener('contextmenu', (e) => e.preventDefault());
    container.addEventListener('mousedown', handleRightClickDrag);
    
    // Two-finger scroll on container
    container.addEventListener('touchstart', handleContainerTouchStart, { passive: false });
    container.addEventListener('touchmove', handleContainerTouchMove, { passive: false });
    container.addEventListener('touchend', handleContainerTouchEnd, { passive: false });
}

// ===================== MODE SWITCHING =====================

function toggleEraser() {
    if (currentMode !== 'stylus') {
        // Auto-switch to stylus mode when eraser is clicked
        switchMode('stylus');
    }
    
    isErasing = !isErasing;
    
    // Update button state
    const eraserBtn = document.getElementById('eraser-mode-btn');
    if (isErasing) {
        eraserBtn.classList.add('active');
    } else {
        eraserBtn.classList.remove('active');
    }
    
    // Update cursor for all active canvases
    document.querySelectorAll('.stylus-canvas.active').forEach(canvas => {
        if (isErasing) {
            canvas.classList.add('erasing');
        } else {
            canvas.classList.remove('erasing');
        }
    });
}

function switchMode(mode) {
    if (currentMode === mode) return;
    
    saveCurrentPage(); // Save before switching
    currentMode = mode;
    
    // Deactivate eraser when leaving stylus mode
    if (mode !== 'stylus' && isErasing) {
        isErasing = false;
        document.getElementById('eraser-mode-btn').classList.remove('active');
    }

    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (!btn.id.includes('eraser')) {
            btn.classList.remove('active');
        }
    });
    document.getElementById(`${mode}-mode-btn`).classList.add('active');

    // Update content editability and canvas state
    const container = document.getElementById('book-container');
    container.querySelectorAll('.page-content').forEach(content => {
        content.contentEditable = mode === 'writing';
    });

    container.querySelectorAll('.stylus-canvas').forEach(canvas => {
        if (mode === 'stylus') {
            canvas.classList.add('active');
        } else {
            canvas.classList.remove('active');
        }
    });
}

// ===================== STYLUS DRAWING =====================

function startDrawing(e) {
    if (currentMode !== 'stylus') return;
    if (e.button === 2 && e.pointerType !== 'pen') return; // Right-click = pan (but not for pen)

    // Debug: Log pen input details to identify eraser button
    if (e.pointerType === 'pen') {
        console.log('Asus Stylus input:', {
            button: e.button,
            buttons: e.buttons,
            pointerType: e.pointerType,
            pressure: e.pressure
        });
    }

    // Detect hardware eraser (pen eraser end)
    // Asus Active Stylus common patterns:
    // - Eraser: button 5, buttons 32 (most common)
    // - Some models: button 2, buttons 2
    // - Some models: button 0, buttons 32
    const isHardwareEraser = e.pointerType === 'pen' && (
        e.button === 5 || 
        e.buttons === 32 || 
        (e.button === 2 && e.buttons === 2) ||
        (e.button === 0 && e.buttons === 32)
    );
    const shouldErase = isErasing || isHardwareEraser;
    currentStrokeIsErasing = shouldErase; // Store for entire stroke

    isDrawing = true;
    const canvas = e.target;
    const ctx = canvas.getContext('2d');
    drawingContext = ctx;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Start tracking lasso points if erasing
    if (shouldErase) {
        lassoPoints = [{ x, y }];
        lassoCanvas = canvas; // Store canvas reference for lasso
        // Don't erase while drawing lasso - we'll erase the contents after
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'transparent'; // Invisible stroke for lasso
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#000000';
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = shouldErase ? 1 : 2;
    ctx.lineCap = 'round';

}

function draw(e) {
    if (isPanning) return; // Don't draw while panning
    if (!isDrawing || currentMode !== 'stylus') return;

    const canvas = e.target;
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    // Track lasso points if erasing
    if (currentStrokeIsErasing && lassoPoints.length > 0) {
        lassoPoints.push({ x, y });
        
        // Draw lasso trail preview
        drawLassoTrail(canvas);
        
        // Keep stroke invisible for lasso
        ctx.strokeStyle = 'transparent';
        ctx.globalCompositeOperation = 'source-over';
    } else {
        // Normal drawing - ensure proper composite operation
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
}

function stopDrawing(e) {
    if (isDrawing) {
        // Clear lasso trail preview
        clearLassoTrail();
        
        // Check if lasso loop is closed (for smart selection)
        if (currentStrokeIsErasing && lassoPoints.length > 20 && lassoCanvas) {
            const start = lassoPoints[0];
            const end = lassoPoints[lassoPoints.length - 1];
            const distance = Math.hypot(end.x - start.x, end.y - start.y);
            
            console.log('Lasso check:', { 
                points: lassoPoints.length, 
                distance: distance.toFixed(2),
                threshold: 80
            });
            
            // If loop is closed (end near start), show lasso selection
            // Increased threshold to 80 pixels for easier closing
            if (distance < 80) {
                console.log('Lasso closed! Showing selection...');
                showLassoSelection(lassoCanvas);
            } else {
                console.log('Lasso not closed - too far from start');
            }
        }
        
        isDrawing = false;
        currentStrokeIsErasing = false; // Reset stroke erase state
        if (drawingContext) {
            drawingContext.globalCompositeOperation = 'source-over'; // Reset
        }
        drawingContext = null;
        saveCurrentPage();
    }
    if (isPanning && (!e || !e.touches || e.touches.length === 0)) {
        isPanning = false;
    }
}

// ===================== SMART LASSO SELECTION =====================

function drawLassoTrail(canvas) {
    // Find or create trail overlay
    let trailOverlay = canvas.parentElement.querySelector('.lasso-trail-overlay');
    
    if (!trailOverlay) {
        trailOverlay = document.createElement('canvas');
        trailOverlay.className = 'lasso-trail-overlay';
        trailOverlay.width = canvas.width;
        trailOverlay.height = canvas.height;
        canvas.parentElement.appendChild(trailOverlay);
    }
    
    const ctx = trailOverlay.getContext('2d');
    ctx.clearRect(0, 0, trailOverlay.width, trailOverlay.height);
    
    if (lassoPoints.length < 2) return;
    
    // Draw the lasso trail
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([10, 5]);
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
    
    for (let i = 1; i < lassoPoints.length; i++) {
        ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
    }
    
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    
    // Draw start point indicator
    const start = lassoPoints[0];
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw connection line to start if close enough
    const end = lassoPoints[lassoPoints.length - 1];
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    
    if (distance < 100) {
        ctx.strokeStyle = `rgba(0, 255, 136, ${1 - distance / 100})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(start.x, start.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function clearLassoTrail() {
    const trails = document.querySelectorAll('.lasso-trail-overlay');
    trails.forEach(trail => trail.remove());
}

function showLassoSelection(canvas) {
    // Clear any existing lasso
    clearLassoSelection();
    
    lassoActive = true;
    lassoCanvas = canvas;
    
    // Find page index
    const pageDiv = canvas.closest('.book-page');
    lassoPageIndex = pageDiv ? pageDiv.getAttribute('data-page-index') : null;
    
    // Create selection overlay
    const overlay = document.createElement('div');
    overlay.className = 'lasso-overlay';
    overlay.id = 'lasso-overlay';
    
    // Calculate bounds of lasso path
    const bounds = getLassoBounds();
    const rect = canvas.getBoundingClientRect();
    
    // Convert canvas coordinates to page coordinates
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    overlay.style.left = `${bounds.minX * scaleX}px`;
    overlay.style.top = `${bounds.minY * scaleY}px`;
    overlay.style.width = `${(bounds.maxX - bounds.minX) * scaleX}px`;
    overlay.style.height = `${(bounds.maxY - bounds.minY) * scaleY}px`;
    
    // Create highlighted path visualization
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = lassoPoints.map((p, i) => {
        const x = (p.x - bounds.minX) * scaleX;
        const y = (p.y - bounds.minY) * scaleY;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') + ' Z';
    
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'rgba(255, 100, 100, 0.2)');
    path.setAttribute('stroke', '#ff4444');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-dasharray', '5,5');
    
    svg.appendChild(path);
    overlay.appendChild(svg);
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'lasso-delete-btn';
    deleteBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        Delete Selection
    `;
    deleteBtn.onclick = confirmLassoDeletion;
    overlay.appendChild(deleteBtn);
    
    // Create cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'lasso-cancel-btn';
    cancelBtn.innerHTML = '✕';
    cancelBtn.onclick = clearLassoSelection;
    overlay.appendChild(cancelBtn);
    
    pageDiv.appendChild(overlay);
}

function getLassoBounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    lassoPoints.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });
    return { minX, minY, maxX, maxY };
}

function confirmLassoDeletion() {
    if (!lassoCanvas || !lassoActive) return;
    
    const ctx = lassoCanvas.getContext('2d');
    
    // Create clipping path from lasso
    ctx.save();
    ctx.beginPath();
    lassoPoints.forEach((p, i) => {
        if (i === 0) {
            ctx.moveTo(p.x, p.y);
        } else {
            ctx.lineTo(p.x, p.y);
        }
    });
    ctx.closePath();
    ctx.clip();
    
    // Clear everything inside the lasso
    const bounds = getLassoBounds();
    ctx.clearRect(bounds.minX - 10, bounds.minY - 10, 
                  bounds.maxX - bounds.minX + 20, 
                  bounds.maxY - bounds.minY + 20);
    
    ctx.restore();
    
    // Clear selection UI
    clearLassoSelection();
    
    // Save the page
    saveCurrentPage();
}

function clearLassoSelection() {
    const overlay = document.getElementById('lasso-overlay');
    if (overlay) {
        overlay.remove();
    }
    lassoActive = false;
    lassoCanvas = null;
    lassoPageIndex = null;
    lassoPoints = [];
}

function handleTouchStart(e) {
    if (currentMode !== 'stylus') return;
    if (isPanning) return; // Don't start drawing while panning
    if (e.touches.length !== 1) return; // Only single-finger drawing
    
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = e.target;
    const ctx = canvas.getContext('2d');
    drawingContext = ctx;

    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);

    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = isErasing ? 20 : 2;
    ctx.lineCap = 'round';
    
    if (isErasing) {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#000000';
    }
}

function handleTouchMove(e) {
    if (currentMode !== 'stylus') return;
    if (!isDrawing || e.touches.length !== 1) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = e.target;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);

    ctx.lineTo(x, y);
    ctx.stroke();
}

// ===================== TWO-FINGER SCROLL (CONTAINER LEVEL) =====================

function handleContainerTouchStart(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        touchStartDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        lastTouchY = (touch1.clientY + touch2.clientY) / 2;
        isPanning = true;
    }
}

function handleContainerTouchMove(e) {
    if (e.touches.length === 2 && isPanning) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentY = (touch1.clientY + touch2.clientY) / 2;
        
        const container = document.getElementById('book-container');
        const deltaY = (lastTouchY - currentY) * scrollSensitivity;
        container.scrollTop += deltaY;
        lastTouchY = currentY;
    }
}

function handleContainerTouchEnd(e) {
    if (e.touches.length < 2) {
        isPanning = false;
    }
}

// ===================== INFINITE SCROLL =====================

function handleScroll() {
    if (!currentBook) return;

    const container = document.getElementById('book-container');
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

    // Add new page when near bottom
    if (scrollBottom < 200) {
        addNewPage();
    }
}

function addNewPage() {
    if (!currentBook) return;

    // Check if last page already exists
    const lastPage = currentBook.pages[currentBook.pages.length - 1];
    if (!lastPage.content && !lastPage.drawingData) {
        return; // Don't add if last page is empty
    }

    currentBook.pages.push(createBlankPage());
    saveFolders();
    renderBookContainer();
}

// ===================== RIGHT-CLICK DRAG NAVIGATION =====================

function handleRightClickDrag(e) {
    if (currentMode !== 'stylus') return; // Only pan in stylus mode
    if (e.button !== 2) return; // Only right mouse button / pen side button

    e.preventDefault();
    isPanning = true;
    lastPanY = e.clientY;

    const container = e.currentTarget;
    const canvas = document.querySelector('.stylus-canvas.active');

    // Visual feedback: show grab cursor
    if (canvas) canvas.classList.add('panning');

    function onMove(ev) {
        if (!isPanning) return;
        const deltaY = (lastPanY - ev.clientY) * scrollSensitivity;
        container.scrollTop += deltaY;
        lastPanY = ev.clientY;
    }

    function onUp() {
        isPanning = false;
        if (canvas) canvas.classList.remove('panning');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

// ===================== MODALS =====================

function showNewFolderModal() {
    const modal = document.getElementById('new-folder-modal');
    const input = document.getElementById('folder-name-input');
    modal.classList.add('active');
    input.value = '';
    input.focus();
}

function hideNewFolderModal() {
    document.getElementById('new-folder-modal').classList.remove('active');
}

function showNewBookModal(folderId) {
    currentFolder = folders.find(f => f.id === folderId);
    const modal = document.getElementById('new-book-modal');
    const input = document.getElementById('book-name-input');
    modal.classList.add('active');
    input.value = '';
    input.focus();
}

function hideNewBookModal() {
    document.getElementById('new-book-modal').classList.remove('active');
}

function handleCreateFolder() {
    const input = document.getElementById('folder-name-input');
    const name = input.value.trim();

    if (name) {
        createFolder(name);
        hideNewFolderModal();
    }
}

function handleCreateBook() {
    const input = document.getElementById('book-name-input');
    const name = input.value.trim();

    if (name && currentFolder) {
        const book = createBook(currentFolder.id, name);
        hideNewBookModal();
        if (book) {
            loadBook(currentFolder.id, book.id);
        }
    }
}

// ===================== EVENT LISTENERS =====================

document.addEventListener('DOMContentLoaded', () => {
    // Load data
    loadFolders();

    // Add folder button
    document.getElementById('add-folder-btn').addEventListener('click', showNewFolderModal);

    // Mode buttons
    document.getElementById('writing-mode-btn').addEventListener('click', () => switchMode('writing'));
    document.getElementById('stylus-mode-btn').addEventListener('click', () => switchMode('stylus'));
    document.getElementById('eraser-mode-btn').addEventListener('click', toggleEraser);
    
    // Scroll sensitivity slider
    const sensitivitySlider = document.getElementById('scroll-sensitivity');
    const sensitivityValue = document.getElementById('sensitivity-value');
    sensitivitySlider.addEventListener('input', (e) => {
        scrollSensitivity = parseFloat(e.target.value);
        sensitivityValue.textContent = scrollSensitivity.toFixed(1) + 'x';
    });

    // New Folder Modal
    document.getElementById('close-folder-modal').addEventListener('click', hideNewFolderModal);
    document.getElementById('cancel-folder-btn').addEventListener('click', hideNewFolderModal);
    document.getElementById('create-folder-btn').addEventListener('click', handleCreateFolder);
    document.getElementById('folder-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCreateFolder();
    });

    // New Book Modal
    document.getElementById('close-book-modal').addEventListener('click', hideNewBookModal);
    document.getElementById('cancel-book-btn').addEventListener('click', hideNewBookModal);
    document.getElementById('create-book-btn').addEventListener('click', handleCreateBook);
    document.getElementById('book-name-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCreateBook();
    });

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Auto-save every 30 seconds
    setInterval(() => {
        if (currentBook) {
            saveCurrentPage();
        }
    }, 30000);

    // Save before leaving
    window.addEventListener('beforeunload', () => {
        if (currentBook) {
            saveCurrentPage();
        }
    });
});
