import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink, Link, Navigate } from 'react-router-dom'
import Register from './Register'
import Leaderboard from './Leaderboard'
import SearchPage from './SearchPage'
import Login from './Login'
import Profile from './Profile'
import LandingPage from './LandingPage'
import MatchSimulator from './MatchSimulator'
import NotFound from './NotFound'
import SupportPage from './SupportPage'

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
                    <NavLink to="/search" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><button>Search</button></NavLink>
                    <NavLink to="/leaderboard" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><button>Leaderboard</button></NavLink>
                    <NavLink to="/simulator" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><button>Clash Simulator</button></NavLink>
                    <NavLink to="/support" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><button>Support</button></NavLink>
                    
                    {!isLoggedIn ? (
                        <>
                            <NavLink to="/register" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><button>Register</button></NavLink>
                            <NavLink to="/login" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><button>Login</button></NavLink>
                        </>
                    ) : (
                        <>
                            <NavLink to="/profile" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}><button>My Profile</button></NavLink>
                            <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', letterSpacing: '2px', padding: '0.5rem 1.2rem', fontFamily: 'Cinzel', fontWeight: '700', cursor: 'pointer' }}>Logout</button>
                        </>
                    )}
                </nav>
                
                {/* Wrapping our routes in this main-content div applies the central panel styling */}
                <main className="main-content hextech-card">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/search" element={<SearchPage />} />
                        <Route path="/leaderboard" element={<Leaderboard />} />
                        <Route path="/simulator" element={<MatchSimulator />} />
                        <Route path="/support" element={<SupportPage />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/login" element={
                            isLoggedIn ? <Navigate to="/profile" /> : <Login onLoginSuccess={() => setIsLoggedIn(true)} />
                        } />
                        <Route path="/profile" element={
                            isLoggedIn ? <Profile /> : <Navigate to="/login" />
                        } />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </main>
            </div>
        </Router>
    )
}
export default App