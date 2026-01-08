# 🚀 PhonicsLearn Production Setup Guide

## Complete Implementation Summary

You now have a **production-ready** commercial phonics learning platform with:

✅ **PostgreSQL Database** - Persistent storage for users, licenses, payments, analytics  
✅ **Stripe Payments** - Subscription billing & one-time payments  
✅ **SendGrid Emails** - Automated license delivery & reminders  
✅ **Admin Dashboard** - License management & analytics  
✅ **Usage Tracking** - Student activity & progress monitoring  
✅ **License System** - Trial, Parent, Teacher, School tiers  

---

## 📋 Prerequisites

### 1. Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows
# Download from: https://www.postgresql.org/download/windows/
```

### 2. Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

---

## 🗄️ Database Setup

### Option 1: Local PostgreSQL
```bash
# Start PostgreSQL service
sudo service postgresql start  # Linux
brew services start postgresql # macOS

# Run setup script
psql -U postgres -f setup_db.sql

# Or manually:
psql -U postgres
CREATE DATABASE phonicslearn;
CREATE USER phonicslearn WITH PASSWORD 'phonicslearn123';
GRANT ALL PRIVILEGES ON DATABASE phonicslearn TO phonicslearn;
```

### Option 2: Docker (Recommended)
```bash
# Start PostgreSQL in Docker
docker run --name phonicslearn_db \
  -e POSTGRES_DB=phonicslearn \
  -e POSTGRES_USER=phonicslearn \
  -e POSTGRES_PASSWORD=phonicslearn123 \
  -p 5432:5432 \
  -d postgres:15-alpine

# Or use docker-compose
docker-compose up -d postgres
```

### Verify Connection
```bash
psql postgresql://phonicslearn:phonicslearn123@localhost:5432/phonicslearn
```

---

## 💳 Stripe Setup

### 1. Create Stripe Account
- Visit: https://dashboard.stripe.com/register
- Complete verification

### 2. Get API Keys
```
Dashboard → Developers → API keys
- Copy "Secret key" (starts with sk_test_)
- Copy "Webhook signing secret" (after setting up webhook)
```

### 3. Create Products & Prices
```
Dashboard → Products → Add Product

Create 4 products:
1. Parent Plan - Monthly ($9.99/month)
2. Parent Plan - Yearly ($99.99/year)
3. Teacher Plan - Monthly ($29.99/month)
4. Teacher Plan - Yearly ($299.99/year)

Copy the Price IDs (start with price_)
```

### 4. Setup Webhook
```
Dashboard → Developers → Webhooks → Add endpoint

URL: https://your-domain.com/payment/webhook
Events to listen:
- checkout.session.completed
- customer.subscription.deleted
- invoice.payment_failed

Copy webhook signing secret (starts with whsec_)
```

### 5. Update Environment Variables
```bash
# backend/.env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PARENT_MONTHLY=price_...
STRIPE_PRICE_PARENT_YEARLY=price_...
STRIPE_PRICE_TEACHER_MONTHLY=price_...
STRIPE_PRICE_TEACHER_YEARLY=price_...
```

---

## 📧 SendGrid Setup

### 1. Create SendGrid Account
- Visit: https://signup.sendgrid.com/
- Verify email & complete setup

### 2. Create API Key
```
Settings → API Keys → Create API Key
Name: PhonicsLearn
Permissions: Full Access
Copy the key (starts with SG.)
```

### 3. Verify Sender Email
```
Settings → Sender Authentication → Single Sender Verification
Add: noreply@phonicslearn.com (or your domain)
Verify email address
```

### 4. Create Email Templates (Optional)
```
Email API → Dynamic Templates → Create Template

Create templates for:
- Welcome email
- License key delivery
- Trial reminder
- Expiration notice
- Payment success

Copy template IDs (start with d-)
```

### 5. Update Environment Variables
```bash
# backend/.env
SENDGRID_API_KEY=SG....
SENDER_EMAIL=noreply@phonicslearn.com
SENDER_NAME=PhonicsLearn
```

---

## 🚀 Launch Application

### 1. Configure Environment
```bash
cd backend
cp .env.example .env
# Edit .env with your actual keys
```

### 2. Initialize Database
```bash
# Tables are auto-created on first run
python -m uvicorn app.main:app --reload
# Check logs for "✓ Database tables created"
```

### 3. Start Backend
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Start Frontend
```bash
# In project root
python -m http.server 3000
```

### 5. Access Application
- **Marketing Site**: http://localhost:3000/landing.html
- **License Activation**: http://localhost:3000/license-activation.html
- **Main App**: http://localhost:3000/index.html
- **Admin Dashboard**: http://localhost:3000/admin-dashboard.html
- **API Docs**: http://localhost:8000/docs

---

## 🔑 API Endpoints Reference

### Payment Endpoints
```http
POST /payment/create-checkout
Body: { email, plan_type, success_url, cancel_url }
→ Returns Stripe checkout URL

