// app.js - Frontend Logic
// ENGSE207 Software Architecture - Week 3 Lab
// Client-Server Architecture

// ========================================
// PART 1: STATE MANAGEMENT
// ========================================

let allTasks = [];
let currentFilter = 'ALL';

// ========================================
// PART 2: API CONFIGURATION
// ========================================

// API Configuration using API_CONFIG
const API_BASE = API_CONFIG.BASE_URL;
const API = {
    TASKS: `${API_BASE}${API_CONFIG.ENDPOINTS.TASKS}`,
    STATS: `${API_BASE}${API_CONFIG.ENDPOINTS.STATS}`
};

// ========================================
// PART 3: DOM ELEMENTS
// ========================================

const addTaskForm = document.getElementById('addTaskForm');
const statusFilter = document.getElementById('statusFilter');
const loadingOverlay = document.getElementById('loadingOverlay');

// Task list containers
const todoTasks = document.getElementById('todoTasks');
const progressTasks = document.getElementById('progressTasks');
const doneTasks = document.getElementById('doneTasks');

// Task counters
const todoCount = document.getElementById('todoCount');
const progressCount = document.getElementById('progressCount');
const doneCount = document.getElementById('doneCount');

// Server status elements
const serverStatus = document.getElementById('serverStatus');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

// ========================================
// PART 4: SERVER STATUS MANAGEMENT
// ========================================

/**
 * Update server connection status indicator
 */
function updateServerStatus() {
    // Try to ping the server
    fetch(API.TASKS)
        .then(response => {
            if (response.ok) {
                serverStatus.className = 'status-bar connected';
                statusIndicator.textContent = '🟢';
                statusText.textContent = `เชื่อมต่อกับ server สำเร็จ (${API_BASE})`;
            } else {
                throw new Error('Server error');
            }
        })
        .catch(() => {
            serverStatus.className = 'status-bar error';
            statusIndicator.textContent = '🔴';
            statusText.textContent = `ไม่สามารถเชื่อมต่อกับ server ได้ (${API_BASE})`;
        });
}

/**
 * Check server health periodically (optional)
 */
function startServerHealthCheck() {
    // Check every 30 seconds
    setInterval(() => {
        updateServerStatus();
    }, 30000);
}

// ========================================
// PART 5: API FUNCTIONS - FETCH TASKS
// ========================================

/**
 * Fetch all tasks from the server
 */
async function fetchTasks() {
    showLoading();
    try {
        const response = await fetch(API.TASKS);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        allTasks = data.data;
        console.log('Fetched tasks:', data);
        renderTasks();
        
        // Update server status on successful fetch
        updateServerStatus();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showError('Failed to load tasks. Please check server connection and refresh the page.');
        
        // Update server status on error
        updateServerStatus();
    } finally {
        hideLoading();
    }
}

// ========================================
// PART 6: API FUNCTIONS - CREATE TASK
// ========================================

/**
 * Create a new task
 * @param {Object} taskData - Task data {title, description, priority}
 */
