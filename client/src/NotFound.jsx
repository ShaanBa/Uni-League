import { Link } from 'react-router-dom';
import './NotFound.css';

function NotFound() {
    return (
        <div className="not-found-container">
            <div className="not-found-code">404</div>
            <h1>Page Not Found</h1>
            <p>The summoner you seek has vanished from the Rift.</p>
            <Link to="/" className="hextech-btn hextech-btn-gold">
                Return Home
            </Link>
        </div>
    );
}

export default NotFound;
