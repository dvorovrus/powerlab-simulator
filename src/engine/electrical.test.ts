import {describe,expect,it} from 'vitest';
import {calculatePower,INITIAL,LIMIT,scenarios} from './electrical';

describe('electrical switching model',()=>{
 it('powers normal loads from the grid and charges the battery',()=>{const r=calculatePower(INITIAL);expect(r.source).toBe('grid');expect(r.gridSafe).toBe(true);expect(r.chargePower).toBe(1);});
 it('uses the inverter on a grid outage',()=>{const r=calculatePower(scenarios.outage);expect(r.source).toBe('inverter');expect(r.dischargePower).toBeGreaterThan(0);expect(r.chargePower).toBe(0);});
 it('accepts inclusive 90 to 310 volt stabilizer boundaries',()=>{for(const voltage of [90,310])expect(calculatePower({...INITIAL,voltage}).gridSafe).toBe(true);for(const voltage of [89,311])expect(calculatePower({...INITIAL,voltage}).gridSafe).toBe(false);});
 it('refuses charging from a stopped generator',()=>expect(calculatePower({...INITIAL,grid:false,chargerMode:'generator'}).chargePower).toBe(0));
 it('never feeds inverter output into its own charge input',()=>{const r=calculatePower({...INITIAL,grid:false,generator:true,chargerMode:'generator'});expect(r.source).toBe('inverter');expect(r.chargeFrom).toBe('none');expect(r.blocking).toBe(true);});
 it('checks the generator kW rating',()=>{expect(LIMIT.GEN).toBe(5);expect(calculatePower({...INITIAL,grid:false,generator:true,inverter:false,load:5}).source).toBe('generator');expect(calculatePower({...INITIAL,grid:false,generator:true,inverter:false,load:5.1}).source).toBe('none');});
 it('disconnects the house when the output breaker opens',()=>expect(calculatePower({...INITIAL,qfHome:false}).source).toBe('none'));
 it('protects the low-charge threshold and rejects excessive inverter loads',()=>{expect(calculatePower({...INITIAL,grid:false,soc:5}).source).toBe('none');expect(calculatePower({...INITIAL,grid:false,load:10.5}).source).toBe('none');});
});
