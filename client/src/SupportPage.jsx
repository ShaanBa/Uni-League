import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import './SupportPage.css';

function SupportPage() {
    const [, showToast, ToastContainer] = useToast();
    const [isAdmin, setIsAdmin] = useState(false);
    const [adminSecret, setAdminSecret] = useState('');
    const [tickets, setTickets] = useState([]);
    
    // Ticket Form State
    const [category, setCategory] = useState('BUG');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Check if user is logged in to pre-fill email
    useEffect(() => {
        const token = localStorage.getItem('user_token');
        if (token) {
            fetch('/api/profile/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.user_email) {
                    setContactEmail(data.user_email);
                }
            })
            .catch(() => {});
        }
    }, []);

    // Submit Ticket
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            setError("Title and Description are required.");
            return;
        }

        setError(null);
        setSubmitting(true);
        const token = localStorage.getItem('user_token');

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('/api/tickets', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    category,
                    title: title.trim(),
                    description: description.trim(),
                    contact_email: contactEmail.trim() || null
                })
            });

            if (response.ok) {
                showToast("Feedback submitted successfully!", "success");
                setTitle('');
                setDescription('');
            } else {
                const data = await response.json();
                setError(data.error || "Failed to submit ticket.");
            }
        } catch (err) {
            setError("Failed to reach server.");
        } finally {
            setSubmitting(false);
        }
    };

    // Load Admin Tickets
    const fetchAdminTickets = async (secret) => {
        setError(null);
        try {
            const response = await fetch(`/api/admin/tickets?admin_secret=${encodeURIComponent(secret)}`);
            if (response.ok) {
                const data = await response.json();
                setTickets(data);
                setIsAdmin(true);
                showToast("Admin access granted.", "success");
            } else {
                showToast("Invalid admin secret.", "error");
            }
        } catch (err) {
            showToast("Server unreachable.", "error");
        }
    };

    // Toggle Ticket Status
    const handleToggleStatus = async (ticketId, currentStatus) => {
        const newStatus = currentStatus === 'OPEN' ? 'RESOLVED' : 'OPEN';
        try {
            const response = await fetch(`/api/admin/tickets/${ticketId}/status?admin_secret=${encodeURIComponent(adminSecret)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                showToast(`Ticket status set to ${newStatus}.`, "success");
                setTickets(prev => prev.map(t => t.ticket_id === ticketId ? { ...t, status: newStatus } : t));
            } else {
                showToast("Failed to update status.", "error");
            }
        } catch (err) {
            showToast("Server error.", "error");
        }
    };

    return (
        <div className="support-container">
            <ToastContainer />

            {isAdmin ? (
                // --- ADMIN PANEL VIEW ---
                <div className="admin-tickets-view">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h2>Support Desk (Admin Panel)</h2>
                        <button 
                            onClick={() => { setIsAdmin(false); setAdminSecret(''); setTickets([]); }}
                            style={{ border: '1px solid var(--border-gold)', color: 'var(--gold-primary)', background: 'transparent' }}
                        >
                            Exit Admin Mode
                        </button>
                    </div>

                    {tickets.length === 0 ? (
                        <p className="empty-state">No tickets submitted yet.</p>
                    ) : (
                        <div className="tickets-grid">
                            {tickets.map(ticket => (
                                <div key={ticket.ticket_id} className="ticket-card hextech-card" style={{ border: ticket.status === 'RESOLVED' ? '1px solid var(--success)' : '1px solid var(--border-gold)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                                        <span className="ticket-badge" style={{ 
                                            background: ticket.category === 'BUG' ? '#5c1d24' : ticket.category === 'UNIVERSITY' ? '#1c3e3c' : '#223c52',
                                            borderColor: ticket.category === 'BUG' ? 'var(--danger)' : ticket.category === 'UNIVERSITY' ? '#2ecc71' : 'var(--hextech-blue)'
                                        }}>
                                            {ticket.category}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>
                                            {new Date(ticket.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <h3>{ticket.title}</h3>
                                    <p className="ticket-description">{ticket.description}</p>
                                    <div className="ticket-footer">
                                        <div>
                                            <strong>Email:</strong> {ticket.contact_email || 'Anonymous'}
                                        </div>
                                        <button 
                                            onClick={() => handleToggleStatus(ticket.ticket_id, ticket.status)}
                                            style={{ 
                                                background: ticket.status === 'RESOLVED' ? 'rgba(42, 124, 70, 0.15)' : 'transparent',
                                                borderColor: ticket.status === 'RESOLVED' ? 'var(--success)' : 'var(--gold-primary)',
                                                color: ticket.status === 'RESOLVED' ? '#2ecc71' : 'var(--gold-primary)',
                                                padding: '4px 10px',
                                                fontSize: '0.75rem'
                                            }}
                                        >
                                            {ticket.status === 'RESOLVED' ? 'RESOLVED (Reopen)' : 'MARK RESOLVED'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // --- USER TICKET FORM ---
                <div className="form-container" style={{ maxWidth: '560px' }}>
                    <h2>Support &amp; Feedback</h2>
                    <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                        Found a bug? Requesting a missing university? Let us know below so we can fix it!
                    </p>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Category</label>
                            <select 
                                value={category} 
                                onChange={(e) => setCategory(e.target.value)}
                                className="hextech-select"
                                style={{ width: '100%', border: '1px solid var(--border-blue)' }}
                            >
                                <option value="BUG">Bug Report 🐛</option>
                                <option value="UNIVERSITY">Request Missing University 🎓</option>
                                <option value="FEATURE">Feature Suggestion 💡</option>
                                <option value="OTHER">Other Feedback 💬</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Title</label>
                            <input 
                                type="text"
                                placeholder="Summary of issue or request"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                disabled={submitting}
                            />
                        </div>

                        <div className="form-group">
                            <label>Description / Details</label>
                            <textarea 
                                placeholder="Describe the issue, step-by-step reproduction, or the university domain and logo url..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                disabled={submitting}
                                rows={5}
                                style={{
                                    width: '100%',
                                    backgroundColor: 'rgba(2, 6, 12, 0.9)',
                                    border: '1px solid var(--border-blue)',
                                    color: 'var(--text-light)',
                                    padding: '0.85rem 1rem',
                                    fontFamily: 'inherit',
                                    fontSize: '0.9rem',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div className="form-group">
                            <label>Contact Email (Optional)</label>
                            <input 
                                type="email"
                                placeholder="name@university.edu"
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                disabled={submitting}
                            />
                        </div>

                        <button type="submit" style={{ width: '100%', marginTop: '0.5rem' }} disabled={submitting}>
                            {submitting ? "Submitting..." : "Send Ticket"}
                        </button>
                    </form>

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <span 
                            onClick={() => {
                                const secret = prompt("Enter Admin Secret Key:");
                                if (secret) {
                                    setAdminSecret(secret);
                                    fetchAdminTickets(secret);
                                }
                            }}
                            style={{ fontSize: '0.7rem', color: 'rgba(200, 170, 110, 0.3)', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}
                        >
                            Admin Access
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SupportPage;
