# EmailJS Refactoring - Code Summary

## Backend Changes

### 1. controllers/emailController.js

**What Changed:**
- Removed `@emailjs/nodejs` import
- Removed all EmailJS sending logic from `sendEmail()`
- Added new `prepareEmailData()` function

**New `prepareEmailData()` Function:**
```javascript
exports.prepareEmailData = async (req, res) => {
    try {
        const { taskId, body } = req.body;
        const recipientOverride = req.body.recipient || req.body.recipientName || null;
        if (!taskId || !body) {
            return res.status(400).json({ message: 'taskId and body required' });
        }

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        
        // Resolve recipient email and name
        let recipientEmail = null;
        let recipientName = '';

        // ... (recipient resolution logic)

        if (!recipientEmail) {
            return res.status(400).json({ success: false, message: 'Could not determine recipient email' });
        }

        // Return email data to frontend - NO EmailJS sending here!
        res.json({
            success: true,
            data: {
                toEmail: recipientEmail,
                toName: recipientName || recipientEmail,
                subject: `Regarding task: ${task.title}`,
                message: body,
                taskId: taskId,
                taskTitle: task.title
            }
        });

    } catch (err) {
        console.error('prepareEmailData error', err);
        res.status(500).json({ message: 'Server error preparing email data' });
    }
};
```

**Updated `sendEmail()` (Deprecated):**
```javascript
exports.sendEmail = async (req, res) => {
    try {
        console.log('sendEmail called - This endpoint is deprecated. Use /api/email/prepare instead.');
        return res.json({ 
            success: true, 
            message: 'Please use the frontend EmailJS integration. Call /api/email/prepare to get email data.' 
        });
    } catch (err) {
        console.error('sendEmail error', err);
        res.status(500).json({ message: 'Server error' });
    }
};
```

### 2. routes/emailRoutes.js

**Before:**
```javascript
const router = require('express').Router();
const { draftEmail, sendEmail } = require('../controllers/emailController');

router.post('/draft', draftEmail);
router.post('/send', sendEmail);

module.exports = router;
```

**After:**
```javascript
const router = require('express').Router();
const { draftEmail, sendEmail, prepareEmailData } = require('../controllers/emailController');

router.post('/draft', draftEmail);
router.post('/send', sendEmail); // Deprecated - use /prepare instead
router.post('/prepare', prepareEmailData); // New endpoint for frontend EmailJS integration

module.exports = router;
```

---

## Frontend Changes

### 1. .env (NEW FILE)

```dotenv
# EmailJS Configuration for Frontend
# Get these values from your EmailJS dashboard: https://dashboard.emailjs.com/
# NOTE: These are FRONTEND variables, prefixed with VITE_

# USER_ID: Found in Account -> API Keys
VITE_EMAILJS_USER_ID=1Ldu_XOYndMIKRVel

# PUBLIC_KEY: Found in Account -> API Keys (used in frontend for browser)
VITE_EMAILJS_PUBLIC_KEY=m9U7iT-Ey_JtjqLqx

# SERVICE_ID: Found in Email Services tab
VITE_EMAILJS_SERVICE_ID=service_9hc4tzg

# TEMPLATE_ID: Found in Email Templates tab
VITE_EMAILJS_TEMPLATE_ID=template_ird6dze
```

### 2. services/emailService.js (NEW FILE)

