import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

print("Connecting to localhost:2222...")
client.connect('127.0.0.1', port=2222, username='cloud', password='1234')

print("Executing installation commands...")
command = """
curl -O http://192.168.56.1:9999/aeriseg_agent.py
curl -O http://192.168.56.1:9999/install.sh
chmod +x install.sh
echo '1234' | sudo -S ./install.sh
"""
stdin, stdout, stderr = client.exec_command(command)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
client.close()
