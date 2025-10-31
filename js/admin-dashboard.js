// ADMIN DASHBOARD MANAGER
// Handles all admin-specific dashboard functionality including branch, user, and student management
console.log('Loading Admin Dashboard Manager...');





class AdminDashboardManager {
    constructor() {
        this.apiBaseUrl = API_BASE_URL;
        this.currentPage = 0;
        this.pageSize = 4;
        this.currentSection = 'branches';
        this.openForms = new Set();
        this.init();
    }

    /**
     * Initialize the admin dashboard
     * Sets up authentication, navigation, and initial data loading
     */
    init() {
        console.log('Admin Dashboard Manager Initialized');
        
        if (!this.checkAuth()) {
            return;
        }

        this.setupDashboard();
    }

    /**
     * Check if user is authenticated as admin
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
        console.log('User authenticated');
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
        this.loadUserInfo();
        
        this.initBranchesSection();
        this.initUsersSection();
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
     * @param {string} section - Section to switch to (branches, users, students)
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
        const forms = ['branchFormContainer', 'userFormContainer', 'studentFormContainer'];
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
            window.location.href = 'login.html';
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
     * Load current user information
     */
    async loadUserInfo() {
        try {
            const response = await this.apiCall('/api/auth/me', 'GET');
            if (response && response.data) {
                this.updateWelcomeMessage(response.data);
            }
        } catch (error) {
            console.error('Error loading user info:', error);
        }
    }

