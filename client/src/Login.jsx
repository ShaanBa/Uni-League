import { useState } from "react";

// Add the onLoginSuccess prop here in the parentheses
function Login({ onLoginSuccess }) {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleLogin = async () => {
        const response = await fetch(`/api/login`, {
            method: 'POST',
            body: JSON.stringify({email, password}),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json()
        
        if (response.ok) {
            localStorage.setItem('user_token', data.token)
            localStorage.setItem('uni_id', data.uni_id)
            alert("Logged In!")
            
            // Tell App.jsx that the login was successful!
            if (onLoginSuccess) {
                onLoginSuccess()
            }
        } else {
            alert("Error: " + data.error)
        }
    }

    return (
        <div>
            <input
            type="email"
            placeholder="Student Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />
            
            <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            />

            <button onClick={handleLogin}>
                Login
            </button>
        </div>
    )
}
export default Login