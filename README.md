# ConnectP - Real-time Chat and Video Call Application

ConnectP is a full-stack web application that provides real-time chat and video calling functionalities. It's built with a modern technology stack, featuring a React frontend and a Node.js backend.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Deployment](#deployment)
  - [Backend (Railway)](#backend-railway)
  - [Frontend (Vercel)](#frontend-vercel)

## Features

- **Real-time Chat:** Instant messaging with friends.
- **Video Calls:** High-quality video calls powered by Stream.
- **User Authentication:** Secure user registration and login with JWT authentication.
- **Friend System:** Send, accept, and decline friend requests.
- **Notifications:** Get notified about new friend requests.
- **Theme Customization:** Switch between different themes.
- **Responsive Design:** A clean and modern UI that works on all devices.

## Tech Stack

### Frontend

- **Framework:** React (with Vite)
- **Styling:** Tailwind CSS & daisyUI
- **State Management:** Zustand
- **Data Fetching:** React Query & Axios
- **Real-time Video:** Stream Video React SDK
- **Routing:** React Router

### Backend

- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JSON Web Tokens (JWT)
- **Real-time Chat:** Stream Chat
- **Environment Variables:** Dotenv

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or pnpm
- MongoDB (local instance or a cloud-hosted one like MongoDB Atlas)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/hasnain-tanoli/connect-p.git
    cd connect-p
    ```

2.  **Install backend dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Install frontend dependencies:**
    ```bash
    cd ../frontend
    npm install
    ```

### Environment Variables

You'll need to create `.env` files for both the backend and frontend directories.

**Backend (`backend/.env`):**

```env
PORT=5001
MONGO_URI=<your_mongodb_connection_string>
FRONTEND_URL=http://localhost:5173
JWT_SECRET=<your_jwt_secret>
STREAM_API_KEY=<your_stream_api_key>
STREAM_API_SECRET=<your_stream_api_secret>
```

**Frontend (`frontend/.env`):**

```env
VITE_API_URL=http://localhost:5001/api
VITE_STREAM_API_KEY=<your_stream_api_key>
```

## Usage

1.  **Start the backend server:**
    ```bash
    cd backend
    npm run dev
    ```
    The server will start on the port specified in your `backend/.env` file (e.g., 5001).

2.  **Start the frontend development server:**
    ```bash
    cd frontend
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## Deployment

This project is configured for a split deployment: the backend on Railway and the frontend on Vercel.

### Backend (Railway)

1.  Push your code to a GitHub repository.
2.  Create a new project on Railway and link it to your GitHub repository.
3.  Railway will automatically detect the `package.json` and use the `start` script (`node src/server.js`) to run the application.
4.  Set the following environment variables in your Railway project settings:
    - `MONGO_URI`
    - `FRONTEND_URL` (the URL of your deployed Vercel app)
    - `JWT_SECRET`
    - `STREAM_API_KEY`
    - `STREAM_API_SECRET`

### Frontend (Vercel)

1.  Push your code to a GitHub repository.
2.  Create a new project on Vercel and link it to your GitHub repository.
3.  Configure the project root to be `frontend`.
4.  Vercel will automatically detect the Vite configuration and use the `vite build` command.
5.  Set the following environment variables in your Vercel project settings:
    - `VITE_API_URL` (the URL of your deployed Railway backend)
    - `VITE_STREAM_API_KEY`

---

This README provides a comprehensive guide to understanding, setting up, and deploying the ConnectP application.
