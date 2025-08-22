# Deployment Guide for Online Chat App

## Overview
This guide will help you deploy your full-stack chat application using:
- **Railway** for the backend (Node.js + Socket.io)
- **Netlify** for the frontend (React + Vite)

## Prerequisites
- GitHub account with your code pushed
- Railway account (free tier available)
- Netlify account (free tier available)
- MongoDB Atlas account (for database)
- Cloudinary account (for image uploads)

## Step 1: Deploy Backend to Railway

### 1.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Connect your GitHub repository

### 1.2 Deploy Backend
1. Click "New Project" → "Deploy from GitHub repo"
2. Select your `Online-Chat-App` repository
3. Railway will auto-detect Node.js and deploy from root
4. Go to Settings → Environment Variables and add:

```
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
FRONTEND_URL=https://your-app-name.netlify.app
```

### 1.3 Get Backend URL
- After deployment, Railway will provide a URL like: `https://your-app-name.railway.app`
- Copy this URL for frontend configuration

## Step 2: Deploy Frontend to Netlify

### 2.1 Create Netlify Account
1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub

### 2.2 Deploy Frontend
1. Click "New site from Git"
2. Choose GitHub and select your repository
3. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

### 2.3 Set Environment Variables
In Netlify dashboard → Site settings → Environment variables:
```
VITE_BACKEND_URL=https://your-backend-url.railway.app
```

### 2.4 Configure Redirects
Netlify will automatically use the `netlify.toml` file for SPA redirects.

## Step 3: Update Backend CORS

After getting your Netlify URL, update the Railway environment variable:
```
FRONTEND_URL=https://your-actual-netlify-url.netlify.app
```

## Step 4: Test Deployment

1. Visit your Netlify URL
2. Test user registration/login
3. Test real-time messaging
4. Test group functionality
5. Test image uploads

## Troubleshooting

### Common Issues:
1. **CORS errors**: Ensure FRONTEND_URL matches exactly
2. **Socket connection fails**: Check backend URL in frontend env
3. **Images not uploading**: Verify Cloudinary credentials
4. **Database connection**: Check MongoDB Atlas connection string

### Logs:
- **Railway**: View logs in Railway dashboard
- **Netlify**: Check deploy logs and function logs
- **Browser**: Check console for frontend errors

## Environment Variables Summary

### Backend (Railway):
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
JWT_SECRET=your-256-bit-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FRONTEND_URL=https://your-app.netlify.app
```

### Frontend (Netlify):
```
VITE_BACKEND_URL=https://your-backend.railway.app
```

## Security Notes
- Never commit `.env` files
- Use strong JWT secrets
- Rotate API keys regularly
- Enable HTTPS only in production
