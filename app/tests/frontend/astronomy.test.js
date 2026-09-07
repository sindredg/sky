import test from 'node:test';
import assert from 'node:assert/strict';
import {julianDate,solveKepler,planets,orbitalPosition,planetMetrics,DAY_MS,AU_KM,C_KM_S,horizontalCoordinates,siderealDegrees,precess,starPosition,stars,MIN_DATE,MAX_DATE,clampDate,sunAltitude,subsolarPoint,altitudeFrom,lightPhase} from '../../static/astronomy.js';
import {coastlines,ANTARCTIC_CLIP} from '../../static/world.js';
const close=(a,b,tolerance)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b} by ${Math.abs(a-b)}`);
test('Julian epoch and UTC day conversion',()=>{assert.equal(julianDate(Date.UTC(2000,0,1,12)),2451545);assert.equal(julianDate(Date.UTC(1970,0,1)),2440587.5);});
test('Kepler solver closes its residual over planetary eccentricities',()=>{for(const e of [0,.006,.0167,.0539,.2057])for(let M=-Math.PI;M<=Math.PI;M+=.05){const E=solveKepler(M,e);close(E-e*Math.sin(E),M,1e-11);}});
test('Earth J2000 position matches published approximate heliocentric coordinates',()=>{const p=orbitalPosition(planets[2],Date.UTC(2000,0,1,12));close(p.x,-.17717,.0001);close(p.y,.96721,.0001);close(p.z,0,.00001);});
test('Every orbit stays inside perihelion and aphelion over the supported interval',()=>{for(const planet of planets)for(let year=1800;year<=2050;year+=5){const p=orbitalPosition(planet,Date.UTC(year,0,1));assert.ok(p.r>=p.a*(1-p.e)-1e-9&&p.r<=p.a*(1+p.e)+1e-9);assert.ok(Number.isFinite(p.x+p.y+p.z));}});
test('Earth returns close to the same point after a sidereal year',()=>{const date=Date.UTC(2026,0,1),a=orbitalPosition(planets[2],date),b=orbitalPosition(planets[2],date+365.256*DAY_MS);assert.ok(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.001);});
test('Sunlight and vis-viva speed are in physical bounds',()=>{close(AU_KM/C_KM_S,499.004784,1e-5);const earth=planetMetrics(planets[2],Date.UTC(2026,0,1));assert.ok(earth.speed>29&&earth.speed<31);assert.equal(earth.earthDistance,0);for(const p of planets){const m=planetMetrics(p,Date.UTC(2026,0,1));assert.ok(m.speed>4&&m.speed<60);}});
test('Horizon transform gives zenith, east horizon, west horizon and latitude for a pole',()=>{const date=Date.UTC(2000,0,1,12),ra=siderealDegrees(date)/15;close(horizontalCoordinates(ra,0,date,0,0).altitude,90,1e-5);const east=horizontalCoordinates(ra+6,0,date,0,0);close(east.altitude,0,1e-6);close(east.azimuth,90,1e-6);close(horizontalCoordinates(ra-6,0,date,0,0).azimuth,270,1e-6);close(horizontalCoordinates(0,90,date,59.9,10.7).altitude,59.9,1e-6);});
test('Longitude moves the local meridian and precession is identity at J2000',()=>{const date=Date.UTC(2000,0,1,12),ra=siderealDegrees(date,45)/15;close(horizontalCoordinates(ra,20,date,20,45).altitude,90,1e-5);const p=precess(6.75,-16.7,date);close(p.ra,6.75,1e-10);close(p.dec,-16.7,1e-10);});
test('Stars produce finite coordinates at both poles and dates stay in range',()=>{for(const lat of [-90,0,90])for(const star of stars){const p=starPosition(star,Date.UTC(2026,8,7),lat,180);assert.ok(Number.isFinite(p.altitude+p.azimuth));assert.ok(p.altitude>=-90&&p.altitude<=90);assert.ok(p.azimuth>=0&&p.azimuth<360);}assert.equal(clampDate(MIN_DATE-1),MIN_DATE);assert.equal(clampDate(MAX_DATE+1),MAX_DATE);});
// The globe shades every pixel from one subsolar point rather than solving the Sun per
// sample. That is only sound while the shortcut and the full solve agree.
test('Shading from the subsolar point agrees with solving the Sun for each place',()=>{for(const date of [Date.UTC(2026,5,21,12),Date.UTC(2026,2,20,6),Date.UTC(2026,11,21,18),Date.UTC(1890,7,3,4),Date.UTC(2049,0,9,23)]){const sun=subsolarPoint(date);for(let lat=-85;lat<=85;lat+=5)for(let lon=-180;lon<180;lon+=15)close(altitudeFrom(sun,lat,lon),sunAltitude(date,lat,lon),1e-9);}});
test('The subsolar latitude reaches the obliquity at the solstices and zero at an equinox',()=>{close(subsolarPoint(Date.UTC(2026,5,21,12)).lat,23.44,.05);close(subsolarPoint(Date.UTC(2026,11,21,12)).lat,-23.44,.05);close(subsolarPoint(Date.UTC(2026,2,20,12)).lat,0,.3);});
test('The subsolar longitude tracks the rotating Earth westward at fifteen degrees an hour',()=>{const noon=Date.UTC(2026,5,21,12);close(subsolarPoint(noon).lon,0,4);for(let hour=1;hour<=6;hour++){const drift=subsolarPoint(noon+hour*3600000).lon-subsolarPoint(noon).lon;close(((drift+540)%360)-180,-15*hour,.2);}});
test('Every solar altitude carries a phase, and the named boundaries sit where they are documented',()=>{assert.equal(lightPhase(6.1),'day');assert.equal(lightPhase(5.9),'golden');assert.equal(lightPhase(-3.9),'golden');assert.equal(lightPhase(-4.1),'blue');assert.equal(lightPhase(-5.9),'blue');assert.equal(lightPhase(-6.1),'twilight');assert.equal(lightPhase(-17.9),'twilight');assert.equal(lightPhase(-18.1),'night');for(let a=-90;a<=90;a+=.5)assert.ok(['day','golden','blue','twilight','night'].includes(lightPhase(a)));});
// The coastline is a compressed payload rather than readable source, so a corrupted
// character or a botched re-encode would show up as a subtly wrong world rather than
// as an error. These are the shapes of the planet, asserted.
test('The coastline payload decodes to plausible geography',()=>{
  const rings=coastlines();
  assert.ok(rings.length>100,`only ${rings.length} rings`);
  const points=rings.flat();
  assert.ok(points.length>3000,`only ${points.length} points`);
  for(const [lon,lat] of points){
    assert.ok(Number.isFinite(lon)&&Number.isFinite(lat));
    assert.ok(lon>=-180.05&&lon<=180.05,`longitude ${lon}`);
    assert.ok(lat>=ANTARCTIC_CLIP-.05&&lat<=84,`latitude ${lat}`);
  }
  // Every ring closes on itself, within the tenth of a degree it was quantised to.
  for(const ring of rings){
    const [x0,y0]=ring[0],[x1,y1]=ring[ring.length-1];
    close(x0,x1,.11);close(y0,y1,.11);
  }
  // The largest ring is Afro-Eurasia, which spans both hemispheres and reaches the
  // Arctic. If a decode went wrong this is what stops looking like a continent.
  const area=r=>Math.abs(r.reduce((s,p,i)=>{const q=r[(i+r.length-1)%r.length];return s+p[0]*q[1]-q[0]*p[1];},0))/2;
  const biggest=rings.reduce((a,b)=>area(a)>area(b)?a:b);
  assert.ok(Math.max(...biggest.map(p=>p[1]))>70,'the largest landmass should reach the Arctic');
  assert.ok(Math.min(...biggest.map(p=>p[1]))<-30,'and should reach well into the south');
});
