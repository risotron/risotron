import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import NewProject from './pages/NewProject';
import NewReleaseServer from './pages/NewReleaseServer';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <header className="shell-header">
        <Link to="/" className="brand">
          Risotron Studio
        </Link>
        <nav>
          <Link to="/new-project">New Project</Link>
          <Link to="/new-release-server">New Release Server</Link>
        </nav>
      </header>
      <main className="shell-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new-project" element={<NewProject />} />
          <Route path="/new-release-server" element={<NewReleaseServer />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>
);
