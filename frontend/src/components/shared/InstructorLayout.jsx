import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const instNav = [
  { to:'/instructor',                 label:'Dashboard',         icon: '📊', end:true },
  { to:'/instructor/lessons',         label:'Learning Lessons',  icon: '📚' },
  { to:'/instructor/assessment',      label:'Create Assessment', icon: '📝' },
  { to:'/instructor/students',        label:'Student List',      icon: '👥' },
  { to:'/instructor/accounts',        label:'Account Management',icon: '🔑' },
  { to:'/instructor/peer-evaluation', label:'Peer Evaluation',   icon: '🔄' },
  { to:'/instructor/profile',         label:'My Profile',        icon: '👤' },
];

const studNav = [
  { to:'/student',                 label:'Dashboard',         icon: '📊', end:true },
  { to:'/student/lessons',         label:'Learning Lessons',  icon: '📚' },
  { to:'/student/profile',         label:'My Profile',        icon: '👤' },
  { to:'/student/assessment',      label:'Take Assessment',   icon: '📝' },
  { to:'/student/ai',              label:'AI Assistant',      icon: '🤖' },
  { to:'/student/peer-evaluation', label:'Peer Evaluation',   icon: '🔄' },
  { to:'/student/upload',          label:'Upload Activities', icon: '📤' },
];


function AppLayout({ navItems }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // State to track mobile menu visibility
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const toggleMenu = () => { setIsMenuOpen(!isMenuOpen); };

  return (
    <div>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          {/* Hamburger Button visible only on mobile */}
          <button className="menu-toggle-btn" onClick={toggleMenu} aria-label="Toggle Menu">
            {isMenuOpen ? '✕' : '☰'}
          </button>
          
          <div className="topbar-logo">
            <span className="topbar-name">MMS: Web-Based Guide in Learning Video Editing</span>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {/* Hide long text on mobile to save space */}
          <span className="user-details-text">{user?.name} · {user?.role}</span>
          {user?.profile_pic
            ? <img src={user.profile_pic} alt="avatar" style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover', border:'1.5px solid var(--cream)' }} />
            : <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#f5f2ed', border:'1.5px solid rgba(255,255,255,0.3)' }}>{user?.name?.[0]}</div>
          }
          <button className="btn-sm" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      {/* Sidebar + Content */}
      <div className="layout">
        {/* Dynamic class added based on menu state */}
        <div className={`sidebar ${isMenuOpen ? 'mobile-open' : ''}`}>
          <div style={{ padding:'14px 16px 6px' }}>
            <div style={{ fontFamily:'Playfair Display,serif', fontSize:'11px', color:'var(--cream)', opacity:0.8, textTransform:'capitalize' }}>
              {user?.role} Panel
            </div>
          </div>
          {navItems?.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setIsMenuOpen(false)} // Close menu on link click
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
        
        {/* Main Content Area */}
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function InstructorLayout() { return <AppLayout navItems={instNav} />; }
export function StudentLayout()    { return <AppLayout navItems={studNav} />; }

export default AppLayout;
