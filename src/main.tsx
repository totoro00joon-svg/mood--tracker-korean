import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AdminPage } from './AdminPage';
import './App.css';

const isAdmin = window.location.hash === '#admin';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdmin ? <AdminPage /> : <App />}
  </React.StrictMode>,
);

window.addEventListener('hashchange', () => {
  window.location.reload();
});
