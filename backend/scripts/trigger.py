import subprocess

log_line = "Jun 24 10:22:33 wsl-host sshd[123]: Failed password for invaliduser from 192.168.1.100 port 50400"
cmd = f"echo '1234' | sudo -S sh -c \"echo '{log_line}' >> /var/log/auth.log\""

subprocess.run(["wsl", "-e", "bash", "-c", cmd])
