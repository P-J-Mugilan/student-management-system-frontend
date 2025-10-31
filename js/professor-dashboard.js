// PROFESSOR DASHBOARD MANAGER
// Handles all professor-specific dashboard functionality including student management
console.log('Loading Professor Dashboard Manager...');

class ProfessorDashboardManager {
    constructor() {
        this.apiBaseUrl = API_BASE_URL;
        this.currentPage = 0;
        this.pageSize = 10;
        this.currentSection = 'students';
        this.openForms = new Set();
        this.professorBranchId = null;
        this.professorBranchName = null;
        this.init();
    }

    /**
     * Initialize the professor dashboard
     * Sets up authentication, navigation, and initial data loading
     */
    init() {
        console.log('Professor Dashboard Manager Initialized');
        
        if (!this.checkAuth()) {
            return;
        }

        this.setupDashboard();
    }

    /**
     * Check if professor is authenticated
     * Redirects to login if no valid token found
     * @returns {boolean} True if authenticated
     */
    checkAuth() {
        const token = this.getToken();
        if (!token) {
            console.log('No token found - redirecting to login');
            window.location.href = 'login.html';
            return false;
        }
        console.log('Professor authenticated');
        return true;
    }

    /**
     * Get JWT token from localStorage
     * @returns {string|null} JWT token or null if not found
     */
    getToken() {
        return localStorage.getItem('jwtToken');
    }

    /**
     * Set up dashboard components and load initial data
     */
    setupDashboard() {
        this.setupNavigation();
        this.setupLogout();
        this.setupRefresh();
        this.loadProfessorInfo();
        
        this.initStudentsSection();
        
        this.loadSectionData(this.currentSection);
        this.closeAllForms();
    }

