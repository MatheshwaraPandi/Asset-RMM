# Alternative Deployment Methods for Asset-RMM

## Method 1: Manual Docker Deployment (Simplest)

### Step 1: Clone Repository
```bash
cd /opt
git clone --branch Feat-Emp-Asset-Tracking-04.05.26 https://github.com/MatheshwaraPandi/Asset-RMM.git
cd Asset-RMM
```

### Step 2: Configure Environment
```bash
# Backend environment
cat > backend/.env <<EOF
DATABASE_URL=postgresql+psycopg2://your_user:your_password@your_postgres_host:5432/your_database
SECRET_KEY=$(openssl rand -base64 32)
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
OTP_EXPIRE_SECONDS=600
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_admin_password
HR_USERNAME=hradmin
HR_PASSWORD=your_secure_hr_password
CORS_ORIGINS=https://asset-mgmt.sgtstaging.com
NEXTAUTH_URL=https://asset-mgmt.sgtstaging.com
NEXT_PUBLIC_APP_URL=https://asset-mgmt.sgtstaging.com
EOF

# Frontend environment
cat > frontend/.env.local <<EOF
BACKEND_API_URL=https://asset-mgmt.sgtstaging.com
NEXT_PUBLIC_BACKEND_API_URL=https://asset-mgmt.sgtstaging.com
NEXT_PUBLIC_APP_URL=https://asset-mgmt.sgtstaging.com
NEXTAUTH_URL=https://asset-mgmt.sgtstaging.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_ORG_NAME=SvaaN Global Tech
NEXT_PUBLIC_ORG_SHORT_NAME=SGT
NEXT_PUBLIC_ORG_SUBTITLE=Unified asset operations, repair tracking, and HR visibility
NEXT_PUBLIC_ORG_LOGO_URL=/svaan-logo.png
EOF
```

### Step 3: Build and Run Manually
```bash
# Build backend
cd backend
docker build -t asset-rmm-backend .

# Build frontend
cd ../frontend
docker build -t asset-rmm-frontend .

# Run containers
docker run -d --name asset-rmm-backend -p 8000:8000 --env-file ../backend/.env asset-rmm-backend
docker run -d --name asset-rmm-frontend -p 80:3000 --env-file ../frontend/.env.local asset-rmm-frontend
```

---

## Method 2: Docker Compose with External PostgreSQL

If you have PostgreSQL running separately:

### Step 1: Create docker-compose.override.yml
```yaml
version: "3.9"

services:
  postgres:
    # Remove this service - using external PostgreSQL

  backend:
    environment:
      DATABASE_URL: postgresql+psycopg2://your_user:your_password@your_postgres_host:5432/your_database
    depends_on: []  # Remove postgres dependency

  frontend:
    # No changes needed
```

### Step 2: Deploy
```bash
cd /opt/Asset-RMM
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d --build
```

---

## Method 3: Traditional Server Deployment (No Docker)

### Prerequisites
```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.12+
sudo apt-get install -y python3.12 python3.12-venv python3-pip

# Install PostgreSQL client (if needed)
sudo apt-get install -y postgresql-client
```

### Step 1: Clone and Setup
```bash
cd /opt
git clone --branch Feat-Emp-Asset-Tracking-04.05.26 https://github.com/MatheshwaraPandi/Asset-RMM.git
cd Asset-RMM
```

### Step 2: Setup Backend
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r app/requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
```

### Step 3: Setup Frontend
```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment
# Edit .env.local with your settings

# Build for production
npm run build

# Run frontend
npm start &
```

### Step 4: Setup Nginx Reverse Proxy
```bash
sudo apt-get install -y nginx

