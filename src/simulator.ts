import {LIMIT,INITIAL,scenarios,calculatePower} from './engine/electrical';
import { constrainDevice, canvasSize } from './engine/canvas';

'use strict';
const $=(id:string):any=>document.getElementById(id);
const $$=(selector:string):NodeListOf<any>=>document.querySelectorAll(selector);
const R={GRID:'grid',GEN:'generator',INV:'inverter'};

const RATINGS=[6,10,16,20,25,32,40,50,63,80,100,125,160,200,250];
function nextRating(amps){return RATINGS.find(x=>x>=amps)||'>250';}
function ratingUpdate(){
 const v=Number($('ratedVoltage').value)||230;
 const gen=LIMIT.GEN*1000/v,inv=LIMIT.INV*1000/v,charge=LIMIT.CHARGE*1000/v,grid=LIMIT.STAB*1000/v;
 const rows=[['QF1 · сеть / стабилизатор',grid],['QF2 · генератор',gen],['QF3 · заряд AC IN',charge],['QF4 · дом / выход',Math.max(grid,gen,inv)],['АВР I–0–II · сеть / инвертор',Math.max(grid,inv)],['АВР генератор / резерв',Math.max(gen,inv)]];
 $('ratingResults').innerHTML=rows.map(([n,a])=>`<div class="rr"><span>${n}</span><strong>${Number(a).toFixed(1)} А → ≥ ${nextRating(a)} А*</strong></div>`).join('')+'<div style="margin-top:6px;color:#a9b9c8">* Ближайший стандартный ток аппарата — только предварительный ориентир по пропускной способности, не назначенный номинал автомата. Для QF4/АВР нужен расчёт реальной нагрузки и паспортного тока. Номинал IEK выбирается по току AC IN и паспорту конкретной модели.</div>';
 $$('.device-group').forEach(()=>{});
}
for(const [id,key] of [['pGen','GEN'],['pInv','INV'],['pCap','CAP'],['pStab','STAB'],['pCharge','CHARGE']]){document.addEventListener('input',e=>{if((e.target as HTMLInputElement).id!==id)return;const n=Number((e.target as HTMLInputElement).value);if(!Number.isFinite(n)||n<=0)return;LIMIT[key]=n;ratingUpdate();onChanged();});}
document.addEventListener('input',e=>{if((e.target as HTMLInputElement).id==='ratedVoltage')ratingUpdate();});
let state:any={...INITIAL}, activeScenario='normal',simSeconds=0,lastFrame=performance.now(),lastPaint=0,lastSignature='',selectedTerminal:any=null,activeTab='overview',latest:any=null;

const names={grid:'Городская сеть',inverter:'Инвертор / АКБ',generator:'Генератор',none:'Нет питания'};
const fmt=n=>Number(n).toFixed(1),clock=()=>String(Math.floor(simSeconds/3600)).padStart(2,'0')+':'+String(Math.floor(simSeconds/60)%60).padStart(2,'0');
function calc(){return calculatePower(state);}

function setScenario(name){if(!scenarios[name])return;state={...scenarios[name],speed:state.speed};activeScenario=name;simSeconds=0;lastSignature='';setTab('overview');syncControls();update(true);addLog('Сценарий: '+document.querySelector('[data-scenario="'+name+'"]').textContent.replace(/^\d+/,'').trim(),'mode');}
function syncControls(){ratingUpdate();for(const [id,k] of [['gridSwitch','grid'],['genSwitch','generator'],['invSwitch','inverter'],['chargeSwitch','chargeEnabled'],['qfGridSwitch','qfGrid'],['qfGenSwitch','qfGen'],['qfChargeSwitch','qfCharge'],['qfHomeSwitch','qfHome']])$(id).setAttribute('aria-checked',String(state[k]));$('voltage').value=state.voltage;$('voltageText').textContent=state.voltage+' В';$('soc').value=state.soc;$('socText').textContent=fmt(state.soc)+'%';$('load').value=state.load;$('loadText').textContent=fmt(state.load)+' кВт';$('atsAutoFlag').textContent=state.atsMode.toUpperCase();$('chargeFlag').textContent=state.chargerMode==='off'?'0':state.chargerMode==='generator'?'II':'I';
 $$('[data-control]').forEach(group=>{const key=group.dataset.control;group.querySelectorAll('button[data-value]').forEach(btn=>btn.classList.toggle('selected',String(state[key])===btn.dataset.value));});
 $('atsManual').style.opacity=state.atsMode==='manual'?'1':'.55';$$('[data-scenario]').forEach(b=>b.classList.toggle('active',b.dataset.scenario===activeScenario));}
