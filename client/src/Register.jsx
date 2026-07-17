import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Register() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password) {
            setError("Both email and password are required.")
            return
        }

        if (!email.endsWith(".edu")) {
            setError("Registration requires a valid university email ending with .edu.")
            return
        }

        setError(null)
        setSuccess(false)
        setLoading(true)

        try {
            const response = await fetch(`/api/register`, {
                method: 'POST',
                body: JSON.stringify({email: email.trim(), password}),
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                setSuccess(true)
                // Clear fields
                setEmail("")
                setPassword("")
                alert("Account created successfully! Redirecting to login.")
                navigate("/login")
            } else {
                const data = await response.json()
                setError(data.error || "Registration failed. Is your university domain supported?")
            }
        } catch (err) {
            setError("Could not connect to the registration server.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="form-container">
            <h2>Join the League</h2>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                Create a student profile to claim your summoner and track your standings.
            </p>

            {error && <div className="error-message">{error}</div>}
            {success && (
                <div className="error-message" style={{ borderColor: 'var(--success)', color: '#a3f3be', background: 'rgba(42, 124, 70, 0.12)' }}>
                    Registration successful! Redirecting to login...
                </div>
            )}

            <form onSubmit={handleRegister}>
                <div className="form-group">
                    <label>Student Email (.edu)</label>
                    <input
                        type="email"
                        placeholder="yourname@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading || success}
                        required
                    />
                </div>
                
                <div className="form-group">
                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Create password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading || success}
                        required
                    />
                </div>

                <button type="submit" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading || success}>
                    {loading ? "Creating Account..." : "Sign Up"}
                </button>
            </form>

            <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                Already have an account? <Link to="/login" style={{ color: 'var(--gold-primary)', textDecoration: 'none', fontWeight: 'bold' }}>Login</Link>
            </div>
        </div>
    )
}

export default Register