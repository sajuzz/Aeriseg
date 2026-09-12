import subprocess
import sys

def main():
    print("Installing asyncpg...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "asyncpg", "psycopg2-binary"])
        print("Installed successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
