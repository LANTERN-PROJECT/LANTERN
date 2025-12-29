// =========================================================
// LANTERN NOTES - Complete JavaScript Implementation
// =========================================================

// -----------------------------
// State Management
// -----------------------------

let currentWorkspaceId = null;
let currentNotebook = null;
let currentSection = null;
let currentPage = null;
let selectedNoteContainer = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let selectedColor = '#C4A7E6';
let isDrawing = false;
let drawMode = false;
let eraseMode = false;
let drawingCanvas = null;
let drawingContext = null;
let brushSize = 3;
let brushColor = '#F3ECE9';

// -----------------------------
// Storage Helper Functions
// -----------------------------

function getStorageKey(key) {
    const workspace = JSON.parse(localStorage.getItem('lantern-current-workspace'));
    const workspaceId = workspace?.id || 'guest';
    return `${workspaceId}-lantern-notes-${key}`;
}

function saveToStorage(key, data) {
    localStorage.setItem(getStorageKey(key), JSON.stringify(data));
}

function getFromStorage(key) {
    const data = localStorage.getItem(getStorageKey(key));
    return data ? JSON.parse(data) : null;
}

function getAllNotebooks() {
    return getFromStorage('notebooks') || [];
}

function saveNotebooks(notebooks) {
    saveToStorage('notebooks', notebooks);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// -----------------------------
// Initialization
// -----------------------------

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadNotebooks();
});

function initializeApp() {
    const workspace = JSON.parse(localStorage.getItem('lantern-current-workspace'));
    currentWorkspaceId = workspace?.id || 'guest';
    
    // Create default notebook if none exist
    const notebooks = getAllNotebooks();
    if (notebooks.length === 0) {
        createDefaultNotebook();
    }
}

function createDefaultNotebook() {
    const defaultNotebook = {
        id: generateId(),
        name: 'My First Notebook',
        color: '#C4A7E6',
        sections: [{
            id: generateId(),
            name: 'General Notes',
            pages: [{
                id: generateId(),
                name: 'Getting Started',
                notes: [],
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }]
        }],
        createdAt: new Date().toISOString()
    };
    
    const notebooks = [defaultNotebook];
    saveNotebooks(notebooks);
    
    // Load the default notebook
    currentNotebook = defaultNotebook.id;
    currentSection = defaultNotebook.sections[0].id;
    currentPage = defaultNotebook.sections[0].pages[0].id;
}

// -----------------------------
// Event Listeners Setup
// -----------------------------

function setupEventListeners() {
    // Modal controls
    document.getElementById('newNotebookBtn').addEventListener('click', () => openModal('newNotebookModal'));
    document.getElementById('createNotebookBtn').addEventListener('click', createNotebook);
    document.getElementById('createSectionBtn').addEventListener('click', createSection);
    document.getElementById('createPageBtn').addEventListener('click', createPage);
    
    // Search
    document.getElementById('searchBtn').addEventListener('click', () => openModal('searchModal'));
    document.getElementById('searchInput').addEventListener('input', performSearch);
    
    // Canvas interactions
    const canvas = document.getElementById('canvas');
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    document.addEventListener('mousemove', handleDocumentMouseMove);
    document.addEventListener('mouseup', handleDocumentMouseUp);
    
    // Toolbar formatting
    document.querySelectorAll('.toolbar-btn[data-command]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const command = e.currentTarget.dataset.command;
            document.execCommand(command, false, null);
        });
    });
    
    document.getElementById('headingSelect').addEventListener('change', changeHeading);
    document.getElementById('textColorPicker').addEventListener('change', changeTextColor);
    document.getElementById('highlightColorPicker').addEventListener('change', changeHighlight);
    
    // Special buttons
    document.getElementById('checklistBtn').addEventListener('click', insertChecklist);
    document.getElementById('insertImageBtn').addEventListener('click', insertImage);
    document.getElementById('insertLinkBtn').addEventListener('click', () => openModal('linkModal'));
    document.getElementById('insertLinkConfirm').addEventListener('click', insertLink);
    document.getElementById('addTagBtn').addEventListener('click', addTag);
    
    // Drawing tools
    document.getElementById('drawModeBtn').addEventListener('click', toggleDrawMode);
    document.getElementById('eraserBtn').addEventListener('click', toggleEraseMode);
    document.getElementById('brushSize').addEventListener('input', (e) => {
        brushSize = parseInt(e.target.value);
    });
    
    // Color options in modal
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
            e.target.classList.add('active');
            selectedColor = e.target.dataset.color;
        });
    });
    
    // Modal close handlers
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.dataset.modal);
        });
    });
    
    // Context menu
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', () => {
        document.getElementById('contextMenu').classList.remove('active');
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Sidebar toggle
    document.getElementById('toggleSidebarBtn').addEventListener('click', toggleSidebar);
}

