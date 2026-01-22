import { useState } from "react";

function Register() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleRegister = async () => {
        const response = await fetch(`/api/register`, {
            method: 'POST',
            body: JSON.stringify({email, password}),
            headers: { 'Content-Type': 'application/json' }
        });
        
        // Optional: You can check response.ok here to alert success/fail
        if (response.ok) {
            alert("User Created! Please Log In.")
        } else {
            alert("Error creating user")
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

            <button onClick={handleRegister}>
                Sign Up
            </button>

        </div>
    )
}
export default Register