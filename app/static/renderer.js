import {planets, stars, constellationLines, orbitalPosition, starPosition, scaleStops, RAD, subsolarPoint, altitudeFrom, lightPhase} from './astronomy.js';
import {landMask, isLand} from './world.js';

const textures=new Map();
const fract=n=>n-Math.floor(n);
function random(seed) { return fract(Math.sin(seed*127.1+311.7)*43758.5453); }
function noise(x,y) { return Math.sin(x*3.1+Math.sin(y*5.3))*Math.cos(y*2.7+Math.sin(x*4.2)); }
// Four texels per degree. The baked planet texture and the live globe read land from
// this one mask, so the Earth in the solar view and the Earth on the globe are the
// same coastline.
const LAND = () => landMask(1440);

// Ground colour by latitude, which is most of what separates a green world from a
// convincing one: the Sahara, the Gobi and the Australian interior all sit in the same
// dry band, and the boreal belt reads grey-green rather than grass.
const BIOME=[[0,[74,116,64]],[12,[114,134,72]],[20,[176,150,96]],[30,[156,144,88]],[38,[100,124,70]],[50,[84,110,76]],[62,[94,114,94]],[70,[152,156,144]],[76,[214,224,228]],[90,[228,236,240]]];
function ground(lat){
  const a=Math.abs(lat);
  for(let i=1;i<BIOME.length;i++){
    if(a<=BIOME[i][0]){
      const [lo,c0]=BIOME[i-1],[hi,c1]=BIOME[i],k=(a-lo)/(hi-lo);
      return [c0[0]+(c1[0]-c0[0])*k,c0[1]+(c1[1]-c0[1])*k,c0[2]+(c1[2]-c0[2])*k];
    }
  }
  return BIOME[BIOME.length-1][1];
}
function makeTexture(p) {
  const size=240, c=document.createElement('canvas');c.width=c.height=size;
  const ctx=c.getContext('2d'), data=ctx.createImageData(size,size);
  let land;
  if(p.id==='earth')land=LAND();
  const rgb=p.color.match(/\w\w/g).map(v=>parseInt(v,16));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const nx=(x-size/2)/(size/2),ny=(y-size/2)/(size/2),rr=nx*nx+ny*ny;
    if(rr>1)continue;
    const nz=Math.sqrt(1-rr),lon=Math.atan2(nx,nz),lat=Math.asin(-ny),n=noise(lon*12,lat*12),detail=random(x*59+y*173);
    let color=[...rgb];
    if(p.id==='earth'){
      const longitude=(lon/RAD+20+540)%360-180,latitude=lat/RAD;
      color=isLand(land,latitude,longitude)?ground(latitude).map(v=>v+n*9):[26+n*7,62+n*10,96+n*14];
      const clouds=Math.sin(lon*5+lat*13+Math.sin(lat*7)*1.2)+Math.sin(lon*12-lat*9)*.3;
      if(clouds>.87){const mix=(clouds-.87)*1.5;color=color.map(v=>v*(1-mix)+213*mix);}
      if(Math.abs(latitude)>76+noise(lon*5,lat*2)*7)color=[188,203,203];
    } else if(p.id==='jupiter'||p.id==='saturn'){
      const bands=Math.sin(lat*44+Math.sin(lon*8)*.5)+Math.sin(lat*83+Math.sin(lon*4)*.8)*.4;
      color=color.map((v,i)=>v+bands*(p.id==='jupiter'?22:10)+n*6-i*bands*3);
      if(p.id==='jupiter'&&((lon+.35)**2/.028+(lat+.29)**2/.006)<1)color=[157+n*14,95+n*15,69+n*10];
    } else if(p.id==='mars')color=[169+n*28+detail*13,91+n*15+detail*7,60+n*12];
    else if(p.id==='mercury')color=color.map(v=>v+n*29+(detail-.5)*20);
    else color=color.map(v=>v+n*7+Math.sin(lat*30)*4);
    const light=Math.max(.075,nx*-.48+ny*-.32+nz*.72),shade=.15+.85*light;
    const edge=p.id==='earth'?Math.pow(1-nz,4)*30:0;
    const idx=(y*size+x)*4;
    data.data[idx]=color[0]*shade+edge*.3;data.data[idx+1]=color[1]*shade+edge*.8;data.data[idx+2]=color[2]*shade+edge;data.data[idx+3]=Math.min(255,(1-rr)*size*255);
  }
  ctx.putImageData(data,0,0);return c;
}
// Where each phase of light shows up as a pin.
export const phaseColors={day:'#ffe4a3',golden:'#f2a445',blue:'#7ea6e0',twilight:'#8298b2',night:'#d3e2f4'};
export const phaseNames={day:'Daylight',golden:'Golden hour',blue:'Blue hour',twilight:'Twilight',night:'Night'};

