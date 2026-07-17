import { useState } from "react";
import { Link } from "react-router-dom";

function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

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

    return (
        <div className="form-container">
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
                    <label>Password</label>
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