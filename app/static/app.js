import {planets,stars,planetMetrics,starPosition,sunAltitude,scaleStops,DAY_MS,MIN_DATE,MAX_DATE,clampDate,C_KM_S,AU_KM} from './astronomy.js';
import {UniverseRenderer,renderPortrait} from './renderer.js';

const $=id=>document.getElementById(id);
const paths={
  orbit:'<ellipse cx="12" cy="12" rx="11" ry="4.5" transform="rotate(-35 12 12)"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1"/>',
  stars:'<path d="m9 3 1.7 5.3L16 10l-5.3 1.7L9 17l-1.7-5.3L2 10l5.3-1.7L9 3Zm10 10 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/>',
  expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  book:'<path d="M12 5v16M3 3l9 2 9-2v16l-9 2-9-2V3Z"/>',
  play:'<path d="m8 4 12 8-12 8V4Z" fill="currentColor" stroke="none"/>',
  pause:'<path d="M8 5v14M16 5v14" stroke-width="4"/>',
  label:'<path d="M4 4h16M12 4v16M8 20h8"/>',
  layers:'<path d="m12 3 10 6-10 6L2 9l10-6Zm-10 12 10 6 10-6M2 12l10 6 10-6"/>',
  reset:'<path d="M4 10a8 8 0 1 1 1 7M4 3v7h7"/>',
  mouse:'<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 5v4"/>',
  bookmark:'<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
  spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M7 15h2m3 0h2m3 0h1"/>',
  back:'<path d="M5 5v14m14-14L7 12l12 7V5Z"/>',
  forward:'<path d="M19 5v14M5 5l12 7-12 7V5Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>'
};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
let stored={};try{stored=JSON.parse(localStorage.getItem('sky-preferences')||'{}')||{};}catch{}
const validLocation=l=>l&&typeof l.name==='string'&&Number.isFinite(l.lat)&&Number.isFinite(l.lon)&&Math.abs(l.lat)<=90&&Math.abs(l.lon)<=180;
const knownIds=new Set([...planets,...stars].map(x=>x.id));
const state={view:'solar',date:clampDate(Date.now()),live:true,playing:false,speed:86400,selectedPlanet:'earth',selectedStar:'vega',orbits:true,labels:true,proportional:false,scale:0,location:validLocation(stored.location)?stored.location:{name:'Oslo, Norway',lat:59.9139,lon:10.7522},saved:new Set(Array.isArray(stored.saved)?stored.saved.filter(id=>knownIds.has(id)):[]),savedOnly:false};
let anchor=state.date,tourTimer=null,tourIndex=0,toastTimer=null;
const renderer=new UniverseRenderer($('universe'),state,id=>selectObject(id));
renderer.onZoom=()=>updateZoom();
function persist(){try{localStorage.setItem('sky-preferences',JSON.stringify({location:state.location,saved:[...state.saved]}));}catch{toast('Browser storage is unavailable. Your settings will last for this visit.');}}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
function setIcon(button,name){button.innerHTML=icon(name);}
function formatNumber(n,d=0){return n.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});}
function duration(seconds){if(seconds<60)return `${Math.round(seconds)}s`;if(seconds<3600){const s=Math.round(seconds);return `${Math.floor(s/60)}m ${s%60}s`;}if(seconds<86400)return `${(seconds/3600).toFixed(1)} hours`;if(seconds<31557600)return `${(seconds/86400).toFixed(1)} days`;return `${formatNumber(seconds/31557600,1)} years`;}
function stat(label,value,unit=''){return `<div><div class="stat-label">${label}</div><div class="stat-value">${value}<small>${unit}</small></div></div>`;}
function currentItem(){return state.view==='solar'?planets.find(p=>p.id===state.selectedPlanet):state.view==='sky'?stars.find(s=>s.id===state.selectedStar):scaleStops[state.scale];}

