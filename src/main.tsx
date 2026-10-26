import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GeneratedLayout } from './components/GeneratedLayout';
import './styles.css';

function PowerLabApp(){
 useEffect(()=>{
  // DOM-based SVG renderer retains device routing until the typed React diagram is ready.
  void import('./simulator');
 },[]);
 return <GeneratedLayout />;
}
createRoot(document.getElementById('root')!).render(<PowerLabApp />);
