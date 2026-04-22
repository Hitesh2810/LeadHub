# 🚀 LeadHub CRM – Smart Lead Management System

LeadHub is a full-stack CRM application designed to manage leads, follow-ups, reminders, and business-unit-based workflows using **React, Node.js, and Google Sheets**.

It provides real-time lead tracking, automated email reminders, role-based access, and customizable email templates — all without a traditional database.

---

# 📌 Features

## 🔹 Lead Management

* Add, edit, and delete leads
* Store leads in **Google Sheets (Main + Business Unit sheets)**
* Auto-generate **Business Unit-based Lead IDs**

  * Format: `DAD-<CODE>-YYYYMM-XXX`
  * Example: `DAD-SA-202604-001`
* Fields:

  * Name, Email, Phone, Company
  * Source, Status, Category
  * Assigned To
  * Business Unit (stored as `ProductService`)

---

## 🔹 Business Unit System

Leads are categorized into:

* Risk Management Products & Services → `RM`
* SaaS & Custom Software Development → `SA`
* E-Learning & Professional Training → `EL`
* Dadisha Marketplace (E-Commerce) → `MK`

### Behavior:

* All leads → stored in **Main Sheet**
* Additionally → copied to respective BU sheets:

  * `Risk`, `SaaS`, `Elearning`, `Marketplace`

---

## 🔹 Follow-Up Management

* Schedule follow-ups per lead
* Fields:

  * Follow Up Date
  * Follow Up Assigned To (Email)
  * Follow Up Note
  * Follow Up Status (Pending / Completed)

### UI Sections:

* Overdue
* Due Today
* Upcoming
* Completed

---

## 🔹 Email System

### ✅ Instant Email

* Triggered immediately when follow-up is scheduled
* Sent to **Follow Up Assigned To**

### ⏰ Reminder Emails

* Sent automatically using cron
* Trigger schedule:

  * 2 days before
  * 1 day before
  * Same day
* Time: **9:30 AM**

### ❌ Stop Conditions

* If `Follow Up Status = Completed`
* If already sent for that day

---

## 🔹 Email Templates (Dynamic)

Admin can customize email content in **Settings Page**

### Supported Placeholders:

* `{{name}}`
* `{{company}}`
* `{{date}}`
* `{{AssignedTo}}` → Assigned person name

### Example Template:

```
Hello {{AssignedTo}},

You have a follow-up with {{name}} from {{company}} on {{date}}.
```

### Behavior:

* If template is empty → default content is used
* Fully dynamic replacement system

---

## 🔹 Complete Follow-Up via Email

* Email contains **"Mark as Completed" button**
* On click:

  * Updates Google Sheet → `Follow Up Status = Completed`
  * Stops future reminders
  * Updates frontend automatically

---

## 🔹 Role-Based Access

### Admin:

* View all leads
* Delete leads
* Edit email templates
* Access all business units

### User:

* Restricted to their Business Unit
* Can add/view only their leads
* Cannot delete leads

---

## 🔹 Authentication (Firebase)

* Email/Password authentication
* Secure token-based API calls
* Backend verifies Firebase token

---

## 🔹 Dashboard & Analytics

* Total leads
* Status-based insights
* Follow-up tracking
* Business Unit filtering

---

# 🏗️ Tech Stack

### Frontend

* React.js
* Tailwind CSS
* React Query

### Backend

* Node.js
* Express.js
* Google Sheets API

### Authentication

* Firebase Auth

### Email

* Nodemailer (Gmail)

### Scheduler

* node-cron

---

# ⚡ Key Functional Highlights

✔ Business Unit-based lead tracking
✔ Dynamic Lead ID generation
✔ Google Sheets as database
✔ Automated email reminders
✔ Email-based follow-up completion
✔ Role-based access control
✔ Customizable email templates
✔ Real-time UI updates

---

# 🚀 Future Enhancements

* WhatsApp notifications
* Mobile app support
* Advanced analytics dashboard
* Multi-admin roles
* Notification center

---

# 👨‍💻 Author

**Hitesh Kumar**
CSE Student | Full Stack Developer

---

# 📄 License

This project is for educational and internship purposes.
