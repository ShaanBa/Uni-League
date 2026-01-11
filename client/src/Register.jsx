import { use, useState } from "react";

function Register() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleRegister = async () => {
        const response = await fetch(`/api/register`, {
            method: 'POST',
            body: JSON.stringify({email, password}),
            headers: { 'Content-Type': 'application/json' }
        });
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