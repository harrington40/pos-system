# PhonicsLearn API Testing Guide

This file contains curl commands to test all API endpoints.

## Setup
```bash
export API_URL="http://localhost:8000"
```

---

## 🔑 License Endpoints

### 1. Start Free Trial
```bash
curl -X GET "$API_URL/license/trial?email=test@example.com"
```

Expected Response:
```json
{
  "success": true,
  "license_key": "ABC123...",
  "message": "14-day free trial activated!"
}
```

### 2. Validate License
```bash
curl -X POST "$API_URL/license/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "YOUR_LICENSE_KEY"
  }'
```

### 3. Get License Info
```bash
curl -X GET "$API_URL/license/info/YOUR_LICENSE_KEY"
```

### 4. Create License
```bash
curl -X POST "$API_URL/license/create" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "license_type": "parent",
    "duration_days": 30
  }'
```

### 5. Upgrade License
```bash
curl -X POST "$API_URL/license/upgrade" \
  -H "Content-Type: application/json" \
  -d '{
    "license_key": "YOUR_LICENSE_KEY",
    "new_type": "teacher",
    "duration_days": 30
  }'
```

---

## 💳 Payment Endpoints

### 1. Create Checkout Session
```bash
curl -X POST "$API_URL/payment/create-checkout" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "plan_type": "parent_monthly",
    "success_url": "http://localhost:3000/payment-success.html",
    "cancel_url": "http://localhost:3000/landing.html"
  }'
```

Expected Response:
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_test_..."
}
```

### 2. Verify Payment
```bash
curl -X POST "$API_URL/payment/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "cs_test_..."
  }'
```

### 3. Cancel Subscription
```bash
curl -X POST "$API_URL/payment/cancel-subscription?subscription_id=sub_..." \
  -H "Content-Type: application/json"
```

---

## 📊 Tracking Endpoints

### 1. Log Activity
```bash
curl -X POST "$API_URL/tracking/activity" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "lesson_id": "lesson_a",
    "activity_type": "lesson_complete",
    "score": 95.5,
    "duration_seconds": 180
  }'
```

### 2. Update Progress
```bash
curl -X POST "$API_URL/tracking/progress" \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "lesson_id": "lesson_a",
    "phoneme": "a",
    "correct": true
  }'
```

### 3. Get Student Summary
```bash
curl -X GET "$API_URL/tracking/student/1/summary"
```

### 4. Get Student Progress
```bash
curl -X GET "$API_URL/tracking/student/1/progress?limit=20"
```

### 5. Get License Usage
```bash
curl -X GET "$API_URL/tracking/license/YOUR_LICENSE_KEY/usage?days=30"
```

### 6. Get Analytics Overview
```bash
curl -X GET "$API_URL/tracking/analytics/overview"
```

---

## 📚 Lesson Endpoints

### 1. Get Random Lesson
```bash
curl -X GET "$API_URL/lessons/random"
```

### 2. Get Specific Lesson
```bash
curl -X GET "$API_URL/lessons/lesson_a"
```

### 3. Submit Answer
```bash
curl -X POST "$API_URL/learning/submit-answer" \
  -H "Content-Type: application/json" \
  -d '{
    "lesson_id": "lesson_a",
    "student_answer": "a",
    "is_correct": true,
    "time_taken": 5
  }'
```

---

## 🧪 Complete Test Flow

### Step 1: Create Free Trial
```bash
RESPONSE=$(curl -s -X GET "$API_URL/license/trial?email=demo@phonicslearn.com")
echo $RESPONSE
LICENSE_KEY=$(echo $RESPONSE | grep -o '"license_key":"[^"]*' | cut -d'"' -f4)
echo "License Key: $LICENSE_KEY"
```

### Step 2: Validate License
```bash
curl -X POST "$API_URL/license/validate" \
  -H "Content-Type: application/json" \
  -d "{\"license_key\": \"$LICENSE_KEY\"}"
```

### Step 3: Get a Lesson
```bash
curl -X GET "$API_URL/lessons/random"
```

### Step 4: Log Usage
```bash
curl -X POST "$API_URL/tracking/usage" \
  -H "Content-Type: application/json" \
  -d "{
    \"license_key\": \"$LICENSE_KEY\",
    \"action\": \"lesson_accessed\",
    \"details\": {\"lesson_id\": \"lesson_a\"}
  }"
```

### Step 5: Check Analytics
```bash
curl -X GET "$API_URL/tracking/analytics/overview"
```

---

## 🔍 Database Verification

After testing, verify data in PostgreSQL:

```sql
-- Check users
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;

-- Check licenses
SELECT license_key, license_type, is_active, end_date 
FROM licenses ORDER BY created_at DESC LIMIT 5;

-- Check usage logs
SELECT * FROM usage_logs ORDER BY created_at DESC LIMIT 10;

-- Check activity logs
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;

-- Check payments
SELECT user_id, amount, payment_status, license_type
FROM payments ORDER BY created_at DESC;

-- Analytics queries
SELECT 
    COUNT(DISTINCT user_id) as total_users,
    COUNT(DISTINCT CASE WHEN is_active = true THEN id END) as active_licenses,
    AVG(EXTRACT(EPOCH FROM (end_date - start_date))/86400) as avg_license_days
FROM licenses;
```

---

## 📧 Email Testing

After triggering events, check SendGrid:
- Dashboard: https://app.sendgrid.com/email_activity
- Filter by recipient email
- View delivery status & opens

---

## 💡 Tips

1. **Save License Keys**: Store generated keys for testing
2. **Use Stripe Test Mode**: Never use real cards in development
3. **Monitor Logs**: Check backend console for errors
4. **Test Webhooks**: Use Stripe CLI for local webhook testing
5. **Check Database**: Verify data is persisted correctly

---

## 🚨 Common Issues

### Issue: "License not found"
**Solution**: Ensure license was created successfully. Check database:
```sql
SELECT * FROM licenses WHERE license_key = 'YOUR_KEY';
```

### Issue: "Database connection failed"
**Solution**: Verify PostgreSQL is running and credentials are correct in .env

### Issue: "Stripe error"
**Solution**: Check Stripe API key in .env. Verify it's test key (starts with sk_test_)

### Issue: "Email not sending"
**Solution**: Verify SendGrid API key and sender email is verified

---

## 📖 API Documentation

Full interactive API docs available at:
http://localhost:8000/docs

Alternative Redoc format:
http://localhost:8000/redoc
