import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import Register from './Register'
import Leaderboard from './Leaderboard'
import SearchPage from './SearchPage'
import Login from './Login'
import Profile from './Profile'
import LandingPage from './LandingPage'
import MatchSimulator from './MatchSimulator'

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
            <div className="app-container">
                <nav>
                    <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                        <span className="brand-logo" style={{ fontFamily: 'Cinzel', fontWeight: '900', fontSize: '1.25rem', color: 'var(--gold-primary)', letterSpacing: '2px', textShadow: '0 0 10px rgba(200, 170, 110, 0.3)', marginRight: '1.5rem', cursor: 'pointer' }}>
                            UNI LEAGUE
                        </span>
                    </Link>
                    <Link to="/search"><button>Search</button></Link>
                    <Link to="/leaderboard"><button>Leaderboard</button></Link>
                    <Link to="/simulator"><button>Clash Simulator</button></Link>
                    
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
                
                {/* Wrapping our routes in this main-content div applies the central panel styling */}
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/simulator" element={<MatchSimulator />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/login" element={
                            isLoggedIn ? <Navigate to="/profile" /> : <Login onLoginSuccess={() => setIsLoggedIn(true)} />
                        } />
                        <Route path="/profile" element={
                            isLoggedIn ? <Profile /> : <Navigate to="/login" />
                        } />
                    </Routes>
                </main>
            </div>
        </Router>
    )
}
export default App