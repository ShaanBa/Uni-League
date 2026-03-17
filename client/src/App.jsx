import { useState, useEffect } from 'react'
import Register from './Register'
import Leaderboard from './Leaderboard'
import SearchPage from './SearchPage'
import Login from './Login'

function App() {
    const [currentView, setCurrentView] = useState("search")
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    // Check if user is already logged in when the app loads
    useEffect(() => {
        const token = localStorage.getItem('user_token')
        if (token) {
            setIsLoggedIn(true)
        }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('user_token')
        localStorage.removeItem('uni_id')
        setIsLoggedIn(false)
        setCurrentView('search') // kick them back to the search page
        alert("Logged out successfully!")
    }

    return (
        <>
            <nav>
                <button onClick={() => setCurrentView('search')}>Search</button>
                <button onClick={() => setCurrentView('leaderboard')}>Leaderboard</button>
                
                {/* Conditional Rendering: Show different buttons if logged in */}
                {!isLoggedIn ? (
                    <>
                        <button onClick={() => setCurrentView('register')}>Register</button>
                        <button onClick={() => setCurrentView('login')}>Login</button>
                    </>
                ) : (
                    <button onClick={handleLogout}>Logout</button>
                )}
            </nav>
            
            <div>
                {currentView === 'search' && <SearchPage />}
                {currentView === 'register' && <Register />}
                {currentView === 'leaderboard' && <Leaderboard />}
                {/* Pass a success function to Login so it can tell App to update */}
                {currentView === 'login' && <Login onLoginSuccess={() => {
                    setIsLoggedIn(true)
                    setCurrentView('search') // automatically redirect to search after login
                }} />}
            </div>
        </>
    )
}
export default App