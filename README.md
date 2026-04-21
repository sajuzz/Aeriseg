# medishield
MediShield SOC — Agentless, offline-first healthcare security operations center. Real-time threat detection for medical devices (IoMT), legacy OT networks, and compliance-critical environments. Built with NATS streaming, FastAPI, PostgreSQL, and ClickHouse for high-throughput telemetry analysis.
🧠 Project Overview (context)

MediShield = SIEM + XDR prototype

Pipeline:

Log Source → NATS → Backend Processing → ClickHouse → Detection → Output 
📁 Root Level Files
1. 01_install.sh
✅ What

Initial setup script (dependencies + infra)

🎯 Why

Automates environment setup → no manual errors

⚙️ How
Installs:
NATS
ClickHouse
Python dep
Prepares configs
📊 Result

System ready to start pipeline

2. 02_start.sh
✅ What

Starts all core services

🎯 Why

One command to boot full SIEM stack

⚙️ How
Starts:
NATS server
Backend service
DB connections
📊 Result

Pipeline becomes active

3. 04_smoke_test.sh
✅ What

Basic health + functionality test

🎯 Why

Quick validation after deployment

⚙️ How
Sends sample logs
Checks ingestion + processing
📊 Result

Confirms system working end-to-end

4. nats-server.conf
✅ What

Config for NATS message broker

🎯 Why

Controls messaging behavior

⚙️ How
Defines:
ports
clustering
limits
📊 Result

Reliable log streaming backbone

5. scripts/clickhouse_schema.sql
✅ What

Database schema

🎯 Why

Structured storage for logs

⚙️ How

Defines:

CREATE  TABLE  logs ( 
    timestamp  DateTime, 
    source_ip String, 
    event_type String 
) 
📊 Result

Fast querying + analytics

6. WSL_SETUP.md
✅ What

Setup guide for WSL environment

🎯 Why

Ensures reproducibility

⚙️ How

Step-by-step instructions

📊 Result

Anyone can run your project

7. .gitignore
✅ What

Ignored files list

🎯 Why

Prevents leaking sensitive data

⚙️ How

Excludes:

logs
env files
keys
📊 Result

Clean + secure repo

📁 Backend (Core Logic)
8. backend/main.py
✅ What

Entry point of backend service

🎯 Why

Starts API + processing loop

⚙️ How
Initializes services
Connects NATS + DB
📊 Result

Central control of pipeline

9. backend/requirements.txt
✅ What

Python dependencies

🎯 Why

Reproducible environment

⚙️ How

Lists packages like:

fastapi
nats-py
clickhouse-driver
📁 Core Config
10. app/core/config.py
✅ What

Central configuration

🎯 Why

Avoid hardcoding values

⚙️ How

Defines:

NATS_URL  =  "nats://localhost:4222" 
CLICKHOUSE_HOST  =  "localhost" 
11. backend/app/core/security.py
✅ What

Security utilities

🎯 Why

Protect API / system

⚙️ How
Token validation
Basic auth logic
📁 Database Layer
12. backend/app/db/clickhouse.py
✅ What

DB connection handler

🎯 Why

Abstraction over raw DB calls

⚙️ How
def   insert_log  ( log:  dict):
    client.execute("INSERT INTO logs VALUES", [log])
📊 Result

Efficient log ingestion

📁 Models
13. backend/app/models/models.py
✅ What

Data schemas

🎯 Why

Standardize log format

⚙️ How

Defines structure:

class  Log : 
    timestamp :  str 
    source_ip :  str 
📁 Services (Core Engine)
14. backend/app/services/nats_service.py
✅ What

NATS consumer/producer

🎯 Why

Handles real-time log streaming

⚙️ How
Subscribes to topics
Processes incoming logs
📊 Result

Real-time ingestion pipeline

15. backend/app/services/user_service.py
✅ What

User-related logic

🎯 Why

Authentication / access control

⚙️ How

Handles:

user validation
role logic
📁 Scripts
16. scripts/02_start.sh, 03_seed.sh, 04_smoke_test.sh
✅ What

Operational scripts

🎯 Why

Automation for testing + running

⚙️ How
start services
insert test data
validate pipeline
🔥 How Everything Works Together
🔄 Flow
1. Log generated 
2. Sent to NATS 
3. Backend consumes log 
4. Process + validate 
5. Store in ClickHouse 
6. Detection logic triggers alerts 
🧪 Example Execution
Step 1
./01_install.sh 
Step 2
./02_start.sh 
Step 3
./04_smoke_test.sh 
📊 Expected Output
Logs stored in ClickHouse
NATS streaming active
Backend processing logs
No errors in smoke test
🚀 What’s Missing (next upgrade)

To make it SOC-grade :

Detection engine (rules)
Alerting system
Dashboard (use Grafana )
Correlation logic (multi-event attack detection)
