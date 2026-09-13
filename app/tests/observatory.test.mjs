import test from 'node:test';
import assert from 'node:assert/strict';
import {planets,calendarYear,MIN_SOLAR_DATE,MAX_SOLAR_DATE,orbitalPosition,orbitalElements,solveKepler,meanAnomaly,planetMetrics,subsolarPoint,altitudeFrom,lightPhase,usesLongTermModel} from '../static/astronomy.js';
import {historyAge,historyEpoch,UNIVERSE_AGE,epochs} from '../static/history.js';
const near=(actual,expected,tolerance)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} is not within ${tolerance} of ${expected}`);
test('calendar years avoid the JavaScript 1900 offset and have no civil year zero',()=>{
  assert.equal(new Date(calendarYear(1,'CE')).getUTCFullYear(),1);
  assert.equal(new Date(calendarYear(1,'BCE')).getUTCFullYear(),0);
  assert.equal(new Date(calendarYear(3000,'BCE')).getUTCFullYear(),-2999);
  assert.equal(calendarYear(3000,'BCE'),MIN_SOLAR_DATE);
  assert.equal(calendarYear(3000,'CE'),MAX_SOLAR_DATE);
  for(const bad of [0,3001,1.5,NaN])assert.throws(()=>calendarYear(bad,'BCE'),RangeError);
});
test('Earth at J2000 agrees with independently published approximate coordinates',()=>{
  const p=orbitalPosition(planets[2],Date.UTC(2000,0,1,12));near(p.x,-.17717,.0001);near(p.y,.96721,.0001);near(p.z,0,.00001);
});
test('historical orbital positions stay finite and inside ellipse bounds',()=>{
  for(const planet of planets)for(let year=-2999;year<=3000;year+=47){
    const d=new Date(0);d.setUTCFullYear(year,0,1);const p=orbitalPosition(planet,d);
    assert.ok(Number.isFinite(p.x+p.y+p.z));assert.ok(p.e>=0&&p.e<1);
    assert.ok(p.r>=p.a*(1-p.e)-1e-8&&p.r<=p.a*(1+p.e)+1e-8);
    assert.ok(planetMetrics(planet,d).speed>0);
  }
});
test('long-range Saturn anomaly includes the Table 2b correction',()=>{
  const date=calendarYear(1000),p=planets[5],el=orbitalElements(p,date);
  const T=(Number(date)/86400000+2440587.5-2451545)/36525;
  const correction=.00025899*T*T-.13434469*Math.cos(38.35125*T*Math.PI/180)+.87320147*Math.sin(38.35125*T*Math.PI/180);
  const expected=((el[3]-el[4]+correction+180)%360+360)%360-180;
  near(meanAnomaly(p,date),expected*Math.PI/180,1e-10);
  assert.ok(usesLongTermModel(date));assert.ok(!usesLongTermModel(Date.UTC(2026,8,13)));
});
test('Kepler residual converges and unsupported dates fail instead of fabricating orbits',()=>{
  for(const e of [0,.01,.1,.21])for(let M=-Math.PI;M<Math.PI;M+=.1){const E=solveKepler(M,e);near(E-e*Math.sin(E),M,1e-10);}
  for(const date of [MIN_SOLAR_DATE-1,MAX_SOLAR_DATE+1,NaN,-8e15])assert.throws(()=>orbitalPosition(planets[2],date),RangeError);
});
test('sunlight shading agrees at the subsolar point and antipode',()=>{
  for(const date of [Date.UTC(2026,2,20,12),Date.UTC(2026,5,21,0),Date.UTC(2026,11,21,18)]){
    const sun=subsolarPoint(date);near(altitudeFrom(sun,sun.lat,sun.lon),90,1e-5);near(altitudeFrom(sun,-sun.lat,sun.lon+180),-90,1e-5);
    assert.equal(lightPhase(altitudeFrom(sun,sun.lat,sun.lon)),'day');assert.equal(lightPhase(altitudeFrom(sun,-sun.lat,sun.lon+180)),'night');
  }
});
test('cosmic age is monotonic, bounded, and independent of JavaScript dates',()=>{
  let previous=-1;for(let i=0;i<=600;i++){const age=historyAge(i/100);assert.ok(age>=previous&&age<=UNIVERSE_AGE);previous=age;}
  assert.equal(historyAge(-1),0);assert.equal(historyAge(7),UNIVERSE_AGE);
  near(UNIVERSE_AGE-epochs.find(e=>e.id==='solar-birth').age,4.6e9,1);
  assert.equal(historyEpoch(0).kind,'plasma');assert.equal(historyEpoch(6).kind,'today');
  assert.ok(historyAge(.001)>0);
});
