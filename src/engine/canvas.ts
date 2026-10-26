export interface Bounds {x:number;y:number;width:number;height:number}
export interface Point {x:number;y:number}
/** Allow device movement beyond the initial schematic; the viewport grows to fit. */
export function constrainDevice(point:Point,size:{width:number;height:number},limit=12000):Point {
 const margin=36;
 return {x:Math.round(Math.max(margin,Math.min(limit-size.width,point.x))),y:Math.round(Math.max(margin,Math.min(limit-size.height,point.y)))};
}
export function canvasSize(devices:Bounds[],minWidth=2200,minHeight=1120){
 return devices.reduce((size,d)=>({width:Math.max(size.width,Math.ceil((d.x+d.width+90)/120)*120),height:Math.max(size.height,Math.ceil((d.y+d.height+90)/120)*120)}),{width:minWidth,height:minHeight});
}
