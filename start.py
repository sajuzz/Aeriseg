import subprocess
import sys
import os
import time

def main():
    print("Starting AeriSeg SIEM+XDR Prototype...")

    
    # Setup paths
    venv_python = os.path.abspath(os.path.join("venv", "Scripts", "python.exe"))
    if not os.path.exists(venv_python):
        print(f"Error: {venv_python} not found. Please ensure venv is setup.")
        sys.exit(1)
        
    backend_cmd = [venv_python, "-m", "uvicorn", "app.main:app", "--port", "8000", "--host", "0.0.0.0"]
    frontend_cmd = ["npm.cmd", "run", "dev"]
    
    # Setup environment
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.join(os.getcwd(), "backend")
    # Make sure npm is accessible
    env["PATH"] = env.get("PATH", "") + r";C:\Program Files\nodejs"
    
    # Boot Backend
    print("[SYSTEM] Booting FastAPI Backend on Port 8000...")
    backend_proc = subprocess.Popen(backend_cmd, cwd=os.path.join(os.getcwd(), "backend"), env=env)
    
    time.sleep(3)
    
    # Boot Frontend
    print("[SYSTEM] Booting Vite React Frontend...")
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=os.path.join(os.getcwd(), "frontend"), env=env, shell=True)
    
    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\n[SYSTEM] Shutting down...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

if __name__ == "__main__":
    main()
