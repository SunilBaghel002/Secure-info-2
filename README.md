SecureChat Application
A secure private chat application with user authentication, room-based chat, file uploads, and an admin dashboard.
Project Structure
/chat-app
├── /public               # Static frontend files
│   ├── index.html        # Frontend
│   ├── favicon.ico       # Favicon
├── /api                  # Serverless API routes for Vercel
│   ├── auth.js           # Authentication routes
│   ├── rooms.js          # Room management routes
│   ├── admin.js          # Admin dashboard routes
├── /backend              # Socket.IO server for Render
│   ├── server.js         # Socket.IO backend
│   ├── package.json      # Backend dependencies
├── .env                  # Environment variables
├── .gitignore            # Git ignore
├── vercel.json           # Vercel configuration
├── package.json          # Root dependencies
├── README.md             # Documentation

Prerequisites

Node.js 18.x
MongoDB Atlas account
Vercel account
Render account
Git and GitHub account

Setup Instructions
1. Clone the Repository
git clone <your-repo-url>
cd chat-app

2. Set Up MongoDB Atlas

Sign up at https://www.mongodb.com/cloud/atlas.
Create a free-tier cluster (M0).
Add a database user (e.g., username: chatapp, password: <yourpassword>).
Allow network access from anywhere (0.0.0.0/0).
Copy the connection string (e.g., mongodb+srv://chatapp:<password>@cluster0.mongodb.net/chat-app?retryWrites=true&w=majority).

3. Configure Environment Variables
Create a .env file in the root:
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/chat-app?retryWrites=true&w=majority
ADMIN_PASSWORD=supersecret123

4. Deploy Frontend and API on Vercel

Install Vercel CLI:
npm install -g vercel


Push to GitHub:
git add .
git commit -m "Initial commit"
git push origin main


Deploy to Vercel:
vercel


Follow prompts to link your GitHub repository.
Add environment variables in Vercel dashboard:
MONGO_URI: Your MongoDB Atlas connection string
ADMIN_PASSWORD: Same as in .env (e.g., supersecret123)




Note the Vercel URL (e.g., https://your-vercel-app.vercel.app).


5. Deploy Socket.IO Backend on Render

Create a /backend repository:
cd backend
git init
git add .
git commit -m "Initial backend commit"
git remote add origin <your-backend-repo-url>
git push origin main


Create a Web Service on Render:

Go to https://dashboard.render.com/, click “New > Web Service”, and connect your backend repository.
Set:
Environment: Node
Build Command: npm install
Start Command: npm start
Environment Variables:
MONGO_URI: Your MongoDB Atlas connection string
ADMIN_PASSWORD: Same as in .env




Deploy and note the URL (e.g., https://your-chat-backend.onrender.com).


Update /public/index.html with the Render URL:
socket = io("https://your-chat-backend.onrender.com", {
  auth: { token: localStorage.getItem("token") },
});



6. Test the Application

Visit the Vercel URL.
Register/login, create/join rooms, and send messages/files.
Access the admin dashboard:
Press Ctrl+Shift+K+L.
Enter the admin password (e.g., supersecret123).
View rooms and user activity.



Troubleshooting

API Errors: Check Vercel logs and ensure MONGO_URI and ADMIN_PASSWORD are set.
Socket.IO Errors: Verify the Render URL in index.html and ensure the Render server is running.
CORS Issues: Ensure CORS origins in server.js include your Vercel URL.
MongoDB Issues: Verify the connection string and network access in MongoDB Atlas.

Security Notes

Replace ADMIN_PASSWORD with a strong value in production.
Use HTTPS for all connections.
Consider JWT-based admin auth for enhanced security.
Restrict MongoDB Atlas access to specific IPs in production.

