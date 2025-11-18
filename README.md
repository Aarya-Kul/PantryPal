# PantryPal — Expo + Flask Application

## 📦 Project Structure & How This App Works

This project contains **two major components**:

### **1. `expo/` — The Mobile Frontend**
The `expo/` directory contains an Expo (React Native) application. This handles:
- All mobile UI
- Screens and navigation (via file-based routing in `expo/app`)
- Camera access, scanning, user flows
- Communication with the Flask backend

Expo provides fast refresh, mobile simulators, and QR-code previews for rapid development.

The frontend runs on **http://0.0.0.0:8001/** in development.

### **2. `backend/` — The Flask API Server**
The `backend/` directory contains a Python Flask application. It powers:
- Authentication and user/session handling
- Database access and ORM models
- Receipt uploading and processing
- API endpoints consumed by the Expo frontend

The backend runs on **http://0.0.0.0:8000/** in development.

---

## 🚀 Get Started

### **1. Install dependencies**

**Frontend (Expo):**
```bash
npm install
```

**Backend (Flask):**
```bash
cd backend
python -m venv env
source env/bin/activate  # On Windows: env\Scripts\activate
pip install -r requirements.txt
cd ..
```

### **2. Start the application**

You have two options:

#### **Option A: Single Command (Recommended)**
```bash
./start.sh
```
This launches both the Expo app and Flask backend simultaneously.

When this runs, you'll see:
- Flask backend running at `0.0.0.0:8000`
- Expo dev server running at `0.0.0.0:8001`
- Options to open the mobile app in:
  - A development build
  - Android emulator
  - iOS simulator
  - Expo Go

#### **Option B: Separate Terminals**

**Terminal 1 — Start the Flask Backend:**
```bash
cd backend
source env/bin/activate  # On Windows: env\Scripts\activate
python app.py
```
The backend will run at `http://0.0.0.0:8000/`

**Terminal 2 — Start the Expo Frontend:**
```bash
npx expo start --port 8001
```
The Expo dev server will run at `http://0.0.0.0:8001/`

When Expo starts, you'll see options to open the app in:
- A development build
- Android emulator
- iOS simulator
- Expo Go

---

## 📱 Expo Development Notes

Once the Expo dev server is running, you can open the app in:
- A development build
- Android emulator
- iOS simulator
- Expo Go

Learn more:
- [Expo docs](https://docs.expo.dev)
- [File-based routing](https://docs.expo.dev/router/introduction)
- [Interactive tutorial](https://docs.expo.dev/tutorial/introduction/)

If you ever want a clean starting point:
```bash
npm run reset-project
```
This moves starter code to `app-example/` and gives you an empty `app/` directory.

---

## 🧑‍🤝‍🧑 Join the Community

- [Expo GitHub](https://github.com/expo/expo)
- [Expo Discord](https://chat.expo.dev)