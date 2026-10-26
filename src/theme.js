
(function(){
const key='powerlab-theme';
let saved;try{saved=localStorage.getItem(key)}catch(e){}
const system=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
let mode=saved==='dark'||saved==='light'?saved:system;
const apply=()=>{document.documentElement.dataset.theme=mode;const b=document.getElementById('themeToggle');const l=document.getElementById('themeLabel');if(l)l.textContent=mode==='dark'?'Светлая':'Тёмная';if(b){b.setAttribute('aria-label',mode==='dark'?'Включить светлую тему':'Включить тёмную тему');b.setAttribute('aria-pressed',String(mode==='dark'))}const i=document.getElementById('themeIcon');if(i){i.setAttribute('data-lucide',mode==='dark'?'sun':'moon');if(window.lucide&&lucide.createIcons)lucide.createIcons()};};
apply();document.getElementById('themeToggle')?.addEventListener('click',()=>{mode=mode==='dark'?'light':'dark';try{localStorage.setItem(key,mode)}catch(e){}apply()});
})();

export {};
