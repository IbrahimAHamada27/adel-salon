import React from 'react';
import ReactDOM from 'react-dom/client';
import { CashierApp } from './app/CashierApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CashierApp />
  </React.StrictMode>,
);