// -----------------------------
// Notebook Management
// -----------------------------

function loadNotebooks() {
    const notebooks = getAllNotebooks();
    const notebooksList = document.getElementById('notebooksList');
    notebooksList.innerHTML = '';
    
    notebooks.forEach(notebook => {
        const notebookEl = createNotebookElement(notebook);
        notebooksList.appendChild(notebookEl);
    });
    
    // Load the first notebook by default or the last active one
    if (notebooks.length > 0 && !currentNotebook) {
        const firstNotebook = notebooks[0];
        currentNotebook = firstNotebook.id;
        if (firstNotebook.sections.length > 0) {
            currentSection = firstNotebook.sections[0].id;
            if (firstNotebook.sections[0].pages.length > 0) {
                currentPage = firstNotebook.sections[0].pages[0].id;
            }
        }
    }
    
    if (currentPage) {
        loadPage(currentPage);
    }
}

function createNotebookElement(notebook) {
    const div = document.createElement('div');
    div.className = 'notebook-item';
    div.dataset.id = notebook.id;
    
    const header = document.createElement('div');
    header.className = `notebook-header ${currentNotebook === notebook.id ? 'active' : ''}`;
    
    header.innerHTML = `
        <div class="notebook-color" style="background: ${notebook.color}"></div>
        <span class="notebook-title">${notebook.name}</span>
        <div class="notebook-toggle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </div>
        <div class="notebook-actions">
            <button class="icon-btn new-section-btn" title="New Section">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
            </button>
        </div>
    `;
    
    const sectionsList = document.createElement('div');
    sectionsList.className = 'sections-list';
    
    notebook.sections.forEach(section => {
        const sectionEl = createSectionElement(section, notebook.id);
        sectionsList.appendChild(sectionEl);
    });
    
    div.appendChild(header);
    div.appendChild(sectionsList);
    
    // Toggle sections
    header.querySelector('.notebook-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        sectionsList.classList.toggle('expanded');
        header.querySelector('.notebook-toggle').classList.toggle('expanded');
    });
    
    // Select notebook
    header.addEventListener('click', () => {
        currentNotebook = notebook.id;
        document.querySelectorAll('.notebook-header').forEach(h => h.classList.remove('active'));
        header.classList.add('active');
    });
    
    // New section button
    header.querySelector('.new-section-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        currentNotebook = notebook.id;
        openModal('newSectionModal');
    });
    
    return div;
}

function createSectionElement(section, notebookId) {
    const div = document.createElement('div');
    div.className = 'section-item';
    div.dataset.id = section.id;
    
    const header = document.createElement('div');
    header.className = `section-header ${currentSection === section.id ? 'active' : ''}`;
    
    header.innerHTML = `
        <div class="section-toggle">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </div>
        <span class="section-title">${section.name}</span>
    `;
    
    const pagesList = document.createElement('div');
    pagesList.className = 'pages-list';
    
    section.pages.forEach(page => {
        const pageEl = createPageElement(page, notebookId, section.id);
        pagesList.appendChild(pageEl);
    });
    
    // Add new page button
    const newPageBtn = document.createElement('div');
    newPageBtn.className = 'page-item';
    newPageBtn.innerHTML = `
        <svg class="page-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>New Page</span>
    `;
    newPageBtn.addEventListener('click', () => {
        currentNotebook = notebookId;
        currentSection = section.id;
        openModal('newPageModal');
    });
    pagesList.appendChild(newPageBtn);
    
    div.appendChild(header);
    div.appendChild(pagesList);
    
    // Toggle pages
    header.querySelector('.section-toggle').addEventListener('click', (e) => {
        e.stopPropagation();
        pagesList.classList.toggle('expanded');
        header.querySelector('.section-toggle').classList.toggle('expanded');
    });
    
    // Select section
    header.addEventListener('click', () => {
        currentNotebook = notebookId;
        currentSection = section.id;
        document.querySelectorAll('.section-header').forEach(h => h.classList.remove('active'));
        header.classList.add('active');
    });
    
    return div;
}

