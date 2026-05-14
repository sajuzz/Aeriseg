@echo off
set PATH=%PATH%;C:\Program Files\nodejs
npx -y create-vite@latest frontend --template react
cd frontend
npm install zustand tailwindcss @tailwindcss/vite postcss framer-motion recharts lucide-react axios react-router-dom
