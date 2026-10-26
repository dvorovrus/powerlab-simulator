import {Button} from './ui/button';
import {useEffect,useState} from 'react';
import {Zap,Moon,Sun,RotateCcw} from 'lucide-react';

type Theme='light'|'dark';
function preferredTheme():Theme {
 const stored=window.localStorage.getItem('powerlab-theme');
 if(stored==='light'||stored==='dark')return stored;
 return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}
export function Header(){
 const [theme,setTheme]=useState<Theme>(preferredTheme);
 useEffect(()=>{document.documentElement.dataset.theme=theme;try{localStorage.setItem('powerlab-theme',theme)}catch{}},[theme]);
 const dark=theme==='dark';
 return <><header className="topline"><div className="identity"><div className="mark"><Zap size={19}/></div><div><div className="brand">POWER<span>LAB</span> <span style={{fontSize:11,letterSpacing:0,color:'#7793aa',fontWeight:500}}>/ HOME BACKUP</span></div><div className="desc">Интерактивная модель питания · 230 В · L / N</div></div></div><div className="top-actions"><Button className="round-btn theme-toggle" id="themeToggle" type="button" aria-label={dark?'Включить светлую тему':'Включить тёмную тему'} aria-pressed={dark} onClick={()=>setTheme(dark?'light':'dark')}>{dark?<Sun size={16}/>:<Moon size={16}/>}<span id="themeLabel">{dark?'Светлая':'Тёмная'}</span></Button><span className="chip"><i className="led yes" id="systemLed"/><span id="systemShort">Система готова</span></span><Button className="round-btn" id="resetBtn" type="button"><RotateCcw size={16}/> Сбросить</Button></div></header><div className="overview-heading"><div><div className="overview-kicker">SYSTEM OVERVIEW / 01</div><h1>Центр управления питанием</h1><p>Состояние сети, резерва и накопителя в реальном времени</p></div><div className="overview-live"><span className="live-pulse"/> LIVE SIMULATION</div></div></>
}
