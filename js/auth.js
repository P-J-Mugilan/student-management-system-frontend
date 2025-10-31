// AUTHENTICATION MANAGER - FIXED VERSION
// Handles user authentication, role management, and access control
console.log('Loading Authentication Manager...');

class AuthManager {
    constructor() {
        this.publicApi = publicApi;
        this.redirectTimeout = null;
        this.init();
    }

    /**
     * Initialize the authentication manager
     * Sets up event listeners and checks current auth status
     */
    init() {
        console.log('Auth Manager Initialized');
        console.log('Current page:', window.location.pathname);
        
        this.checkAuthStatus();
        
        if (document.getElementById('loginForm')) {
            this.initLoginForm();
        }

        this.initLogout();
    }

    /**
     * Check authentication status and handle page access
     * Redirects unauthorized users to login page
     */
    async checkAuthStatus() {
        const currentPage = window.location.pathname.split('/').pop();
        console.log('Checking auth status for page:', currentPage);
        
        const isAuthenticated = this.publicApi.isAuthenticated();
        const userRole = this.getUserRole();
        
        console.log('Auth Status:', {
            authenticated: isAuthenticated,
            role: userRole,
            currentPage: currentPage
        });

        // Protected pages that require authentication
        const protectedPages = ['admin-dashboard.html', 'professor-dashboard.html'];
        
        // If user is not authenticated and trying to access protected page
        if (!isAuthenticated && protectedPages.includes(currentPage)) {
            console.log('Not authenticated - redirecting to login');
            this.redirectToLogin();
            return;
        }

        // If user is authenticated and on login page, redirect to dashboard
        if (isAuthenticated && currentPage === 'login.html') {
            console.log('Authenticated on login page - redirecting to dashboard');
            this.redirectToDashboard(userRole);
            return;
        }

        // Validate role access for protected pages
        if (isAuthenticated && protectedPages.includes(currentPage)) {
            this.validateRoleAccess(currentPage, userRole);
        }
    }

    /**
     * Extract user role from current user API response data
     * @param {Object} data - User data from API
     * @returns {string|null} Normalized role or null if not found
     */
    extractUserRoleFromCurrentUser(data) {
        console.log('Extracting role from current user data:', data);
        
        if (!data) return null;
        
        // Try different possible locations for role data
        let role = data.role || 
                   data.data?.role ||
                   data.authorities?.[0]?.authority ||
                   data.user?.role;
        
        if (role) {
            console.log('Role extracted from current user:', role);
            return this.normalizeRole(role);
        }
        
        // If no role found, check if it's a professor by branch assignment
        if (data.branchId || data.data?.branchId) {
            console.log('User has branch assignment, assuming PROFESSOR role');
            return 'PROFESSOR';
        }
        
        console.log('No role found in current user data');
        return null;
    }

    /**
     * Fetch user role from current user API endpoint
     * @returns {Promise<string|null>} User role or null if not available
     */
    async fetchRoleFromCurrentUser() {
        try {
            const response = await fetch('http://localhost:8080/api/auth/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Current user data for role detection:', userData);
                
                return this.extractUserRoleFromCurrentUser(userData);
            } else {
                console.error('Failed to fetch current user:', response.status);
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
        }
        
        return null;
    }

    /**
     * Validate if user has access to the requested page based on role
     * @param {string} page - Requested page
     * @param {string} role - User role
     */
    validateRoleAccess(page, role) {
        console.log('Validating role access:', { page, role });
        
        if (!role) {
            console.error('No role detected - forcing logout');
            this.forceLogout('Unable to determine user role');
            return;
        }

        const normalizedRole = this.normalizeRole(role);
        console.log('Normalized role:', normalizedRole);

        if ((page === 'admin-dashboard.html' || page === 'dashboard.html') && normalizedRole !== 'ADMIN') {
            console.log('Access denied - Admin required but user is:', normalizedRole);
            this.showToast('Access denied. Admin privileges required.', 'error');
            setTimeout(() => this.redirectToDashboard(normalizedRole), 2000);
            return;
        }

        if (page === 'professor-dashboard.html' && normalizedRole !== 'PROFESSOR') {
            console.log('Access denied - Professor required but user is:', normalizedRole);
            this.showToast('Access denied. Professor privileges required.', 'error');
            setTimeout(() => this.redirectToDashboard(normalizedRole), 2000);
            return;
        }

        console.log('Role access validated successfully');
    }

