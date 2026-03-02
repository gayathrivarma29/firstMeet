import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/signInPage.css';

const SignInPage = () => {
    const [userName, setUserName] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('/signIn', { userName, password });
            if (response.data.success) {
                localStorage.setItem('userName', response.data.userName);
                localStorage.setItem('userRole', response.data.role);
                navigate('/home');
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
            <div className="auth-card">
                <header className="auth-header">
                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">
                        Sign in to your MeetUp account
                    </p>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="form-group mb-24">
                        <label className="label-main" htmlFor="userName">
                            Username
                        </label>
                        <input
                            type="text"
                            id="userName"
                            className="input-field"
                            // placeholder="Enter your username"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group mb-32">
                        <label className="label-main" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="input-field"
                            // placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: '1.5rem' }}>
                        Sign In
                    </button>
                </form>

                <p className="auth-footer-text">
                    Don't have an account?{" "}
                    <Link to="/signup" className="auth-link">
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default SignInPage;

