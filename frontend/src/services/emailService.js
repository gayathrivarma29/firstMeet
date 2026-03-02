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
 * @param {string} taskId - The task ID
 * @param {string} body - The email body/message
 * @param {string} recipient - Optional recipient override (name or email)
 * @returns {Promise<Object>} Email data from backend
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
 * @param {Object} emailData - Email data object with toEmail, toName, subject, message
 * @returns {Promise<Object>} EmailJS response
 */
export const sendEmailViaEmailJS = async (emailData) => {
    if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID) {
        throw new Error('EmailJS configuration missing. Check environment variables: VITE_EMAILJS_PUBLIC_KEY, VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID');
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
 * @param {string} taskId - The task ID
 * @param {string} body - The email body/message
 * @param {string} recipient - Optional recipient override
 * @returns {Promise<Object>} Result of email send
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