function createPageElement(page, notebookId, sectionId) {
    const div = document.createElement('div');
    div.className = `page-item ${currentPage === page.id ? 'active' : ''}`;
    div.dataset.id = page.id;
    
    const timeAgo = getTimeAgo(page.updatedAt || page.createdAt);
    
    div.innerHTML = `
        <div class="page-item-header">
            <svg class="page-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>${page.name}</span>
        </div>
        <div class="page-item-time">${timeAgo}</div>
    `;
    
    div.addEventListener('click', () => {
        currentNotebook = notebookId;
        currentSection = sectionId;
        currentPage = page.id;
        loadPage(page.id);
        
        document.querySelectorAll('.page-item').forEach(p => p.classList.remove('active'));
        div.classList.add('active');
    });
    
    return div;
}

function createNotebook() {
    const name = document.getElementById('notebookName').value.trim();
    if (!name) return;
    
    const notebooks = getAllNotebooks();
    const newNotebook = {
        id: generateId(),
        name: name,
        color: selectedColor,
        sections: [{
            id: generateId(),
            name: 'General Notes',
            pages: []
        }],
        createdAt: new Date().toISOString()
    };
    
    notebooks.push(newNotebook);
    saveNotebooks(notebooks);
    
    document.getElementById('notebookName').value = '';
    closeModal('newNotebookModal');
    loadNotebooks();
}

function createSection() {
    const name = document.getElementById('sectionName').value.trim();
    if (!name || !currentNotebook) return;
    
    const notebooks = getAllNotebooks();
    const notebook = notebooks.find(n => n.id === currentNotebook);
    
    if (notebook) {
        const newSection = {
            id: generateId(),
            name: name,
            pages: []
        };
        
        notebook.sections.push(newSection);
        saveNotebooks(notebooks);
        
        document.getElementById('sectionName').value = '';
        closeModal('newSectionModal');
        loadNotebooks();
    }
}

function createPage() {
    const name = document.getElementById('pageName').value.trim();
    if (!name || !currentNotebook || !currentSection) return;
    
    const notebooks = getAllNotebooks();
    const notebook = notebooks.find(n => n.id === currentNotebook);
    const section = notebook?.sections.find(s => s.id === currentSection);
    
    if (section) {
        const newPage = {
            id: generateId(),
            name: name,
            notes: [],
            tags: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        section.pages.push(newPage);
        saveNotebooks(notebooks);
        
        currentPage = newPage.id;
        
        document.getElementById('pageName').value = '';
        closeModal('newPageModal');
        loadNotebooks();
        loadPage(newPage.id);
    }
}

// -----------------------------
// Page Management
// -----------------------------

function loadPage(pageId) {
    const notebooks = getAllNotebooks();
    let page = null;
    
    for (const notebook of notebooks) {
        for (const section of notebook.sections) {
            const foundPage = section.pages.find(p => p.id === pageId);
            if (foundPage) {
                page = foundPage;
                break;
            }
        }
        if (page) break;
    }
    
    if (!page) return;
    
    // Clear canvas
    const canvas = document.getElementById('canvas');
    canvas.innerHTML = '';
    
    // Create drawing canvas and inner container
    setupDrawingCanvas();
    
    const canvasInner = canvas.querySelector('.canvas-inner');
    
    if (page.notes.length === 0 && (!page.drawing || page.drawing.length === 0)) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.id = 'emptyState';
        emptyState.innerHTML = `
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3">
                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                <path d="M2 2l7.586 7.586"></path>
                <circle cx="11" cy="11" r="2"></circle>
            </svg>
            <p>Click to add notes or press D to draw</p>
            <p class="small">Ctrl+N for new note • Draw with stylus or mouse</p>
        `;
        canvasInner.appendChild(emptyState);
    } else {
        page.notes.forEach(note => {
            const noteEl = createNoteElement(note);
            canvasInner.appendChild(noteEl);
        });
        
        // Load drawing data
        if (page.drawing && page.drawing.length > 0) {
            loadDrawing(page.drawing);
        }
    }
    
    // Auto-expand canvas height based on content
    expandCanvasHeight();
}