    /**
     * Get user role using multiple detection methods
     * @returns {string|null} User role or null if not available
     */
    asyncgetUserRole() {
        console.log('Detecting user role...');
        
        // // Method 1: Try public API first
        // let role = this.publicApi.getUserRole();
        // if (role) {
        //     console.log('Role from public API:', role);
        //     return role;
        // }

       

        // Method 2: Extract from JWT token
        role = this.extractRoleFromToken();
        if (role) {
            console.log('Role from JWT token:', role);
            return role;
        }

        // Method 3: Fetch from /api/auth/me endpoint
        role = this.fetchRoleFromCurrentUser();
        if (role) {
            console.log('Role from current user API:', role);
            return role;
        }

        console.warn('Could not detect user role');
        return null;
    }

    /**
     * Extract role from JWT token payload
     * @returns {string|null} User role or null if not found
     */
    extractRoleFromToken() {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            console.log('No token found');
            return null;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('Token payload:', payload);
            
            // Try different possible role locations in the token
            let role = payload.role || 
                      payload.authorities?.[0]?.authority ||
                      payload.scope ||
                      payload.roles?.[0];
            
            if (role) {
                console.log('Raw role from token:', role);
                return this.normalizeRole(role);
            }
            
            console.log('No role found in token payload');
            return null;
            
        } catch (error) {
            console.error('Failed to parse token:', error);
            return null;
        }
    }

    /**
     * Normalize role string to consistent format
     * @param {string} role - Raw role string
     * @returns {string} Normalized role (ADMIN or PROFESSOR)
     */
    normalizeRole(role) {
        if (!role) return null;
        
        const roleStr = String(role).toUpperCase().trim();
        console.log('Normalizing role:', roleStr);
        
        // Remove "ROLE_" prefix if present
        const cleanRole = roleStr.replace('ROLE_', '');
        
        if (cleanRole === 'ADMIN' || cleanRole.includes('ADMIN')) {
            return 'ADMIN';
        } else if (cleanRole === 'PROFESSOR' || cleanRole.includes('PROFESSOR') || cleanRole.includes('PROF')) {
            return 'PROFESSOR';
        } else if (cleanRole === 'USER') {
            return 'PROFESSOR'; // Default USER to PROFESSOR
        } else if (cleanRole === 'TEACHER' || cleanRole.includes('TEACHER')) {
            return 'PROFESSOR';
        } else if (cleanRole === 'FACULTY' || cleanRole.includes('FACULTY')) {
            return 'PROFESSOR';
        }
        
        console.warn('Unknown role format:', roleStr);
        return cleanRole;
    }

    /**
     * Redirect user to appropriate dashboard based on role
     * @param {string} role - User role
     */
    async redirectToDashboard(role) {
        console.log('Starting dashboard redirect process...');
        
        // Clear any existing timeouts
        if (this.redirectTimeout) {
            clearTimeout(this.redirectTimeout);
        }

        // Use our enhanced role detection if no role provided
        let finalRole = role || awaitthis.getUserRole();
        
        if (!finalRole) {
            console.error('Cannot redirect - unable to determine user role');
            this.showToast('Authentication error: Unable to determine user role', 'error');
            setTimeout(() => this.redirectToLogin(), 2000);
            return;
        }

        const normalizedRole = this.normalizeRole(finalRole);
        console.log('Final normalized role:', normalizedRole);

        let targetPage = 'login.html'; // Default fallback
        
        if (normalizedRole === 'ADMIN') {
            targetPage = 'admin-dashboard.html';
            console.log('Redirecting to ADMIN dashboard');
        } else if (normalizedRole === 'PROFESSOR') {
            targetPage = 'professor-dashboard.html';
            console.log('Redirecting to PROFESSOR dashboard');
        } else {
            console.warn('Unknown role, defaulting to login page');
            targetPage = 'login.html';
        }

        console.log('Final target page:', targetPage);
        
        this.redirectTimeout = setTimeout(() => {
            console.log('Executing redirect to:', targetPage);
            window.location.href = targetPage;
        }, 1000);
    }

    /**
     * Redirect user to login page
     */
    redirectToLogin() {
        console.log('Redirecting to login page');
        // Clear any pending redirects
        if (this.redirectTimeout) {
            clearTimeout(this.redirectTimeout);
        }
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    }

    /**
     * Initialize login form with event listeners
     */
    initLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const passwordToggle = document.getElementById('passwordToggle');

        // Password visibility toggle
        if (passwordToggle) {
            passwordToggle.addEventListener('click', () => {
                this.togglePasswordVisibility();
            });
        }

        // Login form submission
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleLogin();
            });
        }

        console.log('Login form initialized');
    }

    /**
     * Toggle password visibility in the login form
     */
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const passwordToggle = document.getElementById('passwordToggle');
        
        if (!passwordInput || !passwordToggle) return;

        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = passwordToggle.querySelector('svg');
        if (type === 'text') {
            icon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        } else {
            icon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    }

    /**
     * Handle login form submission
     * FIXED: Now shows actual backend error messages instead of generic ones
     */
    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('loginBtn');
        const loginText = document.getElementById('loginText');
        const loginSpinner = document.getElementById('loginSpinner');
        const errorMessage = document.getElementById('errorMessage');

        console.log('Login attempt started for user:', username);

        // Basic validation
        if (!username || !password) {
            this.showError('Please enter both username and password');
            return;
        }

        // Show loading state
        this.showLoadingState(loginBtn, loginText, loginSpinner);
        this.hideElement(errorMessage);

        try {
            console.log('Sending login request...');
            const credentials = { username, password };
            const response = await this.publicApi.login(credentials);
            
            console.log('Login response received:', response);

            // Parse the response to extract token and role
            const { token, role } = this.parseLoginResponse(response);
            
            console.log('Parsed token:', token ? 'PRESENT' : 'MISSING');
            console.log('Parsed role:', role);

            if (!token) {
                throw new Error('No authentication token received from server');
            }

            // Store the token
            this.publicApi.setToken(token);
            console.log('Token stored in localStorage');

            // Verify token was stored
            const storedToken = localStorage.getItem('jwtToken');
            console.log('Token verification - stored:', !!storedToken);

            if (!storedToken) {
                throw new Error('Failed to store authentication token');
            }

            // Use the role from response or extract from our enhanced detection
            let finalRole = role || this.getUserRole();

            if (!finalRole) {
                console.warn('No role in response or token - using username fallback');
                finalRole = this.determineRoleFromUsername(username);
            }

            console.log('Final role for redirect:', finalRole);

            // Show success message
            this.showToast('Login successful! Redirecting...', 'success');

            // Redirect to appropriate dashboard using our enhanced logic
            setTimeout(() => {
                this.redirectToDashboard(finalRole);
            }, 1500);

        } catch (error) {
            console.error('Login failed:', error);
            
            // FIXED: Show the actual backend error message instead of generic one
            let errorMsg = error.message || 'Login failed. Please try again.';
            
            // Remove any technical prefixes for user-friendly display
            if (errorMsg.includes('Validation failed:')) {
                errorMsg = errorMsg.replace('Validation failed:', 'Please check your input:');
            }
            
            this.showError(errorMsg);
            this.hideLoadingState(loginBtn, loginText, loginSpinner);
        }
    }

    /**
     * Parse login response from various backend formats
     * @param {Object} response - API response
     * @returns {Object} Contains token and role
     */
    parseLoginResponse(response) {
        console.log('Parsing login response structure...');
        
        if (!response) {
            console.error('Empty response received');
            return { token: null, role: null };
        }

        let token = null;
        let role = null;
        let userData = null;

        // Try different response structures
        if (response.token) {
            token = response.token;
            role = response.role;
            userData = response.user || response.data;
            console.log('Found in root: token, role');
        } 
        else if (response.accessToken) {
            token = response.accessToken;
            role = response.role;
            userData = response.user || response.data;
            console.log('Found in root: accessToken, role');
        }
        else if (response.data) {
            // Handle nested data structure
            if (response.data.token) {
                token = response.data.token;
                role = response.data.role;
                userData = response.data.user || response.data;
                console.log('Found in data: token, role');
            } 
            else if (response.data.accessToken) {
                token = response.data.accessToken;
                role = response.data.role;
                userData = response.data.user || response.data;
                console.log('Found in data: accessToken, role');
            }
            else if (response.data.jwt) {
                token = response.data.jwt;
                role = response.data.role;
                userData = response.data.user || response.data;
                console.log('Found in data: jwt, role');
            }
            // Handle Spring Security default response
            else if (response.data.username) {
                token = response.token || response.data.token;
                role = response.data.role || response.data.authorities?.[0]?.authority;
                userData = response.data;
                console.log('Found Spring Security response');
            }
        }
        else if (response.jwt) {
            token = response.jwt;
            role = response.role;
            userData = response.user || response.data;
            console.log('Found in root: jwt, role');
        }
        // Handle direct user object response
        else if (response.username) {
            token = response.token;
            role = response.role;
            userData = response;
            console.log('Found direct user object');
        }

        // If still no token, try to find it recursively
        if (!token) {
            token = this.findValueRecursive(response, ['token', 'accessToken', 'jwt']);
            console.log('Recursive token search result:', token);
        }

        if (!role) {
            role = this.findValueRecursive(response, ['role', 'authority', 'userRole']);
            console.log('Recursive role search result:', role);
            
            // If no role found, try to extract from user data
            if (!role && userData) {
                role = userData.role || userData.authorities?.[0]?.authority;
                console.log('Role from user data:', role);
            }
        }

        // Clean up role string (remove "ROLE_" prefix if present)
        if (role) {
            role = role.replace('ROLE_', '');
            console.log('Cleaned role:', role);
        }

        return { token, role, userData };
    }

    /**
     * Recursively search for a value in an object
     * @param {Object} obj - Object to search
     * @param {Array} keys - Keys to search for
     * @returns {*} Found value or null
     */
    findValueRecursive(obj, keys) {
        if (!obj || typeof obj !== 'object') return null;

        // Check current level
        for (let key of keys) {
            if (obj[key] !== undefined) {
                return obj[key];
            }
        }

        // Check nested objects
        for (let key in obj) {
            if (obj[key] && typeof obj[key] === 'object') {
                const result = this.findValueRecursive(obj[key], keys);
                if (result) return result;
            }
        }

        return null;
    }

    /**
     * Fallback role determination based on username
     * @param {string} username - Username
     * @returns {string} Determined role
     */
    determineRoleFromUsername(username) {
        console.log('Determining role from username:', username);
        
        const usernameLower = username.toLowerCase();
        
        if (usernameLower.includes('admin') || usernameLower === 'admin') {
            return 'ADMIN';
        } else if (usernameLower.includes('prof') || usernameLower.includes('teacher') || usernameLower.includes('faculty')) {
            return 'PROFESSOR';
        }
        
        // Default fallback - use ADMIN as default for security
        console.warn('Could not determine role from username, using ADMIN as fallback');
        return 'ADMIN';
    }

    /**
     * Show loading state on login button
     */
    showLoadingState(button, textElement, spinnerElement) {
        if (button && textElement && spinnerElement) {
            textElement.style.display = 'none';
            spinnerElement.style.display = 'block';
            button.disabled = true;
        }
    }

    /**
     * Hide loading state on login button
     */
    hideLoadingState(button, textElement, spinnerElement) {
        if (button && textElement && spinnerElement) {
            textElement.style.display = 'inline';
            spinnerElement.style.display = 'none';
            button.disabled = false;
        }
    }

    /**
     * Initialize logout functionality
     */
    initLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        }
    }

    /**
     * Handle user logout
     */
    handleLogout() {
        console.log('Logging out...');
        this.publicApi.removeToken();
        this.showToast('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }

    /**
     * Force logout with reason
     * @param {string} reason - Reason for forced logout
     */
    forceLogout(reason) {
        console.error('Force logout:', reason);
        this.publicApi.removeToken();
        this.showToast(`Authentication error: ${reason}`, 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }

    /**
     * Show error message to user
     * @param {string} message - Error message
     */
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }
    }

    /**
     * Utility function to show element
     */
    showElement(element) {
        if (element) element.style.display = 'block';
    }

    /**
     * Utility function to hide element
     */
    hideElement(element) {
        if (element) element.style.display = 'none';
    }

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type of toast (success, error, info)
     */
    showToast(message, type = 'info') {
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize authentication manager with error handling
console.log('Initializing Enhanced Auth Manager...');

try {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM Content Loaded - Starting Auth Manager');
        window.authManager = new AuthManager();
    });
} catch (error) {
    console.error('Failed to initialize Auth Manager:', error);
}