    /**
     * Set up navigation between dashboard sections
     */
    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-section]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.switchSection(section);
            });
        });
    }

    /**
     * Switch between dashboard sections
     * @param {string} section - Section to switch to (students, etc.)
     */
    switchSection(section) {
        console.log('Switching to section:', section);
        this.closeAllForms();
        
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNav = document.querySelector(`[data-section="${section}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update content section visibility
        document.querySelectorAll('.content-section').forEach(sectionEl => {
            sectionEl.classList.remove('active');
        });
        const activeSection = document.getElementById(`${section}Section`);
        if (activeSection) activeSection.classList.add('active');

        this.currentSection = section;
        this.currentPage = 0;
        this.loadSectionData(section);
    }

    /**
     * Close all open forms in the dashboard
     */
    closeAllForms() {
        console.log('Closing all forms');
        const forms = ['studentFormContainer'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.style.display = 'none';
        });
        this.openForms.clear();
    }

    /**
     * Set up logout functionality
     */
    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    /**
     * Handle user logout process
     */
    handleLogout() {
        localStorage.removeItem('jwtToken');
        this.showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }

    /**
     * Set up refresh functionality for current section
     */
    setupRefresh() {
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loadSectionData(this.currentSection);
            });
        }
    }

    /**
     * Load professor information and branch assignment
     */
    async loadProfessorInfo() {
        try {
            const response = await this.apiCall('/api/auth/me', 'GET');
            if (response && response.data) {

                const userData = response.data; // get user data
                
                this.updateWelcomeMessage(userData); // update welcome message

                // Set branch info (null for admin)
                this.professorBranchId = userData.branchId || null;
                this.professorBranchName = userData.branchName || null;

                this.setProfessorBranch(userData); // set branch info in UI

            }
        } catch (error) {
            console.error('Error loading professor info:', error);
        }
    }

    /**
     * Update welcome message with professor's name
     * @param {Object} userData - Professor user data from API
     */
    updateWelcomeMessage(userData) {
        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement && userData) {
            const displayName = userData.username || 'Professor';
            welcomeElement.textContent = `Welcome, ${displayName}`;
        }
    }

    /**
     * Set professor's branch information and update UI accordingly
     * @param {Object} userData - Professor user data containing branch information
     */
    setProfessorBranch(userData) {
        const branchInfoElement = document.getElementById('professorBranchInfo');
        
        console.log('Professor user data:', userData);

        // Use flat structure from backend
        this.professorBranchId = userData.branchId || null;
        this.professorBranchName = userData.branchName || null;
        
        console.log('Extracted branch info:', {
            branchId: this.professorBranchId,
            branchName: this.professorBranchName
        });
        
        // Update branch info in UI
        
        if (this.professorBranchId) {
            if (branchInfoElement) {
                branchInfoElement.textContent = `Branch: ${this.professorBranchName}`;
                branchInfoElement.style.color = '2d3047'; // Reset color
            }
            console.log('Professor branch set:', this.professorBranchId, this.professorBranchName);
            
            // Enable add student button when branch is assigned
            this.toggleStudentButtons(true);
        } else {
            console.warn('Professor has no branch assigned');
            if (branchInfoElement) {
                branchInfoElement.textContent = 'Branch: Not assigned - Contact Admin';
                branchInfoElement.style.color = '#dc3545';
            }
            
            // Disable add student button if no branch assigned
            this.toggleStudentButtons(false);
            if (userData.role === 'PROFESSOR') {
                this.showToast('You are not assigned to a branch. Cannot add students.', 'warning');
            }
        }
    }

    /**
     * Toggle add student buttons based on branch assignment
     * @param {boolean} enabled - Whether buttons should be enabled
     */
    toggleStudentButtons(enabled) {
        const addStudentBtn = document.getElementById('addStudentBtn');
        const addFirstStudentBtn = document.getElementById('addFirstStudent');
        
        const buttonState = {
            disabled: !enabled,
            title: enabled ? 'Add new student' : 'Cannot add students - No branch assigned'
        };
        
        if (addStudentBtn) {
            addStudentBtn.disabled = buttonState.disabled;
            addStudentBtn.title = buttonState.title;
        }
        if (addFirstStudentBtn) {
            addFirstStudentBtn.disabled = buttonState.disabled;
            addFirstStudentBtn.title = buttonState.title;
        }
    }

    // ========== STUDENTS SECTION METHODS ==========

    /**
     * Initialize students section with event listeners
     */
    initStudentsSection() {
        this.setupButton('addStudentBtn', () => this.showStudentForm());
        this.setupButton('addFirstStudent', () => this.showStudentForm());
        this.setupButton('cancelStudentBtn', () => this.hideStudentForm());
        this.setupForm('studentForm', (e) => {
            e.preventDefault();
            this.handleStudentSubmit();
        });

        this.setupSearch('studentSearch', 'studentsTableBody');
        this.setupPagination('students');
    }

    /**
     * Show student form for adding or editing
     * @param {Object|null} student - Student data for editing, null for new student
     */
    showStudentForm(student = null) {
        const formContainer = document.getElementById('studentFormContainer');
        const formTitle = document.getElementById('studentFormTitle');

        if (student) {
            formTitle.textContent = 'Edit Student';
            document.getElementById('studentId').value = student.studentId || '';
            document.getElementById('studentName').value = student.name || '';
            document.getElementById('studentEmail').value = student.email || '';
            document.getElementById('studentAge').value = student.age || '';
            document.getElementById('studentGender').value = student.gender || '';
            
            console.log('Student data for editing:', student);
        } else {
            formTitle.textContent = 'Add New Student';
            document.getElementById('studentForm').reset();
            document.getElementById('studentId').value = '';
        }

        this.showElement(formContainer);
        this.openForms.add('student');
    }

    /**
     * Hide student form
     */
    hideStudentForm() {
        this.hideElement(document.getElementById('studentFormContainer'));
        this.openForms.delete('student');
    }

    /**
     * Handle student form submission for both add and edit operations
     */
    async handleStudentSubmit() {
        const formData = {
            name: document.getElementById('studentName').value.trim(),
            email: document.getElementById('studentEmail').value.trim(),
            age: parseInt(document.getElementById('studentAge').value),
            gender: document.getElementById('studentGender').value
        };

        // Validate required fields
        if (!formData.name || !formData.email || !formData.age || !formData.gender) {
            this.showToast('All fields are required', 'error');
            return;
        }

        // Validate age range
        if (formData.age < 16 || formData.age > 100) {
            this.showToast('Age must be between 16 and 100', 'error');
            return;
        }

        // Professor can only add students to their own branch
        if (!this.professorBranchId) {
            this.showToast('You are not assigned to a branch. Cannot add students.', 'error');
            return;
        }
        formData.branchId = this.professorBranchId;

        const studentId = document.getElementById('studentId').value;

        this.showLoading();

        try {
            if (studentId) {
                await this.apiCall(`/api/students/${studentId}`, 'PUT', formData);
                this.showToast('Student updated successfully', 'success');
            } else {
                await this.apiCall('/api/students', 'POST', formData);
                this.showToast('Student registered successfully', 'success');
            }
            this.hideStudentForm();
            await this.loadStudents();
        } catch (error) {
            this.showToast(`Failed to save student: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load students for the current professor's branch
     */
    async loadStudents() {
        try {
            console.log('Loading students for professor...');
            
            // Professor can only see students from their branch
            let endpoint = `/api/students/paginated?page=${this.currentPage}&size=${this.pageSize}`;
            if (this.professorBranchId) {
                endpoint += `&branchId=${this.professorBranchId}`;
            }
            
            const response = await this.apiCall(endpoint, 'GET');
            console.log('Students response:', response);
            
            if (response && response.data && response.data.content) {
                this.displayStudents(response.data.content);
                this.updatePagination('students', response.data);
            } else if (response && response.data) {
                this.displayStudents(response.data);
            } else {
                this.displayStudents([]);
            }
        } catch (error) {
            console.error('Failed to load students:', error);
            this.showToast(`Failed to load students: ${error.message}`, 'error');
            this.displayStudents([]);
        }
    }

    /**
     * Display students in the table
     * @param {Array} students - Array of student objects
     */
    displayStudents(students) {
        const tableBody = document.getElementById('studentsTableBody');
        const emptyState = document.getElementById('studentsEmptyState');

        if (!tableBody || !emptyState) {
            console.error('Students table elements not found');
            return;
        }

        console.log('Displaying students:', students);

        if (!students || students.length === 0) {
            tableBody.innerHTML = '';
            emptyState.style.display = 'block';
            console.log('No students to display');
            return;
        }

        emptyState.style.display = 'none';

        let html = '';
        students.forEach(student => {
            const displayId = student.studentId || 'Not available';

            // Get branch name for professor's students
            const branchDisplay = student.branch ? this.escapeHtml(student.branch.name) : 
                    student.branchName ? this.escapeHtml(student.branchName) : 
                    'My Branch';

            html += `
                <tr>
                    <td>${displayId}</td>
                    <td>${this.escapeHtml(student.name || 'Unknown')}</td>
                    <td>${this.escapeHtml(student.email || 'No email')}</td>
                    <td>${student.age || 'Not available'}</td>
                    <td>${this.escapeHtml(student.gender || 'Unknown')}</td>
                    <td>${branchDisplay}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-secondary btn-sm" onclick="professorDashboard.editStudent(${student.studentId})">Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="professorDashboard.confirmDeleteStudent(${student.studentId})">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
        console.log(`Displayed ${students.length} students`);
    }

    /**
     * Edit student - loads student data into form
     * @param {number} studentId - ID of student to edit
     */
    async editStudent(studentId) {
        try {
            const response = await this.apiCall(`/api/students/${studentId}`, 'GET');
            if (response && response.data) {
                console.log('Student data for editing:', response.data);
                
                // Check if student belongs to professor's branch using branch object
                const studentBranchId = response.data.branch?.branchId || response.data.branchId;
                if (studentBranchId !== this.professorBranchId) {
                    this.showToast('You can only edit students from your branch', 'error');
                    return;
                }
                
                this.showStudentForm(response.data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            this.showToast(`Failed to load student: ${error.message}`, 'error');
        }
    }

    /**
     * Confirm and delete student after validation
     * @param {number} studentId - ID of student to delete
     */
    async confirmDeleteStudent(studentId) {
        if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            this.showLoading();
            try {
                // Verify student belongs to professor's branch using branch object
                const studentResponse = await this.apiCall(`/api/students/${studentId}`, 'GET');
                const studentBranchId = studentResponse.data.branch?.branchId || studentResponse.data.branchId;
                
                if (studentBranchId !== this.professorBranchId) {
                    this.showToast('You can only delete students from your branch', 'error');
                    return;
                }
                
                await this.apiCall(`/api/students/${studentId}`, 'DELETE');
                this.showToast('Student deleted successfully', 'success');
                await this.loadStudents();
            } catch (error) {
                this.showToast(`Failed to delete student: ${error.message}`, 'error');
            } finally {
                this.hideLoading();
            }
        }
    }

    // ========== UTILITY METHODS ==========

    /**
     * Set up button click handler
     * @param {string} elementId - Button element ID
     * @param {Function} handler - Click handler function
     */
    setupButton(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('click', handler);
        }
    }

    /**
     * Set up form submission handler
     * @param {string} elementId - Form element ID
     * @param {Function} handler - Submit handler function
     */
    setupForm(elementId, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener('submit', handler);
        }
    }

    /**
     * Set up search functionality for tables
     * @param {string} searchId - Search input element ID
     * @param {string} tableBodyId - Table body element ID to filter
     */
    setupSearch(searchId, tableBodyId) {
        const searchInput = document.getElementById(searchId);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterTable(tableBodyId, e.target.value);
            });
        }
    }

    /**
     * Set up pagination controls
     * @param {string} section - Section name for pagination
     */
    setupPagination(section) {
        const prevBtn = document.getElementById(`prev${this.capitalize(section)}Page`);
        const nextBtn = document.getElementById(`next${this.capitalize(section)}Page`);

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 0) {
                    this.currentPage--;
                    this.loadSectionData(section);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentPage++;
                this.loadSectionData(section);
            });
        }
    }

    /**
     * Load data for specific section
     * @param {string} section - Section to load data for
     */
    async loadSectionData(section) {
        console.log('Loading data for:', section);
        this.showLoading();

        try {
            switch (section) {
                case 'students':
                    await this.loadStudents();
                    break;
            }
        } catch (error) {
            this.showToast(`Failed to load ${section}: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update pagination controls based on API response
     * @param {string} section - Section name
     * @param {Object} response - API pagination response
     */
    updatePagination(section, response) {
        const pageInfo = document.getElementById(`${section}PageInfo`);
        const prevBtn = document.getElementById(`prev${this.capitalize(section)}Page`);
        const nextBtn = document.getElementById(`next${this.capitalize(section)}Page`);

        if (pageInfo) {
            pageInfo.textContent = `Page ${(response.number || 0) + 1} of ${response.totalPages || 1}`;
        }
        if (prevBtn) {
            prevBtn.disabled = response.first || false;
        }
        if (nextBtn) {
            nextBtn.disabled = response.last || false;
        }
    }

    /**
     * Filter table rows based on search term
     * @param {string} tableBodyId - Table body element ID
     * @param {string} searchTerm - Search term to filter by
     */
    filterTable(tableBodyId, searchTerm) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;

        const rows = tableBody.getElementsByTagName('tr');
        const searchLower = searchTerm.toLowerCase();

        for (let row of rows) {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchLower) ? '' : 'none';
        }
    }

    /**
     * Make API call with authentication
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {Object|null} data - Request data for POST/PUT
     * @returns {Promise} API response
     */
    async apiCall(endpoint, method = 'GET', data = null) {
        const token = this.getToken();
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: data && (method === 'POST' || method === 'PUT') ? JSON.stringify(data) : undefined
        };

        console.log(`API ${method}: ${this.apiBaseUrl}${endpoint}`, data);

        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
            console.log(`API Response: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                let errorMessage = `API error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (e) {
                    // Ignore JSON parsing errors for error responses
                }
                throw new Error(errorMessage);
            }

            if (response.status === 204) {
                return { success: true };
            }


            
            let responseData = {};
            try {
                responseData = await response.json();
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                throw new Error('Invalid JSON response from server');
            }

            console.log(`API Data:`, responseData);
            return responseData;

        } catch (error) {
            console.error(`API Call failed:`, error);
            throw error;
        }
    }

    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Escape HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Safe HTML string
     */
    escapeHtml(text) {
        if (!text) return 'Not available';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show loading spinner
     */
    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.style.display = 'flex';
    }

    /**
     * Hide loading spinner
     */
    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.style.display = 'none';
    }

    /**
     * Show DOM element
     * @param {HTMLElement} element - Element to show
     */
    showElement(element) {
        if (element) element.style.display = 'block';
    }

    /**
     * Hide DOM element
     * @param {HTMLElement} element - Element to hide
     */
    hideElement(element) {
        if (element) element.style.display = 'none';
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type of toast (success, error, warning, info)
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#f8d7da' : type === 'success' ? '#d1edff' : '#fff3cd'};
            color: ${type === 'error' ? '#721c24' : type === 'success' ? '#0c5460' : '#856404'};
            border: 1px solid ${type === 'error' ? '#f5c6cb' : type === 'success' ? '#bee5eb' : '#ffeaa7'};
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }
}

// Initialize professor dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting Professor Dashboard Manager...');
    window.professorDashboard = new ProfessorDashboardManager();
});