# Create nginx config
sudo tee /etc/nginx/sites-available/asset-rmm <<EOF
server {
    listen 80;
    server_name asset-mgmt.sgtstaging.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/asset-rmm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Method 4: PM2 Process Manager (Production Ready)

### Install PM2
```bash
sudo npm install -g pm2
```

### Backend PM2 Config
```bash
cd /opt/Asset-RMM/backend

# Create ecosystem file
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'asset-rmm-backend',
    script: 'venv/bin/uvicorn',
    args: 'app.main:app --host 0.0.0.0 --port 8000',
    cwd: '/opt/Asset-RMM/backend',
    env: {
      DATABASE_URL: 'postgresql+psycopg2://your_user:your_password@your_postgres_host:5432/your_database',
      SECRET_KEY: 'your-secret-key',
      // ... other env vars
    }
  }]
};
EOF

# Start backend
pm2 start ecosystem.config.js
```

### Frontend PM2 Config
```bash
cd /opt/Asset-RMM/frontend

# Create ecosystem file
cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [{
    name: 'asset-rmm-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/opt/Asset-RMM/frontend',
    env: {
      NODE_ENV: 'production',
      BACKEND_API_URL: 'https://asset-mgmt.sgtstaging.com',
      // ... other env vars
    }
  }]
};
EOF

# Start frontend
pm2 start ecosystem.config.js
```

### PM2 Management
```bash
pm2 list                    # List processes
pm2 logs                    # View logs
pm2 restart asset-rmm-backend  # Restart backend
pm2 restart asset-rmm-frontend # Restart frontend
pm2 save                    # Save process list
pm2 startup                 # Enable auto-start on boot
```

---

## Method 5: Systemd Services (Linux Init)

### Backend Service
```bash
sudo tee /etc/systemd/system/asset-rmm-backend.service <<EOF
[Unit]
Description=Asset-RMM Backend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/Asset-RMM/backend
Environment=DATABASE_URL=postgresql+psycopg2://your_user:your_password@your_postgres_host:5432/your_database
Environment=SECRET_KEY=your-secret-key
ExecStart=/opt/Asset-RMM/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### Frontend Service
```bash
sudo tee /etc/systemd/system/asset-rmm-frontend.service <<EOF
[Unit]
Description=Asset-RMM Frontend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/Asset-RMM/frontend
Environment=NODE_ENV=production
Environment=BACKEND_API_URL=https://asset-mgmt.sgtstaging.com
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

### Enable and Start Services
```bash
sudo systemctl daemon-reload
sudo systemctl enable asset-rmm-backend
sudo systemctl enable asset-rmm-frontend
sudo systemctl start asset-rmm-backend
sudo systemctl start asset-rmm-frontend
```

### Service Management
```bash
sudo systemctl status asset-rmm-backend
sudo systemctl restart asset-rmm-backend
sudo journalctl -u asset-rmm-backend -f  # View logs
```

---

## Method 6: Cloud Deployment (AWS/GCP/Azure)

### AWS EC2 + RDS
```bash
# 1. Launch EC2 instance
# 2. Setup PostgreSQL RDS
# 3. Use Method 1 or 3 above
# 4. Configure security groups
# 5. Setup domain with Route 53
```

### Docker + Cloud Run (GCP)
```bash
# Build and push to GCR
docker build -t gcr.io/your-project/asset-rmm-backend ./backend
docker build -t gcr.io/your-project/asset-rmm-frontend ./frontend
docker push gcr.io/your-project/asset-rmm-backend
docker push gcr.io/your-project/asset-rmm-frontend

# Deploy to Cloud Run
gcloud run deploy asset-rmm-backend --image gcr.io/your-project/asset-rmm-backend --platform managed
gcloud run deploy asset-rmm-frontend --image gcr.io/your-project/asset-rmm-frontend --platform managed
```

---

## Troubleshooting Common Issues

### 1. Port Already in Use
```bash
# Find process using port
sudo lsof -i :80
sudo lsof -i :8000

# Kill process
sudo kill -9 <PID>
```

### 2. Permission Issues
```bash
# Fix permissions
sudo chown -R www-data:www-data /opt/Asset-RMM
sudo chmod -R 755 /opt/Asset-RMM
```

### 3. Database Connection Issues
```bash
# Test connection
psql "postgresql://your_user:your_password@your_postgres_host:5432/your_database" -c "SELECT 1;"

# Check firewall
sudo ufw allow 5432
```

### 4. Memory Issues
```bash
# Check memory usage
free -h
docker stats

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 5. SSL Certificate Issues
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d asset-mgmt.sgtstaging.com
```

---

## Which Method Should You Choose?

- **For Development**: Method 1 (Manual Docker)
- **For Small Production**: Method 3 (Traditional) or Method 4 (PM2)
- **For Enterprise**: Method 5 (Systemd) or Cloud deployment
- **If Docker Issues**: Method 3 (Traditional deployment)

Let me know which method you'd like to try and what specific issues you're encountering!