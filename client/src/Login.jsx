import { useState } from "react";

function Login() {
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
            alert("Logged In!")
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