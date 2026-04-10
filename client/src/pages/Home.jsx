import { Link } from 'react-router-dom';
import { HiOutlineAcademicCap, HiOutlineOfficeBuilding, HiOutlineShieldCheck, HiOutlineSparkles } from 'react-icons/hi';
import './Home.css';

const highlights = [
  {
    title: 'College onboarding',
    text: 'Register a college once and start with a dedicated super admin workspace immediately.',
    icon: HiOutlineOfficeBuilding,
  },
  {
    title: 'Role-based portals',
    text: 'Super admin, department admin, faculty, and students each get the right dashboard and controls.',
    icon: HiOutlineShieldCheck,
  },
  {
    title: 'Live academic flow',
    text: 'Attendance, marks, subjects, and assignments stay connected across all dashboards.',
    icon: HiOutlineSparkles,
  },
];

export default function Home() {
  return (
    <div className="home-shell">
      <section className="home-hero">
        <div className="home-copy">
          <div className="home-badge">
            <HiOutlineAcademicCap />
            Attendance Management System
          </div>
          <h1>Run one college platform with a clean super admin workflow.</h1>
          <p>
            Register a college, generate the super admin account, and manage departments, faculty, students,
            attendance, and marks from one connected system.
          </p>
          <div className="home-actions">
            <Link to="/register" className="btn btn-primary">Register College</Link>
            <Link to="/login" className="btn btn-secondary">Login</Link>
          </div>
        </div>

        <div className="home-panel card">
          <h2>What happens next</h2>
          <div className="home-steps">
            <div>
              <span>1</span>
              <p>Create a college and super admin account.</p>
            </div>
            <div>
              <span>2</span>
              <p>Land directly in the super admin dashboard.</p>
            </div>
            <div>
              <span>3</span>
              <p>Add departments and share department admin credentials.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-highlights">
        {highlights.map((item) => (
          <article key={item.title} className="card home-highlight-card">
            <div className="home-highlight-icon"><item.icon /></div>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