function updateInspector(full=true){
  const item=currentItem();
  if(full){
    $('object-name').textContent=item.name;
    $('bookmark-button').hidden=state.view==='scale';
    if(state.view!=='scale'){
      const saved=state.saved.has(item.id);$('bookmark-button').classList.toggle('saved',saved);$('bookmark-button').setAttribute('aria-label',`${saved?'Unsave':'Save'} ${item.name}`);$('bookmark-button').setAttribute('aria-pressed',String(saved));
    }
    renderPortrait($('portrait'),state.view==='scale'?planets[2]:item,state.view);
    $('portrait').setAttribute('aria-label',state.view==='sky'?`Illustration of ${item.name}`:state.view==='scale'?'Earth as a reference for distance':`Artistic illustration of ${item.name}`);
  }
  if(state.view==='solar'){
    const m=planetMetrics(item,state.date);
    if(full){
      $('object-type').textContent=item.type;$('object-symbol').textContent=['☿','♀','♁','♂','♃','♄','♅','♆'][planets.indexOf(item)];
      $('object-description').textContent=item.description;$('object-fact').textContent=item.fact;
      $('portrait-caption').textContent=`${['FIRST','SECOND','THIRD','FOURTH','FIFTH','SIXTH','SEVENTH','EIGHTH'][planets.indexOf(item)]} PLANET FROM THE SUN`;
      $('focus-label').textContent=`Focus on ${item.name}`;$('inspector-foot').textContent=item.tagline;
    }
    $('stats-grid').innerHTML=stat('Distance from Sun',m.r.toFixed(3),'AU')+stat('Orbital period',item.period<1000?formatNumber(item.period,1):formatNumber(item.period/365.25,1),item.period<1000?'days':'years')+stat('Mean radius',formatNumber(item.radius),'km')+stat('Orbital speed',m.speed.toFixed(2),'km/s');
    $('light-title').textContent='A MESSAGE FROM THE SUN';$('light-copy').innerHTML=`Sunlight takes <strong>${duration(m.lightSeconds)}</strong> to reach ${item.name}.`;
  }else if(state.view==='sky'){
    const p=starPosition(item,state.date,state.location.lat,state.location.lon);
    if(full){$('object-type').textContent=`${item.constellation} · Star`;$('object-symbol').textContent='✧';$('portrait-caption').textContent='A DISTANT SUN IN YOUR SKY';$('object-description').textContent=`${item.name} is a star in ${item.constellation}. Its light has traveled across about ${formatNumber(item.distance)} light-years of space to reach our little world.`;$('inspector-foot').textContent='Altitude 0° is the horizon. 90° is straight up.';}
    $('stats-grid').innerHTML=stat('Altitude',p.altitude.toFixed(1),'°')+stat('Azimuth',p.azimuth.toFixed(1),'°')+stat('Distance ≈',formatNumber(item.distance),'ly')+stat('Visual magnitude',item.mag.toFixed(2));
    $('object-fact').textContent=p.altitude>0?`${item.name} is above your horizon. ${p.altitude>60?'Look high in the sky.':'Look toward '+['north','northeast','east','southeast','south','southwest','west','northwest'][Math.round(p.azimuth/45)%8]+'.'}`:`${item.name} is below your horizon. Advance time or change your observing location to explore its path.`;
    $('focus-label').textContent=p.altitude>=0?`Locate ${item.name}`:'Find next rise';
    $('light-title').textContent='A GLIMPSE INTO THE PAST';$('light-copy').innerHTML=`This starlight began its journey about <strong>${formatNumber(item.distance)} years ago.</strong>`;
  }else{
    if(full){$('object-type').textContent=item.label;$('object-symbol').textContent='↔';$('portrait-caption').textContent='EARTH IS OUR MEASURING STICK';$('object-description').textContent=item.text;$('object-fact').textContent='A light-year is a distance: how far light travels in one year. Space is so big that time becomes a useful ruler.';$('focus-label').textContent=state.scale<7?'Go a little farther':'Back to our home';$('inspector-foot').textContent='Every step changes your sense of scale.';}
    const earths=item.km/12742;
    const size=item.km<1e7?[formatNumber(item.km),'km']:item.km<1e13?[formatNumber(item.km/AU_KM,2),'AU']:[formatNumber(item.km/9460730472580.8,2),'ly'];
    $('stats-grid').innerHTML=stat('Distance / diameter',...size)+stat('Light travel time',duration(item.km/C_KM_S))+stat('In Earth diameters',earths>1e7?earths.toExponential(2):formatNumber(earths))+stat('Speed of light','299,792','km/s');
    $('light-title').textContent='THE UNIVERSE HAS A SPEED LIMIT';$('light-copy').innerHTML='Light travels <strong>299,792 km</strong> every second in a vacuum.';
  }
}
function updateObjects(){
  const list=$('object-list');list.replaceChildren();
  const title=state.view==='solar'?['Meet the neighbors','08 PLANETS. ENDLESS PERSPECTIVES.']:state.view==='sky'?['Find your guiding star','50 BRIGHT STARS. ONE SHARED SKY.']:['A change in perspective','FROM A SMALL WORLD TO A VAST GALAXY.'];
  $('object-section-title').innerHTML=`${title[0]}<span>${title[1]}</span>`;
  $('saved-toggle').hidden=state.view==='scale';$('saved-label').textContent=state.savedOnly?'Show all objects':`Saved objects${state.saved.size?' · '+state.saved.size:''}`;
  let items=state.view==='solar'?planets:state.view==='sky'?(state.savedOnly?stars:[...stars].sort((a,b)=>starPosition(b,state.date,state.location.lat,state.location.lon).altitude-starPosition(a,state.date,state.location.lat,state.location.lon).altitude).slice(0,8)):scaleStops;
  if(state.savedOnly&&state.view!=='scale')items=items.filter(p=>state.saved.has(p.id));
  $('empty-saved').hidden=items.length>0;
  for(const item of items){
    const button=document.createElement('button');button.className='object-card';const selected=state.view==='scale'?item===scaleStops[state.scale]:item.id===(state.view==='solar'?state.selectedPlanet:state.selectedStar);button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
    const secondary=state.view==='solar'?`${item.elements[0][0].toFixed(2)} AU`:state.view==='sky'?`${item.constellation}`:`${item.unit}`;
    button.innerHTML=`<span class="mini-planet ${state.view==='sky'?'star':item.id||'earth'}" style="--planet-color:${item.color||'#8ba78d'}"></span><span><strong>${item.name}</strong><small>${secondary}</small></span>`;
    button.addEventListener('click',()=>state.view==='scale'?setScale(scaleStops.indexOf(item)):selectObject(item.id));list.append(button);
  }
}
function selectObject(id){
  if(planets.some(p=>p.id===id)){state.selectedPlanet=id;if(state.view!=='solar')setView('solar');if(renderer.focus)renderer.focus=id;}
  else if(stars.some(s=>s.id===id)){state.selectedStar=id;if(state.view!=='sky')setView('sky');}
  updateInspector();updateObjects();renderer.draw();
}
function setView(view){
  stopTour();state.view=view;renderer.focus=null;renderer.zoom=1;
  document.querySelectorAll('[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===view);el.setAttribute('aria-current',el.dataset.view===view?'page':'false');});
  const titles={solar:['Your universe, <em>in motion.</em>','Explore our celestial neighborhood. Grounded in science. Driven by wonder.','THE SOLAR SYSTEM','Heliocentric view'],sky:['A sky full of <em>possibility.</em>','Look up from wherever you are. Find your place among the stars.','YOUR NIGHT SKY','Local horizon · '+state.location.name],scale:['A little world. <em>A bigger picture.</em>','Travel from our home planet to the galaxy we call home.','COSMIC SCALE','A journey through distance']};
  const [title,desc,eyebrow,subtitle]=titles[view];$('page-title').innerHTML=title;$('page-description').textContent=desc;$('scene-eyebrow').textContent=eyebrow;$('scene-subtitle').textContent=subtitle;
  $('projection-toggle').hidden=view!=='solar';$('distance-toggle').hidden=view!=='solar';document.querySelector('.zoom-controls').hidden=view!=='solar';$('tour-button').hidden=view!=='solar';
  document.querySelector('.scene-controls').hidden=view==='scale';document.querySelector('.scene-caption').hidden=view==='scale';$('scale-controls').hidden=view!=='scale';$('orbits-label').textContent=view==='sky'?'Constellations':'Orbits';
  $('scene-hint').innerHTML=view==='sky'?'Select a star · Use time to watch the sky turn':`${icon('mouse')}Drag to rotate · Scroll to explore`;
  $('universe').setAttribute('aria-label',view==='solar'?'Solar system map. Select planets using the object buttons below. Drag to rotate; scroll to zoom.':view==='sky'?'Sky map with north at top and east at left. Select stars with the object buttons or search.':'Cosmic scale illustration. Use the slider or destination buttons below.');
  updateZoom();updateInspector();updateObjects();updateSkyNote();renderer.draw();
}
function setScale(index){state.scale=index;$('scale-slider').value=index;$('scale-progress').textContent=`${String(index+1).padStart(2,'0')} / 08`;updateInspector();updateObjects();renderer.draw();}
function updateZoom(){$('zoom-value').textContent=Math.round(renderer.zoom*100)+'%';}
function updateSkyNote(){
  $('sky-note').hidden=state.view!=='sky';if(state.view!=='sky')return;
  const alt=sunAltitude(state.date,state.location.lat,state.location.lon),count=stars.filter(s=>starPosition(s,state.date,state.location.lat,state.location.lon).altitude>0).length;
  $('sky-note').textContent=`${count} catalog stars above your horizon. ${alt>-.833?'The Sun is up; stars are shown for exploration.':alt>-18?'Twilight: faint stars may be difficult to see.':'The Sun is below astronomical twilight.'}`;
}
function updateTime(){
  const date=new Date(state.date);
  $('date-display').textContent=date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
  $('time-display').textContent=date.toLocaleTimeString('en-GB',{timeZone:'UTC',hour12:false})+' UTC';
  $('timeline').value=Math.max(-182,Math.min(182,(state.date-anchor)/DAY_MS));
  $('timeline-start').textContent=new Date(clampDate(anchor-182*DAY_MS)).toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
  $('timeline-end').textContent=new Date(clampDate(anchor+182*DAY_MS)).toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
  $('step-back').disabled=state.date<=MIN_DATE;$('step-forward').disabled=state.date>=MAX_DATE;
  $('now-button').style.opacity=state.live?'1':'.55';
  $('play-button').setAttribute('aria-label',state.playing?'Pause simulation':'Play simulation');setIcon($('play-button'),state.playing?'pause':'play');
  updateInspector(false);updateSkyNote();
}
function setDate(date,reanchor=true){state.date=clampDate(date);state.live=false;state.playing=false;if(reanchor)anchor=state.date;updateTime();if(state.view==='sky')updateObjects();renderer.draw();}
function stopTour(){if(tourTimer){clearInterval(tourTimer);tourTimer=null;}$('tour-label').textContent='Take a tour';}
function openDialog(id){const dialog=$(id);if(!dialog.open)dialog.showModal();}
document.querySelectorAll('.close-dialog').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();}));
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
for(const id of ['science-button','about-button'])$(id).addEventListener('click',()=>openDialog('science-dialog'));
$('orbits-toggle').addEventListener('click',()=>{state.orbits=!state.orbits;$('orbits-toggle').classList.toggle('active',state.orbits);$('orbits-toggle').setAttribute('aria-pressed',String(state.orbits));renderer.draw();});
$('labels-toggle').addEventListener('click',()=>{state.labels=!state.labels;$('labels-toggle').classList.toggle('active',state.labels);$('labels-toggle').setAttribute('aria-pressed',String(state.labels));renderer.draw();});
$('projection-toggle').addEventListener('click',()=>{renderer.top=!renderer.top;$('projection-toggle').classList.toggle('active',renderer.top);$('projection-toggle').setAttribute('aria-pressed',String(renderer.top));renderer.draw();});
$('distance-toggle').addEventListener('click',()=>{state.proportional=!state.proportional;renderer.reset();updateZoom();$('distance-toggle').innerHTML=`${state.proportional?'Proportional distances':'Distances compressed'} <span>↗</span>`;toast(state.proportional?'Orbital distances now share a linear scale. Planet sizes remain enlarged.':'Distances compressed to keep every planet in view.');});
$('zoom-in').addEventListener('click',()=>{renderer.setZoom(renderer.zoom*1.25);updateZoom();});$('zoom-out').addEventListener('click',()=>{renderer.setZoom(renderer.zoom/1.25);updateZoom();});$('reset-view').addEventListener('click',()=>{renderer.reset();updateZoom();});
$('fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.observatory').requestFullscreen();}catch{toast('Fullscreen is unavailable in this browser.');}});
$('focus-button').addEventListener('click',()=>{
  if(state.view==='solar'){renderer.focus=state.selectedPlanet;renderer.setZoom(2);updateZoom();toast(`${currentItem().name} centered. Reset the view to see the full system.`);}
  else if(state.view==='scale')setScale((state.scale+1)%scaleStops.length);
  else{
    const item=currentItem();const pos=starPosition(item,state.date,state.location.lat,state.location.lon);
    if(pos.altitude>=0){state.labels=true;$('labels-toggle').classList.add('active');$('labels-toggle').setAttribute('aria-pressed','true');renderer.draw();toast(`${item.name}: ${pos.altitude.toFixed(1)}° above the horizon, azimuth ${pos.azimuth.toFixed(1)}°.`);}
    else{let found=false;for(let i=1;i<=192;i++){const date=state.date+i*DAY_MS/96;if(date>MAX_DATE)break;if(starPosition(item,date,state.location.lat,state.location.lon).altitude>1){setDate(date);found=true;toast(`Moved forward to ${item.name} just above your horizon.`);break;}}if(!found)toast('This star does not rise here in the next 48 hours within the supported dates. Try another location.');}
  }
});
$('bookmark-button').addEventListener('click',()=>{const item=currentItem();if(!item.id)return;if(state.saved.has(item.id)){state.saved.delete(item.id);toast(`${item.name} removed from saved objects.`);}else{state.saved.add(item.id);toast(`${item.name} saved for another night.`);}persist();updateInspector();updateObjects();});
$('saved-toggle').addEventListener('click',()=>{state.savedOnly=!state.savedOnly;updateObjects();});
$('tour-button').addEventListener('click',()=>{if(tourTimer){stopTour();return;}renderer.reset();updateZoom();tourIndex=0;selectObject(planets[0].id);$('tour-label').textContent='Stop tour';toast('A journey through eight worlds. Each stop lasts six seconds.');tourTimer=setInterval(()=>{tourIndex++;if(tourIndex>=planets.length){stopTour();selectObject('earth');toast('Welcome home. There is always more to discover.');return;}selectObject(planets[tourIndex].id);},6000);});
$('play-button').addEventListener('click',()=>{state.playing=!state.playing;state.live=false;if(state.playing&&state.date>=MAX_DATE){state.playing=false;toast('You reached 2050. Choose an earlier date to continue.');}updateTime();});
$('speed').addEventListener('change',()=>state.speed=Number($('speed').value));
$('step-back').addEventListener('click',()=>setDate(state.date-DAY_MS));$('step-forward').addEventListener('click',()=>setDate(state.date+DAY_MS));
$('now-button').addEventListener('click',()=>{setDate(Date.now());state.live=true;updateTime();});
$('timeline').addEventListener('input',()=>setDate(anchor+Number($('timeline').value)*DAY_MS,false));
$('date-button').addEventListener('click',()=>{$('date-input').value=new Date(state.date).toISOString().slice(0,16);openDialog('date-dialog');});
$('date-form').addEventListener('submit',e=>{e.preventDefault();const date=Date.parse($('date-input').value+'Z');if(!Number.isFinite(date)||date<MIN_DATE||date>MAX_DATE){$('date-error').textContent='Choose a valid UTC date from 1800 through January 1, 2050.';return;}setDate(date);$('date-dialog').close();});
document.querySelectorAll('[data-date]').forEach(button=>button.addEventListener('click',()=>{setDate(Date.parse(button.dataset.date));$('date-dialog').close();}));
$('scale-slider').addEventListener('input',()=>setScale(Number($('scale-slider').value)));
function updateLocationUI(){$('location-name').textContent=state.location.name;$('latitude').value=state.location.lat;$('longitude').value=state.location.lon;if(state.view==='sky')$('scene-subtitle').textContent='Local horizon · '+state.location.name;}
function setLocation(name,lat,lon){state.location={name,lat,lon};persist();updateLocationUI();updateInspector();updateObjects();updateSkyNote();renderer.draw();$('location-dialog').close();toast('Observing location set to '+name+'.');}
$('location-button').addEventListener('click',()=>{updateLocationUI();openDialog('location-dialog');});
document.querySelectorAll('[data-city]').forEach(button=>button.addEventListener('click',()=>setLocation(button.dataset.city,Number(button.dataset.lat),Number(button.dataset.lon))));
$('location-form').addEventListener('submit',e=>{e.preventDefault();const lat=Number($('latitude').value),lon=Number($('longitude').value);if(!validLocation({name:'',lat,lon}))return;setLocation(`${Math.abs(lat).toFixed(2)}°${lat>=0?'N':'S'}, ${Math.abs(lon).toFixed(2)}°${lon>=0?'E':'W'}`,lat,lon);});
$('geolocation-button').addEventListener('click',()=>{if(!navigator.geolocation){$('location-status').textContent='Geolocation is unavailable. Enter coordinates or choose a city.';return;}$('location-status').textContent='Waiting for your browser’s location permission…';$('geolocation-button').disabled=true;navigator.geolocation.getCurrentPosition(pos=>{$('geolocation-button').disabled=false;$('location-status').textContent='Coordinates stay in this browser.';setLocation('Your location',pos.coords.latitude,pos.coords.longitude);},()=>{$('geolocation-button').disabled=false;$('location-status').textContent='Could not access your location. Choose a city or enter coordinates.';},{timeout:10000,maximumAge:300000});});
function search(){
  const query=$('search-input').value.trim().toLowerCase();const result=$('search-results');result.replaceChildren();
  const matches=[...planets,...stars].filter(item=>!query||`${item.name} ${item.constellation||''} ${item.type||''}`.toLowerCase().includes(query)).slice(0,query?30:8);
  if(!matches.length){const p=document.createElement('p');p.className='dialog-hint';p.textContent='No matches in this catalog. Try a planet, bright star, or constellation.';result.append(p);}
  for(const item of matches){const button=document.createElement('button');button.className='search-result';button.innerHTML=`<span>${item.name}</span><small>${item.constellation?item.constellation+' · Star':item.type} ↗</small>`;button.addEventListener('click',()=>{selectObject(item.id);$('search-dialog').close();});result.append(button);}
}
function openSearch(){openDialog('search-dialog');$('search-input').value='';search();$('search-input').focus();}
$('search-button').addEventListener('click',openSearch);$('search-input').addEventListener('input',search);
$('search-input').addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();$('search-results').querySelector('button')?.focus();}if(e.key==='Enter')$('search-results').querySelector('button')?.click();});
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;if(e.key==='/'){e.preventDefault();openSearch();}if(e.code==='Space'){e.preventDefault();$('play-button').click();}});
updateLocationUI();updateInspector();updateObjects();updateTime();
let last=performance.now(),lastUI=0,lastDraw=0;
function tick(now){const elapsed=Math.min((now-last)/1000,.15);last=now;
  if(!document.hidden){
    if(state.playing){state.date=clampDate(state.date+elapsed*state.speed*1000);if(state.date>=MAX_DATE){state.playing=false;toast('You reached the end of the orbital model: January 1, 2050.');}}
    else if(state.live)state.date=clampDate(Date.now());
    if((state.playing||state.live)&&now-lastDraw>32){renderer.draw();lastDraw=now;}
    if(now-lastUI>250){updateTime();lastUI=now;}
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
