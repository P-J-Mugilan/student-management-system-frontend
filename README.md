# Student Management System

A complete web application for managing students, branches, and users with role-based access control.

## 👤 Developer

**P J Mugilan**  
Full Stack Developer  
📍 Tirupati, Andhra Pradesh | Bangalore, Karnataka  
📧 pjmugilan@gmail.com  
📞 +91 7671085496  

**Portfolio:** https://pjmugilan.onrender.com  
**LinkedIn:** https://www.linkedin.com/in/mugilanjagadeesan/  
**GitHub:** https://github.com/P-J-Mugilan/

**Technical Skills:**  
- Frontend: HTML5, CSS3, JavaScript, React.js
- Backend: Spring Boot, REST APIs, JWT Authentication
- Database: MySQL, MongoDB
- Tools: Git, Postman, VS Code

**About this Project:**  
Built a complete Student Management System with role-based access control, featuring admin and professor dashboards with full CRUD operations, JWT authentication, and responsive design.

## 🚀 Live Deployment

**Frontend:** http://localhost:5500/index.html  
**Backend:** http://localhost:8080  
**Status:** Planning to deploy both frontend and backend on free hosting services

## 🛠️ Features

### Authentication System
- JWT-based authentication
- Role-based access control (Admin/Professor)
- Automatic redirect based on user role
- Secure token management

### Admin Dashboard
- Manage Branches - CRUD operations for academic branches
- Manage Users - Create and edit users with role assignment
- Manage Students - Full student management across all branches
- Pagination and Search - Efficient data browsing

### Professor Dashboard
- Student Management - Limited to professor's assigned branch
- Branch-specific access - Can only manage students from own branch
- Simple interface - Streamlined for professor workflow

### Public Features
- Student Search - Public lookup by email address
- Responsive design - Works on all devices

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Spring Boot REST API
- **Authentication**: JWT Tokens
- **Storage**: LocalStorage for tokens

## 📁 Project Structure

```
student-management-system/
├── index.html              # Public landing page
├── login.html              # Login page
├── admin-dashboard.html    # Admin dashboard
├── professor-dashboard.html # Professor dashboard
├── css/
│   └── style.css          # Complete styling
└── js/
    ├── api.js             # API service classes
    ├── auth.js            # Authentication manager
    ├── admin-dashboard.js # Admin dashboard manager
    ├── professor-dashboard.js # Professor dashboard manager
    └── main.js            # Public page functionality
```

## 🔐 User Roles

### Admin
- Full system access
- Manage all branches, users, and students
- Assign professors to branches

### Professor
- Limited to assigned branch
- Manage students only from their branch
- Cannot access branch management

## 📋 Getting Started

### Local Development
1. Clone the repository
2. Start the backend server on http://localhost:8080
3. Start the frontend server on http://localhost:5500
4. Open index.html in a web browser
5. Login with admin or professor credentials

### Production Deployment
- Planning to deploy frontend on Netlify/Vercel
- Planning to deploy backend on Render/Railway
- Database on free tier of cloud services

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Admin Endpoints
- `GET/POST/PUT/DELETE /api/branches` - Branch management
- `GET/POST/PUT/DELETE /api/users` - User management  
- `GET/POST/PUT/DELETE /api/students` - Student management

### Professor Endpoints
- `GET/POST/PUT/DELETE /api/students` - Branch-specific student management

### Public Endpoints
- `GET /api/students/public/email/{email}` - Student search by email

## ✨ Key Features

- Responsive Design - Mobile-friendly interface
- Real-time Validation - Form validation with user feedback
- Error Handling - Comprehensive error management
- Loading States - Visual feedback for API calls
- Toast Notifications - User-friendly messages
- Security - XSS protection and input sanitization

## 🌐 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🐛 Troubleshooting

- 403 Errors: Check user permissions and role assignments
- Branch Issues: Ensure professors have branch assignments
- Token Issues: Clear localStorage and re-login
- CORS Issues: Verify backend CORS configuration

## 📄 License

This project is for educational and portfolio purposes.

---

Developed with ❤️ by P J Mugilan