function updatePageTitle() {
    if (!currentPage) return;
    
    const notebooks = getAllNotebooks();
    let page = null;
    
    for (const notebook of notebooks) {
        for (const section of notebook.sections) {
            const foundPage = section.pages.find(p => p.id === currentPage);
            if (foundPage) {
                page = foundPage;
                break;
            }
        }
        if (page) break;
    }
    
    if (page) {
        page.name = document.getElementById('pageTitle').value || 'Untitled Page';
        page.updatedAt = new Date().toISOString();
        saveNotebooks(notebooks);
        loadNotebooks();
    }
}

function savePage() {
    if (!currentPage) return;
    
    const notebooks = getAllNotebooks();
    let page = null;
    
    for (const notebook of notebooks) {
        for (const section of notebook.sections) {
            const foundPage = section.pages.find(p => p.id === currentPage);
            if (foundPage) {
                page = foundPage;
                break;
            }
        }
        if (page) break;
    }
    
    if (page) {
        const canvas = document.getElementById('canvas');
        const canvasInner = canvas.querySelector('.canvas-inner');
        const noteElements = canvasInner ? canvasInner.querySelectorAll('.note-container') : [];
        
        page.notes = Array.from(noteElements).map(el => {
            return {
                id: el.dataset.id,
                content: el.querySelector('.note-content').innerHTML,
                position: {
                    x: parseInt(el.style.left) || 0,
                    y: parseInt(el.style.top) || 0
                },
                size: {
                    width: parseInt(el.style.width) || 400,
                    height: parseInt(el.style.height) || 200
                }
            };
        });
        
        // Save drawing data
        page.drawing = getDrawingData();
        
        page.updatedAt = new Date().toISOString();
        saveNotebooks(notebooks);
        
        // Reload sidebar to update timestamps
        loadNotebooks();
    }
}

// -----------------------------
// Note Container Management
// -----------------------------

function handleCanvasClick(e) {
    if (e.target.classList.contains('canvas-inner') || e.target.id === 'emptyState' || e.target.closest('.empty-state')) {
        const canvasInner = document.querySelector('.canvas-inner');
        if (!canvasInner) return;
        
        const rect = canvasInner.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        createNoteContainer(x, y);
    }
}

function createNoteContainer(x, y) {
    const canvas = document.getElementById('canvas');
    const canvasInner = canvas.querySelector('.canvas-inner');
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
        emptyState.remove();
    }
    
    const note = {
        id: generateId(),
        content: '',
        position: { x: x - 100, y: y - 50 },
        size: { width: 400, height: 200 }
    };
    
    const noteEl = createNoteElement(note);
    canvasInner.appendChild(noteEl);
    
    // Focus on the new note
    const contentEl = noteEl.querySelector('.note-content');
    contentEl.focus();
    
    savePage();
}

function createNoteElement(note) {
    const div = document.createElement('div');
    div.className = 'note-container';
    div.dataset.id = note.id;
    div.style.left = note.position.x + 'px';
    div.style.top = note.position.y + 'px';
    div.style.width = note.size.width + 'px';
    div.style.height = note.size.height + 'px';
    
    const content = document.createElement('div');
    content.className = 'note-content';
    content.contentEditable = true;
    content.innerHTML = note.content || '';
    
    content.addEventListener('input', savePage);
    content.addEventListener('focus', () => {
        selectedNoteContainer = div;
        document.querySelectorAll('.note-container').forEach(n => n.classList.remove('selected'));
        div.classList.add('selected');
    });
    
    div.appendChild(content);
    
    // Make draggable
    div.addEventListener('mousedown', handleNoteMouseDown);
    
    return div;
}

function handleNoteMouseDown(e) {
    if (e.target.classList.contains('note-content') || e.target.closest('.note-content')) {
        return; // Don't drag when editing content
    }
    
    e.preventDefault();
    isDragging = true;
    selectedNoteContainer = e.currentTarget;
    
    const rect = selectedNoteContainer.getBoundingClientRect();
    const canvasRect = document.getElementById('canvas').getBoundingClientRect();
    
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    selectedNoteContainer.classList.add('selected');
    document.querySelectorAll('.note-container').forEach(n => {
        if (n !== selectedNoteContainer) n.classList.remove('selected');
    });
}

function handleCanvasMouseDown(e) {
    // Deselect notes when clicking on empty canvas
    if (e.target.id === 'canvas') {
        document.querySelectorAll('.note-container').forEach(n => n.classList.remove('selected'));
        selectedNoteContainer = null;
    }
}

