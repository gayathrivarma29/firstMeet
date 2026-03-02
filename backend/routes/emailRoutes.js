const router = require('express').Router();
const { draftEmail, sendEmail, prepareEmailData } = require('../controllers/emailController');

router.post('/draft', draftEmail);
router.post('/send', sendEmail); // Deprecated - use /prepare instead
router.post('/prepare', prepareEmailData); // New endpoint for frontend EmailJS integration

module.exports = router;
