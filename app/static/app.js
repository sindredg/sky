import {planets,stars,planetMetrics,starPosition,sunAltitude,subsolarPoint,altitudeFrom,lightPhase,scaleStops,DAY_MS,MIN_DATE,MAX_DATE,clampDate,C_KM_S,AU_KM} from './astronomy.js';
import {MIN_SOLAR_DATE,MAX_SOLAR_DATE,clampSolarDate,usesLongTermModel,calendarYear} from './astronomy.js';
import {epochs,historyAge,historyEpoch,cosmicDuration,UNIVERSE_AGE} from './history.js';
import {earthTextureStatus} from './earth-texture.js';
import {UniverseRenderer,renderPortrait,phaseColors,phaseNames} from './renderer.js';

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
const state={view:'solar',date:clampDate(Date.now()),live:true,playing:false,speed:86400,selectedPlanet:'earth',selectedStar:'vega',orbits:true,labels:true,proportional:false,scale:0,location:validLocation(stored.location)?stored.location:{name:'Oslo, Norway',lat:59.9139,lon:10.7522},saved:new Set(Array.isArray(stored.saved)?stored.saved.filter(id=>knownIds.has(id)):[]),savedOnly:false,places:[],selectedPlace:stored.place||null,placeData:null,placesError:false,milkyLatitude:null,placeDay:null,placeRequest:null,earthDaylight:false,earthGrid:false,deepTime:false,historyPosition:0,historyPlaying:false};
let anchor=state.date,tourTimer=null,tourIndex=0,toastTimer=null;
const renderer=new UniverseRenderer($('universe'),state,id=>selectObject(id));
renderer.onZoom=()=>updateZoom();
function persist(){try{localStorage.setItem('sky-preferences',JSON.stringify({location:state.location,saved:[...state.saved],place:state.selectedPlace}));}catch{toast('Browser storage is unavailable. Your settings will last for this visit.');}}
const currentPlace=()=>state.places.find(p=>p.slug===state.selectedPlace)||null;
// Everything the inspector renders as markup is server-supplied rather than typed here,
// so it is escaped on the way in rather than trusted because of where it came from.
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Times arrive with the place's own UTC offset attached, so the wall clock is already
// the one a person standing there would read.
const clock=iso=>typeof iso==='string'&&iso.length>=16?iso.slice(11,16):'Unavailable';
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
function setIcon(button,name){button.innerHTML=icon(name);}
function formatNumber(n,d=0){return n.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});}
function duration(seconds){if(seconds<60)return `${Math.round(seconds)}s`;if(seconds<3600){const s=Math.round(seconds);return `${Math.floor(s/60)}m ${s%60}s`;}if(seconds<86400)return `${(seconds/3600).toFixed(1)} hours`;if(seconds<31557600)return `${(seconds/86400).toFixed(1)} days`;return `${formatNumber(seconds/31557600,1)} years`;}
function stat(label,value,unit=''){return `<div><div class="stat-label">${label}</div><div class="stat-value">${value}<small>${unit}</small></div></div>`;}
function currentItem(){return state.view==='solar'?planets.find(p=>p.id===state.selectedPlanet):state.view==='sky'?stars.find(s=>s.id===state.selectedStar):state.view==='earth'?currentPlace():scaleStops[state.scale];}

