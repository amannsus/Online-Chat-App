
# Yap! 🤗 - Real-Time Chat Application

A modern, real-time chat application built with **React**, **Node.js**, **Socket.IO**, and **MongoDB**. Yap! lets you chat in real-time, manage friends, create groups, and enjoy a sleek, responsive UI.

---

## 🏷️ Badges
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-brightgreen?logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-lightgrey?logo=socket.io)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

- **Real-time Messaging** using Socket.IO
- **Secure Authentication** with JWT
- **Individual & Group Chats**
- **Friend System**: Send/manage friend requests
- **Typing Indicators** & **Online Status**
- **Dark Mode UI**
- **Persistent Message History**
- **Responsive Design** for all devices

---

## 🚀 Tech Stack

### Frontend
- React 18 + Vite
- Zustand (State Management)
- Tailwind CSS + Lucide Icons
- Socket.IO Client
- React Router DOM

### Backend
- Node.js + Express.js
- Socket.IO
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs for password hashing
- Cloudinary for image uploads

---

## 🎥 Webapp link

"https://yappinng.netlify.app"

---

## 📸 Screenshots

### 🟣 Sign Up & Profile Page
<img width="1918" height="985" alt="Screenshot 2025-08-22 220150" src="https://github.com/user-attachments/assets/86d3d056-590b-4c53-97b8-cb02ff6f2803" />

<img width="1918" height="965" alt="Screenshot 2025-08-22 220002" src="https://github.com/user-attachments/assets/702c62d9-68ac-4e8b-a2c2-5e84cbdb4122" />

---

### 🟢 Group Management

<img width="1918" height="917" alt="Screenshot 2025-08-22 213402" src="https://github.com/user-attachments/assets/e060b297-2170-4992-ba21-1363c6d23f31" />

---

### 🟡 Chat Interface
<img width="1918" height="972" alt="Screenshot 2025-08-22 191505" src="https://github.com/user-attachments/assets/f6891ea5-153e-456f-95ec-dfe77b158a72" />

---

### 🔵 MongoDB Integration
<img width="1918" height="961" alt="Screenshot 2025-08-22 193129" src="https://github.com/user-attachments/assets/bae4816c-7f22-4be2-afcf-51efe8be772b" />

---

## 📁 Project Structure

```bash
Chatapp/
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── socket/
│   └── lib/
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── store/
│   ├── hooks/
│   └── lib/
└── README.md
````

---

## 🛠️ Installation & Setup

### Prerequisites

* Node.js >= 16
* MongoDB (Local or Atlas)
* npm or yarn

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

Start server:

```bash
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📱 Usage

1. **Sign Up/Login**
2. **Add Friends**
3. **Start Chatting**
4. **Create Groups**
5. **Manage Members & Settings**

---

## 🚀 Deployment

### Backend

*  Render
* Configure environment variables

### Frontend

* Use Netlify
* Configure environment variables
```bash
npm run build
```

Deploy via **Vercel**, **Netlify**, or **Surge**.

---

## 👨‍💻 Author

**Aman Kumar Chaudhary**
[![GitHub](https://img.shields.io/badge/GitHub-Profile-black?logo=github)](https://github.com/amannsus)

---

**Yap! 🤗** — *Because great conversations start with a friendly hello!*