function handleDocumentMouseMove(e) {
    if (!isDragging || !selectedNoteContainer) return;
    
    const canvasRect = document.getElementById('canvas').getBoundingClientRect();
    const x = e.clientX - canvasRect.left - dragOffset.x;
    const y = e.clientY - canvasRect.top - dragOffset.y;
    
    selectedNoteContainer.style.left = Math.max(0, x) + 'px';
    selectedNoteContainer.style.top = Math.max(0, y) + 'px';
}

function handleDocumentMouseUp() {
    if (isDragging) {
        isDragging = false;
        savePage();
    }
}

// -----------------------------
// Search Functionality
// -----------------------------

function performSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');
    
    if (!query) {
        resultsContainer.innerHTML = '<div class="empty-search">Start typing to search...</div>';
        return;
    }
    
    const notebooks = getAllNotebooks();
    const results = [];
    
    notebooks.forEach(notebook => {
        notebook.sections.forEach(section => {
            section.pages.forEach(page => {
                // Search in page title
                if (page.name.toLowerCase().includes(query)) {
                    results.push({
                        type: 'page',
                        notebook: notebook.name,
                        section: section.name,
                        page: page,
                        match: page.name
                    });
                }
                
                // Search in note content
                page.notes.forEach(note => {
                    const content = stripHtml(note.content).toLowerCase();
                    if (content.includes(query)) {
                        results.push({
                            type: 'note',
                            notebook: notebook.name,
                            section: section.name,
                            page: page,
                            match: getSearchPreview(content, query)
                        });
                    }
                });
            });
        });
    });
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="empty-search">No results found</div>';
        return;
    }
    
    resultsContainer.innerHTML = results.map(result => `
        <div class="search-result-item" onclick="openSearchResult('${result.page.id}')">
            <div class="search-result-title">${result.page.name}</div>
            <div class="search-result-path">${result.notebook} > ${result.section}</div>
            <div class="search-result-preview">${highlightSearchTerm(result.match, query)}</div>
        </div>
    `).join('');
}

function openSearchResult(pageId) {
    const notebooks = getAllNotebooks();
    
    for (const notebook of notebooks) {
        for (const section of notebook.sections) {
            const page = section.pages.find(p => p.id === pageId);
            if (page) {
                currentNotebook = notebook.id;
                currentSection = section.id;
                currentPage = page.id;
                loadPage(page.id);
                closeModal('searchModal');
                loadNotebooks();
                return;
            }
        }
    }
}

function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

function getSearchPreview(content, query) {
    const index = content.indexOf(query);
    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + query.length + 50);
    return (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
}

function highlightSearchTerm(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<span class="search-highlight">$1</span>');
}

// -----------------------------
// Formatting Functions
// -----------------------------

function changeHeading() {
    const heading = document.getElementById('headingSelect').value;
    document.execCommand('formatBlock', false, heading);
}

function changeTextColor() {
    const color = document.getElementById('textColorPicker').value;
    document.execCommand('foreColor', false, color);
}

function changeHighlight() {
    const color = document.getElementById('highlightColorPicker').value;
    document.execCommand('backColor', false, color);
}

function insertChecklist() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const checklistItem = document.createElement('div');
    checklistItem.className = 'checklist-item';
    checklistItem.innerHTML = `
        <input type="checkbox" onchange="toggleChecklistItem(this)">
        <span contenteditable="true">New task</span>
    `;
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(checklistItem);
    
    savePage();
}

function toggleChecklistItem(checkbox) {
    const item = checkbox.parentElement;
    item.classList.toggle('completed', checkbox.checked);
    savePage();
}

function insertImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            document.execCommand('insertImage', false, event.target.result);
            savePage();
        };
        reader.readAsDataURL(file);
    };
    
    input.click();
}

function insertLink() {
    const text = document.getElementById('linkText').value;
    const url = document.getElementById('linkUrl').value;
    
    if (!url) return;
    
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const link = document.createElement('a');
    link.href = url;
    link.textContent = text || url;
    link.target = '_blank';
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(link);
    
    document.getElementById('linkText').value = '';
    document.getElementById('linkUrl').value = '';
    closeModal('linkModal');
    savePage();
}

