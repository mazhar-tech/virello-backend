# Virello Food Backend API

A Node.js backend API for the Virello Food application, built with Express.js and MongoDB.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: User registration, login, profile management
- **Product Management**: CRUD operations for products with search and filtering
- **Order Management**: Complete order lifecycle management
- **Admin Panel**: Administrative functions and reporting
- **Security**: Input validation, rate limiting, CORS protection
- **Database**: MongoDB with Mongoose ODM

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **ODM**: Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. **Clone the repository and navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables:**
   Edit `.env` file with your configuration:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/virello-food
   JWT_SECRET=your-super-secret-jwt-key-here
   FRONTEND_URL=http://localhost:3000
   ```

5. **Start MongoDB:**
   Make sure MongoDB is running on your system.

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Build (if using TypeScript)
```bash
npm run build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/logout` - Logout

### Products
- `GET /api/products` - Get all products (with filtering)
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/slug/:slug` - Get product by slug
- `GET /api/products/category/:category` - Get products by category
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)
- `DELETE /api/products/:id` - Delete product (Admin only)
- `PATCH /api/products/:id/stock` - Update product stock (Admin only)
- `GET /api/products/search/suggestions` - Get search suggestions

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/number/:orderNumber` - Get order by order number
- `PATCH /api/orders/:id/cancel` - Cancel order
- `PATCH /api/orders/:id/status` - Update order status (Admin only)
- `GET /api/orders/admin/all` - Get all orders (Admin only)

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update current user profile
- `PUT /api/users/preferences` - Update user preferences
- `DELETE /api/users/account` - Delete user account
- `GET /api/users/admin/all` - Get all users (Admin only)
- `GET /api/users/admin/:id` - Get user by ID (Admin only)
- `PUT /api/users/admin/:id` - Update user by ID (Admin only)

### Admin
- `GET /api/admin/dashboard` - Get admin dashboard
- `GET /api/admin/analytics` - Get analytics data
- `POST /api/admin/products/bulk-update` - Bulk update products
- `POST /api/admin/orders/bulk-status-update` - Bulk update order statuses
- `GET /api/admin/reports/sales` - Get sales report
- `GET /api/admin/reports/inventory` - Get inventory report

## Database Models

### User
- Basic user information (email, password, display name)
- Profile details (first name, last name, phone, address)
- Role-based access control (user, admin, moderator)
- Preferences and notification settings

### Product
- Product information (name, description, price, stock)
- Categories and specifications
- Images and SEO metadata
- Analytics (views, orders, ratings)

### Order
- Customer information and shipping details
- Order items with product references
- Payment and shipping information
- Order status tracking and admin notes

## Authentication & Authorization

- **JWT Tokens**: Secure authentication with configurable expiration
- **Role-based Access**: Different permission levels for users, moderators, and admins
- **Middleware**: Authentication and authorization middleware for route protection

## Security Features

- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS settings
- **Helmet**: Security headers for Express applications
- **Password Hashing**: Bcrypt for secure password storage

## Error Handling

- **Centralized Error Handling**: Consistent error responses across the API
- **Validation Errors**: Detailed validation error messages
- **Database Errors**: Proper handling of MongoDB errors
- **HTTP Status Codes**: Appropriate HTTP status codes for different scenarios

## Development

### Project Structure
```
backend/
├── models/          # MongoDB models
├── routes/          # API route handlers
├── middleware/      # Custom middleware
├── server.js        # Main application file
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

### Adding New Routes
1. Create a new route file in the `routes/` directory
2. Define your routes with proper validation and error handling
3. Import and use the routes in `server.js`

### Adding New Models
1. Create a new model file in the `models/` directory
2. Define your Mongoose schema with proper validation
3. Export the model for use in routes

## Testing

```bash
npm test
```

## Deployment

### Environment Variables
Make sure to set all required environment variables in production:
- `NODE_ENV=production`
- `MONGODB_URI` - Production MongoDB connection string
- `JWT_SECRET` - Strong, unique JWT secret
- `FRONTEND_URL` - Production frontend URL

### Process Management
Consider using PM2 or similar process managers for production:
```bash
npm install -g pm2
pm2 start server.js --name "virello-backend"
```

## Contributing

1. Follow the existing code style
2. Add proper error handling and validation
3. Include JSDoc comments for complex functions
4. Test your changes thoroughly

## License

This project is part of the Virello Food application.