// The catalogue of places lives on the server, so the globe starts empty and fills in.
async function loadPlaces(){
  if(state.places.length||state.placesError||state.loadingPlaces)return;
  state.loadingPlaces=true;
  try{
    const response=await fetch('/api/places');
    if(!response.ok)throw new Error(String(response.status));
    const body=await response.json();
    state.places=(body?.places||[]).filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));
    if(!state.places.length)throw new Error('empty catalogue');
    if(!currentPlace())state.selectedPlace=state.places[0].slug;
    selectPlace(state.selectedPlace,false);
  }catch{
    state.placesError=true;
    if(state.view==='earth'){updateInspector();updateObjects();}
    toast('The place catalogue could not be loaded. The globe still turns; times are unavailable.');
  }finally{state.loadingPlaces=false;}
}
// A later selection must win even if an earlier one answers second.
let detailToken=0,detailTimer=null;
// The clock at the place decides which day its times belong to. A UTC date would hand
// back the wrong side of midnight for everywhere far enough east or west of Greenwich.
function placeDay(place,ms){
  try{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:place.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ms));
    const part=type=>parts.find(p=>p.type===type)?.value;
    const [year,month,day]=[part('year'),part('month'),part('day')];
    if(year&&month&&day)return `${year}-${month}-${day}`;
  }catch{}
  return new Date(ms).toISOString().slice(0,10);
}
async function loadPlaceDetail(slug,day){
  const token=++detailToken;
  state.placeDay=day;state.placeRequest=slug+'|'+day;state.placeData=null;
  try{
    const [light,moon,milky]=await Promise.all(['light','moon','milkyway'].map(async name=>{
      const response=await fetch(`/api/${name}?place=${encodeURIComponent(slug)}&on=${encodeURIComponent(day)}`);
      if(!response.ok)throw new Error(`${name} ${response.status}`);
      return response.json();
    }));
    if(token!==detailToken)return;
    state.placeData={light,moon,milky};state.detailSlug=slug;
    state.milkyLatitude=Number.isFinite(milky?.visible_south_of)?milky.visible_south_of:null;
  }catch{
    if(token!==detailToken)return;
    state.placeData='error';state.detailSlug=slug;
  }
  if(state.view==='earth'){updateInspector();renderer.draw();}
}
function selectPlace(slug,recenter=true){
  const place=state.places.find(p=>p.slug===slug);
  if(!place)return;
  clearTimeout(detailTimer);detailToken++;state.placeRequest=null;
  state.selectedPlace=slug;state.placeData=null;state.milkyLatitude=null;
  applyLocation(place.name,place.latitude,place.longitude);
  // Chosen from the list the globe should bring it into view; clicked on the globe it
  // is already in view, and snapping it to the middle would throw the reader off.
  if(recenter){renderer.spin=place.longitude;renderer.tilt=Math.max(-78,Math.min(78,place.latitude));}
  updateInspector();updateObjects();renderer.draw();
  loadPlaceDetail(slug,placeDay(place,state.date));
}
// The printed times belong to a date, so travelling has to ask again. Playback would
// otherwise fire a request every simulated day, so it waits until the motion stops.
function refreshPlaceDetail(){
  const place=currentPlace();
  if(state.view!=='earth'||!place||state.playing)return;
  const day=placeDay(place,state.date);
  const key=place.slug+'|'+day;
  if(key===state.placeRequest)return;
  clearTimeout(detailTimer);detailToken++;state.placeRequest=key;state.placeData=null;
  detailTimer=setTimeout(()=>loadPlaceDetail(place.slug,day),300);
}
function milkyCopy(milky){
  if(!milky)return 'Working out when the galactic centre clears the horizon…';
  if(milky.window)return `The galactic centre is up between <strong>${escapeHtml(clock(milky.window.start))}</strong> and <strong>${escapeHtml(clock(milky.window.end))}</strong>, highest toward the ${escapeHtml(milky.direction?.compass||'south')}.`;
  if(milky.reason==='never_rises')return `The galactic centre never clears the horizon here. It stays down for anywhere north of <strong>${escapeHtml(milky.visible_south_of)}°</strong>.`;
  return 'No window for the galactic centre here tonight.';
}

