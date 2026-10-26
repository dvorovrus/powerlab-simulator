import {Card} from './ui/card';
type Metric={title:string;id:string;value:string;subId:string;subtitle:string};
const metrics:Metric[]=[
 {title:'Городская сеть',id:'kGrid',value:'230 В',subId:'kGridSub',subtitle:'Стабилизатор в норме'},
 {title:'Питание дома',id:'kHome',value:'СЕТЬ',subId:'kHomeSub',subtitle:'1.8 кВт · через АВР'},
 {title:'Аккумулятор',id:'kBattery',value:'65.0%',subId:'kBatterySub',subtitle:'Накопитель 15 кВт·ч'},
 {title:'Зарядка АКБ',id:'kCharge',value:'0.0 кВт',subId:'kChargeSub',subtitle:'Нет питания AC IN'},
 {title:'Генератор',id:'kGenerator',value:'ВЫКЛ',subId:'kGeneratorSub',subtitle:'Резерв 5.0 кВт'},
];
export function Kpis(){return <section className="kpis" aria-label="Показатели системы">{metrics.map(m=><Card className="kpi" key={m.id}><div className="eyebrow">{m.title}</div><div className="big" id={m.id}>{m.value}</div><div className="sub" id={m.subId}>{m.subtitle}</div></Card>)}</section>;}
