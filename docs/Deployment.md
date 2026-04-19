# Deployment Guide

## Recommended Production Split

- Deploy `client/` to Vercel.
- Deploy `server/` as a Docker container on AWS EC2.
- Use MongoDB Atlas for the database instead of running MongoDB on the EC2 instance.
- Use GitHub Actions to build, publish, and deploy the backend container and optionally trigger Vercel deployments.

This split matches the current codebase well:

- The frontend is a static Vite app and works naturally on Vercel.
- The backend is a long-running Express + MongoDB app, which is a better fit for a container host than for a serverless frontend platform.

## Required Environment Variables

### Frontend

Create `client/.env.local` for local development if needed:

```bash
VITE_API_URL=http://localhost:5000/api
```

On Vercel, set:

```bash
VITE_API_URL=https://api.your-domain.com/api
```

If `VITE_API_URL` is not set, the client now defaults to `/api`.

### Backend

Copy `server/.env.example` into your real environment setup and provide:

```bash
PORT=5000
NODE_ENV=production
MONGO_URI=...
JWT_SECRET=...
JWT_EXPIRES_IN=15m
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

## Docker

### Full Stack Local Run

From the repo root:

```bash
docker compose up --build
```

This starts:

- MongoDB on `localhost:27017`
- API on `localhost:5000`
- Web app on `http://localhost:8080`

### What The Docker Setup Does

- `server/Dockerfile` builds the Node API image.
- `client/Dockerfile` builds the Vite app and serves it with Nginx.
- `client/nginx.conf` serves the SPA and proxies `/api` to the backend container.
- `docker-compose.yml` wires MongoDB, API, and web together.

## Vercel Frontend Deployment

### Simplest Option

1. Create a Vercel project that points to the `client` directory as the root directory.
2. Set `VITE_API_URL` in the Vercel project settings.
3. Deploy.

The repo includes `client/vercel.json` to:

- use `dist` as the output directory
- rewrite unknown routes to `index.html` for SPA navigation

### GitHub Actions Option

If you prefer Actions-based Vercel deploys, configure these GitHub secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Then `.github/workflows/deploy-frontend-vercel.yml` can deploy the client.

## EC2 Backend Deployment

### Recommended EC2 Shape

- Ubuntu EC2 instance
- Docker Engine + Docker Compose installed
- Security group allowing `22`, `80`, `443`, and optionally `5000`
- MongoDB Atlas connection string in `MONGO_URI`
- Reverse proxy or load balancer in front of the API for HTTPS

### Files Included

- `deploy/docker-compose.ec2.yml`
- `deploy/ec2.env.example`

The EC2 compose file assumes:

- the backend image is pulled from GHCR
- runtime secrets live on the server in `/opt/equiclass/.env`

## GitHub Actions

### CI

`.github/workflows/ci.yml` does:

- client dependency install
- client production build
- server dependency install
- server JavaScript syntax checks

### Backend Deployment To EC2

`.github/workflows/deploy-backend-ec2.yml` does:

1. Build the API Docker image from `server/`
2. Push it to GitHub Container Registry
3. SSH into EC2
4. Copy the compose file
5. Write `/opt/equiclass/.env`
6. Pull and restart the backend container

Configure these repository secrets:

- `EC2_HOST`
- `EC2_USERNAME`
- `EC2_SSH_PRIVATE_KEY`
- `GHCR_USERNAME`
- `GHCR_PAT`
- `EC2_MONGO_URI`
- `EC2_JWT_SECRET`
- `EC2_JWT_EXPIRES_IN`
- `EC2_CORS_ORIGIN`

## Suggested Rollout Order

1. Deploy the backend first and confirm `https://api.your-domain.com/api/health` works.
2. Set `VITE_API_URL` in Vercel to that API base URL.
3. Deploy the frontend to Vercel.
4. Test login, registration, and one API-backed dashboard flow.