POST /payment/verify
Body: { session_id }
→ Verifies payment & creates license

POST /payment/webhook
→ Handles Stripe webhooks (subscription events)
```

### License Endpoints
```http
POST /license/create
Body: { email, license_type, duration_days }
→ Create new license

POST /license/validate
Body: { license_key }
→ Validate license

GET /license/info/{license_key}
→ Get license details

GET /license/trial?email=user@example.com
→ Quick trial signup
```

### Tracking Endpoints
```http
POST /tracking/activity
Body: { student_id, lesson_id, activity_type, score }
→ Log student activity

POST /tracking/progress
Body: { student_id, lesson_id, phoneme, correct }
→ Update progress

GET /tracking/student/{id}/summary
→ Get student summary

GET /tracking/analytics/overview
→ Platform-wide analytics
```

---

## 📊 Testing the System

### 1. Test Free Trial
```bash
# Visit license activation page
http://localhost:3000/license-activation.html

# Click "Start Free Trial"
# Enter email: test@example.com
# Should create license and redirect to app
```

### 2. Test Payment Flow
```bash
# Visit landing page
http://localhost:3000/landing.html

# Click "View Pricing" → Select plan
# Use Stripe test card: 4242 4242 4242 4242
# Any future expiry date
# Any 3-digit CVC

# Should redirect to success page with license key
```

### 3. Test Email Delivery
```bash
# Check SendGrid Activity Feed
# https://app.sendgrid.com/email_activity

# Should see emails sent for:
# - Trial signups
# - Payment confirmations
# - License key delivery
```

### 4. Test Database
```bash
# Connect to database
psql postgresql://phonicslearn:phonicslearn123@localhost:5432/phonicslearn

# Check tables
\dt

# View users
SELECT * FROM users;

# View licenses
SELECT * FROM licenses;

# View payments
SELECT * FROM payments;
```

---

## 🔒 Security Checklist

- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS in production
- [ ] Set up CORS properly for your domain
- [ ] Use strong database passwords
- [ ] Enable Stripe webhook signature verification
- [ ] Rate limit API endpoints
- [ ] Sanitize user inputs
- [ ] Set up database backups
- [ ] Monitor API usage
- [ ] Enable logging & error tracking

---

## 📈 Production Deployment

### 1. Database (Recommended: Supabase, Heroku Postgres, AWS RDS)
```bash
# Update DATABASE_URL in .env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### 2. Backend (Recommended: Heroku, Railway, AWS)
```bash
# Deploy to Heroku
heroku create phonicslearn-api
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main

# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set SENDGRID_API_KEY=SG...
```

### 3. Frontend (Recommended: Vercel, Netlify, Cloudflare Pages)
```bash
# Deploy to Vercel
vercel deploy

# Or Netlify
netlify deploy --prod
```

### 4. Domain Setup
```bash
# Point your domain to:
# - Frontend: Vercel/Netlify URL
# - Backend API: Heroku/Railway URL

# Update URLs in frontend code:
# - API_URL = "https://api.phonicslearn.com"
# - Landing page links
# - Email templates
```

---

## 🛠️ Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Test connection
psql postgresql://phonicslearn:phonicslearn123@localhost:5432/phonicslearn

# Check logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Stripe Webhook Not Working
```bash
# Use Stripe CLI for local testing
stripe listen --forward-to localhost:8000/payment/webhook

# Check webhook logs in Stripe Dashboard
# Verify webhook signature in .env
```

### Email Not Sending
```bash
# Check SendGrid API key is valid
# Verify sender email is authenticated
# Check SendGrid Activity Feed for errors
# Ensure API key has "Mail Send" permission
```

### License Not Activating
```bash
# Check backend logs
# Verify license key exists in database
# Check license expiration date
# Test API endpoint directly:
curl -X POST http://localhost:8000/license/validate \
  -H "Content-Type: application/json" \
  -d '{"license_key": "YOUR_KEY"}'
```

---

## 📞 Support & Resources

- **Stripe Documentation**: https://stripe.com/docs/api
- **SendGrid Documentation**: https://docs.sendgrid.com/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/

---

## 🎉 You're Ready!

Your PhonicsLearn platform is now fully equipped with:
- ✅ Commercial payment processing
- ✅ Automated email marketing
- ✅ Production database
- ✅ Admin analytics
- ✅ Usage tracking

**Next Steps:**
1. Set up production accounts (Stripe, SendGrid, Database)
2. Deploy to cloud hosting
3. Configure custom domain
4. Launch marketing campaign
5. Start collecting payments! 💰
