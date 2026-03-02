import { useState, useEffect } from 'react';
import axios from 'axios';
import MainLayout from '../components/MainLayout';
import { sendEmailToTask } from '../services/emailService';

const EmailPage = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [notes, setNotes] = useState('');
    const [recipient, setRecipient] = useState('');
    const [draft, setDraft] = useState('');
    const [generating, setGenerating] = useState(false);
    const [sending, setSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [sentTasks, setSentTasks] = useState(() => {
        const saved = localStorage.getItem('sentEmailTasks');
        return saved ? JSON.parse(saved) : [];
    });

    const keywords = [/email/i, /gmail/i, /mail/i];

    // Save sentTasks to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('sentEmailTasks', JSON.stringify(sentTasks));
    }, [sentTasks]);

    useEffect(() => {
        const fetchAssigned = async () => {
            const userName = localStorage.getItem('userName');
            if (!userName) return;
            try {
                const res = await axios.get(`/api/tasks/assigned/${userName}`);
                const filtered = res.data.filter(task =>
                    keywords.some(rx => rx.test(task.title))
                );
                setTasks(filtered);
            } catch (err) {
                console.error('Error fetching tasks', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAssigned();
    }, []);

    const handleStart = (task) => {
        setSelectedTask(task);
        setNotes('');
        setRecipient('');
        setDraft('');
        setEmailSent(false);
    };

    const handleGenerate = async () => {
        if (!selectedTask || !notes.trim() || !recipient.trim()) return;
        setGenerating(true);
        try {
            const res = await axios.post('/api/email/draft', { taskId: selectedTask._id, description: notes, recipient });
            setDraft(res.data.draft);
        } catch (err) {
            console.error('Draft error', err);
            alert('Failed to generate draft');
        } finally {
            setGenerating(false);
        }
    };

    const handleSend = async () => {
        if (!selectedTask || !draft.trim()) return;
        setSending(true);
        try {
            const result = await sendEmailToTask(selectedTask._id, draft, recipient);
            
            if (result.success) {
                alert(`✓ ${result.message}\nSent to: ${result.to}`);
                setEmailSent(true);
                setSentTasks([...sentTasks, selectedTask._id]);
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

    return (
        <MainLayout>
            <div className="content-area">
                <header className="home-greeting">
                    <h2 className="content-title">Email Tasks</h2>
                </header>
                {loading ? (
                    <p className="empty-msg">Loading...</p>
                ) : tasks.length === 0 ? (
                    <p className="empty-msg">No email-related tasks found.</p>
                ) : (
                    <ul className="task-list">
                        {tasks.map(task => (
                            <li key={task._id} className="task-item">
                                <div className="task-item-content">
                                    <strong>{task.title}</strong>
                                    {task.assignedBy && <p>Assigned by: {task.assignedBy}</p>}
                                </div>
                                <button 
                                    className="small-assign-btn" 
                                    onClick={() => handleStart(task)}
                                    disabled={sentTasks.includes(task._id)}
                                    style={{
                                        backgroundColor: sentTasks.includes(task._id) ? '#4ade80' : undefined,
                                        borderColor: sentTasks.includes(task._id) ? '#4ade80' : undefined,
                                        cursor: sentTasks.includes(task._id) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {sentTasks.includes(task._id) ? '✓ Sent' : 'Send'}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {selectedTask && (
                    <div className="email-draft-box">
                        <h3>Compose Email for: {selectedTask.title}</h3>
                        {draft ? (
                            <>
                                <textarea
                                    rows={8}
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                />
                                <button 
                                    onClick={handleSend} 
                                    disabled={sending || emailSent} 
                                    className="small-assign-btn"
                                    style={{ 
                                        backgroundColor: emailSent ? '#4ade80' : undefined,
                                        borderColor: emailSent ? '#4ade80' : undefined,
                                        cursor: emailSent ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {sending ? 'Sending...' : emailSent ? '✓ Sent' : 'Send Email'}
                                </button>
                                <button onClick={() => setSelectedTask(null)} className="small-assign-btn">
                                    {emailSent ? 'Close' : 'Cancel'}
                                </button>
                            </>
                        ) : (
                            <>
                                <input
                                    placeholder="Recipient name or email"
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', marginBottom: '0.75rem' }}
                                />
                                <textarea
                                    placeholder="Enter notes or description for the email"
                                    rows={4}
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                                <button onClick={handleGenerate} disabled={generating || !notes.trim()} className="small-assign-btn">
                                    {generating ? 'Generating...' : 'Generate Draft'}
                                </button>
                                <button onClick={() => setSelectedTask(null)} className="small-assign-btn">
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default EmailPage;