function updateInspector(full=true){
  if(state.deepTime){updateHistoryInspector();return;}
  const item=currentItem();
  // The globe can be drawn before the catalogue arrives, and has to stay usable if it
  // never does.
  if(state.view==='earth'&&!item){
    if(full){
      $('object-name').textContent=state.placesError?'Places unavailable':'Loading places…';
      $('bookmark-button').hidden=true;$('object-type').textContent='';$('object-symbol').textContent='◍';
      $('object-description').textContent=state.placesError?'The catalogue could not be reached. The globe and its light still work, but the times for each place come from the server.':'Fetching the catalogue of places.';
      $('object-fact').textContent='';$('focus-label').textContent='Try again';$('inspector-foot').textContent='Sunlight sweeps west at about 15° of longitude an hour.';
      $('portrait-caption').textContent='THE DAY SIDE OF THE WORLD';
      renderPortrait($('portrait'),planets[2],'earth');
    }
    $('stats-grid').innerHTML='';$('light-title').textContent='THE VIEW FROM HERE';$('light-copy').textContent='';
    return;
  }
  if(full){
    $('object-name').textContent=item.name;
    $('bookmark-button').hidden=state.view==='scale'||state.view==='earth';
    if(state.view!=='scale'&&state.view!=='earth'){
      const saved=state.saved.has(item.id);$('bookmark-button').classList.toggle('saved',saved);$('bookmark-button').setAttribute('aria-label',`${saved?'Unsave':'Save'} ${item.name}`);$('bookmark-button').setAttribute('aria-pressed',String(saved));
    }
    renderPortrait($('portrait'),state.view==='scale'||state.view==='earth'?planets[2]:item,state.view);
    $('portrait').setAttribute('aria-label',state.view==='sky'?`Illustration of ${item.name}`:state.view==='scale'?'Earth as a reference for distance':state.view==='earth'?'Earth surface illustration':`Artistic illustration of ${item.name}`);
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
  }else if(state.view==='earth'){
    // The altitude is solved here so the panel stays live while time runs; the printed
    // times come from the planner, which is the tested implementation.
    const sun=subsolarPoint(state.date),altitude=altitudeFrom(sun,item.latitude,item.longitude),phase=lightPhase(altitude);
    const current=state.detailSlug===item.slug&&state.placeDay===placeDay(item,state.date)&&!state.playing;
    const failed=current&&state.placeData==='error',light=current&&!failed?state.placeData?.light:null,moon=current&&!failed?state.placeData?.moon:null;
    if(full){
      $('object-type').textContent=item.country;$('object-symbol').textContent='⌖';
      $('portrait-caption').textContent='THE DAY SIDE OF THE WORLD';
      $('object-description').textContent=item.note||`${item.name} stands at ${Math.abs(item.latitude).toFixed(2)}°${item.latitude>=0?'N':'S'}, ${Math.abs(item.longitude).toFixed(2)}°${item.longitude>=0?'E':'W'}.`;
      $('focus-label').textContent='Chase the golden hour';
      $('inspector-foot').textContent=`Times for ${new Date(`${placeDay(item,state.date)}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'long',timeZone:'UTC'})}, on the clock at that place.`;
    }
    const pending=!failed&&!light;
    $('stats-grid').innerHTML=light
      ? stat('Sunrise',escapeHtml(clock(light.sunrise)))+stat('Sunset',escapeHtml(clock(light.sunset)))+stat('Evening golden',escapeHtml(clock(light.golden_hour_evening?.start)))+stat('Moon lit',moon?Math.round(moon.illumination*100):'—',moon?'%':'')
      : stat('Sun altitude',altitude.toFixed(1),'°')+stat('Right now',phaseNames[phase])+stat('Sunrise',pending?'…':'—')+stat('Sunset',pending?'…':'—');
    $('object-fact').textContent=light?.midnight_sun?`The Sun does not set at ${item.name} today.`:light?.polar_night?`The Sun does not rise at ${item.name} today.`:`${phaseNames[phase]} at ${item.name} right now, with the Sun ${Math.abs(altitude).toFixed(1)}° ${altitude>=0?'above':'below'} the horizon.`;
    $('light-title').textContent='THE MILKY WAY FROM HERE';
    $('light-copy').innerHTML=state.playing?'Pause time to calculate the Milky Way window for this local day.':failed?'Tonight’s times could not be loaded. Use Retry times to try again.':milkyCopy(current?state.placeData?.milky:null);
    updatePlacePanel(item,light,failed);
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
  list.classList.toggle('places-grid',state.view==='earth');list.classList.toggle('history-cards',state.deepTime);
  if(state.deepTime){renderHistoryCards(list);return;}
  if(state.view==='earth'){
    $('object-section-title').innerHTML=`Where the light is<span>${state.places.length?`${String(state.places.length).padStart(2,'0')} PLACES. ONE TURNING WORLD.`:'LOADING THE CATALOGUE.'}</span>`;
    $('saved-toggle').hidden=true;
    $('empty-saved').hidden=state.places.length>0;
    $('empty-saved').textContent=state.placesError?'The catalogue of places could not be loaded. Drag the globe to follow the light anyway.':'Loading the catalogue of places…';
    // Golden first, so the list answers "where is the light right now" before it
    // answers "what is in this catalogue".
    const sun=subsolarPoint(state.date),rank={golden:0,blue:1,twilight:2,night:3,day:4};
    const query=$('place-search').value.trim().toLocaleLowerCase(),filter=$('place-phase').value,sort=$('place-sort').value;
    const rows=state.places.map(place=>({place,phase:lightPhase(altitudeFrom(sun,place.latitude,place.longitude))})).filter(row=>(filter==='all'||row.phase===filter)&&(!query||`${row.place.name} ${row.place.country}`.toLocaleLowerCase().includes(query))).sort((a,b)=>sort==='name'?a.place.name.localeCompare(b.place.name):sort==='country'?a.place.country.localeCompare(b.place.country)||a.place.name.localeCompare(b.place.name):rank[a.phase]-rank[b.phase]||a.place.name.localeCompare(b.place.name));
    $('place-count').textContent=`${rows.length} of ${state.places.length} places`;
    $('empty-saved').hidden=rows.length>0;
    if(state.places.length&&!rows.length)$('empty-saved').textContent='No places match these filters. Try another light condition or clear your search.';
    $('scene-subtitle').textContent=state.earthDaylight?'Daylight preview · pin colors show actual light':`${state.places.length} places · calculated sunlight`;
    for(const {place,phase} of rows){
      const button=document.createElement('button');button.className='object-card';
      const selected=place.slug===state.selectedPlace;
      button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));
      button.innerHTML=`<span class="mini-planet star" style="--planet-color:${phaseColors[phase]}"></span><span><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(place.country)} · ${escapeHtml(localClock(place))}</small><span class="place-phase" style="--phase:${phaseColors[phase]}">${phaseNames[phase]}</span></span>`;
      button.addEventListener('click',()=>selectPlace(place.slug));
      list.append(button);
    }
    return;
  }
  $('empty-saved').textContent='No saved objects yet. Select an object and use the bookmark to keep it here.';
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
  // Pins carry a prefixed id so one hit list can hold places alongside planets and stars.
  if(typeof id==='string'&&id.startsWith('place:')){selectPlace(id.slice(6),false);return;}
  if(planets.some(p=>p.id===id)){state.selectedPlanet=id;if(state.view!=='solar')setView('solar');if(renderer.focus)renderer.focus=id;}
  else if(stars.some(s=>s.id===id)){state.selectedStar=id;if(state.view!=='sky')setView('sky');}
  updateInspector();updateObjects();renderer.draw();
}
function setView(view){
  stopTour();state.deepTime=false;state.historyPlaying=false;
  if(view!=='solar'&&usesLongTermModel(state.date)){state.date=clampDate(Date.now());anchor=state.date;state.playing=false;state.live=true;toast('Returned to today. Local sky and daylight use the 1800–2050 model.');}
  state.view=view;document.body.dataset.view=view;renderer.focus=null;renderer.zoom=1;
  syncExtraUI();
  document.querySelectorAll('[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===view);el.setAttribute('aria-current',el.dataset.view===view?'page':'false');});
  const titles={solar:['Your universe, <em>in motion.</em>','Explore our celestial neighborhood. Grounded in science. Driven by wonder.','THE SOLAR SYSTEM','Heliocentric view'],sky:['A sky full of <em>possibility.</em>','Look up from wherever you are. Find your place among the stars.','YOUR NIGHT SKY','Local horizon · '+state.location.name],earth:['Where the light <em>is right now.</em>','Follow golden hour around a turning world, and see which places are waiting for the dark.','THE LIT WORLD','Places · '+state.places.length+' on the map'],scale:['A little world. <em>A bigger picture.</em>','Travel from our home planet to the galaxy we call home.','COSMIC SCALE','A journey through distance']};
  const [title,desc,eyebrow,subtitle]=titles[view];$('page-title').innerHTML=title;$('page-description').textContent=desc;$('scene-eyebrow').textContent=eyebrow;$('scene-subtitle').textContent=subtitle;
  $('projection-toggle').hidden=view!=='solar';$('distance-toggle').hidden=view!=='solar';document.querySelector('.zoom-controls').hidden=view!=='solar'&&view!=='earth';$('tour-button').hidden=view!=='solar';
  document.querySelector('.scene-controls').hidden=view==='scale';document.querySelector('.scene-caption').hidden=view==='scale';$('scale-controls').hidden=view!=='scale';$('orbits-label').textContent=view==='sky'?'Constellations':'Orbits';
  $('orbits-toggle').hidden=view==='earth';
  $('scene-hint').innerHTML=view==='sky'?'Select a star · Use time to watch the sky turn':view==='earth'?`${icon('mouse')}Drag to spin the world · Click a place`:`${icon('mouse')}Drag to rotate · Scroll to explore`;
  $('universe').setAttribute('aria-label',view==='solar'?'Solar system map. Select planets using the object buttons below. Drag to rotate; scroll to zoom.':view==='sky'?'Sky map with north at top and east at left. Select stars with the object buttons or search.':view==='earth'?'Globe showing which places are in daylight, golden hour, twilight or night. Select places using the buttons below.':'Cosmic scale illustration. Use the slider or destination buttons below.');
  if(view==='earth')loadPlaces();
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
  if(state.deepTime){updateHistoryControls();return;}
  const date=new Date(state.date);
  $('date-display').textContent=formatCalendar(state.date);
  $('time-display').textContent=date.toLocaleTimeString('en-GB',{timeZone:'UTC',hour12:false})+' UTC';
  $('timeline').value=Math.max(-182,Math.min(182,(state.date-anchor)/DAY_MS));
  $('timeline-start').textContent=new Date(clampForView(anchor-182*DAY_MS)).toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
  $('timeline-end').textContent=new Date(clampForView(anchor+182*DAY_MS)).toLocaleDateString('en-GB',{month:'short',year:'2-digit',timeZone:'UTC'});
  const [minimum,maximum]=dateBounds();
  $('step-back').disabled=state.date<=minimum;$('step-forward').disabled=state.date>=maximum;
  if(state.view==='solar')$('scene-subtitle').textContent=usesLongTermModel(state.date)?'JPL long-range approximation · J2000 frame':'Heliocentric view · J2000 frame';
  $('now-button').style.opacity=state.live?'1':'.55';
  $('play-button').setAttribute('aria-label',state.playing?'Pause simulation':'Play simulation');setIcon($('play-button'),state.playing?'pause':'play');
  updateInspector(false);updateSkyNote();refreshPlaceDetail();
}
function setDate(date,reanchor=true){state.date=clampForView(date);state.live=false;state.playing=false;if(reanchor)anchor=state.date;updateTime();if(state.view==='sky'||state.view==='earth'){updateObjects();refreshPlaceDetail();}renderer.draw();}
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
  if(state.deepTime){if(state.historyPosition>=6)setHistory(false);else setHistoryPosition(Math.floor(state.historyPosition)+1);return;}
  if(state.view==='solar'){renderer.focus=state.selectedPlanet;renderer.setZoom(2);updateZoom();toast(`${currentItem().name} centered. Reset the view to see the full system.`);}
  else if(state.view==='scale')setScale((state.scale+1)%scaleStops.length);
  else if(state.view==='earth'){
    const place=currentPlace();
    if(!place){state.placesError=false;loadPlaces();return;}
    // Ten-minute steps across a week. Golden hour lasts far longer than a step at high
    // latitudes and never arrives at all during a polar night, so the search is bounded.
    for(let i=1;i<=1008;i++){
      const date=state.date+i*600000;
      if(date>MAX_DATE)break;
      if(lightPhase(altitudeFrom(subsolarPoint(date),place.latitude,place.longitude))==='golden'){setDate(date);toast(`Golden hour reaches ${place.name}.`);return;}
    }
    toast(`No golden hour at ${place.name} within a week. At this latitude the Sun can stay up, or stay down, for months.`);
  }
  else{
    const item=currentItem();const pos=starPosition(item,state.date,state.location.lat,state.location.lon);
    if(pos.altitude>=0){state.labels=true;$('labels-toggle').classList.add('active');$('labels-toggle').setAttribute('aria-pressed','true');renderer.draw();toast(`${item.name}: ${pos.altitude.toFixed(1)}° above the horizon, azimuth ${pos.azimuth.toFixed(1)}°.`);}
    else{let found=false;for(let i=1;i<=192;i++){const date=state.date+i*DAY_MS/96;if(date>MAX_DATE)break;if(starPosition(item,date,state.location.lat,state.location.lon).altitude>1){setDate(date);found=true;toast(`Moved forward to ${item.name} just above your horizon.`);break;}}if(!found)toast('This star does not rise here in the next 48 hours within the supported dates. Try another location.');}
  }
});
$('bookmark-button').addEventListener('click',()=>{const item=currentItem();if(!item.id)return;if(state.saved.has(item.id)){state.saved.delete(item.id);toast(`${item.name} removed from saved objects.`);}else{state.saved.add(item.id);toast(`${item.name} saved for another night.`);}persist();updateInspector();updateObjects();});
$('saved-toggle').addEventListener('click',()=>{state.savedOnly=!state.savedOnly;updateObjects();});
$('tour-button').addEventListener('click',()=>{if(tourTimer){stopTour();return;}renderer.reset();updateZoom();tourIndex=0;selectObject(planets[0].id);$('tour-label').textContent='Stop tour';toast('A journey through eight worlds. Each stop lasts six seconds.');tourTimer=setInterval(()=>{tourIndex++;if(tourIndex>=planets.length){stopTour();selectObject('earth');toast('Welcome home. There is always more to discover.');return;}selectObject(planets[tourIndex].id);},6000);});
$('play-button').addEventListener('click',()=>{state.playing=!state.playing;state.live=false;const [min,max]=dateBounds();if(state.playing&&((state.speed>0&&state.date>=max)||(state.speed<0&&state.date<=min))){state.playing=false;toast('You reached the model boundary. Change direction or choose another date.');}updateTime();});
$('speed').addEventListener('change',()=>state.speed=Number($('speed').value));
$('step-back').addEventListener('click',()=>setDate(state.date-DAY_MS));$('step-forward').addEventListener('click',()=>setDate(state.date+DAY_MS));
$('now-button').addEventListener('click',()=>{setDate(Date.now());state.live=true;updateTime();});
$('timeline').addEventListener('input',()=>setDate(anchor+Number($('timeline').value)*DAY_MS,false));
$('date-button').addEventListener('click',()=>{const year=new Date(state.date).getUTCFullYear();$('date-input').value=year>0?new Date(state.date).toISOString().slice(0,16):'';$('ancient-year').value=year>0?year:1-year;$('ancient-era').value=year>0?'CE':'BCE';const solar=state.view==='solar';$('ancient-form').hidden=!solar;$('orbital-range').hidden=!solar;$('date-input').min=solar?'0001-01-01T00:00':'1800-01-01T00:00';$('date-input').max=solar?'3000-01-01T00:00':'2050-01-01T00:00';openDialog('date-dialog');});
$('date-form').addEventListener('submit',e=>{e.preventDefault();const date=Date.parse($('date-input').value+'Z');const [min,max]=dateBounds();if(!Number.isFinite(date)||date<min||date>max){$('date-error').textContent='Choose a valid date within this view’s supported range.';return;}setDate(date);$('date-dialog').close();});
document.querySelectorAll('[data-date]').forEach(button=>button.addEventListener('click',()=>{setDate(Date.parse(button.dataset.date));$('date-dialog').close();}));
$('scale-slider').addEventListener('input',()=>setScale(Number($('scale-slider').value)));
function updateLocationUI(){$('location-name').textContent=state.location.name;$('latitude').value=state.location.lat;$('longitude').value=state.location.lon;if(state.view==='sky')$('scene-subtitle').textContent='Local horizon · '+state.location.name;}
function applyLocation(name,lat,lon){state.location={name,lat,lon};persist();updateLocationUI();updateSkyNote();}
function setLocation(name,lat,lon){applyLocation(name,lat,lon);updateInspector();updateObjects();renderer.draw();$('location-dialog').close();toast('Observing location set to '+name+'.');}
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
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;if(e.key==='/'){e.preventDefault();openSearch();}if(e.code==='Space'){e.preventDefault();$(state.deepTime?'history-play':'play-button').click();}});
syncExtraUI();updateLocationUI();updateInspector();updateObjects();updateTime();
let last=performance.now(),lastUI=0,lastDraw=0,lastPlaces=0;
function tick(now){const elapsed=Math.min((now-last)/1000,.15);last=now;
  if(!document.hidden){
    if(state.historyPlaying){state.historyPosition=Math.min(6,state.historyPosition+elapsed*.12);if(state.historyPosition>=6)state.historyPlaying=false;renderer.draw();if(now-lastUI>250){updateHistoryInspector();updateHistoryControls();lastUI=now;}}
    if(state.playing&&!state.deepTime){const [min,max]=dateBounds();state.date=clampForView(state.date+elapsed*state.speed*1000);if(state.date>=max||state.date<=min){state.playing=false;toast('Reached the orbital model boundary. Choose another date or explore cosmic history.');}}
    else if(state.live&&!state.deepTime)state.date=clampDate(Date.now());
    if(!state.deepTime&&(state.playing||state.live)&&now-lastDraw>(state.playing?50:1000)){renderer.draw();lastDraw=now;}
    if(now-lastUI>500){updateTime();lastUI=now;}
    if(state.view==='earth'&&now-lastPlaces>(state.playing?1500:30000)&&!$('object-list').contains(document.activeElement)){updateObjects();lastPlaces=now;}
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function dateBounds(){return state.view==='solar'?[MIN_SOLAR_DATE,MAX_SOLAR_DATE]:[MIN_DATE,MAX_DATE];}
function clampForView(date){return state.view==='solar'?clampSolarDate(date):clampDate(date);}
function formatCalendar(ms){const date=new Date(ms);return date.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC',...(date.getUTCFullYear()<=0?{era:'short'}:{})});}
function localClock(place){try{return new Date(state.date).toLocaleTimeString('en-GB',{timeZone:place.timezone,hour:'2-digit',minute:'2-digit',hour12:false});}catch{return 'Unknown';}}
function syncExtraUI(){
  const earth=state.view==='earth',history=state.deepTime;
  document.body.classList.toggle('earth-view',earth);document.body.classList.toggle('history-view',history);
  for(const id of ['earth-legend','earth-daylight','earth-center','earth-grid','place-clock','place-sky','place-filters'])$(id).hidden=!earth;
  $('history-button').hidden=state.view!=='solar';$('history-button').textContent=history?'Orbital time ↗':'Cosmic history ↗';
  $('history-controls').hidden=!history;
  document.querySelector('.time-main').hidden=history;document.querySelector('.time-playback').hidden=history;
  $('place-daylight').hidden=!earth;$('place-status').hidden=!earth;
  if(history){document.querySelector('.scene-controls').hidden=true;document.querySelector('.scene-caption').hidden=true;$('tour-button').hidden=true;$('saved-toggle').hidden=true;}
}
function updatePlacePanel(place,light,failed){
  $('local-clock').textContent=localClock(place);$('place-coordinates').textContent=`${Math.abs(place.latitude).toFixed(2)}° ${place.latitude<0?'S':'N'} · ${Math.abs(place.longitude).toFixed(2)}° ${place.longitude<0?'W':'E'}`;
  $('place-daylight').hidden=!light?.curve?.length;
  const status=$('place-status');status.hidden=Boolean(light);
  if(failed){if(!status.querySelector('button')){status.innerHTML='Times could not be loaded. <button id="retry-place" class="text-button">Retry times ↗</button>';}}
  else status.textContent=state.playing?'Pause time to load sunrise and sunset for this day.':'Calculating this local day…';
  if(light?.curve?.length){
    const colors={day:'#e7d7a2',golden:'#e6a050',blue:'#628bc0',twilight:'#354e73',night:'#152237'};
    $('daylight-bar').style.background=`linear-gradient(90deg,${light.curve.map((alt,i)=>`${colors[lightPhase(alt)]} ${(i/(light.curve.length-1)*100).toFixed(2)}%`).join(',')})`;
    const minutes=Math.round(light.daylight_minutes);$('daylight-duration').textContent=`${Math.floor(minutes/60)}h ${minutes%60}m daylight`;
    $('daylight-bar').setAttribute('aria-label',`Light on ${light.date} at ${place.name}. Sunrise ${clock(light.sunrise)}, sunset ${clock(light.sunset)}. ${Math.floor(minutes/60)} hours ${minutes%60} minutes of daylight.`);
  }
}
function setHistory(enabled){
  setView('solar');state.deepTime=enabled;state.playing=false;state.live=false;state.historyPlaying=false;
  syncExtraUI();updateInspector();updateObjects();updateTime();renderer.draw();
}
function setHistoryPosition(value){state.historyPosition=Math.max(0,Math.min(6,Number(value)));state.historyPlaying=false;updateHistoryInspector();updateHistoryControls();updateObjects();renderer.draw();}
function updateHistoryControls(){
  $('history-slider').value=state.historyPosition;$('history-age').textContent=cosmicDuration(historyAge(state.historyPosition))+' after the Big Bang';
  if(state.historyPosition===0)$('history-age').textContent='The beginning';
  $('history-prev').disabled=state.historyPosition<=0;$('history-next').disabled=state.historyPosition>=6;
  setIcon($('history-play'),state.historyPlaying?'pause':'play');$('history-play').setAttribute('aria-label',state.historyPlaying?'Pause cosmic history':'Play cosmic history');
  document.querySelectorAll('[data-epoch]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.epoch)===Math.floor(state.historyPosition))));
}
function updateHistoryInspector(){
  const epoch=historyEpoch(state.historyPosition),age=historyAge(state.historyPosition);
  $('scene-eyebrow').textContent='BEFORE OUR NEIGHBORHOOD';$('scene-subtitle').textContent='Illustrative cosmic history';
  $('object-name').textContent=epoch.name;$('bookmark-button').hidden=true;$('object-type').textContent='Cosmic chapter';$('object-symbol').textContent='✧';
  $('object-description').textContent=epoch.description;$('object-fact').textContent=epoch.fact;
  $('stats-grid').innerHTML=stat('Age of the universe',cosmicDuration(age))+stat('Lookback time',cosmicDuration(UNIVERSE_AGE-age))+stat('In this chapter',epoch.contents)+stat('Visual model','Illustration');
  $('focus-label').textContent=state.historyPosition<6?'Next chapter':'Return to orbital time';$('inspector-foot').textContent='Rounded cosmic ages. Chapter spacing is not linear.';
  $('light-title').textContent='A UNIVERSE BEFORE THE SUN';$('light-copy').textContent=age<9.2e9?'Our solar system has not formed in this chapter.':'Our solar system formed about 4.6 billion years ago.';
}
function renderHistoryCards(list){
  $('object-section-title').innerHTML='The story of everything<span>SEVEN CHAPTERS. 13.8 BILLION YEARS.</span>';$('saved-toggle').hidden=true;$('empty-saved').hidden=true;
  list.classList.add('history-cards');
  epochs.forEach((epoch,index)=>{const button=document.createElement('button');button.className='object-card';button.dataset.epoch=index;button.setAttribute('aria-pressed',String(index===Math.floor(state.historyPosition)));button.innerHTML=`<span class="epoch-number">0${index+1}</span><span><strong>${epoch.name}</strong><small>${index===0?'The beginning':cosmicDuration(epoch.age)}</small></span>`;button.addEventListener('click',()=>setHistoryPosition(index));list.append(button);});
}
for(const id of ['place-search','place-phase','place-sort'])$(id).addEventListener(id==='place-search'?'input':'change',updateObjects);
$('earth-daylight').addEventListener('click',()=>{state.earthDaylight=!state.earthDaylight;$('earth-daylight').setAttribute('aria-pressed',String(state.earthDaylight));$('earth-daylight').textContent=state.earthDaylight?'Actual sunlight':'Explore daylight';updateObjects();renderer.draw();});
$('earth-grid').addEventListener('click',()=>{state.earthGrid=!state.earthGrid;$('earth-grid').setAttribute('aria-pressed',String(state.earthGrid));$('earth-grid').classList.toggle('active',state.earthGrid);renderer.draw();});
$('earth-center').addEventListener('click',()=>{const place=currentPlace();if(place){renderer.spin=place.longitude;renderer.tilt=Math.max(-78,Math.min(78,place.latitude));renderer.zoom=1;updateZoom();renderer.draw();}});
$('place-sky').addEventListener('click',()=>{if(currentPlace())setView('sky');});
$('place-status').addEventListener('click',e=>{if(e.target.closest('#retry-place')){const place=currentPlace();if(place){state.placeData=null;loadPlaceDetail(place.slug,placeDay(place,state.date));updateInspector();}}});
$('history-button').addEventListener('click',()=>setHistory(!state.deepTime));
$('history-exit').addEventListener('click',()=>setHistory(false));
$('history-slider').addEventListener('input',()=>setHistoryPosition($('history-slider').value));
$('history-prev').addEventListener('click',()=>setHistoryPosition(Math.ceil(state.historyPosition)-1));
$('history-next').addEventListener('click',()=>setHistoryPosition(Math.floor(state.historyPosition)+1));
$('history-play').addEventListener('click',()=>{if(state.historyPosition>=6)state.historyPosition=0;state.historyPlaying=!state.historyPlaying;updateHistoryControls();});
$('date-history').addEventListener('click',()=>{$('date-dialog').close();setHistory(true);setHistoryPosition(0);});
$('ancient-form').addEventListener('submit',e=>{e.preventDefault();try{setDate(calendarYear(Number($('ancient-year').value),$('ancient-era').value));$('date-dialog').close();}catch(error){$('date-error').textContent=error.message;}});
window.addEventListener('earth-texture-ready',()=>{renderer.draw();updateInspector();if(earthTextureStatus==='fallback')toast('The surface image could not load. Using the coastline map.');});