function onChanged(){activeScenario='';syncControls();update(true);}
['gridSwitch','genSwitch','invSwitch','chargeSwitch','qfGridSwitch','qfGenSwitch','qfChargeSwitch','qfHomeSwitch'].forEach((id,i)=>{const key=['grid','generator','inverter','chargeEnabled','qfGrid','qfGen','qfCharge','qfHome'][i];$(id).addEventListener('click',()=>{state[key]=!state[key];onChanged();addLog({grid:'Городская сеть',generator:'Генератор',inverter:'Инвертор',chargeEnabled:'Зарядное устройство',qfGrid:'QF1 сеть',qfGen:'QF2 генератор',qfCharge:'QF3 AC IN',qfHome:'QF4 дом'}[key]+': '+(state[key]?'включено':'выключено'));});});
for(const [id,key] of [['voltage','voltage'],['soc','soc'],['load','load']])$(id).addEventListener('input',e=>{state[key]=Number((e.target as HTMLInputElement).value);onChanged();});
$$('[data-control] button').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.parentElement.dataset.control;state[key]=key==='speed'?Number(btn.dataset.value):btn.dataset.value;onChanged();if(key!=='speed')addLog('Режим '+key+': '+btn.textContent); }));
$('scenarioBar').addEventListener('click',e=>{const b=e.target.closest('[data-scenario]');if(b)setScenario(b.dataset.scenario)});
$('resetBtn').addEventListener('click',()=>setScenario('normal'));
$('showTerminals').addEventListener('click',()=>{setTab('terminals');$('details').scrollIntoView({behavior:'smooth',block:'start'});});
$('showAll').addEventListener('click',()=>{$('diagramScroll').scrollTo({left:0,behavior:'smooth'});setTab('overview');});
function addLog(message,type=''){const wrap=$('logs');const el=document.createElement('div');el.className='log';const t=document.createElement('time');t.textContent=clock();const m=document.createElement('span');m.textContent=message;el.append(t,m);wrap.prepend(el);while(wrap.children.length>20)wrap.lastChild.remove();}
// Drag positions are additional SVG transforms; the functional connection matrix never changes.
const LAYOUT_KEY='power-lab-device-layout-v5';
const DEFAULT_DEVICE_OFFSETS={grid:{x:0,y:0},qfgrid:{x:48,y:0},stab:{x:95,y:0},selector:{x:155,y:0},qfcharge:{x:225,y:0},inverter:{x:300,y:0},battery:{x:365,y:0},generator:{x:0,y:145},qfgen:{x:55,y:145},ats:{x:175,y:145},qfhome:{x:265,y:145},home:{x:350,y:145}}; const deviceOffsets={};
let dragging=null, routeFrame=0, suppressDiagramClick=false;
const routePairs={
 grid_qf:['grid_l','qfgrid_il','grid_n','qfgrid_in'],
 qf_stab:['qfgrid_ol','stab_il','qfgrid_on','stab_in'],
 stab_charge:['stab_cl','selector_gl','stab_cn','selector_gn'],
 stab_ats:['stab_al','ats_1l','stab_an','ats_1n'],
 gen_qf:['gen_cl','qfgen_il','gen_cn','qfgen_in'],
 qf_gen_charge:['qfgen_cl','selector_el','qfgen_cn','selector_en'],
 qf_gen_ats:['qfgen_al','ats_3l','qfgen_an','ats_3n'],
 charge_qf:['selector_ol','qfcharge_il','selector_on','qfcharge_in'],
 qf_inv:['qfcharge_ol','inv_il','qfcharge_on','inv_in'],
 inv_ats:['inv_ol','ats_2l','inv_on','ats_2n'],
 inv_battery:['inv_dp','bat_dp','inv_dn','bat_dn'],
 ats_qf:['ats_ol','qfhome_il','ats_on','qfhome_in'],
 qf_home:['qfhome_ol','home_il','qfhome_on','home_in']
};
const wireSets=Object.keys(routePairs).map(id=>({id,kind:id==='inv_battery'?'dc':'ac'}));
const devicePaths=[
 {id:'grid',x:55,y:110,w:190,h:135,title:'ГОРОДСКАЯ СЕТЬ',sub:'Источник · 230 В',state:'L / N'},
 {id:'stab',x:315,y:110,w:225,h:135,title:'СТАБИЛИЗАТОР',sub:'Стабилизация 230 В',state:'12 кВт (условно)'},
 {id:'qfgrid',x:252,y:122,w:56,h:106,title:'QF1',sub:'EATON',state:'Сеть'},
 {id:'generator',x:65,y:495,w:190,h:150,title:'ГЕНЕРАТОР',sub:'230 В · 2.8 кВт',state:'Ручной запуск'},
 {id:'qfgen',x:290,y:502,w:80,h:120,title:'QF2',sub:'EATON · 2P',state:'Генератор'},
 {id:'selector',x:690,y:105,w:240,h:175,title:'IEK 1-0-2',sub:'Ручной I–0–II · 2P',state:'Проверить клеммы по паспорту'},
 {id:'qfcharge',x:950,y:108,w:70,h:111,title:'QF3',sub:'EATON · 2P',state:'AC IN'},
 {id:'inverter',x:1030,y:95,w:235,h:235,title:'ИНВЕРТОР',sub:'AC IN / AC OUT',state:'9 кВт · заряд 1 кВт'},
 {id:'battery',x:1370,y:135,w:175,h:155,title:'АККУМУЛЯТОР',sub:'DC + / −',state:'15 кВт·ч'},
 {id:'ats',x:965,y:485,w:260,h:175,title:'АВР · КАСКАД 2×2P',sub:'АВР-1 + АВР-2 · 3 источника',state:'Разрыв перед включением'},
 {id:'qfhome',x:1270,y:515,w:82,h:117,title:'QF4',sub:'EATON · 2P',state:'Щит дома'},
 {id:'home',x:1370,y:495,w:175,h:150,title:'ЩИТ ДОМА',sub:'Резервные линии',state:'N-шина после АВР'}
];
const terminals=[];
const t=(id,device,port,side,polar,x,y,relation,description)=>terminals.push({id,device,port,side,polar,x,y,relation,description});
// Each dot is a FUNCTIONAL port, not a manufacturer's terminal number.
t('grid_l','grid','OUT','L', 'L',245,162,'QF1 · IN · L','Фаза городской сети, подвод к стабилизатору через защиту.');
t('grid_n','grid','OUT','N', 'N',245,182,'QF1 · IN · N','Нейтраль городской сети, ввод стабилизатора.');
t('stab_il','stab','AC IN','L','L',315,162,'QF1 · OUT · L','Фаза на вход стабилизатора.');t('stab_in','stab','AC IN','N','N',315,182,'QF1 · OUT · N','Нейтраль на вход стабилизатора.');
t('stab_cl','stab','AC OUT → CHG','L','L',540,147,'SELECTOR · I · L','Ветвь стабилизированного питания к селектору источника зарядки.');t('stab_cn','stab','AC OUT → CHG','N','N',540,167,'SELECTOR · I · N','Нейтраль ветви заряда.');
t('stab_al','stab','AC OUT → ATS','L','L',540,212,'ATS · I · L','Отдельная ветвь питания входа I АВР от стабилизатора.');t('stab_an','stab','AC OUT → ATS','N','N',540,230,'ATS · I · N','Нейтраль ветви входа I АВР.');
t('gen_cl','generator','OUT → CHG','L','L',255,525,'QF2 · IN · L','Фаза генератора на селектор питания AC IN инвертора.');t('gen_cn','generator','OUT → CHG','N','N',255,545,'QF2 · IN · N','Нейтраль генератора к селектору заряда; допустимая схема нейтрали зависит от генератора.');
t('selector_gl','selector','I · СЕТЬ','L','L',690,147,'STAB · AC OUT · L','Первый вход двухполюсного селектора источника зарядки.');t('selector_gn','selector','I · СЕТЬ','N','N',690,167,'STAB · AC OUT · N','Нейтраль первого источника.');
t('selector_el','selector','II · ГЕН','L','L',690,225,'GEN · OUT · L','Второй вход селектора заряда от генератора.');t('selector_en','selector','II · ГЕН','N','N',690,245,'GEN · OUT · N','Нейтраль второго источника.');
t('selector_ol','selector','OUT → AC IN','L','L',930,147,'QF3 · IN · L','Выход селектора к AC IN инвертора, не к выходу АВР.');t('selector_on','selector','OUT → AC IN','N','N',930,167,'QF3 · IN · N','Нейтраль на AC IN инвертора.');
t('inv_il','inverter','AC IN','L','L',1030,147,'QF3 · OUT · L','Вход инвертора для сетевого питания/зарядки, только от селектора.');t('inv_in','inverter','AC IN','N','N',1030,167,'QF3 · OUT · N','Нейтраль AC IN.');
t('inv_ol','inverter','AC OUT','L','L',1110,330,'ATS · II · L','Резервный выход инвертора на второй вход АВР.');t('inv_on','inverter','AC OUT','N','N',1134,330,'ATS · II · N','Нейтраль резервного AC OUT.');
t('inv_dp','inverter','DC BAT','+','+',1265,225,'BATTERY · DC +','Плюс аккумулятора через согласованную DC-защиту.');t('inv_dn','inverter','DC BAT','−','-',1265,245,'BATTERY · DC −','Минус аккумулятора через предусмотренную DC-схему.');
t('bat_dp','battery','DC','+','+',1370,225,'INVERTER · DC +','Положительный вывод аккумуляторной сборки.');t('bat_dn','battery','DC','−','-',1370,245,'INVERTER · DC −','Отрицательный вывод аккумуляторной сборки.');
t('ats_1l','ats','I · СЕТЬ','L','L',965,530,'STAB · AC OUT · L','Первый ввод АВР от стабилизатора.');t('ats_1n','ats','I · СЕТЬ','N','N',965,550,'STAB · AC OUT · N','Нейтраль первого ввода.');
t('ats_3l','ats','III · ГЕН','L','L',965,595,'GEN · OUT · L','Третий ввод АВР от генератора.');t('ats_3n','ats','III · ГЕН','N','N',965,615,'GEN · OUT · N','Нейтраль третьего ввода.');
t('ats_2l','ats','II · ИНВ','L','L',1110,485,'INVERTER · AC OUT · L','Второй ввод АВР от инвертора.');t('ats_2n','ats','II · ИНВ','N','N',1134,485,'INVERTER · AC OUT · N','Нейтраль второго ввода.');
t('ats_ol','ats','LOAD OUT','L','L',1225,560,'QF4 · IN · L','Выход выбранного АВР источника на щит дома.');t('ats_on','ats','LOAD OUT','N','N',1225,585,'QF4 · IN · N','Выход нейтрали выбранного источника на щит дома.');
t('home_il','home','AC IN','L','L',1370,560,'QF4 · OUT · L','Фаза от АВР на отходящие линии.');t('home_in','home','AC IN','N','N',1370,585,'QF4 · OUT · N','Нейтраль от АВР.');
// Functional breaker labels, NOT manufacturer terminal numbering.
t('qfgrid_il','qfgrid','IN','L','L',252,162,'GRID · OUT · L','QF1 вводной двухполюсный автомат.');t('qfgrid_in','qfgrid','IN','N','N',252,182,'GRID · OUT · N','N ввод QF1.');
t('qfgrid_ol','qfgrid','OUT','L','L',308,162,'STAB · AC IN · L','L на стабилизатор.');t('qfgrid_on','qfgrid','OUT','N','N',308,182,'STAB · AC IN · N','N на стабилизатор.');
t('qfgen_il','qfgen','IN','L','L',290,525,'GEN · OUT · L','L генератора через QF2.');t('qfgen_in','qfgen','IN','N','N',290,545,'GEN · OUT · N','N генератора через QF2.');
t('qfgen_cl','qfgen','OUT → CHARGE','L','L',370,535,'IEK · II · L','Выход QF2 к ручному селектору AC IN.');t('qfgen_cn','qfgen','OUT → CHARGE','N','N',370,555,'IEK · II · N','Нейтраль к IEK 1-0-2.');
t('qfgen_al','qfgen','OUT → ATS','L','L',370,580,'ATS · III · L','Ответвление QF2 к системе АВР.');t('qfgen_an','qfgen','OUT → ATS','N','N',370,600,'ATS · III · N','Нейтраль QF2 к системе АВР.');
t('qfcharge_il','qfcharge','IN','L','L',950,147,'IEK · OUT · L','L от IEK 1-0-2.');t('qfcharge_in','qfcharge','IN','N','N',950,167,'IEK · OUT · N','N от IEK 1-0-2.');
t('qfcharge_ol','qfcharge','OUT','L','L',1020,147,'INVERTER · AC IN · L','L на AC IN инвертора.');t('qfcharge_on','qfcharge','OUT','N','N',1020,167,'INVERTER · AC IN · N','N на AC IN инвертора.');
t('qfhome_il','qfhome','IN','L','L',1270,560,'ATS · LOAD OUT · L','L от АВР на QF4.');t('qfhome_in','qfhome','IN','N','N',1270,585,'ATS · LOAD OUT · N','N от АВР на QF4.');
t('qfhome_ol','qfhome','OUT','L','L',1352,560,'HOUSE · AC IN · L','L отходящих линий щита.');t('qfhome_on','qfhome','OUT','N','N',1352,585,'HOUSE · AC IN · N','N к изолированной шине резервных линий; не к общим нейтралям всех источников.');
function escapeHTML(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function boundOffset(d,x,y){const p=constrainDevice({x:d.x+x,y:d.y+y},{width:d.w,height:d.h});return {x:p.x-d.x,y:p.y-d.y};}
function getOffset(id){return deviceOffsets[id]||DEFAULT_DEVICE_OFFSETS[id]||{x:0,y:0};}
function getWorldTerminal(t){const a=getOffset(t.device);return {x:t.x+a.x,y:t.y+a.y};}
function getDevice(id){return devicePaths.find(d=>d.id===id);}
function getPortDirection(t){const d=getDevice(t.device);const eps=.1;
 if(Math.abs(t.x-d.x)<eps)return [-1,0];if(Math.abs(t.x-(d.x+d.w))<eps)return [1,0];
 if(Math.abs(t.y-d.y)<eps)return [0,-1];return [0,1];
}
function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
function restoreLayout(){try{const data=JSON.parse(localStorage.getItem(LAYOUT_KEY)||'{}');for(const d of devicePaths){const a=data[d.id];if(a&&Number.isFinite(a.x)&&Number.isFinite(a.y))deviceOffsets[d.id]=boundOffset(d,a.x,a.y)}}catch(_){}}
function saveLayout(){try{localStorage.setItem(LAYOUT_KEY,JSON.stringify(deviceOffsets))}catch(_){}}
function applyDeviceTransform(id){const a=getOffset(id),transform=`translate(${a.x} ${a.y})`;const block=$('dev-'+id);const terminalsEl=document.querySelector(`[data-terminal-group="${id}"]`);if(block)block.setAttribute('transform',transform);if(terminalsEl)terminalsEl.setAttribute('transform',transform);}
// A* router: four-way paths, bends penalized and device rectangles used as obstacles.
// Red and blue lines are independently routed; connections retain their original L/N terminals.
const ROUTE_STEP=12; let ROUTE_W=184, ROUTE_H=94;
function buildBlocked(){const blocked=new Uint8Array(ROUTE_W*ROUTE_H);const boxes=devicePaths.map(d=>{const a=getOffset(d.id);return {x:d.x+a.x-10,y:d.y+a.y-10,x2:d.x+a.x+d.w+10,y2:d.y+a.y+d.h+10};});
 for(let row=0;row<ROUTE_H;row++)for(let col=0;col<ROUTE_W;col++){
  const x=col*ROUTE_STEP,y=row*ROUTE_STEP;
  if(boxes.some(b=>x>=b.x&&x<=b.x2&&y>=b.y&&y<=b.y2))blocked[row*ROUTE_W+col]=1;
 }return blocked;
}
class MinHeap{a:any[];constructor(){this.a=[]}push(item){const a=this.a;a.push(item);let i=a.length-1;while(i>0){let p=(i-1)>>1;if(a[p].f<=item.f)break;a[i]=a[p];i=p}a[i]=item}pop(){const a=this.a,head=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(last.f<=a[c].f)break;a[i]=a[c];i=c}a[i]=last}return head}get length(){return this.a.length}}
function searchManhattan(a,b,blocked){const start=a.y*ROUTE_W+a.x,end=b.y*ROUTE_W+b.x;
 const total=ROUTE_W*ROUTE_H*5,cost=new Float32Array(total).fill(Infinity),parent=new Int32Array(total).fill(-1),heap=new MinHeap();
 // Direction 4 means start, directions 0..3 are right, down, left, up.
 const dirs=[[1,0],[0,1],[-1,0],[0,-1]],k=start*5+4;cost[k]=0;
 heap.push({node:k,f:Math.abs(a.x-b.x)+Math.abs(a.y-b.y),g:0});let finish=-1,cycles=0;
 while(heap.length&&cycles++<17000){const cur=heap.pop();if(cur.g>cost[cur.node]+.001)continue;const cell=Math.floor(cur.node/5),prevDir=cur.node%5;
 if(cell===end){finish=cur.node;break;}const x=cell%ROUTE_W,y=Math.floor(cell/ROUTE_W);
 for(let dir=0;dir<4;dir++){const xx=x+dirs[dir][0],yy=y+dirs[dir][1];if(xx<1||xx>=ROUTE_W-1||yy<1||yy>=ROUTE_H-1)continue;
  const nextCell=yy*ROUTE_W+xx;if(blocked[nextCell]&&nextCell!==end)continue;
  const next=nextCell*5+dir,g=cur.g+1+(prevDir!==4&&prevDir!==dir?.75:0);
  if(g+1e-4>=cost[next])continue;cost[next]=g;parent[next]=cur.node;heap.push({node:next,g,f:g+Math.abs(xx-b.x)+Math.abs(yy-b.y)});
 }}
 if(finish===-1)return null;const out=[];for(let i=finish;i!==-1;i=parent[i]){const cell=Math.floor(i/5);out.push({x:(cell%ROUTE_W)*ROUTE_STEP,y:Math.floor(cell/ROUTE_W)*ROUTE_STEP})}return out.reverse();
}
function simplifyPath(points){let o=[];for(const p of points){if(o.length&&Math.abs(o[o.length-1].x-p.x)<.001&&Math.abs(o[o.length-1].y-p.y)<.001)continue;
  while(o.length>=2){const u=o[o.length-2],v=o[o.length-1];if((u.x===v.x&&v.x===p.x)||(u.y===v.y&&v.y===p.y))o.pop();else break;}o.push(p);
 }return o;}
