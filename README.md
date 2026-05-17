# EduSIM (Spring Boot + Angular + MySQL)

EduSIM is a role-based LMS demo with:

- Student flow: login, dashboard, course learning, video completion, quiz, result, attempt history
- Lecturer flow: dashboard, course/video/material management, question bank, quiz creation/publish, student result monitoring
- Core rule: quiz can be locked until mandatory videos are completed

## Tech Stack

- Backend: Spring Boot 3, Spring Security (JWT), Spring Data JPA
- Frontend: Angular 18 (standalone components)
- Database: MySQL 8

## Project Structure

- `backend` - Spring Boot REST API
- `frontend` - Angular web app
- `database/mysql-setup.sql` - MySQL bootstrap script

## Demo Accounts

- Student: `student@edusim.com` / `password123`
- Lecturer: `lecturer@edusim.com` / `password123`

Seed data is created automatically on first backend run.

## Run Instructions

1. Start MySQL.
   Optional with Docker:

```bash
docker compose up -d mysql
```

2. Run setup SQL from `database/mysql-setup.sql`.
3. Start backend:

```bash
cd backend
mvn spring-boot:run
```

4. Start frontend:

```bash
cd frontend
npm install
npm start
```

5. Open `http://localhost:4200`.

## Default Backend DB Config

Configured in `backend/src/main/resources/application.yml`:

- DB URL: `jdbc:mysql://127.0.0.1:${EDUSIM_DB_PORT:3307}/edusim`
- Username: `${EDUSIM_DB_USER:edusim}`
- Password: `${EDUSIM_DB_PASSWORD:1234}`

## Production Deployment (DigitalOcean Droplet + Docker)

This repo now includes production container setup files:

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx/default.conf` (serves Angular and proxies `/api` to backend)
- `docker-compose.prod.yml`
- `.env.production.example`

### 1. Prepare Droplet

Use Ubuntu 22.04/24.04 and SSH into it:

```bash
ssh root@<DROPLET_PUBLIC_IP>
```

Install Docker and Docker Compose plugin:

```bash
apt update
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 2. Clone Project on Droplet

```bash
git clone https://github.com/wnzimah/update_EduSIM.git
cd update_EduSIM
```

### 3. Create Production Env File

```bash
cp .env.production.example .env
```

Edit `.env` and change all secrets/passwords before first run.

### 4. Start Production Stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

### 5. Access Live App

Open:

- `http://<DROPLET_PUBLIC_IP>`

If port `80` is blocked, allow it in firewall/security group first.

### 6. Update Deployment

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```
