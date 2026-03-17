# 🛡️ MSAJCE Grievance Bot - Command & Workflow Blueprint

## 🤖 Bot Overview
The MSAJCE Grievance Bot is a professional, human-centric automated assistant designed to handle college-wide complaints, emergency alerts, and student/staff inquiries with high semantic precision and administrative accountability.

---

## 🎮 CORE COMMANDS

### `/start`
**Primary Entry Point**
- **Unverified Users**: Automatically funneled into the **Profile Registration Workflow**.
- **Verified Users**: Welcomes the user by name (e.g., "Hello, Mr. Ram!") and displays the **Main Dashboard**.

### `/register` or `📝 Register Complaint`
**Formal Grievance Submission**
- **Flow**: Privacy Selection → Category Selection → Description → Evidence Upload → Submission.
- **Privacy Mode**: Users can choose **Anonymous** (details hidden from admins) or **Visible**.

### `🚨 Emergency Complaint`
**High-Priority Alert System**
- Triggers immediate notifications to the Principal, Security, and Administrative heads.
- Collects: Incident Type, Precise Location, and Brief Description.

### `/track` or `🔍 Track Complaint`
**Ticket Monitoring**
- Allows users to check live status (Submitted, Under Review, Resolved) using their **GRV-ID**.

### `/profile` or `👤 My Profile`
**Identity Management**
- Displays current academic/staff details and verification status.

### `💡 FAQ & Help`
**Knowledge Retrieval**
- Provides instant answers regarding college timings, contact info, vision, mission, and department details pulled from the verified knowledge base.

---

## 🔄 WORKFLOW LOGIC

### 1. Registration Workflow
1. **Salutation**: User selects "Mr." or "Ms." for personalized interaction.
2. **Role**: Selects "Student" or "Staff".
3. **Identification**: Enter University Register Number or Staff ID.
4. **Name**: Full Name as per college records.
5. **Department**: Dropdown selection of academic departments.
6. **Year/Designation**: Academic year for students; Job role for staff.
7. **Contact**: Interactive Telegram button to share Phone Number securely.

### 2. Complaint Submission Workflow
1. **Trigger**: User clicks "Register Complaint".
2. **Privacy Choice**: "👤 Normal (Visible)" vs "🎭 Anonymous (Hide Identity)".
3. **Category**: Select from 17 specific college departments (Hostel, Transport, Mess, etc.).
4. **Description**: Human assistant asks, "_Certainly [Name], could you describe the issue in detail?_"
5. **Evidence**: Optional photo/document upload.
6. **Routing**: Automated routing to the specific Department Head via glassmorphism-styled email.

### 3. Emergency Signal Workflow
1. **Type**: Medical, Harassment, Theft, Fire.
2. **Location**: Precise campus spot.
3. **Alert**: Sends high-priority email with red-alert styling and emergency phone links.

---

## 🛠️ ADMIN INTEGRATION
- All complaints are stored in **MongoDB** with 3072-dim support.
- Emails are sent using **Nodemailer** with professional responsive templates.
- Media evidence is hosted on **Cloudinary**.
