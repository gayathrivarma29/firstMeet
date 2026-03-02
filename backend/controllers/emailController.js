const Task = require('../models/tasks');
const User = require('../models/user');
const { InferenceClient } = require('@huggingface/inference');
const axios = require('axios');


const client = new InferenceClient(process.env.HF_API_KEY);




// Helper: try to extract an email address or recipient name from task text
// Accepts optional override (name or email) coming from the frontend
const parseRecipientFromTask = async (task, override) => {
    if (override) {
        const emailRegex = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;
        const m = override.match(emailRegex);
        if (m) return { email: m[1], name: null };
        return { email: null, name: override };
    }

    const text = `${task.title || ''} ${task.assignedTo || ''} ${task.assignedBy || ''}`;

    // 1) look for an email address in the text
    const emailRegex = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) return { email: emailMatch[1], name: null };

    // 2) look for patterns like "email John" or "email to John" or "to John"
    const namePattern = /(?:email|mail)(?: to)?\s+([A-Z][a-zA-Z0-9._-]{1,})/i;
    const toPattern = /(?:to)\s+([A-Z][a-zA-Z0-9._-]{1,})/i;
    let nameMatch = text.match(namePattern) || text.match(toPattern);
    if (nameMatch) {
        const nameCandidate = nameMatch[1];
        // try to find user by firstName, lastName or userName (case-insensitive)
        const user = await User.findOne({
            $or: [
                { firstName: new RegExp(`^${nameCandidate}$`, 'i') },
                { lastName: new RegExp(`^${nameCandidate}$`, 'i') },
                { userName: new RegExp(`^${nameCandidate}$`, 'i') }
            ]
        });
        if (user) return { email: user.email, name: `${user.firstName} ${user.lastName}` };
        // if no user found, return name candidate as recipient name (no email)
        return { email: null, name: nameCandidate };
    }

    // 3) fallback: use assignedBy if available
    if (task.assignedBy) {
        const assignedUser = await User.findOne({ userName: task.assignedBy });
        if (assignedUser) return { email: assignedUser.email, name: `${assignedUser.firstName} ${assignedUser.lastName}` };
        return { email: null, name: task.assignedBy };
    }

    return { email: null, name: null };
};

exports.draftEmail = async (req, res) => {
    try {
        const { taskId, description } = req.body;
        const recipientOverride = req.body.recipient || req.body.recipientName || null;
        if (!taskId || !description) {
            return res.status(400).json({ message: 'taskId and description required' });
        }
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const recipient = await parseRecipientFromTask(task, recipientOverride);
        const recipientName = recipient.name || recipient.email || 'the appropriate person';

        const prompt = `You are a helpful assistant. Draft a professional, concise email to ${recipientName} about the task titled "${task.title}". Include the following notes that the user has provided as context: ${description}. Keep it short and to the point.`;

        const response = await client.chatCompletion({
            model: "Qwen/Qwen2.5-72B-Instruct",
            messages: [
                { role: 'system', content: 'You are an AI assistant that drafts concise professional emails based on user inputs.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 500,
        });

        const draft = response.choices[0].message.content;
        res.json({ draft });
    } catch (err) {
        console.error('draftEmail error', err);
        res.status(500).json({ message: 'Server error drafting email' });
    }
};

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

exports.prepareEmailData = async (req, res) => {
    try {
        const { taskId, body } = req.body;
        const recipientOverride = req.body.recipient || req.body.recipientName || null;
        if (!taskId || !body) {
            return res.status(400).json({ message: 'taskId and body required' });
        }

        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        
        // Resolve recipient email
        let recipientEmail = null;
        let recipientName = '';

        // If the frontend provided an explicit override, try to resolve it first
        if (recipientOverride) {
            const emailRegex = /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;
            const m = recipientOverride.match(emailRegex);
            if (m) {
                recipientEmail = m[1];
            } else {
                // Try to find matching user by username, first or last name, or full name
                const nameParts = recipientOverride.split(/\s+/).filter(Boolean);
                let user = null;
                if (nameParts.length === 1) {
                    const candidate = nameParts[0];
                    user = await User.findOne({
                        $or: [
                            { userName: new RegExp(`^${candidate}$`, 'i') },
                            { firstName: new RegExp(`^${candidate}$`, 'i') },
                            { lastName: new RegExp(`^${candidate}$`, 'i') }
                        ]
                    });
                } else {
                    const first = nameParts[0];
                    const last = nameParts[nameParts.length - 1];
                    user = await User.findOne({
                        firstName: new RegExp(`^${first}$`, 'i'),
                        lastName: new RegExp(`^${last}$`, 'i')
                    });
                }
                if (user) {
                    recipientEmail = user.email;
                    recipientName = `${user.firstName} ${user.lastName}`;
                }
            }
        }

        // If no override resolution, fall back to parsing the task text
        if (!recipientEmail) {
            const recipient = await parseRecipientFromTask(task, null);
            if (recipient && recipient.email) {
                recipientEmail = recipient.email;
                recipientName = recipient.name || '';
            } else if (recipient && recipient.name) {
                const user = await User.findOne({
                    $or: [
                        { firstName: new RegExp(`^${recipient.name}$`, 'i') },
                        { lastName: new RegExp(`^${recipient.name}$`, 'i') },
                        { userName: new RegExp(`^${recipient.name}$`, 'i') }
                    ]
                });
                if (user) {
                    recipientEmail = user.email;
                    recipientName = `${user.firstName} ${user.lastName}`;
                } else {
                    recipientName = recipient.name;
                }
            }
        }

        // Final fallback to assignedBy's email
        if (!recipientEmail && task.assignedBy) {
            const assignedUser = await User.findOne({ userName: task.assignedBy });
            if (assignedUser) {
                recipientEmail = assignedUser.email;
                recipientName = `${assignedUser.firstName} ${assignedUser.lastName}`;
            }
        }

        if (!recipientEmail) {
            return res.status(400).json({ success: false, message: 'Could not determine recipient email' });
        }

        // Return email data to frontend - frontend will handle EmailJS sending
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