async function createTask(taskData) {
    showLoading();
    try {
        const response = await fetch(API.TASKS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create task');
        }
        
        const data = await response.json();
        allTasks.unshift(data.data); // Add to beginning
        renderTasks();
        
        // Reset form
        addTaskForm.reset();
        
        showSuccess('✅ Task created successfully!');
        console.log('Task created:', data.data);
    } catch (error) {
        console.error('Error creating task:', error);
        showError(`❌ Failed to create task: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// ========================================
// PART 7: API FUNCTIONS - UPDATE STATUS
// ========================================

/**
 * Update task status
 * @param {number} taskId - Task ID
 * @param {string} newStatus - New status (TODO, IN_PROGRESS, DONE)
 */
async function updateTaskStatus(taskId, newStatus) {
    showLoading();
    try {
        const response = await fetch(`${API.TASKS}/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update task status');
        }
        
        const data = await response.json();
        
        // Update task in allTasks array
        const taskIndex = allTasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            allTasks[taskIndex] = data.data;
        }
        
        renderTasks();
        showSuccess('✅ Task status updated!');
        console.log('Task updated:', data.data);
    } catch (error) {
        console.error('Error updating task status:', error);
        showError(`❌ Failed to update task status: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// ========================================
// PART 8: API FUNCTIONS - DELETE TASK
// ========================================

/**
 * Delete a task
 * @param {number} taskId - Task ID
 */
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    showLoading();
    try {
        const response = await fetch(`${API.TASKS}/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete task');
        }
        
        // Remove task from allTasks array
        allTasks = allTasks.filter(t => t.id !== taskId);
        
        renderTasks();
        
        showSuccess('✅ Task deleted successfully!');
        console.log('Task deleted:', taskId);
    } catch (error) {
        console.error('Error deleting task:', error);
        showError(`❌ Failed to delete task: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// ========================================
// PART 9: API FUNCTIONS - FETCH STATISTICS
// ========================================

/**
 * Fetch task statistics (optional)
 * @returns {Promise<Object|null>} Statistics data or null
 */
async function fetchStatistics() {
    try {
        const response = await fetch(API.STATS);
        
        if (!response.ok) {
            throw new Error('Failed to fetch statistics');
        }
        
        const data = await response.json();
        console.log('Statistics:', data);
        return data.data;
    } catch (error) {
        console.error('Error fetching statistics:', error);
        return null;
    }
}

// ========================================
// PART 10: RENDER FUNCTIONS - MAIN RENDER
// ========================================

/**
 * Render all tasks to the UI
 */
function renderTasks() {
    // Clear all lists
    todoTasks.innerHTML = '';
    progressTasks.innerHTML = '';
    doneTasks.innerHTML = '';
    
    // Filter tasks based on current filter
    let filteredTasks = allTasks;
    if (currentFilter !== 'ALL') {
        filteredTasks = allTasks.filter(task => task.status === currentFilter);
    }
    
    // Separate tasks by status
    const todo = filteredTasks.filter(t => t.status === 'TODO');
    const progress = filteredTasks.filter(t => t.status === 'IN_PROGRESS');
    const done = filteredTasks.filter(t => t.status === 'DONE');
    
    // Update counters
    todoCount.textContent = todo.length;
    progressCount.textContent = progress.length;
    doneCount.textContent = done.length;
    
    // Render each column
    renderTaskList(todo, todoTasks, 'TODO');
    renderTaskList(progress, progressTasks, 'IN_PROGRESS');
    renderTaskList(done, doneTasks, 'DONE');
}

// ========================================
// PART 11: RENDER FUNCTIONS - RENDER LIST
// ========================================

/**
 * Render a list of tasks to a container
 * @param {Array} tasks - Array of task objects
 * @param {HTMLElement} container - Container element
 * @param {string} currentStatus - Current status column
 */
function renderTaskList(tasks, container, currentStatus) {
    if (tasks.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No tasks yet</p></div>';
        return;
    }
    
    tasks.forEach(task => {
        const card = createTaskCard(task, currentStatus);
        container.appendChild(card);
    });
}

// ========================================
// PART 12: RENDER FUNCTIONS - CREATE CARD
// ========================================

/**
 * Create a task card element
 * @param {Object} task - Task object
 * @param {string} currentStatus - Current status column
 * @returns {HTMLElement} Task card element
 */
function createTaskCard(task, currentStatus) {
    const card = document.createElement('div');
    card.className = 'task-card';
    
    const priorityClass = `priority-${task.priority.toLowerCase()}`;
    
    card.innerHTML = `
        <div class="task-header">
            <div class="task-title">${escapeHtml(task.title)}</div>
            <span class="priority-badge ${priorityClass}">${task.priority}</span>
        </div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
            Created: ${formatDate(task.created_at)}
        </div>
        <div class="task-actions">
            ${createStatusButtons(task.id, currentStatus)}
            <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">
                🗑️ Delete
            </button>
        </div>
    `;
    
    return card;
}

// ========================================
// PART 13: HELPER FUNCTIONS - STATUS BUTTONS
// ========================================

/**
 * Create status transition buttons HTML
 * @param {number} taskId - Task ID
 * @param {string} currentStatus - Current task status
 * @returns {string} HTML string for buttons
 */
function createStatusButtons(taskId, currentStatus) {
    const buttons = [];
    
    if (currentStatus !== 'TODO') {
        buttons.push(`
            <button class="btn btn-warning btn-sm" onclick="updateTaskStatus(${taskId}, 'TODO')">
                ← To Do
            </button>
        `);
    }
    
    if (currentStatus !== 'IN_PROGRESS') {
        buttons.push(`
            <button class="btn btn-primary btn-sm" onclick="updateTaskStatus(${taskId}, 'IN_PROGRESS')">
                ${currentStatus === 'TODO' ? '→' : '←'} In Progress
            </button>
        `);
    }
    
    if (currentStatus !== 'DONE') {
        buttons.push(`
            <button class="btn btn-success btn-sm" onclick="updateTaskStatus(${taskId}, 'DONE')">
                → Done
            </button>
        `);
    }
    
    return buttons.join('');
}

// ========================================
// PART 14: UTILITY FUNCTIONS
// ========================================

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date string to readable format
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Show loading overlay
 */
function showLoading() {
    loadingOverlay.style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    loadingOverlay.style.display = 'none';
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
    alert(message);
    // TODO: Replace with better notification system (e.g., toast notification)
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
    alert(message);
    // TODO: Replace with better notification system (e.g., toast notification)
}

// ========================================
// PART 15: EVENT LISTENERS
// ========================================

/**
 * Handle form submission
 */
addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    
    if (!title) {
        showError('Please enter a task title');
        return;
    }
    
    createTask({ title, description, priority });
});

/**
 * Handle status filter change
 */
statusFilter.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    console.log('Filter changed to:', currentFilter);
    renderTasks();
});

// ========================================
// PART 16: INITIALIZATION
// ========================================

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Task Board App Initialized');
    console.log('📊 Architecture: Client-Server');
    console.log('🔗 API Base URL:', API_BASE);
    console.log('📍 Endpoints:', API);
    
    // Update server status
    updateServerStatus();
    
    // Start periodic health check (optional)
    // startServerHealthCheck();
    
    // Load initial tasks
    fetchTasks();
});

// ========================================
// PART 17: GLOBAL FUNCTION EXPOSURE
// ========================================

// Make functions globally accessible for inline onclick handlers
window.updateTaskStatus = updateTaskStatus;
window.deleteTask = deleteTask;

// ========================================
// ARCHITECTURE NOTES
// ========================================

/*
CLIENT-SERVER ARCHITECTURE IMPLEMENTATION:

✅ Client Side (This File):
   - User Interface (HTML/CSS)
   - Business Logic (JavaScript)
   - API Communication
   - State Management
   - Event Handling

✅ Server Side (Backend):
   - RESTful API Endpoints
   - Database Operations
   - Data Validation
   - Error Handling

✅ Communication:
   - HTTP/HTTPS Protocol
   - JSON Data Format
   - RESTful Design Pattern

✅ Key Features:
   1. Configurable API endpoints (config.js)
   2. Server status monitoring
   3. Error handling with user feedback
   4. Loading states
   5. Separation of concerns
   6. Modular code structure

✅ API Endpoints Used:
   - GET    /api/tasks       - Fetch all tasks
   - POST   /api/tasks       - Create new task
   - PUT    /api/tasks/:id   - Update task
   - DELETE /api/tasks/:id   - Delete task
   - GET    /api/tasks/stats - Get statistics (optional)

✅ Benefits:
   - Easy to scale
   - Can change backend without affecting frontend
   - Can deploy frontend and backend separately
   - Better security (API key management)
   - Multiple clients can use same API
*/