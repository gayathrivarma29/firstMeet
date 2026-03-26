import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { rootApi } from '../api';
import '../styles/signInPage.css';


const SignInPage = () => {
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await rootApi.post('/signIn', { userName, password });
            if (response.data.success) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('userName', response.data.userName);
                localStorage.setItem('userRole', response.data.role);
                navigate('/analytics');
            } else {
                alert("Sign in failed: " + (response.data.message || "Unknown error"));
            }
        } catch (error) {
            console.error("Error signing in:", error);
            alert("An error occurred during sign in.");
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card glass-card">
                <header className="auth-header">
                    <span className="auth-logo">MeetUp </span>
                    {/* <h1 className="auth-title">Welcome back</h1> */}
                    <p className="auth-subtitle">Sign in to your account</p>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                        <label className="label-main" htmlFor="userName">Username</label>
                        <input
                            type="text"
                            id="userName"
                            className="input-field"
                            placeholder=""
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label className="label-main" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="input-field"
                            placeholder=""
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary">
                        Sign In →
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Don't have an account?{' '}
                    <Link to="/signup" style={{ color: 'var(--accent-color)', fontWeight: '600' }}>
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default SignInPage;

