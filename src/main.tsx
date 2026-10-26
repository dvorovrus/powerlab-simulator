import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import parse from 'html-react-parser';
import template from './legacy-template.html?raw';
import './styles.css';

function PowerLabApp() {
  useEffect(() => {
    // The simulation engine is initialized only after React mounts the schematic.
    void import('./simulator.js').then(() => import('./theme.js'));
  }, []);
  return <>{parse(template)}</>;
}

createRoot(document.getElementById('root')!).render(<PowerLabApp />);
