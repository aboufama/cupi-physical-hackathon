import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Variation from './Variation.jsx';
import './variation.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Variation />
  </StrictMode>,
);
