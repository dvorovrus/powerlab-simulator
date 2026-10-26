/** Deterministic, side-effect free electrical simulation engine. Units: V, kW, kWh, %. */
export type PowerSource='grid'|'generator'|'inverter'|'none';
export type ChargeSource='grid'|'generator'|'off'|'none';
export type AtsMode='auto'|'manual';
export interface PowerState {grid:boolean;voltage:number;generator:boolean;inverter:boolean;atsMode:AtsMode;atsManual:Exclude<PowerSource,'none'>;chargerMode:Exclude<ChargeSource,'none'>;chargeEnabled:boolean;qfGrid:boolean;qfGen:boolean;qfCharge:boolean;qfHome:boolean;soc:number;load:number;speed:number}
export interface PowerResult {gridPhysical:boolean;gridFeed:boolean;gridSafe:boolean;gridOk:boolean;genReady:boolean;genFeed:boolean;genOk:boolean;invReady:boolean;invOk:boolean;source:PowerSource;atsSource:PowerSource;desiredCharge:ChargeSource;chargeFrom:ChargeSource;chargePower:number;dischargePower:number;remaining:number;blocking:boolean;warnings:string[];flow:Record<string,boolean>}
const fmt=(n:number)=>n.toFixed(1);
export const LIMIT={STAB:12,GEN:5.0,INV:9,CHARGE:1.0,CAP:15,MIN_SOC:5,LOW_V:90,HIGH_V:310};
export const INITIAL: PowerState={grid:true,voltage:230,generator:false,inverter:true,atsMode:'auto',atsManual:'grid',chargerMode:'grid',chargeEnabled:true,qfGrid:true,qfGen:true,qfCharge:true,qfHome:true,soc:65,load:1.8,speed:1};
export const scenarios: Record<string,PowerState>={
 normal:{...INITIAL},
 outage:{...INITIAL,grid:false,soc:68},
 generator:{...INITIAL,grid:false,generator:true,atsMode:'manual',atsManual:'generator',chargeEnabled:false,soc:45},
 gencharge:{...INITIAL,grid:false,generator:true,atsMode:'manual',atsManual:'generator',chargerMode:'generator',soc:38},
 lowbat:{...INITIAL,grid:false,generator:false,soc:3},
 lowvoltage:{...INITIAL,grid:true,voltage:155,soc:62},
 restore:{...INITIAL,grid:true,generator:true,soc:35},
 overload:{...INITIAL,grid:false,generator:true,load:10.5,soc:55}
};
export function calculatePower(state:PowerState):PowerResult{
 const gridPhysical=state.grid,gridFeed=state.grid&&state.qfGrid, gridSafe=gridFeed && state.voltage>=LIMIT.LOW_V&&state.voltage<=LIMIT.HIGH_V;
 const gridOk=gridSafe&&state.load<=LIMIT.STAB,genReady=state.generator,genFeed=genReady&&state.qfGen,genOk=genFeed&&state.load<=LIMIT.GEN,invReady=state.inverter&&state.soc>LIMIT.MIN_SOC,invOk=invReady&&state.load<=LIMIT.INV;
 const ok:Record<Exclude<PowerSource,'none'>,boolean>={grid:gridOk,inverter:invOk,generator:genOk};
 let source: PowerSource='none';
 if(state.atsMode==='auto') source=(['grid','inverter','generator'] as const).find(x=>ok[x])||'none';
 else source=ok[state.atsManual]?state.atsManual:'none';
 const atsSource=source;if(!state.qfHome)source='none';
 let desiredCharge: ChargeSource = state.chargerMode;
 if(!state.inverter||!state.chargeEnabled||!state.qfCharge||state.chargerMode==='off') desiredCharge='none';
 if(desiredCharge==='grid'&&!gridSafe)desiredCharge='none';
 if(desiredCharge==='generator'&&!genFeed)desiredCharge='none';
 const blocking=source==='inverter'&&desiredCharge!=='none';
 const chargeFrom: ChargeSource=blocking?'none':desiredCharge;
 const sourceLoad={grid:source==='grid'?state.load:0,generator:source==='generator'?state.load:0};
 const remaining=chargeFrom==='grid'?LIMIT.STAB-sourceLoad.grid:chargeFrom==='generator'?LIMIT.GEN-sourceLoad.generator:0;
 const chargePower=(chargeFrom==='none'||state.soc>=99.95)?0:Math.max(0,Math.min(LIMIT.CHARGE,remaining));
 const dischargePower=source==='inverter'?state.load/0.9:0;
 const warnings:string[]=[];
 if(gridFeed&&!gridSafe)warnings.push('Напряжение за диапазоном стабилизатора (90–310 В)');
 if(!state.qfHome)warnings.push('QF4 отключён: линии дома обесточены');
 else if(!source || source==='none')warnings.push('Дом обесточен: нет доступного источника необходимой мощности');
 if(genFeed&&state.load>LIMIT.GEN&&source!=='grid')warnings.push('Нагрузка превышает мощность генератора '+fmt(LIMIT.GEN)+' кВт');
 if(state.load>LIMIT.INV&&!gridOk)warnings.push('Для инвертора нагрузка выше лимита '+fmt(LIMIT.INV)+' кВт');
 if(blocking)warnings.push('Заряд через AC IN блокирован при работе AC OUT на дом (модельное ограничение)');
 if(state.soc<=LIMIT.MIN_SOC)warnings.push('АКБ ниже резервного порога 5%');
 if(desiredCharge!=='none' && source!=='inverter' && chargePower===0 && state.soc<99.95)warnings.push('Нет доступной мощности для зарядки');
 return {gridPhysical,gridFeed,gridSafe,gridOk,genReady,genFeed,genOk,invReady,invOk,source,atsSource,desiredCharge,chargeFrom,chargePower,dischargePower,remaining,blocking,warnings,
 flow:{grid_qf:gridPhysical,qf_stab:gridFeed,stab_charge:chargeFrom==='grid'&&chargePower>0,gen_qf:genReady,qf_gen_charge:chargeFrom==='generator'&&chargePower>0,charge_qf:chargeFrom!=='none'&&chargePower>0,qf_inv:chargeFrom!=='none'&&chargePower>0,stab_ats:atsSource==='grid',qf_gen_ats:atsSource==='generator',inv_ats:atsSource==='inverter',ats_qf:atsSource!=='none'&&state.qfHome,qf_home:source!=='none',inv_battery:chargePower>0 || dischargePower>0}};
}
