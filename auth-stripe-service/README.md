# Authentication & Payment Service

## Features
- JWT Authentication
- Role-based Access Control (User, Admin, SuperAdmin)
- Refresh & Access Token Mechanism
- Stripe Payment Integration
    - Subscriptions (Monthly, Yearly, Lifetime) & Free
    - Payment History
    - Payment Method Management
    - Coupon Management
    - Subscription Plans
    - Invoice Management
    - Billing & Invoices
    - Customer Management
    - User Management
- MongoDB Database

## Prerequisites
- Node.js (v18+)
- MongoDB
- Stripe Account

## Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file with required variables
4. Start MongoDB
5. Run the server: `npm run dev`

## Environment Variables
- `PORT`: Server port
- `MONGODB_URI`: MongoDB connection string
- `JWT_ACCESS_SECRET`: Access token secret
- `JWT_REFRESH_SECRET`: Refresh token secret
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret

## Authentication Endpoints
- `POST /api/auth/register`: Register new user
- `POST /api/auth/login`: User login
- `POST /api/auth/refresh-token`: Get new access token
- `POST /api/auth/logout`: User logout

## Stripe Endpoints
- `POST /api/stripe/customer`: Create Stripe customer
- `POST /api/stripe/payment`: Create payment intent
- `POST /api/stripe/subscription`: Create subscription
- `POST /api/stripe/webhook`: Stripe webhook handler

## Roles
- `user`: Basic access
- `admin`: Additional privileges
- `superadmin`: Full system access

## Security
- Passwords are hashed
- JWT for authentication
- Role-based access control
- HTTP-only secure cookies