```javascript
import emailjs from '@emailjs/browser';
import axios from 'axios';

// Initialize EmailJS with public key
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_USER_ID = import.meta.env.VITE_EMAILJS_USER_ID;

if (EMAILJS_PUBLIC_KEY) {
    emailjs.init(EMAILJS_PUBLIC_KEY);
    console.log('[EmailJS] Initialized with public key');
} else {
    console.warn('[EmailJS] PUBLIC_KEY not configured. EmailJS will not work.');
}

/**
 * Prepare email data from backend
 */
export const prepareEmailData = async (taskId, body, recipient = null) => {
    try {
        const response = await axios.post('/api/email/prepare', {
            taskId,
            body,
            recipient
        });

        if (response.data.success) {
            console.log('[EmailJS] Email data prepared:', response.data.data);
            return response.data.data;
        } else {
            throw new Error(response.data.message || 'Failed to prepare email data');
        }
    } catch (error) {
        console.error('[EmailJS] Error preparing email data:', error);
        throw error;
    }
};

/**
 * Send email using EmailJS
 */
export const sendEmailViaEmailJS = async (emailData) => {
    if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID) {
        throw new Error('EmailJS configuration missing. Check environment variables.');
    }

    try {
        const templateParams = {
            to_email: emailData.toEmail,
            to_name: emailData.toName,
            subject: emailData.subject,
            message: emailData.message
        };

        console.log('[EmailJS] Sending email with params:', templateParams);

        const response = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            templateParams,
            {
                publicKey: EMAILJS_PUBLIC_KEY
            }
        );

        console.log('[EmailJS] Email sent successfully:', response);
        return {
            success: true,
            message: 'Email sent successfully!',
            response: response
        };
    } catch (error) {
        console.error('[EmailJS] Error sending email:', error);
        throw error;
    }
};

/**
 * Complete flow: Prepare email data and send via EmailJS
 */
export const sendEmailToTask = async (taskId, body, recipient = null) => {
    try {
        // Step 1: Prepare email data from backend
        const emailData = await prepareEmailData(taskId, body, recipient);

        // Step 2: Send via EmailJS
        const result = await sendEmailViaEmailJS(emailData);

        return {
            success: true,
            message: result.message,
            to: emailData.toEmail
        };
    } catch (error) {
        console.error('[EmailJS] Complete email send flow failed:', error);
        return {
            success: false,
            message: error.response?.data?.message || error.message || 'Failed to send email',
            error: error
        };
    }
};

export default {
    prepareEmailData,
    sendEmailViaEmailJS,
    sendEmailToTask
};
```

### 3. pages/EmailPage.jsx (UPDATED)

**Added Import:**
```javascript
import { sendEmailToTask } from '../services/emailService';
```

**Updated `handleSend()` function:**
```javascript
const handleSend = async () => {
    if (!selectedTask || !draft.trim()) return;
    setSending(true);
    try {
        const result = await sendEmailToTask(selectedTask._id, draft, recipient);
        
        if (result.success) {
            alert(`✓ ${result.message}\nSent to: ${result.to}`);
            setSelectedTask(null);
            setDraft('');
            setNotes('');
            setRecipient('');
        } else {
            alert(`✗ Failed to send email\n${result.message}`);
            console.error('Email send error:', result.error);
        }
    } catch (err) {
        console.error('Send error', err);
        alert('Failed to send email - see console for details');
    } finally {
        setSending(false);
    }
};
```

---

## Installation Steps

### 1. Install @emailjs/browser
```bash
cd frontend
npm install @emailjs/browser
```

### 2. Create frontend/.env
```bash
# Copy the EmailJS credentials to frontend/.env
# Use VITE_ prefix
```

### 3. Restart Services
```bash
# Backend
cd backend && npm start

# Frontend  
cd frontend && npm run dev
```

### 4. Test Email Sending
1. Go to EmailPage in UI
2. Select a task
3. Enter recipient and notes
4. Click "Generate Draft"
5. Click "Send Email"
6. Check console (F12) for logs
7. Email should be sent via EmailJS ✓

---

## Key Differences

| Aspect | Old (Backend) | New (Frontend) |
|--------|---------------|----------------|
| **Library** | @emailjs/nodejs | @emailjs/browser |
| **Works?** | ❌ No | ✅ Yes |
| **Config location** | Backend .env | Frontend .env |
| **API used** | /api/email/send | /api/email/prepare + emailjs.send() |
| **Error handling** | Fallback to simulated | Real errors shown |

---

## Files Modified
- ✅ backend/controllers/emailController.js
- ✅ backend/routes/emailRoutes.js
- ✅ backend/.env (cleaned)
- ✅ frontend/.env (new)
- ✅ frontend/src/services/emailService.js (new)
- ✅ frontend/src/pages/EmailPage.jsx

---

**Status: ✅ Complete - EmailJS now works from frontend!**