function routeConnection(fromID,toID,blocked){const source=terminals.find(t=>t.id===fromID),target=terminals.find(t=>t.id===toID);
 const p=getWorldTerminal(source),q=getWorldTerminal(target),a=getPortDirection(source),b=getPortDirection(target);
 const ps={x:p.x+a[0]*28,y:p.y+a[1]*28},qs={x:q.x+b[0]*28,y:q.y+b[1]*28};
 const start={x:clamp(Math.round(ps.x/ROUTE_STEP),1,ROUTE_W-2),y:clamp(Math.round(ps.y/ROUTE_STEP),1,ROUTE_H-2)},end={x:clamp(Math.round(qs.x/ROUTE_STEP),1,ROUTE_W-2),y:clamp(Math.round(qs.y/ROUTE_STEP),1,ROUTE_H-2)};
 blocked[start.y*ROUTE_W+start.x]=0;blocked[end.y*ROUTE_W+end.x]=0;
 const path=searchManhattan(start,end,blocked);
 let points=[p,ps,{x:start.x*ROUTE_STEP,y:ps.y},{x:start.x*ROUTE_STEP,y:start.y*ROUTE_STEP}];
 if(path)points.push(...path.slice(1));else{const mid=(ps.x+qs.x)/2;points.push({x:mid,y:start.y*ROUTE_STEP},{x:mid,y:end.y*ROUTE_STEP},{x:end.x*ROUTE_STEP,y:end.y*ROUTE_STEP});}
 points.push({x:end.x*ROUTE_STEP,y:qs.y},qs,q);
 return simplifyPath(points).map((v,i)=>`${i?'L':'M'}${Math.round(v.x)} ${Math.round(v.y)}`).join(' ');
}
function routeAllWires(){const blocked=buildBlocked(),s=latest;const html=[];
 for(const wire of wireSets){const pairs=routePairs[wire.id];for(let i=0;i<2;i++){
 const color=wire.kind==='dc'?(i?'neg':'pos'):(i?'n':'l');const path=routeConnection(pairs[i*2],pairs[i*2+1],blocked);const active=s&&s.flow[wire.id];
 html.push(`<path d="${path}" class="wirebase wire-${color}"/><path d="${path}" data-flow="${wire.id}" class="wireflow wire-${color} ${wire.kind==='dc'?'battery':''} ${active?'on':''} ${wire.id==='inv_battery'&&s&&s.dischargePower>0?'reverse':''}"/>`);
 }}$('wireLayer').innerHTML=html.join('');}
