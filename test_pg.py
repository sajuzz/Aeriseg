import socket

def test_pg():
    try:
        s = socket.create_connection(("127.0.0.1", 5432), timeout=2)
        print("PostgreSQL is listening on port 5432!")
        s.close()
    except Exception as e:
        print(f"Failed to connect to PostgreSQL: {e}")

if __name__ == "__main__":
    test_pg()