// One orientation of the globe, sampled once. Between frames only the Sun moves, so
// each sample keeps the terms that reduce its solar altitude to a few multiplies
// instead of solving the Sun's position again a hundred thousand times a second.
const globe={key:''};
function globeSamples(n,tilt,spin){
  const key=`${n}|${tilt.toFixed(2)}|${spin.toFixed(2)}`;
  if(globe.key===key)return globe;
  const mask=LAND(),count=n*n;
  const sinLat=new Float32Array(count),ca=new Float32Array(count),cb=new Float32Array(count);
  const base=new Float32Array(count*3),alpha=new Float32Array(count),edge=new Float32Array(count),water=new Uint8Array(count);
  const sinF=Math.sin(tilt*RAD),cosF=Math.cos(tilt*RAD);
  for(let py=0;py<n;py++)for(let px=0;px<n;px++){
    const i=py*n+px,x=(px+.5)/n*2-1,y=1-(py+.5)/n*2,rr=x*x+y*y;
    if(rr>1)continue;
    const nz=Math.sqrt(1-rr);
    const lat=Math.asin(Math.max(-1,Math.min(1,nz*sinF+y*cosF)))/RAD;
    const lon=(((spin+Math.atan2(x,nz*cosF-y*sinF)/RAD)+180)%360+360)%360-180;
    const grain=noise(lon*RAD*9,lat*RAD*9);
    let c;
    if(isLand(mask,lat,lon)){
      c=ground(lat);
      // A little relief, and enough longitude drift to keep the latitude bands from
      // reading as stripes.
      const v=grain*5+noise(lon*RAD*15,lat*RAD*13)*2.5;
      c=[c[0]+v,c[1]+v*1.1,c[2]+v*.7];
    }else{
      water[i]=1;
      // Shelf water where a neighbouring texel is land, which is what stops every
      // coast from being a hard edge between navy and grass.
      const shelf=isLand(mask,lat+.9,lon)||isLand(mask,lat-.9,lon)||isLand(mask,lat,lon+.9/Math.max(.2,Math.cos(lat*RAD)))||isLand(mask,lat,lon-.9/Math.max(.2,Math.cos(lat*RAD)));
      c=shelf?[48,110,148]:[26,64,108];
      c=[c[0]+grain*2,c[1]+grain*2.5,c[2]+grain*3];
    }
    base[i*3]=c[0];base[i*3+1]=c[1];base[i*3+2]=c[2];
    const cosLat=Math.cos(lat*RAD);
    sinLat[i]=Math.sin(lat*RAD);ca[i]=cosLat*Math.cos(lon*RAD);cb[i]=cosLat*Math.sin(lon*RAD);
    alpha[i]=Math.min(1,(1-rr)*n*.5);edge[i]=Math.pow(1-nz,3.2);
  }
  return Object.assign(globe,{key,n,sinLat,ca,cb,base,alpha,edge,water});
}
export function drawPlanet(ctx,p,x,y,r,glow=true){
  if(!textures.has(p.id))textures.set(p.id,makeTexture(p));
  ctx.save();
  if(glow){const g=ctx.createRadialGradient(x,y,r*.5,x,y,r*2);g.addColorStop(0,p.color+'15');g.addColorStop(1,p.color+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*2,0,Math.PI*2);ctx.fill();}
  if(p.id==='saturn'){
    ctx.save();ctx.translate(x,y);ctx.rotate(-.36);ctx.strokeStyle='#bba98075';ctx.lineWidth=r*.37;ctx.beginPath();ctx.ellipse(0,0,r*1.65,r*.48,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#eee0ad30';ctx.lineWidth=r*.08;ctx.beginPath();ctx.ellipse(0,0,r*1.92,r*.57,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  ctx.drawImage(textures.get(p.id),x-r,y-r,r*2,r*2);ctx.restore();
}
export function renderPortrait(canvas,item,mode){
  const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
  const glow=ctx.createRadialGradient(w/2,h*.46,15,w/2,h*.46,h*.55);glow.addColorStop(0,(item.color||'#a9c6ef')+'17');glow.addColorStop(1,'#a9c6ef00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  if(mode==='sky'){
    const x=w/2,y=h*.45;ctx.fillStyle='#dfe9ff';ctx.shadowColor='#8fbdff';ctx.shadowBlur=28;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    for(let i=0;i<2;i++){ctx.save();ctx.translate(x,y);ctx.rotate(i*Math.PI/2+.2);const g=ctx.createLinearGradient(-75,0,75,0);g.addColorStop(0,'#b4d0ff00');g.addColorStop(.5,'#b4d0ff99');g.addColorStop(1,'#b4d0ff00');ctx.fillStyle=g;ctx.fillRect(-75,-1,150,2);ctx.restore();}
  }else drawPlanet(ctx,item.id?item:planets[2],w/2,h*.46,103);
}

export class UniverseRenderer{
  constructor(canvas,state,onSelect){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');this.state=state;this.onSelect=onSelect;this.width=800;this.height=570;this.hits=[];this.rotation=-.35;this.zoom=1;this.top=false;this.focus=null;this.drag=null;this.spin=10;this.tilt=22;
    this.background=Array.from({length:730},(_,i)=>({x:random(i+10),y:random(i+990),r:random(i+447)*.8+.15,a:random(i+650)*.38+.1}));
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
    canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY,start:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      if(this.drag){
        const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;
        if(Math.hypot(e.clientX-this.drag.start,e.clientY-this.drag.startY)>4)this.drag.moved=true;
        if(state.view==='solar'){this.rotation+=dx*.006;this.drag.x=e.clientX;this.draw();}
        // Spinning the globe east and tilting it, stopping short of the poles where an
        // orthographic view degenerates and the pins pile onto one another.
        else if(state.view==='earth'){this.spin-=dx*.32;this.tilt=Math.max(-78,Math.min(78,this.tilt+dy*.28));this.drag.x=e.clientX;this.drag.y=e.clientY;this.draw();}
      }
      else{const box=canvas.getBoundingClientRect();canvas.style.cursor=this.hits.some(p=>Math.hypot(e.clientX-box.left-p.x,e.clientY-box.top-p.y)<p.radius)?'pointer':'grab';}
    });
    canvas.addEventListener('pointerup',e=>{if(this.drag&&!this.drag.moved){const box=canvas.getBoundingClientRect();const hit=this.hits.find(p=>Math.hypot(e.clientX-box.left-p.x,e.clientY-box.top-p.y)<p.radius);if(hit)this.onSelect(hit.id);}this.drag=null;});
    canvas.addEventListener('pointercancel',()=>this.drag=null);
    canvas.addEventListener('wheel',e=>{if(state.view!=='solar'&&state.view!=='earth')return;e.preventDefault();this.setZoom(this.zoom*Math.exp(-e.deltaY*.001));this.onZoom?.();},{passive:false});
  }
  resize(){const box=this.canvas.getBoundingClientRect();this.width=box.width;this.height=box.height;const dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(box.width*dpr);this.canvas.height=Math.round(box.height*dpr);this.ctx.setTransform(dpr,0,0,dpr,0,0);this.draw();}
  setZoom(z){this.zoom=Math.max(.5,Math.min(5,z));this.draw();}
  reset(){this.rotation=-.35;this.zoom=1;this.focus=null;this.draw();}
  draw(){
    const ctx=this.ctx,w=this.width,h=this.height;if(!w||!h)return;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#0b100d';ctx.fillRect(0,0,w,h);this.hits=[];this.labelBoxes=[];
    const glow=ctx.createRadialGradient(w*.49,h*.47,0,w*.49,h*.47,w*.7);glow.addColorStop(0,'#18241d');glow.addColorStop(.5,'#0d1611');glow.addColorStop(1,'#090d0c');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    if(this.state.view!=='sky')for(const s of this.background){ctx.fillStyle=`rgba(181,199,182,${s.a})`;ctx.beginPath();ctx.arc(s.x*w,s.y*h,s.r,0,Math.PI*2);ctx.fill();}
    if(this.state.view==='solar')this.drawSolar();else if(this.state.view==='sky')this.drawSky();else if(this.state.view==='earth')this.drawEarth();else this.drawScale();
  }
  // Orthographic projection of the visible hemisphere. Null means the point has turned
  // away, which is what keeps pins from bleeding through the far side.
  globePoint(lat,lon,cx,cy,R){
    const f1=this.tilt*RAD,f=lat*RAD,d=(lon-this.spin)*RAD;
    const depth=Math.sin(f1)*Math.sin(f)+Math.cos(f1)*Math.cos(f)*Math.cos(d);
    if(depth<=.015)return null;
    return {x:cx+Math.cos(f)*Math.sin(d)*R,y:cy-(Math.cos(f1)*Math.sin(f)-Math.sin(f1)*Math.cos(f)*Math.cos(d))*R,depth};
  }
  project(pos){
    const w=this.width,h=this.height,flat=this.top?1:.64;
    const max=Math.min(w*.44,(h-175)/(2*flat)),exponent=this.state.proportional?1:.43;
    const r=Math.hypot(pos.x,pos.y,pos.z),rr=Math.pow(r/31,exponent)*max*this.zoom;
    const a=Math.atan2(pos.y,pos.x)+this.rotation;
    return {x:Math.cos(a)*rr,y:Math.sin(a)*rr*flat-pos.z/(r||1)*rr*.5};
  }
  mapLabel(text,x,y,r,selected=false,subtitle=''){
    const ctx=this.ctx;ctx.font=`${selected?'500 ':''}10px "DM Sans",sans-serif`;
    const width=Math.max(ctx.measureText(text).width,subtitle?68:0),height=subtitle?27:14;
    const candidates=[[x+r+10,y-8],[x-r-10-width,y-8],[x+r+9,y-28],[x-r-9-width,y-28],[x+r+9,y+13],[x-width/2,y-r-height-8],[x-width/2,y+r+8]];
    let choice=null,best=Infinity;
    for(const [left,top] of candidates){
      if(left<10||left+width>this.width-10||top<72||top+height>this.height-100)continue;
      const box={left,top,right:left+width,bottom:top+height};
      const overlap=this.labelBoxes.reduce((sum,b)=>sum+Math.max(0,Math.min(box.right,b.right)-Math.max(box.left,b.left))*Math.max(0,Math.min(box.bottom,b.bottom)-Math.max(box.top,b.top)),0);
      if(overlap<best){best=overlap;choice=box;}if(overlap===0)break;
    }
    if(!choice)return;this.labelBoxes.push(choice);ctx.textAlign='left';ctx.fillStyle=selected?'#d5e5c5':'#9da995';ctx.fillText(text,choice.left,choice.top+10);
    if(subtitle){ctx.font='7px "DM Sans",sans-serif';ctx.fillStyle='#859778';ctx.fillText(subtitle,choice.left,choice.top+23);}
  }
  drawSolar(){
    const ctx=this.ctx,w=this.width,h=this.height,date=this.state.date;let cx=w*.5,cy=h*.48;
    if(this.focus){const p=this.project(orbitalPosition(planets.find(p=>p.id===this.focus),date));cx-=p.x;cy-=p.y;}
    const project=pos=>{const p=this.project(pos);return {x:cx+p.x,y:cy+p.y};};
    if(this.state.orbits){
      for(let k=0;k<planets.length;k++){
        const planet=planets[k],selected=planet.id===this.state.selectedPlanet;
        ctx.beginPath();for(let i=0;i<=180;i++){const p=project(orbitalPosition(planet,date,i/180*Math.PI*2));ctx[i?'lineTo':'moveTo'](p.x,p.y);}
        ctx.strokeStyle=selected?'#a4c59160':'#9cb29420';ctx.lineWidth=selected?1.15:.7;if(selected)ctx.setLineDash([3,5]);ctx.stroke();ctx.setLineDash([]);
      }
      for(let i=0;i<460;i++){
        const a=random(i+3400)*Math.PI*2,r=2.2+random(i+912)*1.05,p=project({x:Math.cos(a)*r,y:Math.sin(a)*r,z:(random(i+210)-.5)*.2});ctx.fillStyle=`rgba(173,177,146,${random(i+772)*.2+.05})`;ctx.fillRect(p.x,p.y,1,1);
      }
    }
    const sr=Math.min(25,w*.034)*Math.pow(this.zoom,.35),sunGlow=ctx.createRadialGradient(cx,cy,sr*.4,cx,cy,sr*7);sunGlow.addColorStop(0,'#e3a74c3b');sunGlow.addColorStop(.2,'#c8943620');sunGlow.addColorStop(1,'#d7973100');ctx.fillStyle=sunGlow;ctx.beginPath();ctx.arc(cx,cy,sr*7,0,Math.PI*2);ctx.fill();
    const sun=ctx.createRadialGradient(cx-sr*.3,cy-sr*.3,0,cx,cy,sr);sun.addColorStop(0,'#fff2b2');sun.addColorStop(.6,'#f4ce78');sun.addColorStop(1,'#d58a39');ctx.fillStyle=sun;ctx.shadowColor='#efb64a';ctx.shadowBlur=22;ctx.beginPath();ctx.arc(cx,cy,sr,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    if(this.state.labels){ctx.font='10px "DM Sans",sans-serif';ctx.fillStyle='#d5c294';ctx.textAlign='center';ctx.fillText('Sun',cx,cy+sr+19);}
    const sizes=[5,8,10,7,20,16,12,11];
    const positions=planets.map((planet,i)=>({planet,i,...project(orbitalPosition(planet,date))})).sort((a,b)=>a.y-b.y);
    const labels=[];
    this.labelBoxes.push({left:cx-sr-5,top:cy-sr-5,right:cx+sr+5,bottom:cy+sr+22});
    for(const {planet,i,x,y} of positions){
      const r=sizes[i]*Math.min(1,Math.max(.7,w/700))*Math.pow(this.zoom,.35),selected=planet.id===this.state.selectedPlanet;
      if(selected){ctx.strokeStyle='#bad2a65c';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(x,y,r+8,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#bad2a625';ctx.beginPath();ctx.arc(x,y,r+13,0,Math.PI*2);ctx.stroke();}
      drawPlanet(ctx,planet,x,y,r);this.hits.unshift({id:planet.id,x,y,radius:Math.max(r+9,17)});
      this.labelBoxes.push({left:x-r-4,top:y-r-4,right:x+r+4,bottom:y+r+4});
      labels.push({planet,x,y,r,selected});
    }
    if(this.state.labels)for(const {planet,x,y,r,selected} of labels.sort((a,b)=>Number(b.selected)-Number(a.selected)))this.mapLabel(planet.name,x,y,r,selected,selected?(planet.id==='earth'?'YOU ARE HERE':'IN FOCUS'):'');
    ctx.textAlign='left';ctx.fillStyle='#52664f';ctx.font='8px "DM Sans",sans-serif';
    if(this.state.proportional)ctx.fillText('LINEAR DISTANCES · PLANET SIZES ENLARGED',24,103);
  }
  drawSky(){
    const ctx=this.ctx,w=this.width,h=this.height,cx=w/2,cy=h*.51,r=Math.min(w*.39,(h-180)*.48);
    const map=new Map();
    ctx.lineWidth=.7;
    for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(cx,cy,r*i/3,0,Math.PI*2);ctx.strokeStyle=i===3?'#a6c09155':'#8ea88223';ctx.stroke();if(i<3){ctx.fillStyle='#657c5d';ctx.font='8px sans-serif';ctx.fillText(`${90-i*30}°`,cx+5,cy-r*i/3+12);}}
    for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.strokeStyle='#8ea88216';ctx.stroke();}
    ctx.fillStyle='#a6b99a';ctx.font='10px "DM Sans",sans-serif';ctx.textAlign='center';ctx.fillText('N',cx,cy-r-15);ctx.fillText('S',cx,cy+r+23);ctx.fillText('E',cx-r-18,cy+3);ctx.fillText('W',cx+r+18,cy+3);
    for(const s of stars){const p=starPosition(s,this.state.date,this.state.location.lat,this.state.location.lon);if(p.altitude<0)continue;const rr=(90-p.altitude)/90*r,a=p.azimuth*RAD;map.set(s.name,{x:cx-Math.sin(a)*rr,y:cy-Math.cos(a)*rr,s,alt:p.altitude});}
    if(this.state.orbits){ctx.strokeStyle='#8ba98655';ctx.lineWidth=.85;for(const line of constellationLines){for(let i=1;i<line.length;i++){const a=map.get(line[i-1]),b=map.get(line[i]);if(!a||!b)continue;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}}
    for(const {x,y} of map.values())this.labelBoxes.push({left:x-5,top:y-5,right:x+5,bottom:y+5});
    for(const {x,y,s} of [...map.values()].sort((a,b)=>Number(b.s.id===this.state.selectedStar)-Number(a.s.id===this.state.selectedStar))){
      const selected=s.id===this.state.selectedStar,radius=Math.max(1.3,3.8-s.mag*.75);
      const g=ctx.createRadialGradient(x,y,0,x,y,radius*6);g.addColorStop(0,'#c8dcff44');g.addColorStop(1,'#c8dcff00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,radius*6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d1e0ef';ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
      if(selected){ctx.strokeStyle='#bed4a6';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(x,y,11,0,Math.PI*2);ctx.stroke();}
      if(this.state.labels&&(s.mag<1.6||selected||s.name==='Polaris'))this.mapLabel(s.name,x,y,radius,selected);
      this.hits.push({id:s.id,x,y,radius:13});
    }
    ctx.textAlign='center';ctx.font='8px "DM Sans",sans-serif';ctx.fillStyle='#587250';ctx.fillText('LOOKING UP · ZENITH AT CENTER',cx,cy+r+44);
  }
  drawEarth(){
    const ctx=this.ctx,w=this.width,h=this.height,cx=w*.5,cy=h*.47;
    const R=Math.min(w*.33,(h-165)*.45)*this.zoom;
    const sun=subsolarPoint(this.state.date);
    // Rebuilding the cache costs a trigonometric solve per sample, so a drag runs at a
    // coarser grid and the detail returns when the globe is let go.
    const n=this.drag?160:Math.max(128,Math.min(384,Math.round(R*1.7)));
    const g=globeSamples(n,this.tilt,this.spin);
    if(!this.globeCanvas)this.globeCanvas=document.createElement('canvas');
    if(this.globeCanvas.width!==n){this.globeCanvas.width=this.globeCanvas.height=n;this.globeImage=null;}
    const gctx=this.globeCanvas.getContext('2d');
    if(!this.globeImage)this.globeImage=gctx.createImageData(n,n);
    // Only the Sun has moved since the samples were built, so a frame is one pass of
    // multiplies. Everything is expressed in the sine of the solar altitude, which
    // avoids an arcsine per pixel: sin(6°) is .1045 and sin(-12°) is -.2079.
    const out=this.globeImage.data;
    const sinDec=Math.sin(sun.lat*RAD),cosDec=Math.cos(sun.lat*RAD),cosLam=Math.cos(sun.lon*RAD),sinLam=Math.sin(sun.lon*RAD);
    for(let i=0,count=n*n;i<count;i++){
      const a=g.alpha[i],o=i*4;
      if(!a){out[o+3]=0;continue;}
      const sinAlt=g.sinLat[i]*sinDec+(g.ca[i]*cosLam+g.cb[i]*sinLam)*cosDec;
      // Daylight fades across the terminator rather than at it, and the night side
      // keeps a little light so land stays readable against water.
      const lit=Math.max(0,Math.min(1,(sinAlt+.105)/.21));
      const shade=.14+.86*lit*lit*(3-2*lit);
      // Squared so the warm band sits close in around the terminator instead of
      // washing across the whole lit face.
      const gold=Math.max(0,1-Math.abs(sinAlt)/.085),warm=gold*gold;
      // Just past the terminator the sky is blue before it is black.
      const dusk=Math.max(0,1-Math.abs(sinAlt+.155)/.115);
      const rim=g.edge[i],glow=rim*(14+64*lit);
      let r=g.base[i*3]*shade+warm*78+dusk*6+glow*.34;
      let gr=g.base[i*3+1]*shade+warm*46+dusk*14+glow*.72;
      let b=g.base[i*3+2]*shade+warm*11+dusk*34+glow;
      // The Sun's reflection, which only water gives back.
      if(g.water[i]&&sinAlt>.82){const s=(sinAlt-.82)/.18;const spec=s*s*66;r+=spec;gr+=spec*1.02;b+=spec*.82;}
      out[o]=r;out[o+1]=gr;out[o+2]=b;out[o+3]=a*255;
    }
    gctx.putImageData(this.globeImage,0,0);
    const halo=ctx.createRadialGradient(cx,cy,R*.94,cx,cy,R*1.24);halo.addColorStop(0,'#8fc0e033');halo.addColorStop(.45,'#6f9fc41a');halo.addColorStop(1,'#6f9fc400');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(cx,cy,R*1.24,0,Math.PI*2);ctx.fill();
    ctx.drawImage(this.globeCanvas,cx-R,cy-R,R*2,R*2);
    // The latitude the galactic centre never climbs above, reported by the API for the
    // selected place. One line says what a paragraph otherwise has to.
    const band=this.state.milkyLatitude;
    if(Number.isFinite(band)){
      ctx.save();ctx.setLineDash([4,5]);ctx.strokeStyle='#bcaae8aa';ctx.lineWidth=1;ctx.beginPath();
      let drawn=false;
      for(let lon=-180;lon<=180;lon+=2){const p=this.globePoint(band,lon,cx,cy,R);if(!p){drawn=false;continue;}ctx[drawn?'lineTo':'moveTo'](p.x,p.y);drawn=true;}
      ctx.stroke();ctx.restore();
    }
    const pins=[];
    for(const place of this.state.places||[]){
      const p=this.globePoint(place.latitude,place.longitude,cx,cy,R);
      if(!p)continue;
      pins.push({place,...p,phase:lightPhase(altitudeFrom(sun,place.latitude,place.longitude))});
    }
    // Nearer pins are drawn last so they sit over the ones turning away behind them.
    pins.sort((a,b)=>a.depth-b.depth);
    for(const pin of pins){
      const selected=pin.place.slug===this.state.selectedPlace,color=phaseColors[pin.phase],r=selected?5.5:3.6;
      if(selected){ctx.strokeStyle='#e2eed4';ctx.lineWidth=.9;ctx.beginPath();ctx.arc(pin.x,pin.y,r+7,0,Math.PI*2);ctx.stroke();}
      const glow=ctx.createRadialGradient(pin.x,pin.y,0,pin.x,pin.y,r*4);glow.addColorStop(0,color+'88');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(pin.x,pin.y,r*4,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=color;ctx.strokeStyle='#0c110f';ctx.lineWidth=1.1;ctx.beginPath();ctx.arc(pin.x,pin.y,r,0,Math.PI*2);ctx.fill();ctx.stroke();
      this.hits.push({id:'place:'+pin.place.slug,x:pin.x,y:pin.y,radius:14});
      this.labelBoxes.push({left:pin.x-r-3,top:pin.y-r-3,right:pin.x+r+3,bottom:pin.y+r+3});
    }
    if(this.state.labels){
      const selected=pins.find(p=>p.place.slug===this.state.selectedPlace);
      if(selected)this.mapLabel(selected.place.name,selected.x,selected.y,6,true,phaseNames[selected.phase].toUpperCase());
      for(const pin of pins.filter(p=>p!==selected).sort((a,b)=>b.depth-a.depth).slice(0,7))this.mapLabel(pin.place.name,pin.x,pin.y,4);
    }
    ctx.textAlign='center';ctx.font='8px "DM Sans",sans-serif';ctx.fillStyle='#587250';
    ctx.fillText(`SUN OVERHEAD AT ${Math.abs(sun.lat).toFixed(1)}°${sun.lat>=0?'N':'S'} · ${Math.abs(sun.lon).toFixed(1)}°${sun.lon>=0?'E':'W'}`,cx,Math.min(h-14,cy+R+32));
  }
  drawScale(){
    const ctx=this.ctx,w=this.width,h=this.height,stop=scaleStops[this.state.scale],cx=w/2,cy=h*.42,r=Math.min(w*.19,h*.19);
    ctx.strokeStyle='#a3bf8e18';ctx.lineWidth=1;for(let i=1;i<=4;i++){ctx.beginPath();ctx.arc(cx,cy,r+i*31,0,Math.PI*2);ctx.stroke();}
    if(this.state.scale===0)drawPlanet(ctx,planets[2],cx,cy,r);
    else if(this.state.scale===2){const g=ctx.createRadialGradient(cx-r*.3,cy-r*.3,0,cx,cy,r);g.addColorStop(0,'#fff2bd');g.addColorStop(1,'#cd8a34');ctx.fillStyle=g;ctx.shadowColor='#d9a045';ctx.shadowBlur=45;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    else if(this.state.scale===7){
      ctx.save();ctx.translate(cx,cy);ctx.scale(1,.57);ctx.rotate(-.3);
      for(let i=0;i<1400;i++){const arm=i%3,progress=random(i+881),a=progress*Math.PI*3+arm*Math.PI*2/3,rr=progress*r*1.6;const x=Math.cos(a)*rr+(random(i+291)-.5)*r*.2,y=Math.sin(a)*rr+(random(i+182)-.5)*r*.2;ctx.fillStyle=`rgba(202,213,191,${.15+random(i+44)*.6})`;ctx.beginPath();ctx.arc(x,y,random(i+912)*1.6+.3,0,Math.PI*2);ctx.fill();}const g=ctx.createRadialGradient(0,0,0,0,0,r*.4);g.addColorStop(0,'#fff0cbbf');g.addColorStop(1,'#fff0cb00');ctx.fillStyle=g;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
    }else{
      const left=cx-r*.92,right=cx+r*.92;drawPlanet(ctx,planets[2],left,cy,20);ctx.setLineDash([3,6]);ctx.strokeStyle='#b7cc9c66';ctx.beginPath();ctx.moveTo(left+28,cy);ctx.lineTo(right-17,cy);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#e7d2a3';ctx.shadowColor='#d2c18b';ctx.shadowBlur=25;ctx.beginPath();ctx.arc(right,cy,this.state.scale===1?6:12,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.font='8px sans-serif';ctx.fillStyle='#849778';ctx.textAlign='center';ctx.fillText('ILLUSTRATIVE DISTANCE',cx,cy+40);
    }
    ctx.textAlign='center';ctx.fillStyle='#b9cfa7';ctx.font='9px "DM Sans",sans-serif';ctx.fillText(stop.label.toUpperCase(),cx,h*.68);ctx.fillStyle='#eef0e5';ctx.font=`500 ${Math.min(33,w*.06)}px "Manrope",sans-serif`;ctx.fillText(stop.unit,cx,h*.75);ctx.fillStyle='#7d9273';ctx.font='10px "DM Sans",sans-serif';ctx.fillText(`${(stop.km/12742).toLocaleString('en-US',{maximumFractionDigits:0})} Earth diameters`,cx,h*.80);
  }
}
