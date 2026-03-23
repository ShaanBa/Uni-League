import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import Register from './Register'
import Leaderboard from './Leaderboard'
import SearchPage from './SearchPage'
import Login from './Login'
import Profile from './Profile'

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false)

    useEffect(() => {
        if (localStorage.getItem('user_token')) {
            setIsLoggedIn(true)
        }
    }, [])

    const handleLogout = () => {
        localStorage.removeItem('user_token')
        localStorage.removeItem('uni_id')
        setIsLoggedIn(false)
        window.location.href = '/' // Force redirect to home
    }

    return (
        <Router>
            <nav>
                <Link to="/"><button>Search</button></Link>
                <Link to="/leaderboard"><button>Leaderboard</button></Link>
                
                {!isLoggedIn ? (
                    <>
                        <Link to="/register"><button>Register</button></Link>
                        <Link to="/login"><button>Login</button></Link>
                    </>
                ) : (
                    <>
                        <Link to="/profile"><button>My Profile</button></Link>
                        <button onClick={handleLogout}>Logout</button>
                    </>
                )}
            </nav>
            
            <Routes>
                <Route path="/" element={<SearchPage />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={
                    isLoggedIn ? <Navigate to="/profile" /> : <Login onLoginSuccess={() => setIsLoggedIn(true)} />
                } />
                <Route path="/profile" element={
                    isLoggedIn ? <Profile /> : <Navigate to="/login" />
                } />
            </Routes>
        </Router>
    )
}
export default App