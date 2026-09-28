import React from 'react';
import ReactDOM from 'react-dom/client';

// Order matters: jQuery must be on window before Bootstrap's plugins evaluate.
import './legacy/jquery-global.js';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.js';

// Registers .tz() on the shared `moment` instance for the whole app.
// Works only while moment-timezone and the app resolve the SAME copy of moment.
import 'moment-timezone';

import './styles.css';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
