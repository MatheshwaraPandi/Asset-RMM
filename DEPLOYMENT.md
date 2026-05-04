# Asset-RMM Deployment Guide

This guide explains how to deploy the Asset-RMM application on your server using Docker Compose.

## Prerequisites

Before deploying, ensure your server has:

- **OS**: Ubuntu 20.04 LTS or later (or any Linux distribution)
- **Docker**: 20.10+ ([Install Docker](https://docs.docker.com/engine/install/))
- **Docker Compose**: 2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- **Git**: Latest version ([Install Git](https://git-scm.com/))
- **curl**: For health checks
- **sudo** access: Required to run the deployment script
- **Minimum Resources**:
  - 2 CPU cores
  - 4 GB RAM
  - 20 GB disk space

## Quick Start (Automated Deployment)

### Step 1: Download the Deployment Script

```bash
wget https://raw.githubusercontent.com/MatheshwaraPandi/Asset-RMM/Feat-Emp-Asset-Tracking-04.05.26/deploy.sh
chmod +x deploy.sh
```

### Step 2: Run the Deployment Script

```bash
sudo bash deploy.sh
```

The script will:
- Clone the repository
- Set up environment files
- Generate secure secrets
- Build Docker images
- Start all containers
- Wait for services to be ready
- Display deployment information

### Step 3: Configure Environment Variables (Manual)

After deployment, update sensitive information:

```bash
cd /opt/asset-rmm

# Edit backend environment
sudo nano backend/.env

# Edit frontend environment
sudo nano frontend/.env.local
```

Update the following in `backend/.env`:
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: Generate a new random secret
- `ADMIN_PASSWORD`: Change from default
- `HR_PASSWORD`: Change from default
- `SMTP_*`: Configure email settings

Update the following in `frontend/.env.local`:
- `NEXTAUTH_SECRET`: Generate a new random secret

---

## Manual Deployment Steps

If you prefer to deploy manually, follow these steps:

### Step 1: Clone the Repository

```bash
sudo mkdir -p /opt/asset-rmm
cd /opt/asset-rmm
sudo git clone --branch Feat-Emp-Asset-Tracking-04.05.26 https://github.com/MatheshwaraPandi/Asset-RMM.git .
```

### Step 2: Set Up Environment Files

Create `backend/.env`:

```bash
sudo cat > backend/.env <<'EOF'
DATABASE_URL=postgresql+psycopg2://asset_rmm_user:change_me_secure@postgres:5432/asset_rmm
SECRET_KEY=generate-a-random-secret-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
OTP_EXPIRE_SECONDS=600
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
HR_USERNAME=hradmin
HR_PASSWORD=hr123
CORS_ORIGINS=https://asset-mgmt.sgtstaging.com
NEXTAUTH_URL=https://asset-mgmt.sgtstaging.com
NEXT_PUBLIC_APP_URL=https://asset-mgmt.sgtstaging.com
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USERNAME=your-org-email@yourcompany.com
SMTP_PASSWORD=replace-with-your-password-or-app-password
SMTP_FROM_EMAIL=your-org-email@yourcompany.com
SMTP_USE_TLS=true
OTP_EMAIL_SUBJECT=Your RMM Lite login code
EOF
```

Create `frontend/.env.local`:

```bash
sudo cat > frontend/.env.local <<'EOF'
BACKEND_API_URL=https://asset-mgmt.sgtstaging.com
NEXT_PUBLIC_BACKEND_API_URL=https://asset-mgmt.sgtstaging.com
NEXT_PUBLIC_APP_URL=https://asset-mgmt.sgtstaging.com
NEXTAUTH_URL=https://asset-mgmt.sgtstaging.com
NEXTAUTH_SECRET=generate-a-random-secret-here
NEXT_PUBLIC_ORG_NAME=SvaaN Global Tech
NEXT_PUBLIC_ORG_SHORT_NAME=SGT
NEXT_PUBLIC_ORG_SUBTITLE=Unified asset operations, repair tracking, and HR visibility
NEXT_PUBLIC_ORG_LOGO_URL=/svaan-logo.png
EOF
```

### Step 3: Start Docker Containers

```bash
cd /opt/asset-rmm
sudo docker-compose up -d --build
```

### Step 4: Verify Containers are Running

```bash
sudo docker-compose ps
```

Expected output:
```
NAME              STATUS              PORTS
asset_rmm_postgres     Up 2 minutes        5432/tcp
asset_rmm_backend      Up 1 minute         0.0.0.0:8000->8000/tcp
asset_rmm_frontend     Up 1 minute         0.0.0.0:80->3000/tcp
```

---

## Reverse Proxy Setup (Nginx)

To expose your application at `https://asset-mgmt.sgtstaging.com`, set up a reverse proxy:

### Install Nginx

```bash
sudo apt-get update
sudo apt-get install nginx certbot python3-certbot-nginx -y
```

### Create Nginx Configuration

```bash
sudo tee /etc/nginx/sites-available/asset-rmm <<'EOF'
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:80;
}

server {
    listen 80;
    server_name asset-mgmt.sgtstaging.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name asset-mgmt.sgtstaging.com;
    
    # SSL Certificate paths (update after running certbot)
    ssl_certificate /etc/letsencrypt/live/asset-mgmt.sgtstaging.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/asset-mgmt.sgtstaging.com/privkey.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://backend/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Backend docs
    location /docs {
        proxy_pass http://backend/docs;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
    
    location /openapi.json {
        proxy_pass http://backend/openapi.json;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF
```

### Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/asset-rmm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Get SSL Certificate

```bash
sudo certbot certonly --standalone -d asset-mgmt.sgtstaging.com
```

Then update the Nginx config with the certificate paths and reload:

```bash
sudo systemctl reload nginx
```

---

## Post-Deployment

### Access the Application

- Frontend: `https://asset-mgmt.sgtstaging.com`
- API Docs: `https://asset-mgmt.sgtstaging.com/docs`
- Backend: `https://asset-mgmt.sgtstaging.com/api/`

### Default Credentials

- **Admin Username**: `admin`
- **Admin Password**: `admin123`
- **HR Username**: `hradmin`
- **HR Password**: `hr123`

⚠️ **Change these immediately in production!**

### Database Access

```bash
# Access PostgreSQL container
docker exec -it asset_rmm_postgres psql -U asset_rmm_user -d asset_rmm

# Useful commands
\dt          # List tables
\du          # List users
SELECT * FROM admins;  # View admin users
```

---

## Useful Commands

### View Logs

```bash
cd /opt/asset-rmm

# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Stop Containers

```bash
cd /opt/asset-rmm
docker-compose down
```

### Start Containers

```bash
cd /opt/asset-rmm
docker-compose up -d
```

### Restart Services

```bash
cd /opt/asset-rmm
docker-compose restart

# Specific service
docker-compose restart backend
```

### Update and Redeploy

```bash
cd /opt/asset-rmm
git pull origin Feat-Emp-Asset-Tracking-04.05.26
docker-compose up -d --build
```

### Backup Database

```bash
cd /opt/asset-rmm
docker-compose exec -T postgres pg_dump -U asset_rmm_user asset_rmm > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database

```bash
cd /opt/asset-rmm
docker-compose exec -T postgres psql -U asset_rmm_user asset_rmm < backup_YYYYMMDD_HHMMSS.sql
```

---

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose logs

# Rebuild images
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### PostgreSQL connection error

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check credentials in backend/.env
cat backend/.env | grep DATABASE_URL
```

### Frontend can't connect to backend

```bash
# Verify backend is running
curl http://localhost:8000/docs

# Check frontend env
cat frontend/.env.local | grep BACKEND_API_URL
```

### Port already in use

```bash
# Find what's using the port
sudo lsof -i :80
sudo lsof -i :8000
sudo lsof -i :5432

# Either kill the process or change ports in docker-compose.yml
```

---

## Security Best Practices

1. **Change Default Credentials**: Update all default passwords
2. **Secure Secrets**: Generate strong random secrets for `SECRET_KEY` and `NEXTAUTH_SECRET`
3. **Use HTTPS**: Always use SSL/TLS certificates
4. **Database Password**: Change the default PostgreSQL password
5. **Firewall**: Restrict access to ports 5432 (PostgreSQL) and 8000 (Backend API)
6. **Regular Backups**: Set up automated database backups
7. **Keep Updated**: Regularly pull and rebuild to get security updates

---

## Support

For issues or questions, refer to the [GitHub repository](https://github.com/MatheshwaraPandi/Asset-RMM).