function addTag() {
    const tagName = prompt('Enter tag name:');
    if (!tagName) return;
    
    // TODO: Implement tag system
    console.log('Tag system coming soon!');
}

// -----------------------------
// Context Menu
// -----------------------------

function handleContextMenu(e) {
    const noteContainer = e.target.closest('.note-container');
    if (!noteContainer) return;
    
    e.preventDefault();
    selectedNoteContainer = noteContainer;
    
    const contextMenu = document.getElementById('contextMenu');
    contextMenu.style.left = e.pageX + 'px';
    contextMenu.style.top = e.pageY + 'px';
    contextMenu.classList.add('active');
    
    // Setup context menu actions
    contextMenu.querySelectorAll('.context-item').forEach(item => {
        item.onclick = () => handleContextAction(item.dataset.action);
    });
}

function handleContextAction(action) {
    if (!selectedNoteContainer) return;
    
    switch (action) {
        case 'duplicate':
            duplicateNote(selectedNoteContainer);
            break;
        case 'delete':
            deleteNote(selectedNoteContainer);
            break;
        case 'color':
            changeNoteColor(selectedNoteContainer);
            break;
    }
    
    document.getElementById('contextMenu').classList.remove('active');
}

function duplicateNote(noteEl) {
    const canvas = document.getElementById('canvas');
    const rect = noteEl.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    
    const note = {
        id: generateId(),
        content: noteEl.querySelector('.note-content').innerHTML,
        position: {
            x: parseInt(noteEl.style.left) + 20,
            y: parseInt(noteEl.style.top) + 20
        },
        size: {
            width: parseInt(noteEl.style.width),
            height: parseInt(noteEl.style.height)
        }
    };
    
    const newNoteEl = createNoteElement(note);
    canvas.appendChild(newNoteEl);
    savePage();
}

function deleteNote(noteEl) {
    if (confirm('Delete this note?')) {
        noteEl.remove();
        savePage();
    }
}

function changeNoteColor(noteEl) {
    const color = prompt('Enter color (hex or name):');
    if (color) {
        noteEl.style.background = color;
        savePage();
    }
}

// -----------------------------
// Modal Management
// -----------------------------

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// -----------------------------
// Keyboard Shortcuts
// -----------------------------

function handleKeyboardShortcuts(e) {
    // Ctrl+N: New note container
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        createNoteContainer(rect.width / 2, rect.height / 2);
    }
    
    // Ctrl+F: Search
    if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        openModal('searchModal');
        document.getElementById('searchInput').focus();
    }
    
    // Delete: Delete selected note
    if (e.key === 'Delete' && selectedNoteContainer) {
        const activeElement = document.activeElement;
        if (!activeElement.classList.contains('note-content')) {
            deleteNote(selectedNoteContainer);
        }
    }
    
    // Escape: Deselect
    if (e.key === 'Escape') {
        document.querySelectorAll('.note-container').forEach(n => n.classList.remove('selected'));
        selectedNoteContainer = null;
        document.getElementById('contextMenu').classList.remove('active');
        
        // Exit draw mode
        if (drawMode || eraseMode) {
            drawMode = false;
            eraseMode = false;
            document.getElementById('drawModeBtn').classList.remove('active');
            document.getElementById('eraserBtn').classList.remove('active');
            updateCanvasMode();
        }
    }
    
    // D: Toggle draw mode
    if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.altKey) {
        const activeElement = document.activeElement;
        if (!activeElement.classList.contains('note-content') && activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            toggleDrawMode();
        }
    }
}

// -----------------------------
// Drawing Functions
// -----------------------------

function setupDrawingCanvas() {
    const canvas = document.getElementById('canvas');
    
    // Remove existing canvas inner if any
    let canvasInner = canvas.querySelector('.canvas-inner');
    if (canvasInner) {
        canvasInner.remove();
    }
    
    // Create canvas inner container
    canvasInner = document.createElement('div');
    canvasInner.className = 'canvas-inner';
    canvas.appendChild(canvasInner);
    
    // Create new drawing canvas
    drawingCanvas = document.createElement('canvas');
    drawingCanvas.id = 'drawingCanvas';
    drawingCanvas.width = canvas.clientWidth;
    drawingCanvas.height = 2000; // Initial height
    
    drawingContext = drawingCanvas.getContext('2d');
    drawingContext.lineCap = 'round';
    drawingContext.lineJoin = 'round';
    
    canvasInner.appendChild(drawingCanvas);
    
    // Setup drawing events
    drawingCanvas.addEventListener('mousedown', startDrawing);
    drawingCanvas.addEventListener('mousemove', draw);
    drawingCanvas.addEventListener('mouseup', stopDrawing);
    drawingCanvas.addEventListener('mouseleave', stopDrawing);
    
    // Touch support
    drawingCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    drawingCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    drawingCanvas.addEventListener('touchend', stopDrawing);
}

