import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { connectToServer } from './connection.ts';
import './styles.css';

const connection = connectToServer();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App connection={connection} />
  </StrictMode>,
);
