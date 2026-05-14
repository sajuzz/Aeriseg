@echo off
set PATH=%PATH%;C:\Program Files\nodejs
cd frontend
call npm install
call npm install zustand tailwindcss @tailwindcss/vite postcss framer-motion recharts lucide-react axios react-router-dom
