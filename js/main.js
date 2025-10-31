// Main JavaScript for public pages (index.html)
// Handles student search functionality and public page interactions

class MainApp {
    constructor() {
        this.publicApi = publicApi;
        this.init();
    }

    /**
     * Initialize the main application
     * Sets up all necessary event listeners and functionality
     */
    init() {
        console.log('Main App Initialized');
        
        // Initialize search functionality for index.html
        if (document.getElementById('searchForm')) {
            this.initSearch();
        }
    }

    /**
     * Initialize student search functionality
     * Sets up form submission handler and validation
     */
    initSearch() {
        const searchForm = document.getElementById('searchForm');
        const emailInput = document.getElementById('email');

        if (searchForm && emailInput) {
            searchForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const email = emailInput.value.trim();
                if (!email) {
                    this.showError('Please enter a valid email address.');
                    return;
                }

                // Validate email format
                if (!this.validateEmail(email)) {
                    this.showError('Please enter a valid email address format.');
                    return;
                }

                await this.searchStudent(email);
            });

            // Also allow searching by pressing Enter key
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchForm.dispatchEvent(new Event('submit'));
                }
            });
        }
    }

    /**
     * Search for student by email address
     * @param {string} email - Student email to search for
     */
    async searchStudent(email) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const resultsSection = document.getElementById('resultsSection');
        const errorMessage = document.getElementById('errorMessage');

        // Show loading spinner and hide previous results/errors
        this.showElement(loadingSpinner);
        this.hideElement(resultsSection);
        this.hideElement(errorMessage);

        try {
            console.log(`Searching for student with email: ${email}`);
            const response = await this.publicApi.searchStudentByEmail(email);
            console.log('Search response:', response);
            
            this.displayStudentDetails(response);
            
        } catch (error) {
            console.error('Search error:', error);
            this.showError(error.message || 'No student found for this email.');
        } finally {
            this.hideElement(loadingSpinner);
        }
    }

    /**
     * Display student details in the results section
     * @param {Object} apiResponse - API response containing student data
     */
    displayStudentDetails(apiResponse) {
        const resultsSection = document.getElementById('resultsSection');
        const studentDetails = document.getElementById('studentDetails');

        if (!resultsSection || !studentDetails) {
            console.error('Required DOM elements not found');
            return;
        }

        // Extract student data from the response
        let studentData;
        
        if (apiResponse && apiResponse.data) {
            // Nested data structure
            studentData = apiResponse.data;
        } else if (apiResponse) {
            // Direct student object
            studentData = apiResponse;
        } else {
            throw new Error('Invalid response format from server');
        }

        console.log('Student data:', studentData);

        const branchName = studentData.branch ? studentData.branch.name : 'Not specified';

        studentDetails.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${this.escapeHtml(studentData.name || 'Not available')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">${this.escapeHtml(studentData.email || 'Not available')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Age:</span>
                <span class="detail-value">${studentData.age || 'Not available'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Gender:</span>
                <span class="detail-value">${this.escapeHtml(
                studentData.gender.charAt(0).toUpperCase() +
                studentData.gender.slice(1).toLowerCase() || 'Not available')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Branch:</span>
                <span class="detail-value">${this.escapeHtml(studentData.branchName || 'Not available')}</span>
            </div>
        `;

        this.showElement(resultsSection);
        this.hideElement(document.getElementById('errorMessage'));
        
        // Scroll to results for better user experience
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * Show error message to the user
     * @param {string} message - Error message to display
     */
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            this.showElement(errorMessage);
            this.hideElement(document.getElementById('resultsSection'));
        }
    }

    /**
     * Validate email format using regular expression
     * @param {string} email - Email address to validate
     * @returns {boolean} True if email format is valid
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Escape HTML characters to prevent XSS attacks
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
     * Show a DOM element by setting display to block
     * @param {HTMLElement} element - Element to show
     */
    showElement(element) {
        if (element) {
            element.style.display = 'block';
        }
    }

    /**
     * Hide a DOM element by setting display to none
     * @param {HTMLElement} element - Element to hide
     */
    hideElement(element) {
        if (element) {
            element.style.display = 'none';
        }
    }
}

// Initialize main application when the page finishes loading
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Main App...');
    window.mainApp = new MainApp();
});