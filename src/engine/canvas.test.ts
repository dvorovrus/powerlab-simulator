import {describe,it,expect} from 'vitest';
import {constrainDevice,canvasSize} from './canvas';
describe('expandable schematic',()=>{
 it('permits dragging beyond initial viewport',()=>expect(constrainDevice({x:2300,y:1600},{width:200,height:150})).toEqual({x:2300,y:1600}));
 it('keeps positive canvas margins',()=>expect(constrainDevice({x:-50,y:-10},{width:200,height:150})).toEqual({x:36,y:36}));
 it('expands to include moved devices',()=>expect(canvasSize([{x:2300,y:1400,width:200,height:180}])).toEqual({width:2640,height:1680}));
});
