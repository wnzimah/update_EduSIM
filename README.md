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

## Local Run Instructions

1. Start Docker Desktop, then start the local MySQL container:

```bash
docker compose up -d mysql
```

2. Confirm MySQL is running:

```bash
docker ps
```

You should see `edusim-mysql` with port `3306`.

3. Start backend:

```bash
cd backend
mvn spring-boot:run
```

4. Start frontend in another terminal:

```bash
cd frontend
npm install
npm start
```

5. Open `http://localhost:4200`.

If you use a local Windows MySQL service instead of Docker, make sure it is running on port `3306` and set the matching credentials with environment variables such as `EDUSIM_DB_USER` and `EDUSIM_DB_PASSWORD`.

## Default Backend DB Config

Configured in `backend/src/main/resources/application.yml`:

- DB host: `${EDUSIM_DB_HOST:localhost}`
- DB port: `${EDUSIM_DB_PORT:3306}`
- DB name: `${EDUSIM_DB_NAME:edusim}`
- Username: `${EDUSIM_DB_USER:root}`
- Password: `${EDUSIM_DB_PASSWORD:root}`

The JDBC URL includes `allowPublicKeyRetrieval=true` for MySQL 8 Docker authentication.

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

Production `docker-compose.prod.yml` passes `SPRING_DATASOURCE_URL` directly to the backend, so the backend connects to the internal MySQL container at `mysql:3306` with `allowPublicKeyRetrieval=true`.

### 5. Access Live App

Open:

- `http://<DROPLET_PUBLIC_IP>`

If port `80` is blocked, allow it in firewall/security group first.

### 6. Update Deployment

```bash
git pull
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```
