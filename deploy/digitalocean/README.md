# EduSIM DigitalOcean VPS Deploy

Use an Ubuntu 22.04 or 24.04 Droplet with at least 2 GB RAM.

## 1. Install Docker on the Droplet

```bash
ssh root@YOUR_DROPLET_IP
```

From the project folder on the server:

```bash
bash deploy/digitalocean/bootstrap.sh
```

## 2. Create the production env file

```bash
cp .env.production.example .env
nano .env
```

Change every password and secret before starting the app.

For IP-only deployment:

```text
EDUSIM_ALLOWED_ORIGIN_PATTERNS=http://YOUR_DROPLET_IP
```

For domain deployment:

```text
EDUSIM_ALLOWED_ORIGIN_PATTERNS=https://YOUR_DOMAIN,http://YOUR_DROPLET_IP
```

## 3. Start EduSIM

```bash
bash deploy/digitalocean/deploy.sh
```

Open:

```text
http://YOUR_DROPLET_IP
```

## Useful commands

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs -f backend
docker compose -f docker-compose.prod.yml --env-file .env logs -f frontend
docker compose -f docker-compose.prod.yml --env-file .env restart backend
docker compose -f docker-compose.prod.yml --env-file .env down
```

