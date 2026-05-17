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

- DB URL: `jdbc:mysql://localhost:3306/edusim`
- Username: `root`
- Password: `root`

Change these values if your local MySQL uses different credentials.