function scheduleRoutes(){if(!routeFrame)routeFrame=requestAnimationFrame(()=>{routeFrame=0;routeAllWires();});}
function svgPosition(event){const svg=$('diagram'),point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;return point.matrixTransform(svg.getScreenCTM().inverse());}
function attachDragHandlers(){const svg=$('diagram');
 svg.addEventListener('pointerdown',e=>{if(e.button!==0&&e.pointerType==='mouse')return;
  if(e.target.closest('[data-terminal]'))return;const hit=e.target.closest('.device');if(!hit)return;
  const d=getDevice(hit.dataset.device),point=svgPosition(e),off=getOffset(d.id);
  dragging={id:d.id,pointerId:e.pointerId,at:point,offset:{...off},moved:false};hit.classList.add('dragging');svg.setPointerCapture(e.pointerId);e.preventDefault();
 });
 svg.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragging.pointerId)return;
  const point=svgPosition(e),deltaX=point.x-dragging.at.x,deltaY=point.y-dragging.at.y;
  if(!dragging.moved&&Math.hypot(deltaX,deltaY)<5)return;dragging.moved=true;
  const d=getDevice(dragging.id);deviceOffsets[d.id]=boundOffset(d,dragging.offset.x+deltaX,dragging.offset.y+deltaY);
  applyDeviceTransform(d.id);expandCanvas();scheduleRoutes();e.preventDefault();
 });
 const endDrag=e=>{if(!dragging||e.pointerId!==dragging.pointerId)return;const active=dragging;dragging=null;const hit=$('dev-'+active.id);hit?.classList.remove('dragging');
  if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
  if(active.moved){suppressDiagramClick=true;saveLayout();scheduleRoutes();addLog('Перемещён блок: '+getDevice(active.id).title);setTimeout(()=>{suppressDiagramClick=false},0);}
 };
 svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
 svg.addEventListener('click',e=>{if(suppressDiagramClick){e.preventDefault();e.stopImmediatePropagation();suppressDiagramClick=false;}},true);
 $('resetLayout').addEventListener('click',()=>{for(const d of devicePaths){deviceOffsets[d.id]={...(DEFAULT_DEVICE_OFFSETS[d.id]||{x:0,y:0})};applyDeviceTransform(d.id);}expandCanvas();saveLayout();scheduleRoutes();addLog('Исходное расположение блоков восстановлено.');});
}
// Inline Lucide-style vector strokes: no CDN or network needed.
const lucidePaths={
 'zap':'<path d="m13 2-3 8h7l-6 12 1-9H5z"/>',
 'settings':'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8"/><path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1 1.8V22h-4v-.7A2 2 0 0 0 9 19.5a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1a2 2 0 0 0 .4-2.2A2 2 0 0 0 2.8 14H2v-4h.8A2 2 0 0 0 4.6 9a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 4.6 2 2 0 0 0 10 2.8V2h4v.8A2 2 0 0 0 15 4.6a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1a2 2 0 0 0-.4 2.2 2 2 0 0 0 1.8 1H22v4h-.8a2 2 0 0 0-1.8 1z"/>',
 'sliders-horizontal':'<line x1="4" y1="7" x2="14" y2="7"/><line x1="18" y1="7" x2="20" y2="7"/><circle cx="16" cy="7" r="2"/><line x1="4" y1="17" x2="6" y2="17"/><line x1="10" y1="17" x2="20" y2="17"/><circle cx="8" cy="17" r="2"/>',
 'rotate-ccw':'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
 'minus':'<path d="M5 12h14"/>', 'plus':'<path d="M12 5v14M5 12h14"/>',
 'maximize':'<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3"/>',
 'scan':'<path d="M4 7V5a1 1 0 0 1 1-1h2m10 0h2a1 1 0 0 1 1 1v2m0 10v2a1 1 0 0 1-1 1h-2m-10 0H5a1 1 0 0 1-1-1v-2"/><path d="M4 12h16"/>',
 'list-tree':'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
 'activity':'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
 'clock-3':'<circle cx="12" cy="12" r="10"/><path d="M12 6v6h5"/>',
 'arrow-left-right':'<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
 'shield-check':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
 'radio-tower':'<path d="m2 20 4-9m16 9-4-9M7 20l5-9 5 9M12 4v2m-4-2a4 4 0 0 1 8 0M5 3a7 7 0 0 1 14 0M2 22h20"/>',
 'gauge':'<path d="M12 14l4-4M3.3 17a10 10 0 1 1 17.4 0M5 20h14M12 13h.01"/>',
 'fuel':'<path d="M3 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M3 11h12M3 22h12M17 8l3 3v7a2 2 0 0 1-4 0v-5"/>',
 'cpu':'<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 1v4M15 1v4M9 19v4M15 19v4M19 9h4M19 15h4M1 9h4M1 15h4"/>',
 'battery-charging':'<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2M10 9l-2 3h4l-2 3"/>',
 'house':'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
 'split':'<circle cx="6" cy="5" r="2"/><path d="M6 7v8c0 2 2 4 4 4h8M6 12h12"/><circle cx="20" cy="12" r="2"/><circle cx="20" cy="19" r="2"/>',
 'circuit-board':'<rect x="2" y="3" width="20" height="18" rx="2"/><path d="M6 8h4v4H6zm8-1h4M14 12h4M7 16v2h9"/>',
 'plug-zap':'<path d="m13 2-3 8h7l-6 12 1-9H5z"/>'
};
function iconHTML(name,cls='ico'){return `<svg class="${cls}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${lucidePaths[name]||lucidePaths.zap}</svg>`;}
function paintIcons(){$$('[data-lucide]').forEach(el=>el.outerHTML=iconHTML(el.dataset.lucide));}
function deviceIcon(id,x,y,size=20){const map={grid:'radio-tower',stab:'gauge',generator:'fuel',selector:'arrow-left-right',inverter:'cpu',battery:'battery-charging',ats:'split',home:'house',qfgrid:'shield-check',qfgen:'shield-check',qfcharge:'shield-check',qfhome:'shield-check'};
return `<svg class="node-icon" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" stroke="#9bc7e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" aria-hidden="true">${lucidePaths[map[id]||'zap']}</svg>`;}
function renderStaticDiagram(){
 restoreLayout();expandCanvas();
 $('flowLabels').innerHTML=''; // Labels now sit inside devices, clear of draggable routes.
 $('blockLayer').innerHTML=devicePaths.map(d=>{
 const {x,y,w,h,id}=d,cx=x+w/2;let ex='';
 if(id==='grid')ex=`<g class="device-content"><g class="lucide-diagram-icon" transform="translate(${x+45} ${y+72}) scale(2.25)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${lucidePaths['radio-tower']}</g><text x="${x+131}" y="${y+101}" text-anchor="middle" font-size="16" font-weight="750" fill="#76cdfd">230 В</text></g>`;
 if(id==='stab')ex=`<g class="device-content"><rect class="minor-box" x="${cx-53}" y="${y+71}" width="106" height="35" rx="7"/><text id="svgStabVoltage" x="${cx}" y="${y+94}" fill="#65f1c3" text-anchor="middle" font-size="16" font-weight="750">230 В</text></g>`;
  if(id==='generator')ex=`<g class="device-content" id="generatorSpinner"><g class="generator-fan" transform="translate(${cx} ${y+94})"><g class="spinner"><g transform="scale(1.28) translate(-12 -12)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z"/><path d="M12 12v.01"/></g></g></g></g>`;
 if(id==='selector')ex=`<g class="device-content"><rect class="minor-box" x="${cx-63}" y="${y+78}" width="126" height="41" rx="7"/><text id="svgSelector" x="${cx}" y="${y+105}" text-anchor="middle" font-size="13" font-weight="700" fill="#c1dcf2">I / 0 / II</text><text x="${cx}" y="${y+139}" text-anchor="middle" font-size="10" fill="#7b9db8">РУЧНОЕ ПЕРЕКЛЮЧЕНИЕ</text></g>`;
 if(id==='inverter')ex=`<g class="device-content"><rect class="minor-box" x="${cx-70}" y="${y+82}" width="140" height="69" rx="9"/><path d="M${cx-54} ${y+117} Q${cx-42} ${y+90} ${cx-28} ${y+117} T${cx+5} ${y+117} T${cx+38} ${y+117} T${cx+54} ${y+117}" stroke="#59eebd" fill="none" stroke-width="2.5"/><text x="${cx}" y="${y+179}" font-size="11" fill="#a4c5e1" text-anchor="middle" id="svgInvText">ОЖИДАНИЕ</text><text x="${cx}" y="${y+199}" text-anchor="middle" font-size="11" fill="#829cb4">AC IN / AC OUT</text></g>`;
 if(id==='battery')ex=`<g class="device-content"><text x="${cx}" y="${y+82}" text-anchor="middle" font-size="20" font-weight="800" fill="#85eac7" id="svgSoc">65%</text><rect x="${cx-29}" y="${y+99}" width="58" height="29" rx="5" fill="#17283b" stroke="#46647a"/><rect x="${cx+29}" y="${y+106}" width="6" height="14" rx="2" fill="#46647a"/><rect id="svgBatteryFill" x="${cx-25}" y="${y+103}" width="35" height="21" rx="3" fill="#39d69a"/></g>`;
 if(id==='ats')ex=`<g class="device-content"><rect class="minor-box" x="${cx-78}" y="${y+78}" width="156" height="47" rx="9"/><text id="svgAts" x="${cx}" y="${y+107}" font-size="14" font-weight="760" text-anchor="middle" fill="#adccdf">I / II / III</text><text x="${cx}" y="${y+140}" text-anchor="middle" font-size="10" fill="#91adbf">АВР-1 СЕТЬ/ИНВ · АВР-2 /ГЕН</text></g>`;
 if(id==='home')ex=`<g class="device-content"><g class="lucide-diagram-icon" transform="translate(${cx-25} ${y+69}) scale(2.1)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${lucidePaths.house}</g><text x="${cx}" y="${y+132}" text-anchor="middle" font-size="11" fill="#9bb6ca" id="svgHomeText">1.8 кВт</text><rect x="${cx-62}" y="${y+137}" width="124" height="10" rx="3" fill="#172b43" stroke="#4d779e"/><text x="${cx}" y="${y+145}" text-anchor="middle" font-size="8" fill="#86b9f4">N — шина резерва</text></g>`;
 if(id.startsWith('qf'))ex=`<g class="device-content"><rect x="${cx-9}" y="${y+63}" width="18" height="17" rx="2" fill="#172a40" stroke="#52738d"/><path id="lever-${id}" d="M${cx-4} ${y+75}l8 -8" stroke="#46d6a6" stroke-width="3" stroke-linecap="round"/></g>`;
 const footer=id==='home'?'':`<text class="micro" x="${cx}" y="${y+h-13}" text-anchor="middle">${escapeHTML(d.state)}</text>`;
 return `<g class="device" id="dev-${id}" tabindex="0" data-device="${id}" role="button" aria-label="${escapeHTML(d.title)}: перетаскивание или подробности"><rect class="main" x="${x}" y="${y}" width="${w}" height="${h}" rx="15"/><circle class="state-dot" cx="${x+w-15}" cy="${y+14}" r="4.5"/><text class="name" x="${cx}" y="${y+27}" text-anchor="middle" data-fit="${id}">${escapeHTML(d.title)}</text><text class="minor" x="${cx}" y="${y+47}" text-anchor="middle" data-fit="${id}">${escapeHTML(d.sub)}</text><line class="header-divider" x1="${x+13}" x2="${x+w-13}" y1="${y+57}" y2="${y+57}"/>${id.startsWith('qf')?'':deviceIcon(id,x+10,y+13,14)}${ex}${footer}</g>`;
 }).join('');
 $('terminalLayer').innerHTML=devicePaths.map(d=>`<g class="terminal-set" data-terminal-group="${d.id}">`+terminals.filter(t=>t.device===d.id).map(t=>{
  const left=t.x===d.x,vertical=t.y===d.y||t.y===d.y+d.h,special=(d.id==='inverter'&&t.port==='AC OUT')||(d.id==='ats'&&t.port==='II · ИНВ');
  const tx=special?t.x:t.x+(left?10:-10),ty=special?t.y+(d.id==='ats'?21:-10):t.y+3;
  return `<g role="button" aria-label="${escapeHTML(t.device+' '+t.port+' '+t.side)}" data-terminal="${t.id}" tabindex="0"><circle class="port-dot" data-terminal="${t.id}" cx="${t.x}" cy="${t.y}" r="6.5" fill="${t.polar==='L'?'#fc677b':t.polar==='N'?'#51a6ff':t.polar==='+'?'#ffbd67':'#b4a1ff'}"/><text class="port-tag" x="${tx}" y="${ty}" text-anchor="${special?'middle':left?'start':'end'}">${escapeHTML(t.side)}</text><title>${escapeHTML(t.device.toUpperCase()+' · '+t.port+' · '+t.side+' → '+t.relation)}</title></g>`;
 }).join('')+'</g>').join('');
 for(const d of devicePaths){applyDeviceTransform(d.id);for(const label of $$(`[data-fit="${d.id}"]`)){let font=label.classList.contains('name')?(d.w<90?12:14):(d.w<90?9:11);label.style.fontSize=font+'px';while(label.getComputedTextLength()>d.w-28&&font>8){font--;label.style.fontSize=font+'px';}}}
 routeAllWires();attachDragHandlers();
 $('diagram').addEventListener('click',e=>{const t=e.target.closest('[data-terminal]');if(t){selectTerminal(t.dataset.terminal);return;}const dev=e.target.closest('[data-device]');if(dev)selectDevice(dev.dataset.device);});
  $('diagram').addEventListener('keydown',e=>{const hit=e.target.closest('[data-terminal],[data-device]');if(!hit)return;const arrows={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};const direction=arrows[e.key];if(direction&&hit.dataset.device){e.preventDefault();const d=getDevice(hit.dataset.device),a=getOffset(d.id);deviceOffsets[d.id]=boundOffset(d,a.x+direction[0],a.y+direction[1]);applyDeviceTransform(d.id);expandCanvas();scheduleRoutes();saveLayout();return;}if(e.key==='Enter'||e.key===' '){e.preventDefault();if(hit.dataset.terminal)selectTerminal(hit.dataset.terminal);else selectDevice(hit.dataset.device);}});
}
function statusText(id,s){switch(id){case 'grid':return state.grid?'ВКЛ, '+state.voltage+' В':'ОТКЛ';case 'stab':return s.gridSafe?'РАБОТАЕТ':'НЕТ ВЫХОДА';case 'generator':return s.genReady?'РАБОТАЕТ':'ОСТАНОВЛЕН';case 'selector':return s.chargeFrom==='grid'?'I · СЕТЬ':s.chargeFrom==='generator'?'II · ГЕНЕРАТОР':'НЕТ ЗАРЯДА';case 'inverter':return s.source==='inverter'?'ИНВЕРТ.: AC OUT':s.chargePower>0?'ЗАРЯД: AC IN':state.inverter?'ОЖИДАНИЕ':'ВЫКЛ';case 'battery':return fmt(state.soc)+'%';case 'ats':return s.atsSource==='grid'?'I · СЕТЬ':s.atsSource==='inverter'?'II · ИНВЕРТОР':s.atsSource==='generator'?'III · ГЕНЕРАТОР':'ОТКЛЮЧЕНО';case 'home':return s.source==='none'?'БЕЗ СВЕТА':'ПИТАНИЕ ЕСТЬ';case 'qfgrid':return state.qfGrid?'ВКЛ':'ОТКЛ';case 'qfgen':return state.qfGen?'ВКЛ':'ОТКЛ';case 'qfcharge':return state.qfCharge?'ВКЛ':'ОТКЛ';case 'qfhome':return state.qfHome?'ВКЛ':'ОТКЛ';default:return '—';}}
function update(refreshDetails=false){const s=calc();latest=s;
 $('kGrid').textContent=state.grid?state.voltage+' В':'НЕТ СЕТИ';$('kGrid').className='big '+(s.gridSafe?'green':state.grid?'amber':'red');$('kGridSub').textContent=s.gridSafe?'Стабилизатор: выход 230 В':state.grid?'За допустимым диапазоном (демо)':'Городская сеть отсутствует';
 $('kHome').textContent=s.source==='none'?'НЕТ СВЕТА':({grid:'СЕТЬ',inverter:'ИНВЕРТОР',generator:'ГЕНЕРАТОР'}[s.source]);$('kHome').className='big '+(s.source==='none'?'red':s.source==='generator'?'amber':'green');$('kHomeSub').textContent=s.source==='none'?'АВР не смог выбрать питание':fmt(state.load)+' кВт · источник '+({grid:'I',inverter:'II',generator:'III'}[s.source]);
 $('kBattery').textContent=fmt(state.soc)+'%';$('kBattery').className='big '+(state.soc<=LIMIT.MIN_SOC?'red':state.soc<20?'amber':'green');$('kBatterySub').textContent=fmt(state.soc*LIMIT.CAP/100)+' кВт·ч из '+fmt(LIMIT.CAP)+' кВт·ч';
 $('kCharge').textContent=fmt(s.chargePower)+' кВт';$('kCharge').className='big '+(s.chargePower?'green':'');$('kChargeSub').textContent=s.chargePower?('Заряд от '+(s.chargeFrom==='grid'?'сети':'генератора')):(s.blocking?'Блокировка при работе AC OUT':state.soc>=99.95?'АКБ заряжен':'Заряд отсутствует');
 $('kGenerator').textContent=s.genReady?'РАБОТАЕТ':'ВЫКЛ';$('kGenerator').className='big '+(s.genReady?'amber':'');$('kGeneratorSub').textContent=s.genReady?(fmt((s.source==='generator'?state.load:0)+(s.chargeFrom==='generator'?s.chargePower:0))+' кВт потребляется'):'Резерв '+fmt(LIMIT.GEN)+' кВт';
 $('systemLed').className='led '+(s.source==='none'?'no':s.warnings.length?'warn':'yes');$('systemShort').textContent=s.source==='none'?'Дом обесточен':s.warnings.length?'Есть ограничения':'Питание в норме';
 $('activeSource').textContent=names[s.source];$('activeCharge').textContent=s.chargePower>0?(s.chargeFrom==='grid'?'Стабилизатор · 230 В':'Генератор · 230 В'):'Не заряжается';$('activeLoad').textContent=fmt(s.source==='none'?0:state.load)+' кВт / запрос '+fmt(state.load);let balance=s.chargePower-s.dischargePower;$('batteryBalance').textContent=(balance>0?'+':'')+fmt(balance)+' кВт';$('batteryBalance').style.color=balance>0?'#39d69a':balance<0?'#ffbd67':'#d2e2ef';$('batteryEnergy').textContent=(state.soc*LIMIT.CAP/100).toFixed(2)+' / '+LIMIT.CAP.toFixed(2)+' кВт·ч';$('batteryFill').style.width=state.soc+'%';$('batteryFill').classList.toggle('charging',s.chargePower>0);$('warnings').textContent=s.warnings.length?s.warnings[0]:'Нет критических событий';$('warnings').style.color=s.warnings.length?'#ffbd67':'#39d69a';$('simTime').textContent=clock();
 // SVG highlights and animated live conductor segments.
 $$('[data-flow]').forEach(p=>{p.classList.toggle('on',!!s.flow[p.dataset.flow]);p.classList.toggle('reverse',p.dataset.flow==='inv_battery'&&s.dischargePower>0);});
 const states={qfgrid:s.gridFeed?'live':state.qfGrid?'':'warn',qfgen:s.genFeed?'live':state.qfGen?'':'warn',qfcharge:s.chargePower>0?'live':state.qfCharge?'':'warn',qfhome:s.source!=='none'?'live':state.qfHome?'':'warn',grid:state.grid?'live':'',stab:s.gridSafe?'live':state.grid?'warn':'',generator:s.genReady?'live':'',selector:s.chargePower?'live':'',inverter:(s.source==='inverter'||s.chargePower)?'live':state.inverter?'':'failed',battery:state.soc>LIMIT.MIN_SOC?'live':'warn',ats:s.atsSource!=='none'?'live':'failed',home:s.source!=='none'?'live':'failed'};
 devicePaths.forEach(d=>{if(d.id.startsWith('qf')){const lever=$('lever-'+d.id);if(lever)lever.setAttribute('stroke',state[({qfgrid:'qfGrid',qfgen:'qfGen',qfcharge:'qfCharge',qfhome:'qfHome'})[d.id]]?'#46d6a6':'#f09a77');}const el=$('dev-'+d.id);el.classList.toggle('live',states[d.id]==='live');el.classList.toggle('warn',states[d.id]==='warn');el.classList.toggle('failed',states[d.id]==='failed');el.setAttribute('aria-label',d.title+': '+statusText(d.id,s));});
 $('svgStabVoltage').textContent=s.gridSafe?'230 V':'--- V';$('svgStabVoltage').setAttribute('fill',s.gridSafe?'#65f1c3':'#eaa67d');$('svgSelector').textContent=state.chargerMode==='grid'?'I · СЕТЬ':state.chargerMode==='generator'?'II · ГЕН':'0 · ОТКЛ';$('svgInvText').textContent=s.chargePower?'ЗАРЯД '+fmt(s.chargePower)+' кВт':s.source==='inverter'?'ИНВЕРТИРУЕТ':'ОЖИДАНИЕ';$('svgAts').textContent={grid:'I · СЕТЬ',inverter:'II · ИНВ',generator:'III · ГЕН',none:'НЕТ ИСТОЧНИКА'}[s.atsSource];$('svgSoc').textContent=Math.round(state.soc)+'%';$('svgBatteryFill').setAttribute('width',Math.max(0,49*state.soc/100));$('svgBatteryFill').setAttribute('fill',s.chargePower?'#39d69a':s.dischargePower?'#ffbd67':'#66aabb');$('svgHomeText').textContent=s.source==='none'?'0 кВт':fmt(state.load)+' кВт';$('generatorSpinner').classList.toggle('spin-off',!s.genReady);$('diagram').classList.toggle('paused',state.speed===0);
 $('voltageText').textContent=state.voltage+' В';$('socText').textContent=fmt(state.soc)+'%';$('loadText').textContent=fmt(state.load)+' кВт';if(document.activeElement!==$('soc'))$('soc').value=Math.round(state.soc);
 const signature=[s.source,s.chargeFrom,s.chargePower>0,s.gridSafe,s.genReady,s.warnings.join(';')].join('|');if(lastSignature&&signature!==lastSignature){if(s.source!==lastSignature.split('|')[0])addLog('АВР: '+names[s.source]);if((s.chargeFrom!==lastSignature.split('|')[1]||String(s.chargePower>0)!==lastSignature.split('|')[2]))addLog('Зарядка: '+(s.chargePower?names[s.chargeFrom]:'остановлена'));}lastSignature=signature;
 if(refreshDetails || activeTab==='selection')renderDetails();return s;
}
function selectTerminal(id){selectedTerminal=terminals.find(t=>t.id===id);$$('.port-dot').forEach(el=>el.classList.toggle('chosen',el.dataset.terminal===id));setTab('selection');$('details').scrollIntoView({behavior:'smooth',block:'start'});}
function selectDevice(id){selectedTerminal=null;const dev=devicePaths.find(d=>d.id===id);if(dev){selectedTerminal={device:id,port:'Все клеммы',side:'L / N',relation:'',description:'Нажмите на отдельную клемму в схеме или найдите её в таблице ниже.',isDevice:true};setTab('selection');$('details').scrollIntoView({behavior:'smooth',block:'start'});}}
function setTab(tab){activeTab=tab;$$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));renderDetails();}
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
function renderDetails(){const s=latest||calc();let html='';
 if(activeTab==='overview'){
  html=`<h3>Что происходит прямо сейчас</h3><p>Чтобы изменить расположение схемы, <b>перетащите любой корпус устройства</b>. Контакты и анимированные провода переместятся вместе с ним. Кнопка «<span data-lucide="rotate-ccw"></span> Сброс блоков» восстановит первоначальный вид.</p><p>${s.source==='grid'?'Стабилизатор получает городскую сеть и подаёт питание на вход I АВР.':s.source==='inverter'?'Городской ввод недоступен для нагрузки. АВР выбрал вход II: инвертор разряжает аккумулятор и питает дом.':s.source==='generator'?'АВР выбрал вход III и питает дом от запущенного генератора.':'АВР не может подать питание в дом: выбранный источник недоступен или мощность превышена.'} ${s.chargePower>0?'Одновременно отдельный селектор подаёт на AC IN питание от '+(s.chargeFrom==='grid'?'стабилизатора':'генератора')+' для заряда аккумулятора.':'Сейчас заряд аккумулятора не идёт; IEK 1-0-2 не переключается автоматически.'}</p><div class="callout"><b>Принцип двух независимых коммутаций:</b> Система АВР (каскад двух 2P аппаратов) выбирает один из трёх источников (сеть / инвертор / генератор). Ручной IEK 1-0-2 выбирает только один источник для AC IN инвертора (сеть после стабилизатора / генератор). Выход АВР <b>никогда не соединяется</b> со входом AC IN.</div><ul class="help-list"><li>Зажмите тумблер <b>«Городская сеть»</b> в положении «выкл»: АВР перейдёт на инвертор при достаточном заряде.</li><li>Включите генератор и выберите <b>«III · Ген.»</b> в ручном режиме АВР, затем источник заряда <b>«Ген.»</b>: генератор запитает дом и зарядит АКБ.</li><li>Уменьшите заряд АКБ до 3%: инвертор перестанет быть доступным источником; при запущенном генераторе АВР сможет перейти на него в автоматическом режиме.</li><li>Изменяйте нагрузку и напряжение, чтобы увидеть ограничение мощности и диапазона стабилизации.</li></ul>`;
 }else if(activeTab==='terminals'){
 const groups=[['grid','Городская сеть'],['stab','Стабилизатор'],['generator','Генератор'],['qfgrid','QF1 · Сеть'],['qfgen','QF2 · Генератор'],['selector','IEK 1-0-2'],['qfcharge','QF3 · AC IN'],['inverter','Инвертор'],['battery','АКБ'],['ats','Каскад АВР-1 + АВР-2'],['qfhome','QF4 · Дом'],['home','Щит / N-шина']];
 html=`<h3>Матрица соединений — функциональные клеммы</h3><p>Показаны все контакты L/N (для батареи DC +/−). Разветвления выходов сети и генератора означают <b>распределительные узлы с подходящей защитой</b>, а не обязательно дополнительные штатные клеммы устройства. Нажмите строку, чтобы открыть описание.</p><div style="overflow:auto"><table class="term-table"><thead><tr><th>Устройство</th><th>Назначение</th><th>Провод</th><th>Подключить к</th></tr></thead><tbody>`;
 for(const [id,name] of groups){for(const v of terminals.filter(t=>t.device===id))html+=`<tr style="cursor:pointer" data-term-row="${v.id}"><td>${name}</td><td><span class="mono">${escapeHTML(v.port)}</span></td><td><span class="pill" style="color:${v.polar==='L'?'#fc677b':v.polar==='N'?'#70beff':'#ffbd67'}">${escapeHTML(v.side)}</span></td><td>${escapeHTML(v.relation)}</td></tr>`;}html+='</tbody></table></div>';
 }else if(activeTab==='selection'){
 if(!selectedTerminal)html=`<h3>Выберите клемму на схеме</h3><p>Круглые красные и синие контакты кликабельны. Красный — фаза L, синий — нейтраль N. Для аккумулятора применяются DC + и −.</p>`;
 else{
 const t=selectedTerminal;const d=devicePaths.find(x=>x.id===t.device);let deviceTerminals=terminals.filter(v=>v.device===t.device);
 html=`<h3>${d?d.title:escapeHTML(t.device)} · ${escapeHTML(t.port)}</h3><p>${escapeHTML(t.description)}</p>${!t.isDevice?`<div class="status-pair"><span>Проводник</span><b>${escapeHTML(t.side)}</b></div><div class="status-pair"><span>Куда подключён по функциональной схеме</span><b>${escapeHTML(t.relation)}</b></div>`:''}<div class="status-pair"><span>Текущий статус устройства</span><b>${escapeHTML(statusText(t.device,s))}</b></div><div class="callout">Это функциональные наименования, <b>не номера клемм производителя</b>. Для IEK 1-0-2 общий контакт находится сверху; фактические обозначения проверяют по паспорту. Для реального подключения требуется точный паспорт инвертора, генератора, стабилизатора и аппаратов коммутации.</div><h3>Контакты этого узла</h3><div style="overflow:auto"><table class="term-table"><thead><tr><th>Порт</th><th>L / N / DC</th><th>Подключение</th></tr></thead><tbody>`;
 deviceTerminals.forEach(v=>html+=`<tr data-term-row="${v.id}" style="cursor:pointer"><td class="mono">${escapeHTML(v.port)}</td><td>${escapeHTML(v.side)}</td><td>${escapeHTML(v.relation)}</td></tr>`);html+='</tbody></table></div>';
 }
 }else{
 html=`<h3>Важные ограничения симулятора</h3><div class="callout"><b>Не использовать как монтажную схему.</b> Реальные клеммы, порядок разрыва N, связь N–PE, работа защит и логика встроенного байпаса инвертора определяются паспортами оборудования и типом системы заземления.</div><ul class="help-list"><li><b>PE здесь специально не нарисован по требованию визуализации.</b> Это не означает, что его можно исключить из реального подключения. PE должен сохранять защитную непрерывность и не коммутироваться АВР.</li><li><b>Двухполюсное разделение L/N</b> в симуляции условное. Реальная коммутация нейтрали зависит от TN-C, TN-S, TN-C-S, TT, конструкции генератора и инвертора. PEN никогда не разрывают.</li><li><b>АВР-1 + АВР-2</b> — функциональный каскад двух 2P аппаратов с взаимной блокировкой источников и разрывом перед включением. Обычный двухвходовой АВР не становится трёхвходовым от добавления провода.</li><li><b>IEK 1-0-2 — ручной 2P 40 А с верхним общим контактом.</b> Его положения I/0/II нужны, чтобы AC IN получал сеть после стабилизатора или генератор, но никогда одновременно. АВР домашней нагрузки не обеспечивает этой функции сам по себе.</li><li><b>AC IN + AC OUT одновременно:</b> режимы bypass, UPS, charging while inverting у инверторов различаются. В этом симуляторе одновременный заряд через AC IN и питание дома от батарейного AC OUT заблокированы как консервативное упрощение.</li><li><b>Защита:</b> QF1–QF4 показаны условно; DC предохранители/разъединители, УЗО/дифзащита и заземление не детализированы визуально, но должны быть рассчитаны и предусмотрены в реальном щите.</li><li><b>Мощности и пределы</b> задаются в панели параметров; по умолчанию генератор 2.8 кВт, инвертор 9 кВт, АКБ 15 кВт·ч. Номиналы QF и АВР требуют инженерной проверки, расчёт здесь справочный.</li></ul>`;
 }
 $('detailBody').innerHTML=html;
 $$('[data-term-row]').forEach(tr=>tr.addEventListener('click',()=>selectTerminal(tr.dataset.termRow)));
}
function animate(ts){const delta=Math.min((ts-lastFrame)/1000,.25);lastFrame=ts;const simDelta=delta*state.speed*60;if(simDelta>0){const s=latest||calc();simSeconds+=simDelta;let net=s.chargePower*.92-s.dischargePower;let next=Math.max(0,Math.min(100,state.soc+(net/LIMIT.CAP)*100*(simDelta/3600)));if(Math.abs(next-state.soc)>0.000001){state.soc=next;}}
 if(ts-lastPaint>180){update(false);lastPaint=ts;}requestAnimationFrame(animate);}

