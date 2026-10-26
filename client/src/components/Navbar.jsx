import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Bell, BriefcaseBusiness, CheckCheck, LogOut, Menu, Plus, UserRound, X } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth-context";
import { fetchProfile, fetchProfileFile } from "../api/profile";
import { deleteNotification, fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../api/notifications";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const notificationMenuRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const closeMenu = () => setMenuOpen(false);
  const isEmployerJobEditor = user?.role === "employer" && (location.pathname === "/employer/jobs/new" || /^\/employer\/jobs\/[^/]+\/edit$/.test(location.pathname));

  useEffect(() => {
    if (!profileOpen && !notificationOpen) return undefined;
    function closeOnOutsidePointer(event) {
      if (profileOpen && !profileMenuRef.current?.contains(event.target)) setProfileOpen(false);
      if (notificationOpen && !notificationMenuRef.current?.contains(event.target)) setNotificationOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen, notificationOpen]);

  const loadProfilePreview = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setPhotoUrl((current) => { if (current) URL.revokeObjectURL(current); return ""; });
      return;
    }
    try {
      const data = await fetchProfile();
      setProfile(data);
      if (data.photo) {
        const blob = await fetchProfileFile("photo");
        const nextUrl = URL.createObjectURL(blob);
        setPhotoUrl((current) => { if (current) URL.revokeObjectURL(current); return nextUrl; });
      } else {
        setPhotoUrl((current) => { if (current) URL.revokeObjectURL(current); return ""; });
      }
    } catch {
      setProfile(null);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(loadProfilePreview, 0);
    return () => window.clearTimeout(timer);
  }, [loadProfilePreview, location.pathname]);
  useEffect(() => {
    const onProfileUpdated = () => loadProfilePreview();
    window.addEventListener("hirehub-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("hirehub-profile-updated", onProfileUpdated);
  }, [loadProfilePreview]);

  const loadNotifications = useCallback(async () => {
    if (!user || user.role !== "job-seeker") {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const result = await fetchNotifications();
      setNotifications(result.items || []);
      setUnreadCount(result.unreadCount || 0);
    } catch {
      // Keep the header usable when notifications are temporarily unavailable.
    }
  }, [user]);

  useEffect(() => {
    if (loading || !user || user.role !== "job-seeker") return undefined;
    const timer = window.setTimeout(loadNotifications, 0);
    const interval = window.setInterval(loadNotifications, 60000);
    return () => { window.clearTimeout(timer); window.clearInterval(interval); };
  }, [loading, loadNotifications, user]);

  async function openNotification(item) {
    if (!item.readAt) {
      try {
        await markNotificationRead(item._id);
        setNotifications((current) => current.map((notification) => notification._id === item._id ? { ...notification, readAt: new Date().toISOString() } : notification));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch { /* The user can still open the applications page. */ }
    }
    setNotificationOpen(false);
    navigate("/applications");
  }

  async function removeNotification(event, item) {
    event.stopPropagation();
    try {
      await deleteNotification(item._id);
      setNotifications((current) => current.filter((notification) => notification._id !== item._id));
      if (!item.readAt) setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // Keep the notification visible if the delete request fails.
    }
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnreadCount(0);
    } catch { /* Leave the current notification state visible if this fails. */ }
  }
  async function handleSignOut() {
    await signOut();
    setProfileOpen(false);
    closeMenu();
    navigate("/");
  }

  return (
    <header className="navbar">
      <button className="mobile-menu-toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X /> : <Menu />}
      </button>
      <Link to="/" className="brand" onClick={closeMenu}>
        <span className="brand-icon"><BriefcaseBusiness size={22} /></span>
        <span>Hire<span className="brand-accent">Hub</span></span>
      </Link>
      <nav className={"nav-links " + (menuOpen ? "nav-links-open" : "")} aria-label="Main navigation">
        <NavLink to="/" end onClick={closeMenu}>Home</NavLink>
        {!isEmployerJobEditor && <NavLink to="/jobs" onClick={closeMenu}>Find Jobs</NavLink>}
        {!isEmployerJobEditor && <NavLink to="/companies" onClick={closeMenu}>Companies</NavLink>}
        {user?.role === "job-seeker" && <NavLink to="/applications" onClick={closeMenu}>My applications</NavLink>}
        {user?.role === "job-seeker" && <NavLink to="/saved-jobs" onClick={closeMenu}>Saved jobs</NavLink>}
        {user?.role === "employer" && <NavLink to="/dashboard" onClick={closeMenu}>Employer dashboard</NavLink>}
        {!isEmployerJobEditor && <a href="/#features" onClick={closeMenu}>Why HireHub?</a>}
      </nav>
      <div className="nav-actions">
        {!loading && (user ? <>
          {user.role === "employer" && <Link className="btn btn-primary" to="/employer/jobs/new" onClick={closeMenu}><Plus size={16}/>Post a job</Link>}
          {user.role === "job-seeker" && <div className="notification-menu-wrap" ref={notificationMenuRef}>
            <button className="notification-button" type="button" aria-label={unreadCount ? "Notifications, " + unreadCount + " unread" : "Notifications"} aria-expanded={notificationOpen} onClick={() => { setNotificationOpen((open) => !open); setProfileOpen(false); }}>
              <Bell size={20}/>{unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
            {notificationOpen && <section className="notification-dropdown" aria-label="Notifications">
              <div className="notification-dropdown-heading"><strong>Notifications</strong>{unreadCount > 0 && <button type="button" onClick={markAllRead}><CheckCheck size={14}/>Mark all read</button>}</div>
              {!notifications.length ? <p className="notification-empty">You’re all caught up.</p> : <div className="notification-list">{notifications.map((item) => <div className={"notification-item " + (item.readAt ? "is-read" : "is-unread")} key={item._id}><button className="notification-item-open" type="button" onClick={() => openNotification(item)}><span>{item.message}</span><small>{new Date(item.createdAt).toLocaleDateString()}</small></button><button className="notification-dismiss" type="button" aria-label="Remove notification" title="Remove notification" onClick={(event) => removeNotification(event, item)}><X size={15}/></button></div>)}</div>}
            </section>}
          </div>}          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button className="profile-avatar-button" type="button" aria-label="Open profile menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}>
              {photoUrl ? <img src={photoUrl} alt="" /> : <span>{user.name?.trim()?.charAt(0)?.toUpperCase() || <UserRound size={21}/>}</span>}
            </button>
            {profileOpen && <section className="profile-dropdown" aria-label="Profile menu">
              <div className="profile-dropdown-heading">
                <div className="profile-dropdown-avatar">{photoUrl ? <img src={photoUrl} alt=""/> : <UserRound size={22}/>}</div>
                <div><strong>{profile?.name || user.name}</strong><span>{profile?.email || user.email}</span></div>
              </div>
              <div className="profile-dropdown-details">
                <p>{profile?.headline || "Add a professional headline"}</p>
                {profile?.phone && <span>{profile.phone}</span>}
                {profile?.location && <span>{profile.location}</span>}
                {profile?.skills?.length > 0 && <span>{profile.skills.slice(0, 4).join(" · ")}</span>}
                {profile?.resume && <span className="profile-dropdown-resume">Resume: {profile.resume.fileName}</span>}
              </div>
              <Link className="profile-dropdown-edit" to="/profile" onClick={() => { setProfileOpen(false); closeMenu(); }}>View or edit profile <ArrowRight size={15}/></Link>
              <button className="profile-dropdown-logout" type="button" onClick={handleSignOut}><LogOut size={15}/>Log out</button>
            </section>}
          </div>
        </> : <>
          <Link className="btn btn-ghost" to="/login" onClick={closeMenu}>Log in</Link>
          <Link className="btn btn-primary" to="/register" onClick={closeMenu}>Get started <ArrowRight size={16} /></Link>
        </>)}
      </div>
    </header>
  );
}
