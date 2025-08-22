# Yap! 🤗 - Real-Time Chat Application

A modern, real-time chat application built with React, Node.js, Socket.IO, and MongoDB. Features individual and group chat capabilities with a clean, responsive UI.

## ✨ Features

- **Real-time Messaging**: Instant message delivery using Socket.IO
- **User Authentication**: Secure login/signup with JWT tokens
- **Individual Chat**: Private conversations between users
- **Group Chat**: Create and manage group conversations
- **Friend System**: Send and manage friend requests
- **Typing Indicators**: See when someone is typing
- **Online Status**: Real-time online/offline status
- **Message History**: Persistent chat history
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Modern, eye-friendly interface

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern React with hooks
- **Zustand** - Lightweight state management
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.IO Client** - Real-time communication
- **React Router DOM** - Client-side routing
- **Lucide React** - Beautiful icons
- **React Hot Toast** - User notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Token authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Image upload and storage

## 📁 Project Structure

```
Chatapp/
├── backend/                 # Backend server
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Authentication middleware
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── socket/         # Socket.IO handlers
│   │   └── lib/            # Utility functions
│   └── package.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── store/          # Zustand stores
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utility libraries
│   └── package.json
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```env
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/chatapp
   JWT_SECRET=your_jwt_secret_key_here
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## 🔧 Configuration

### MongoDB
- **Local**: Install MongoDB Community Server and run locally
- **Atlas**: Use MongoDB Atlas cloud service for production

### Environment Variables
- `PORT`: Backend server port (default: 5001)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token signing
- `CLOUDINARY_*`: Cloudinary configuration for image uploads

## 📱 Usage

1. **Sign Up/Login**: Create an account or sign in
2. **Add Friends**: Search and send friend requests
3. **Start Chatting**: Click on contacts to start individual chats
4. **Create Groups**: Create group conversations with multiple members
5. **Real-time Messaging**: Send messages with instant delivery
6. **Manage Groups**: Add/remove members and customize group settings

## 🎯 Key Features Explained

### Real-time Communication
- Uses Socket.IO for instant message delivery
- Typing indicators show when someone is typing
- Online/offline status updates in real-time

### Authentication & Security
- JWT-based authentication system
- Password hashing with bcrypt
- Protected API routes and socket connections

### State Management
- Zustand for lightweight, fast state management
- Separate stores for authentication and chat functionality
- Optimized re-renders and state updates

## 🚀 Deployment

### Backend
- Deploy to platforms like Heroku, Railway, or DigitalOcean
- Set environment variables in your hosting platform
- Ensure MongoDB connection is accessible

### Frontend
- Build the project: `npm run build`
- Deploy to Vercel, Netlify, or any static hosting service
- Update API endpoints to point to your deployed backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Author

**Aman** - [GitHub Profile](https://github.com/amannsus)

## 🙏 Acknowledgments

- React team for the amazing framework
- Socket.IO for real-time capabilities
- MongoDB for the database solution
- Tailwind CSS for the beautiful styling

---

**Yap! 🤗** - Because great conversations start with a friendly hello!
