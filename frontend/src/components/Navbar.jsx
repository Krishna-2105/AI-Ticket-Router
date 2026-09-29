import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Navbar Component
 * Navigation header with role-aware links and user logout.
 */
export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to={isAuthenticated ? (isAdmin ? '/admin' : '/dashboard') : '/login'} className="navbar-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>AI Support</span>
        </Link>

        <div className="navbar-links">
          {isAuthenticated ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/create-ticket"
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                + New Ticket
              </NavLink>

              <NavLink
                to="/tickets"
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                {isAdmin ? 'All Tickets' : 'My Tickets'}
              </NavLink>

              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
                  style={{ fontWeight: 600, color: '#7c3aed' }}
                >
                  Admin Console
                </NavLink>
              )}

              <div className="navbar-user">
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                  {user?.name}
                  <span
                    style={{
                      marginLeft: '0.4rem',
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      background: isAdmin ? '#f3e8ff' : '#e2e8f0',
                      color: isAdmin ? '#6b21a8' : '#334155',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}
                  >
                    {user?.role}
                  </span>
                </span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              >
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
