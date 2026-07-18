import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from './Toast';

function Login({ onLoginSuccess }) {
    const [, showToast, ToastContainer] = useToast();
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    // Password recovery states
    const [isForgotPassword, setIsForgotPassword] = useState(false)
    const [resetStep, setResetStep] = useState(1) // 1 = request, 2 = reset
    const [resetCode, setResetCode] = useState("")
    const [newPassword, setNewPassword] = useState("")

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            setError("Both email and password are required.")
            return
        }

        setError(null)
        setLoading(true)

        try {
            const response = await fetch(`/api/login`, {
                method: 'POST',
                body: JSON.stringify({email: email.trim(), password}),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json()
            
            if (response.ok) {
                localStorage.setItem('user_token', data.token)
                localStorage.setItem('uni_id', data.uni_id)
                
                if (onLoginSuccess) {
                    onLoginSuccess()
                }
            } else {
                setError(data.error || "Authentication failed.")
            }
        } catch (err) {
            setError("Could not connect to the authentication server.")
        } finally {
            setLoading(false)
        }
    }

    const handleResetRequest = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setError("Email is required.")
            return
        }
        if (!email.endsWith(".edu")) {
            setError("Requires a valid university email ending with .edu.")
            return
        }

        setError(null)
        setLoading(true)

        try {
            const response = await fetch('/api/forgot_password/request', {
                method: 'POST',
                body: JSON.stringify({ email: email.trim() }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json()

            if (response.ok) {
                showToast("Verification code sent to your student email!", "success")
                setResetStep(2)
            } else {
                setError(data.error || "Failed to send reset code.")
            }
        } catch (err) {
            setError("Could not connect to the server.")
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!email.trim() || !resetCode.trim() || !newPassword) {
            setError("All fields are required.")
            return
        }

        setError(null)
        setLoading(true)

        try {
            const response = await fetch('/api/forgot_password/reset', {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim(),
                    code: resetCode.trim(),
                    password: newPassword
                }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json()

            if (response.ok) {
                showToast("Password reset successfully! You can now log in.", "success")
                setIsForgotPassword(false)
                setResetStep(1)
                setResetCode("")
                setNewPassword("")
                setPassword("")
            } else {
                setError(data.error || "Failed to reset password.")
            }
        } catch (err) {
            setError("Could not connect to the server.")
        } finally {
            setLoading(false)
        }
    }

    if (isForgotPassword) {
        return (
            <div className="form-container">
                <ToastContainer />
                <h2>Reset Password</h2>
                
                {error && <div className="error-message">{error}</div>}

                {resetStep === 1 ? (
                    <form onSubmit={handleResetRequest}>
                        <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-main)' }}>
                            Enter your student email and we'll send you an authorization code to reset your password.
                        </p>
                        <div className="form-group">
                            <label>Student Email (.edu)</label>
                            <input
                                type="email"
                                placeholder="yourname@university.edu"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <button type="submit" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                            {loading ? "Sending Code..." : "Send Reset Code"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handlePasswordReset}>
                        <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-main)' }}>
                            Enter the 6-digit code sent to your email and set a new password.
                        </p>
                        <div className="form-group">
                            <label>Verification Code</label>
                            <input
                                type="text"
                                placeholder="Enter 6-digit pin"
                                value={resetCode}
                                onChange={(e) => setResetCode(e.target.value)}
                                disabled={loading}
                                maxLength={6}
                                required
                                style={{ textAlign: 'center', fontSize: '1.1rem', letterSpacing: '2px', fontWeight: 'bold' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>New Password</label>
                            <input
                                type="password"
                                placeholder="Min 8 characters, 1 number, 1 letter"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading}
                                required
                            />
                        </div>
                        <button type="submit" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                            {loading ? "Resetting Password..." : "Reset Password"}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', textAlign: 'center' }}>
                    <span 
                        onClick={() => { setIsForgotPassword(false); setResetStep(1); setError(null); }} 
                        style={{ color: 'var(--gold-primary)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
                    >
                        Back to Login
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className="form-container">
            <ToastContainer />
            <h2>Welcome Back</h2>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                Sign in with your university student email to access your standing.
            </p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleLogin}>
                <div className="form-group">
                    <label>Student Email</label>
                    <input
                        type="email"
                        placeholder="yourname@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>
                
                <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label style={{ margin: 0 }}>Password</label>
                        <span 
                            onClick={() => { setIsForgotPassword(true); setError(null); }} 
                            style={{ fontSize: '0.75rem', color: 'var(--gold-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Forgot Password?
                        </span>
                    </div>
                    <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                    />
                </div>

                <button type="submit" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
                    {loading ? "Signing In..." : "Login"}
                </button>
            </form>

            <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                Don't have an account? <Link to="/register" style={{ color: 'var(--gold-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Sign Up</Link>
            </div>
        </div>
    )
}

export default Login