    /**
     * Update welcome message with user's name
     * @param {Object} userData - User data from API
     */
    updateWelcomeMessage(userData) {
        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement && userData) {
            const displayName = userData.username || userData.name || 'User';
            welcomeElement.textContent = `Welcome, ${displayName}`;
        }
    }

    // ========== BRANCHES SECTION METHODS ==========

    /**
     * Initialize branches section with event listeners
     */
    initBranchesSection() {
        this.setupButton('addBranchBtn', () => this.showBranchForm());
        this.setupButton('addFirstBranch', () => this.showBranchForm());
        this.setupButton('cancelBranchBtn', () => this.hideBranchForm());
        this.setupForm('branchForm', (e) => {
            e.preventDefault();
            this.handleBranchSubmit();
        });

        this.setupSearch('branchSearch', 'branchesTableBody');
        this.setupPagination('branches');
    }

    /**
     * Show branch form for adding or editing
     * @param {Object|null} branch - Branch data for editing, null for new branch
     */
    showBranchForm(branch = null) {
        const formContainer = document.getElementById('branchFormContainer');
        const formTitle = document.getElementById('branchFormTitle');

        if (branch) {
            formTitle.textContent = 'Edit Branch';
            document.getElementById('branchId').value = branch.branchId || '';
            document.getElementById('branchName').value = branch.name || '';
            document.getElementById('branchDescription').value = branch.description || '';
        } else {
            formTitle.textContent = 'Add New Branch';
            document.getElementById('branchForm').reset();
            document.getElementById('branchId').value = '';
        }

        this.showElement(formContainer);
        this.openForms.add('branch');
    }

    /**
     * Hide branch form
     */
    hideBranchForm() {
        this.hideElement(document.getElementById('branchFormContainer'));
        this.openForms.delete('branch');
    }

    /**
     * Handle branch form submission for both add and edit operations
     */
    async handleBranchSubmit() {
        const formData = {
            name: document.getElementById('branchName').value.trim(),
            description: document.getElementById('branchDescription').value.trim()
        };
        const branchId = document.getElementById('branchId').value;

        if (!formData.name) {
            this.showToast('Branch name is required', 'error');
            return;
        }

        this.showLoading();

        try {
            if (branchId) {
                await this.apiCall(`/api/branches/${branchId}`, 'PUT', formData);
                this.showToast('Branch updated successfully', 'success');
            } else {
                await this.apiCall('/api/branches', 'POST', formData);
                this.showToast('Branch created successfully', 'success');
            }
            this.hideBranchForm();
            await this.loadBranches();
        } catch (error) {
            this.showToast(`Failed to save branch: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load branches from API with pagination
     */
    async loadBranches() {
        try {
            console.log('Loading branches...');
            const response = await this.apiCall(`/api/branches/paginated?page=${this.currentPage}&size=${this.pageSize}`, 'GET');
            console.log('Full branches response:', response);
            
            if (response && response.data && response.data.content) {
                this.displayBranches(response.data.content);
                this.updatePagination('branches', response.data);
            } else if (response && response.data) {
                this.displayBranches(response.data);
            } else {
                this.displayBranches([]);
            }
        } catch (error) {
            console.error('Failed to load branches:', error);
            this.showToast(`Failed to load branches: ${error.message}`, 'error');
            this.displayBranches([]);
        }
    }

    /**
     * Display branches in the table
     * @param {Array} branches - Array of branch objects
     */
    displayBranches(branches) {
        const tableBody = document.getElementById('branchesTableBody');
        const emptyState = document.getElementById('branchesEmptyState');

        if (!tableBody || !emptyState) {
            console.error('Branches table elements not found');
            return;
        }

        console.log('Displaying branches:', branches);

        if (!branches || branches.length === 0) {
            tableBody.innerHTML = '';
            emptyState.style.display = 'block';
            console.log('No branches to display');
            return;
        }

        emptyState.style.display = 'none';

        let html = '';
        branches.forEach(branch => {
            const displayId = branch.branchId || 'Not available';
            html += `
                <tr>
                    <td>${displayId}</td>
                    <td>${this.escapeHtml(branch.name || 'Unnamed')}</td>
                    <td>${this.escapeHtml(branch.description || 'No description')}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-secondary btn-sm" onclick="dashboardManager.editBranch(${branch.branchId})">Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="dashboardManager.confirmDeleteBranch(${branch.branchId})">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
        console.log(`Displayed ${branches.length} branches`);
    }

    /**
     * Edit branch - loads branch data into form
     * @param {number} branchId - ID of branch to edit
     */
    async editBranch(branchId) {
        try {
            const response = await this.apiCall(`/api/branches/${branchId}`, 'GET');
            if (response && response.data) {
                this.showBranchForm(response.data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            this.showToast(`Failed to load branch: ${error.message}`, 'error');
        }
    }

    /**
     * Confirm and delete branch
     * @param {number} branchId - ID of branch to delete
     */
    async confirmDeleteBranch(branchId) {
        if (confirm('Are you sure you want to delete this branch?')) {
            this.showLoading();
            try {
                await this.apiCall(`/api/branches/${branchId}`, 'DELETE');
                this.showToast('Branch deleted successfully', 'success');
                await this.loadBranches();
            } catch (error) {
                this.showToast(`Failed to delete branch: ${error.message}`, 'error');
            } finally {
                this.hideLoading();
            }
        }
    }

    // ========== USERS SECTION METHODS ==========

    /**
     * Initialize users section with event listeners
     */
    initUsersSection() {
        this.setupButton('addUserBtn', () => this.showUserForm());
        this.setupButton('addFirstUser', () => this.showUserForm());
        this.setupButton('cancelUserBtn', () => this.hideUserForm());
        this.setupForm('userForm', (e) => {
            e.preventDefault();
            this.handleUserSubmit();
        });

        const userRole = document.getElementById('userRole');
        if (userRole) {
            userRole.addEventListener('change', (e) => {
                this.toggleUserBranchField(e.target.value);
            });
        }

        this.setupSearch('userSearch', 'usersTableBody');
        this.setupPagination('users');
    }

    /**
     * Show user form for adding or editing
     * @param {Object|null} user - User data for editing, null for new user
     */
    showUserForm(user = null) {
        const formContainer = document.getElementById('userFormContainer');
        const formTitle = document.getElementById('userFormTitle');
        const passwordField = document.getElementById('userPassword');
        const passwordLabel = document.querySelector('label[for="userPassword"]');

        if (user) {
            formTitle.textContent = 'Edit User';
            document.getElementById('userId').value = user.userId || '';
            document.getElementById('userUsername').value = user.username || '';
            document.getElementById('userRole').value = user.role || '';
            
            console.log('User data for editing:', user);
            
            // Hide password field and label for editing
            if (passwordField) {
                passwordField.style.display = 'none';
                passwordField.required = false;
                passwordField.value = ''; // Clear password field
            }
            if (passwordLabel) {
                passwordLabel.style.display = 'none';
            }
            
            // Load branches and set the current branch for professors
            this.loadBranchesForDropdown('userBranch').then(() => {
                if (user.role === 'PROFESSOR') {
                    this.setUserBranchSelection(user);
                }
            });
            
            this.toggleUserBranchField(user.role);
        } else {
            formTitle.textContent = 'Add New User';
            document.getElementById('userForm').reset();
            document.getElementById('userId').value = '';
            this.toggleUserBranchField('');
            
            // Show password field and label for new users
            if (passwordField) {
                passwordField.style.display = 'block';
                passwordField.required = true;
                passwordField.placeholder = 'Enter password';
            }
            if (passwordLabel) {
                passwordLabel.style.display = 'block';
            }
            
            // Load branches for dropdown
            this.loadBranchesForDropdown('userBranch');
        }

        this.showElement(formContainer);
        this.openForms.add('user');
    }

    /**
     * Set branch selection for professor users
     * @param {Object} user - User object containing branch information
     */
    setUserBranchSelection(user) {
        const branchSelect = document.getElementById('userBranch');
        if (!branchSelect) {
            console.error('Branch select element not found');
            return;
        }

        // Extract branch ID - now backend should provide branchId
        let branchId = user.branchId;
        
        console.log('Setting branch selection:', { branchId, user });

        if (branchId) {
            // Convert to string for comparison (HTML select values are strings)
            const branchIdStr = branchId.toString();
            
            // Try to set the value immediately
            branchSelect.value = branchIdStr;
            
            // Check if setting was successful
            if (branchSelect.value !== branchIdStr) {
                console.log('Branch not found in dropdown, retrying...');
                // If not found, wait a bit and try again (for async loading)
                setTimeout(() => {
                    branchSelect.value = branchIdStr;
                    console.log('Retried setting branch:', branchIdStr, 'Success:', branchSelect.value === branchIdStr);
                    
                    if (branchSelect.value !== branchIdStr) {
                        console.error('Failed to set branch after retry. Available options:');
                        for (let i = 0; i < branchSelect.options.length; i++) {
                            console.log(`   Option ${i}: value="${branchSelect.options[i].value}", text="${branchSelect.options[i].text}"`);
                        }
                    }
                }, 500);
            }
            
            console.log('Branch selection result:', { 
                attempted: branchIdStr, 
                actual: branchSelect.value,
                success: branchSelect.value === branchIdStr 
            });
        } else {
            console.warn('No branch ID found for professor user:', user);
            // Keep the dropdown as "Select Branch" since we don't have the branch info
        }
    }

    /**
     * Hide user form
     */
    hideUserForm() {
        const passwordField = document.getElementById('userPassword');
        const passwordLabel = document.querySelector('label[for="userPassword"]');
        
        // Reset password field visibility when hiding form
        if (passwordField) {
            passwordField.style.display = 'block';
            passwordField.required = true;
        }
        if (passwordLabel) {
            passwordLabel.style.display = 'block';
        }
        
        this.hideElement(document.getElementById('userFormContainer'));
        this.openForms.delete('user');
    }

    /**
     * Toggle branch field visibility based on user role
     * @param {string} role - User role (PROFESSOR, ADMIN, etc.)
     */
    toggleUserBranchField(role) {
        const branchGroup = document.getElementById('userBranchGroup');
        const branchSelect = document.getElementById('userBranch');
        
        if (role === 'PROFESSOR') {
            this.showElement(branchGroup);
            if (branchSelect) {
                branchSelect.required = true;
                branchSelect.disabled = false;
            }
        } else {
            this.hideElement(branchGroup);
            if (branchSelect) {
                branchSelect.required = false;
                branchSelect.value = '';
                branchSelect.disabled = true;
            }
        }
    }

    /**
     * Load branches into dropdown for selection
     * @param {string} dropdownId - ID of the dropdown element
     */
    async loadBranchesForDropdown(dropdownId) {
        try {
            const response = await this.apiCall('/api/branches', 'GET');
            const dropdown = document.getElementById(dropdownId);
            
            if (dropdown && response && response.data) {
                const branches = response.data;
                
                // Clear all options except the first one
                while (dropdown.children.length > 1) {
                    dropdown.removeChild(dropdown.lastChild);
                }
                
                // Add branch options
                branches.forEach(branch => {
                    const option = document.createElement('option');
                    option.value = branch.branchId;
                    option.textContent = branch.name;
                    dropdown.appendChild(option);
                });
                
                console.log('Branches loaded for dropdown:', branches.length);
                console.log('Available branches:', branches.map(b => ({id: b.branchId, name: b.name})));
            }
        } catch (error) {
            console.error('Failed to load branches for dropdown:', error);
        }
    }

    /**
     * Handle user form submission for both add and edit operations
     */
    async handleUserSubmit() {
        const formData = {
            username: document.getElementById('userUsername').value.trim(),
            role: document.getElementById('userRole').value
        };

        if (!formData.username || !formData.role) {
            this.showToast('Username and role are required', 'error');
            return;
        }

        const userId = document.getElementById('userId').value;
        const passwordField = document.getElementById('userPassword');
        const password = passwordField ? passwordField.value : '';

        // Only include password for new users (not for editing)
        if (!userId && password) {
            formData.password = password;
        }

        if (formData.role === 'PROFESSOR') {
            const branchId = document.getElementById('userBranch').value;
            if (!branchId) {
                this.showToast('Branch selection is required for professors', 'error');
                return;
            }
            formData.branchId = parseInt(branchId);
        } else {
            formData.branchId = null;
        }

        console.log('Submitting user data:', formData);

        this.showLoading();

        try {
            if (userId) {
                await this.apiCall(`/api/users/${userId}`, 'PUT', formData);
                this.showToast('User updated successfully', 'success');
            } else {
                await this.apiCall('/api/users', 'POST', formData);
                this.showToast('User created successfully', 'success');
            }
            this.hideUserForm();
            await this.loadUsers();
        } catch (error) {
            console.error('User submission error:', error);
            this.showToast(`Failed to save user: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Load users from API with pagination
     */
    async loadUsers() {
        try {
            console.log('Loading users...');
            const response = await this.apiCall(`/api/users/paginated?page=${this.currentPage}&size=${this.pageSize}`, 'GET');
            console.log('Full users response:', response);
            
            if (response && response.data && response.data.content) {
                this.displayUsers(response.data.content);
                this.updatePagination('users', response.data);
            } else if (response && response.data) {
                this.displayUsers(response.data);
            } else {
                this.displayUsers([]);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            this.showToast(`Failed to load users: ${error.message}`, 'error');
            this.displayUsers([]);
        }
    }

    /**
     * Display users in the table
     * @param {Array} users - Array of user objects
     */
    displayUsers(users) {
        const tableBody = document.getElementById('usersTableBody');
        const emptyState = document.getElementById('usersEmptyState');

        if (!tableBody || !emptyState) {
            console.error('Users table elements not found');
            return;
        }

        console.log('Displaying users with branch data:', users);

        if (!users || users.length === 0) {
            tableBody.innerHTML = '';
            emptyState.style.display = 'block';
            console.log('No users to display');
            return;
        }

        emptyState.style.display = 'none';

        let html = '';
        users.forEach(user => {
            const displayId = user.userId || 'Not available';
            
            let branchDisplay = '<span class="text-muted">Not applicable</span>';
            
            if (user.role === 'PROFESSOR') {
                if (user.branchName) {
                    branchDisplay = `<span class="badge badge-primary">${this.escapeHtml(user.branchName)}</span>`;
                } else if (user.branchId) {
                    branchDisplay = `<span class="text-warning">Branch ID: ${user.branchId}</span>`;
                } else {
                    branchDisplay = '<span class="text-danger">No branch assigned</span>';
                }
            }

            html += `
                <tr>
                    <td>${displayId}</td>
                    <td>${this.escapeHtml(user.username || 'Unknown')}</td>
                    <td><span class="badge ${user.role === 'ADMIN' ? 'badge-success' : 'badge-warning'}">${user.role || 'UNKNOWN'}</span></td>
                    <td>${branchDisplay}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-secondary btn-sm" onclick="dashboardManager.editUser(${user.userId})">Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="dashboardManager.confirmDeleteUser(${user.userId})">Delete</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tableBody.innerHTML = html;
        console.log(`Displayed ${users.length} users`);
    }

    /**
     * Edit user - loads user data into form
     * @param {number} userId - ID of user to edit
     */
    async editUser(userId) {
        try {
            console.log('Fetching user data for editing:', userId);
            const response = await this.apiCall(`/api/users/${userId}`, 'GET');
            
            if (response && response.data) {
                console.log('Full user data received:', response.data);
                this.showUserForm(response.data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            this.showToast(`Failed to load user: ${error.message}`, 'error');
        }
    }

    /**
     * Confirm and delete user
     * @param {number} userId - ID of user to delete
     */
    async confirmDeleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            this.showLoading();
            try {
                await this.apiCall(`/api/users/${userId}`, 'DELETE');
                this.showToast('User deleted successfully', 'success');
                await this.loadUsers();
            } catch (error) {
                this.showToast(`Failed to delete user: ${error.message}`, 'error');
            } finally {
                this.hideLoading();
            }
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
        
        this.loadBranchesForDropdown('studentBranch');
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
            
            // Set branch selection - handle both branch object and branchId
            if (student.branch) {
                document.getElementById('studentBranch').value = student.branch.branchId || '';
            } else if (student.branchId) {
                document.getElementById('studentBranch').value = student.branchId;
            }
            
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

        if (!formData.name || !formData.email || !formData.age || !formData.gender) {
            this.showToast('All fields are required', 'error');
            return;
        }

        if (formData.age < 16 || formData.age > 100) {
            this.showToast('Age must be between 16 and 100', 'error');
            return;
        }

        const branchId = document.getElementById('studentBranch').value;
        if (!branchId) {
            this.showToast('Branch selection is required', 'error');
            return;
        }
        formData.branchId = parseInt(branchId);

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
     * Load students from API with pagination
     */
    async loadStudents() {
        try {
            console.log('Loading students...');
            const response = await this.apiCall(`/api/students/paginated?page=${this.currentPage}&size=${this.pageSize}`, 'GET');
            console.log('Full students response:', response);
            
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
            
            const branchDisplay = student.branch ? this.escapeHtml(student.branch.name) : 
                                student.branchName ? this.escapeHtml(student.branchName) : 
                                student.branchId ? `Branch ID: ${student.branchId}` : 'No branch';

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
                            <button class="btn btn-secondary btn-sm" onclick="dashboardManager.editStudent(${student.studentId})">Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="dashboardManager.confirmDeleteStudent(${student.studentId})">Delete</button>
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
                this.showStudentForm(response.data);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            this.showToast(`Failed to load student: ${error.message}`, 'error');
        }
    }

    /**
     * Confirm and delete student
     * @param {number} studentId - ID of student to delete
     */
    async confirmDeleteStudent(studentId) {
        if (confirm('Are you sure you want to delete this student?')) {
            this.showLoading();
            try {
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
                case 'branches':
                    await this.loadBranches();
                    break;
                case 'users':
                    await this.loadUsers();
                    break;
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
            }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        console.log(`API ${method}: ${this.apiBaseUrl}${endpoint}`, data);

        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);
            console.log(`API Response: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                let errorMessage = `API error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.error || errorMessage;
                    console.log('Error response details:', errorData);
                } catch (e) {
                    console.log('No JSON error response, using status text');
                }
                throw new Error(errorMessage);
            }

            if (response.status === 204) {
                return { success: true };
            }

            // Handle potential JSON parsing issues
            const responseText = await response.text();
            let responseData;
            try {
                responseData = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Response text that failed to parse:', responseText);
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

// Initialize admin dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting Admin Dashboard Manager...');
    window.dashboardManager = new AdminDashboardManager();
});
console.log('Student object for debugging:', student);
console.log('Student branch data:', student.branch);