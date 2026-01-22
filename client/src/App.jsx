import { use, useState } from 'react'
import Register from './Register'
import Leaderboard from './Leaderboard'
import SearchPage from './SearchPage'
import Login from './Login'
function App() {
    const [currentView, setCurrentView] = useState("search")


return (
    <><nav>
        <button onClick={()  => setCurrentView('search')}>Search</button>
        <button onClick={()  => setCurrentView('register')}>Register</button>
        <button onClick={()  => setCurrentView('leaderboard')}>Leaderboard</button>
        <button onClick={()  => setCurrentView('login')}>Login</button>

    </nav><div>
            {currentView === 'search' && <SearchPage />}
            {currentView === 'register' && <Register />}
            {currentView === 'leaderboard' && <Leaderboard />}
            {currentView === 'login' && <Login />}
        </div></>

)
}
export default App  