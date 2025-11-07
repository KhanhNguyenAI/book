# Online Book Reading Platform

This project is a secure online platform that allows users to read books, create posts, and chat with friends in real time. The system is designed with strong authentication and authorization logic to protect user data and ensure safe access to features.

## Features

### 🔐 Secure Authentication

* User login and actions are protected using **JWT (JSON Web Token)**.
* All passwords are stored using a **secure hash system** instead of plain text.
* Only users with valid tokens can access protected routes.

### 📚 Online Book Reading

* Users can read books directly on the website.
* All book data and reading sessions are protected by authentication.

### 📝 Create Posts

* Users can create public or personal posts.
* Posts are tied to authenticated user accounts.

### 💬 Real-Time Messaging

* Users can chat with friends instantly.
* Real-time communication is handled securely using the existing authentication token.

## Tech Highlights

* **JWT Authentication** for user identity verification.
* **Password Hashing** (bcrypt or similar) to secure user credentials.
* **Protected API Routes** that require valid tokens.
* **Real-time messaging** (via WebSocket / Socket.IO).
* **Book reading module** with permission control.


## Demo Video

You can watch the project demo here:

* [https://youtu.be/baO8PnWvYYE](https://youtu.be/baO8PnWvYYE)


