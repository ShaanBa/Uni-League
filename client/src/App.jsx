import { useState, useEffect } from 'react'
import Register from './Register'
import Leaderboard from './Leaderboard'
import SearchPage from './SearchPage'
import Login from './Login'
import Profile from './Profile' // 1. Import the new component

function App() {
    const [currentView, setCurrentView] = useState("search")
    const [isLoggedIn, setIsLoggedIn] = useState(false)

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
        setCurrentView('search')
        alert("Logged out successfully!")
    }

    return (
        <>
            <nav>
                <button onClick={() => setCurrentView('search')}>Search</button>
                <button onClick={() => setCurrentView('leaderboard')}>Leaderboard</button>
                
                {!isLoggedIn ? (
                    <>
                        <button onClick={() => setCurrentView('register')}>Register</button>
                        <button onClick={() => setCurrentView('login')}>Login</button>
                    </>
                ) : (
                    <>
                        {/* 2. Add the Profile button for logged-in users */}
                        <button onClick={() => setCurrentView('profile')}>My Profile</button>
                        <button onClick={handleLogout}>Logout</button>
                    </>
                )}
            </nav>
            
            <div>
                {currentView === 'search' && <SearchPage />}
                {currentView === 'register' && <Register />}
                {currentView === 'leaderboard' && <Leaderboard />}
                {currentView === 'login' && <Login onLoginSuccess={() => {
                    setIsLoggedIn(true)
                    setCurrentView('profile') // 3. Redirect to Profile instead of Search on login
                }} />}
                {/* 4. Render the profile view */}
                {currentView === 'profile' && <Profile />}
            </div>
        </>
    )
}
export default App