// API Configuration and Utility Functions

// Dynamic API URL
const API_BASE_URL = window.location.hostname.includes('localhost')
    ? 'http://localhost:8080'    // local backend
    : 'https://your-production-url.com'; // production backend


/**
 * Base API Service class providing common HTTP methods and response handling
 * All API services extend this base class for consistent behavior
 */
class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
        console.log("API Base URL:", this.baseURL);
    }

    /**
     * Generic GET request handler
     * @param {string} endpoint - API endpoint
     * @param {boolean} requiresAuth - Whether authentication is required
     * @returns {Promise} API response data
     */
    async get(endpoint, requiresAuth = false) {
        try {
            console.log(`API GET: ${endpoint}`);
            
            const headers = this.buildHeaders(requiresAuth);
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'GET',
                headers: headers
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`GET request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Generic POST request handler
     * @param {string} endpoint - API endpoint
     * @param {object} data - Data to send in request body
     * @param {boolean} requiresAuth - Whether authentication is required
     * @returns {Promise} API response data
     */
    async post(endpoint, data, requiresAuth = false) {
        try {
            console.log(`API POST: ${endpoint}`, data);
            
            const headers = this.buildHeaders(requiresAuth);
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`POST request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Generic PUT request handler
     * @param {string} endpoint - API endpoint
     * @param {object} data - Data to send in request body
     * @param {boolean} requiresAuth - Whether authentication is required
     * @returns {Promise} API response data
     */
    async put(endpoint, data, requiresAuth = false) {
        try {
            console.log(`API PUT: ${endpoint}`, data);
            
            const headers = this.buildHeaders(requiresAuth);
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(data)
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`PUT request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Generic DELETE request handler
     * @param {string} endpoint - API endpoint
     * @param {boolean} requiresAuth - Whether authentication is required
     * @returns {Promise} API response data
     */
    async delete(endpoint, requiresAuth = false) {
        try {
            console.log(`API DELETE: ${endpoint}`);
            
            const headers = this.buildHeaders(requiresAuth);
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'DELETE',
                headers: headers
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error(`DELETE request failed for ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Build headers with optional authorization
     * @param {boolean} requiresAuth - Whether to include authorization header
     * @returns {object} Headers object
     */
    buildHeaders(requiresAuth = false) {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (requiresAuth) {
            const token = this.getToken();
            if (!token) {
                throw new Error('No authentication token found. Please login again.');
            }
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Handle API response and error messages
     * FIXED: Preserves backend error messages instead of overriding them
     * @param {Response} response - Fetch API response object
     * @returns {Promise} Parsed response data
     */
    async handleResponse(response) {
        console.log(`Response status: ${response.status} ${response.statusText}`);

        // Parse response data first to get backend message
        let responseData;
        try {
            responseData = await response.json();
        } catch (e) {
            // If response is not JSON, create a simple data object
            responseData = { success: false, message: response.statusText };
        }

        console.log('Response data:', responseData);

        if (!response.ok) {
            // Extract the actual backend error message
            let errorMessage = responseData.message || 
                             responseData.error || 
                             `HTTP error! status: ${response.status}`;
            
            console.log('Error response:', errorMessage);
            
            // Throw error with the actual backend message - DO NOT override it
            throw new Error(errorMessage);
        }

        // For 204 No Content responses
        if (response.status === 204) {
            console.log('204 No Content - Operation successful');
            return { success: true, message: 'Operation completed successfully' };
        }

        console.log('API Response success:', responseData);
        return responseData;
    }

    /**
     * Get JWT token from localStorage
     * @returns {string|null} JWT token or null if not found
     */
    getToken() {
        const token = localStorage.getItem('jwtToken');
        console.log('Token from storage:', token ? 'Present' : 'Missing');
        return token;
    }

    /**
     * Store JWT token in localStorage
     * @param {string} token - JWT token to store
     */
    setToken(token) {
        if (!token) {
            console.error('Attempted to set empty token');
            return;
        }
        localStorage.setItem('jwtToken', token);
        console.log('Token stored successfully');
    }

    /**
     * Remove JWT token from localStorage (logout)
     */
    removeToken() {
        localStorage.removeItem('jwtToken');
        console.log('Token removed successfully');
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user has a valid token
     */
    isAuthenticated() {
        const token = this.getToken();
        const isAuth = !!token;
        console.log('Authentication check:', isAuth ? 'Authenticated' : 'Not authenticated');
        return isAuth;
    }

    /**
     * Get current user role from token
     * @returns {string|null} User role or null if not available
     */
    getUserRole() {
        const token = this.getToken();
        if (!token) {
            console.log('No token available for role check');
            return null;
        }
        
        try {
            console.log('Decoding JWT token...');
            // JWT token has 3 parts: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error('Invalid JWT token structure');
                return null;
            }
            
            const payload = JSON.parse(atob(parts[1]));
            console.log('JWT Payload:', payload);
            
            // Extract role from different possible field names
            let role = payload.role || 
                      payload.authority || 
                      payload.authorities?.[0] || 
                      payload.scope ||
                      payload.roles?.[0];
            
            console.log('Raw extracted role:', role);
            
            // Clean up role string if needed
            if (role) {
                if (typeof role === 'object') {
                    // If role is an object, try to extract authority
                    role = role.authority || role.role || role.name;
                }
                
                if (role && role.startsWith('ROLE_')) {
                    role = role.replace('ROLE_', '');
                }
                
                // Convert to uppercase for consistency
                role = role.toUpperCase();
            }
            
            console.log('Final normalized role:', role);
            return role;
            
        } catch (error) {
            console.error('Error decoding token:', error);
            console.error('Token that failed:', token);
            return null;
        }
    }

    /**
     * Get current user info from API
     * @returns {Promise} User information
     */
    async getCurrentUser() {
        try {
            console.log('Fetching current user info...');
            const userInfo = await this.get('/api/auth/me', true);
            console.log('Current user info:', userInfo);
            return userInfo;
        } catch (error) {
            console.error('Failed to get current user:', error);
            throw error;
        }
    }
}

/**
 * Public API endpoints (no authentication required)
 * Used for public operations like login, registration, and public student search
 */
class PublicApiService extends ApiService {
    /**
     * Search student by email (public endpoint)
     * @param {string} email - Student email to search for
     * @returns {Promise} Student data
     */
    async searchStudentByEmail(email) {
        console.log(`Searching student by email: ${email}`);
        const encodedEmail = encodeURIComponent(email);
        return await this.get(`/api/students/public/email/${encodedEmail}`);
    }

    /**
     * Login user
     * @param {object} credentials - Login credentials {username, password}
     * @returns {Promise} Login response
     */
    async login(credentials) {
        console.log(`Attempting login for user: ${credentials.username}`);
        const response = await this.post('/api/auth/login', credentials);
        
        // Don't automatically set token here - let the auth manager handle it
        console.log('Login response received');
        return response;
    }

    /**
     * Register new user (if available)
     * @param {object} userData - User registration data
     * @returns {Promise} Registration response
     */
    async register(userData) {
        console.log(`Registering new user: ${userData.username}`);
        return await this.post('/api/auth/register', userData);
    }
}

/**
 * Admin API endpoints
 * Provides full access to all administrative functions
 */
class AdminApiService extends ApiService {
    // Branch management
    async getBranches() {
        console.log('Fetching all branches...');
        return await this.get('/api/branches', true);
    }

    async getBranchesPaginated(page = 0, size = 10) {
        console.log(`Fetching branches page ${page}, size ${size}...`);
        return await this.get(`/api/branches/paginated?page=${page}&size=${size}`, true);
    }

    async createBranch(branchData) {
        console.log('Creating new branch:', branchData);
        return await this.post('/api/branches', branchData, true);
    }

    async getBranch(id) {
        console.log(`Fetching branch ID: ${id}`);
        return await this.get(`/api/branches/${id}`, true);
    }

    async updateBranch(id, branchData) {
        console.log(`Updating branch ID: ${id}`, branchData);
        return await this.put(`/api/branches/${id}`, branchData, true);
    }

    async deleteBranch(id) {
        console.log(`Deleting branch ID: ${id}`);
        return await this.delete(`/api/branches/${id}`, true);
    }

    // User management
    async getUsers() {
        console.log('Fetching all users...');
        return await this.get('/api/users', true);
    }

    async getUsersPaginated(page = 0, size = 10) {
        console.log(`Fetching users page ${page}, size ${size}...`);
        return await this.get(`/api/users/paginated?page=${page}&size=${size}`, true);
    }

    async createUser(userData) {
        console.log('Creating new user:', userData);
        return await this.post('/api/users', userData, true);
    }

    async getUser(id) {
        console.log(`Fetching user ID: ${id}`);
        return await this.get(`/api/users/${id}`, true);
    }

    async deleteUser(id) {
        console.log(`Deleting user ID: ${id}`);
        return await this.delete(`/api/users/${id}`, true);
    }

    // Student management (admin has full access)
    async getStudents() {
        console.log('Fetching all students...');
        return await this.get('/api/students', true);
    }

    async getStudentsPaginated(page = 0, size = 10) {
        console.log(`Fetching students page ${page}, size ${size}...`);
        return await this.get(`/api/students/paginated?page=${page}&size=${size}`, true);
    }

    async createStudent(studentData) {
        console.log('Creating new student:', studentData);
        return await this.post('/api/students', studentData, true);
    }

    async getStudent(id) {
        console.log(`Fetching student ID: ${id}`);
        return await this.get(`/api/students/${id}`, true);
    }

    async updateStudent(id, studentData) {
        console.log(`Updating student ID: ${id}`, studentData);
        return await this.put(`/api/students/${id}`, studentData, true);
    }

    async deleteStudent(id) {
        console.log(`Deleting student ID: ${id}`);
        return await this.delete(`/api/students/${id}`, true);
    }
}

/**
 * Professor API endpoints
 * Provides limited access to professor-specific functions
 */
class ProfessorApiService extends ApiService {
    // Student management (limited to professor's branch)
    async getStudents() {
        console.log('Fetching students for professor...');
        return await this.get('/api/students', true);
    }

    async getStudentsPaginated(page = 0, size = 10) {
        console.log(`Fetching students page ${page}, size ${size} for professor...`);
        return await this.get(`/api/students/paginated?page=${page}&size=${size}`, true);
    }

    async createStudent(studentData) {
        console.log('Creating new student as professor:', studentData);
        return await this.post('/api/students', studentData, true);
    }

    async getStudent(id) {
        console.log(`Fetching student ID: ${id} for professor`);
        return await this.get(`/api/students/${id}`, true);
    }

    async updateStudent(id, studentData) {
        console.log(`Updating student ID: ${id} as professor`, studentData);
        return await this.put(`/api/students/${id}`, studentData, true);
    }

    async deleteStudent(id) {
        console.log(`Deleting student ID: ${id} as professor`);
        return await this.delete(`/api/students/${id}`, true);
    }

    // Professor-specific endpoints
    async getMyProfile() {
        console.log('Fetching professor profile...');
        return await this.get('/api/professor/profile', true);
    }

    async getMyBranchStudents() {
        console.log('Fetching students from professor branch...');
        return await this.get('/api/professor/my-students', true);
    }
}

/**
 * Utility functions for API response handling
 */
class ApiUtils {
    /**
     * Extract data from nested API response structures
     * @param {object} apiResponse - Raw API response
     * @returns {*} Extracted data
     */
    static extractData(apiResponse) {
        if (!apiResponse) {
            console.warn('No API response provided to extractData');
            return null;
        }

        // Handle different response structures
        if (apiResponse.data !== undefined) {
            console.log('Extracted data from response.data');
            return apiResponse.data;
        } else if (apiResponse.content !== undefined) {
            console.log('Extracted data from response.content');
            return apiResponse.content;
        } else {
            console.log('Using full response as data');
            return apiResponse;
        }
    }

    /**
     * Check if API response indicates success
     * @param {object} apiResponse - API response object
     * @returns {boolean} True if response indicates success
     */
    static isSuccess(apiResponse) {
        const success = apiResponse && 
                       (apiResponse.success === true || 
                        apiResponse.status === 'OK' || 
                        apiResponse.statusCode === 200);
        console.log('API success check:', success);
        return success;
    }

    /**
     * Get error message from API response
     * @param {object} apiResponse - API response object
     * @returns {string} Error message
     */
    static getErrorMessage(apiResponse) {
        if (!apiResponse) return 'No response from server';
        
        if (apiResponse.message) {
            return apiResponse.message;
        } else if (apiResponse.error) {
            return apiResponse.error;
        } else {
            return 'An unknown error occurred';
        }
    }

    /**
     * Handle pagination response and normalize structure
     * @param {object} apiResponse - API response with pagination data
     * @returns {object} Normalized pagination data
     */
    static handlePaginationResponse(apiResponse) {
        const data = this.extractData(apiResponse);
        
        if (data && typeof data === 'object') {
            // Check common pagination structures
            if (data.content !== undefined) {
                return {
                    items: data.content,
                    totalPages: data.totalPages || 1,
                    currentPage: data.number || 0,
                    totalItems: data.totalElements || data.content.length,
                    hasNext: !data.last,
                    hasPrevious: !data.first
                };
            }
        }
        
        // If no pagination structure, return as single page
        return {
            items: Array.isArray(data) ? data : [data],
            totalPages: 1,
            currentPage: 0,
            totalItems: Array.isArray(data) ? data.length : 1,
            hasNext: false,
            hasPrevious: false
        };
    }
}

// Create global instances for use throughout the application
const publicApi = new PublicApiService();
const adminApi = new AdminApiService();
const professorApi = new ProfessorApiService();
const apiUtils = ApiUtils;

// Export for use in other files (Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        publicApi,
        adminApi,
        professorApi,
        apiUtils
    };
}