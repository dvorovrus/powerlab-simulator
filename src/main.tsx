import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Header } from './components/Header';
import { createRoot } from 'react-dom/client';
import parse from 'html-react-parser';
import template from './legacy-template.html?raw';
import './styles.css';

function PowerLabApp() {
  useEffect(() => {
    // The simulation engine is initialized only after React mounts the schematic.
    void import('./simulator.js').then(() => import('./theme.js'));
  }, []);
  const [host,setHost] = React.useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.getElementById('react-header')), []);
  return <>{parse(template)}{host && createPortal(<Header />,host)}</>;
}

createRoot(document.getElementById('root')!).render(<PowerLabApp />);