// Infinite-feeling canvas navigation: buttons, fit, Ctrl+wheel, shift+drag, double tap.
let zoom=1;
let canvasW=1600,canvasH=755;
function expandCanvas(){const bounds=canvasSize(devicePaths.map(d=>{const a=getOffset(d.id);return {x:d.x+a.x,y:d.y+a.y,width:d.w,height:d.h}}));let w=bounds.width,h=bounds.height;if(w===canvasW&&h===canvasH)return;canvasW=w;canvasH=h;const svg=$('diagram');svg.setAttribute('viewBox','0 0 '+canvasW+' '+canvasH);const bg=svg.querySelector('rect[fill="url(#dots)"]');if(bg){bg.setAttribute('width',canvasW);bg.setAttribute('height',canvasH)}svg.style.width=canvasW*zoom+'px';svg.style.height=canvasH*zoom+'px';ROUTE_W=Math.ceil(canvasW/ROUTE_STEP)+1;ROUTE_H=Math.ceil(canvasH/ROUTE_STEP)+1;}
function setZoom(next,anchor?:any){
 const sc=$('diagramScroll'),rect=sc.getBoundingClientRect(),old=zoom;
 zoom=Math.max(.18,Math.min(2.5,Math.round(next*100)/100));
 const x=anchor?anchor.x-rect.left:sc.clientWidth/2,y=anchor?anchor.y-rect.top:sc.clientHeight/2;
 const worldX=(sc.scrollLeft+x)/old,worldY=(sc.scrollTop+y)/old;
 const svg=$('diagram');svg.style.width=canvasW*zoom+'px';svg.style.height=canvasH*zoom+'px';
 sc.scrollLeft=worldX*zoom-x;sc.scrollTop=worldY*zoom-y;
 $('zoomLabel').textContent=Math.round(zoom*100)+'%';
}
function fitDiagram(){const sc=$('diagramScroll');setZoom(Math.min(1,Math.max(.18,(sc.clientWidth-22)/canvasW)));sc.scrollLeft=0;sc.scrollTop=0;}
$('showAll').addEventListener('click',fitDiagram);
$('exitFullscreen').addEventListener('click',()=>{if(document.fullscreenElement)void document.exitFullscreen()});
$('fullscreenDiagram').addEventListener('click',async()=>{const stage=$('diagramStage');try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen()}catch(e){addLog('Полноэкранный режим недоступен в этом браузере')}});
$('zoomIn').addEventListener('click',()=>setZoom(zoom*1.2));$('zoomOut').addEventListener('click',()=>setZoom(zoom/1.2));$('zoomFit').addEventListener('click',fitDiagram);
$('diagramScroll').addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();setZoom(zoom*(e.deltaY<0?1.12:.89),{x:e.clientX,y:e.clientY});}},{passive:false});
let panning=null;
$('diagram').addEventListener('pointerdown',e=>{if(!e.shiftKey||e.target.closest('.device,[data-terminal]'))return;panning={x:e.clientX,y:e.clientY,sl:$('diagramScroll').scrollLeft,st:$('diagramScroll').scrollTop,pid:e.pointerId};$('diagramScroll').classList.add('grab-pan');$('diagram').setPointerCapture(e.pointerId);e.preventDefault();},true);
$('diagram').addEventListener('pointermove',e=>{if(!panning||e.pointerId!==panning.pid)return;$('diagramScroll').scrollLeft=panning.sl-(e.clientX-panning.x);$('diagramScroll').scrollTop=panning.st-(e.clientY-panning.y);e.preventDefault();},true);
['pointerup','pointercancel'].forEach(type=>$('diagram').addEventListener(type,e=>{if(!panning||e.pointerId!==panning.pid)return;panning=null;$('diagramScroll').classList.remove('grab-pan');},true));
// Mobile: two-finger pinch scale without triggering block drag.
let gesture=null;const scroll=$('diagramScroll');
scroll.addEventListener('touchstart',e=>{if(e.touches.length===2){gesture={dist:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),start:zoom};}},{passive:true});
scroll.addEventListener('touchmove',e=>{if(!gesture||e.touches.length!==2)return;const a=e.touches[0],b=e.touches[1];e.preventDefault();setZoom(gesture.start*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/gesture.dist,{x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});},{passive:false});
scroll.addEventListener('touchend',e=>{if(e.touches.length<2)gesture=null;});
paintIcons();
renderStaticDiagram();syncControls();setTab('overview');fitDiagram();update(true);addLog('Симулятор запущен. Сеть и инвертор готовы.');requestAnimationFrame(ts=>{lastFrame=ts;requestAnimationFrame(animate)});