function toggleDrawMode() {
    drawMode = !drawMode;
    eraseMode = false;
    
    document.getElementById('drawModeBtn').classList.toggle('active', drawMode);
    document.getElementById('eraserBtn').classList.remove('active');
    
    updateCanvasMode();
}

function toggleEraseMode() {
    eraseMode = !eraseMode;
    drawMode = false;
    
    document.getElementById('eraserBtn').classList.toggle('active', eraseMode);
    document.getElementById('drawModeBtn').classList.remove('active');
    
    updateCanvasMode();
}

function updateCanvasMode() {
    const canvas = document.getElementById('canvas');
    const drawingCanvas = document.getElementById('drawingCanvas');
    
    canvas.classList.remove('draw-mode', 'erase-mode');
    
    if (drawMode) {
        canvas.classList.add('draw-mode');
        drawingCanvas.classList.add('active');
    } else if (eraseMode) {
        canvas.classList.add('erase-mode');
        drawingCanvas.classList.add('active');
    } else {
        drawingCanvas.classList.remove('active');
    }
}

function startDrawing(e) {
    if (!drawMode && !eraseMode) return;
    
    e.preventDefault();
    isDrawing = true;
    
    const rect = drawingCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (drawingCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (drawingCanvas.height / rect.height);
    
    drawingContext.beginPath();
    drawingContext.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing || (!drawMode && !eraseMode)) return;
    
    e.preventDefault();
    
    const rect = drawingCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (drawingCanvas.width / rect.width);
    const y = (e.clientY - rect.top) * (drawingCanvas.height / rect.height);
    
    if (eraseMode) {
        drawingContext.globalCompositeOperation = 'destination-out';
        drawingContext.lineWidth = brushSize * 4;
    } else {
        drawingContext.globalCompositeOperation = 'source-over';
        drawingContext.strokeStyle = brushColor;
        drawingContext.lineWidth = brushSize;
    }
    
    drawingContext.lineTo(x, y);
    drawingContext.stroke();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        savePage();
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    drawingCanvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    drawingCanvas.dispatchEvent(mouseEvent);
}

function loadDrawing(drawingData) {
    if (!drawingContext || !drawingData) return;
    
    const img = new Image();
    img.onload = () => {
        drawingContext.drawImage(img, 0, 0);
    };
    img.src = drawingData;
}

function getDrawingData() {
    if (!drawingCanvas) return null;
    return drawingCanvas.toDataURL('image/png');
}

function expandCanvasHeight() {
    const canvas = document.getElementById('canvas');
    const canvasInner = canvas.querySelector('.canvas-inner');
    const drawingCanvas = document.getElementById('drawingCanvas');
    
    if (!drawingCanvas || !canvasInner) return;
    
    // Find the lowest positioned element
    const notes = canvasInner.querySelectorAll('.note-container');
    let maxBottom = 2000;
    
    notes.forEach(note => {
        const bottom = parseInt(note.style.top) + parseInt(note.style.height);
        if (bottom > maxBottom) {
            maxBottom = bottom + 500; // Add padding
        }
    });
    
    // Update canvas-inner and drawing canvas height
    if (maxBottom > parseInt(canvasInner.style.minHeight || 2000)) {
        canvasInner.style.minHeight = maxBottom + 'px';
        
        const tempData = getDrawingData();
        drawingCanvas.height = maxBottom;
        if (tempData) {
            loadDrawing(tempData);
        }
    }
}

// -----------------------------
// Utility Functions
// -----------------------------

function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

// -----------------------------
// UI Helpers
// -----------------------------

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    
    const btn = document.getElementById('toggleSidebarBtn');
    btn.innerHTML = sidebar.classList.contains('collapsed') ? `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        Expand
    ` : `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        Collapse
    `;
}

// Auto-save every 30 seconds
setInterval(() => {
    if (currentPage) {
        savePage();
    }
}, 30000);
