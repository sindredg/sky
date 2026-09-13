// JPL Table 1, J2000 ecliptic elements and rates per Julian century (1800–2050).
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
export const AU_KM = 149597870.7;
export const C_KM_S = 299792.458;
export const DAY_MS = 86400000;
export const MIN_DATE = Date.UTC(1800, 0, 1);
export const MAX_DATE = Date.UTC(2050, 0, 1);
export const MIN_SOLAR_DATE = Date.UTC(-2999, 0, 1);
export const MAX_SOLAR_DATE = Date.UTC(3000, 0, 1);
export const RAD = Math.PI / 180;
export const wrap = (n, base = 360) => ((n % base) + base) % base;
export const julianDate = date => Number(date) / DAY_MS + 2440587.5;
export const clampDate = date => Math.max(MIN_DATE, Math.min(MAX_DATE, Number(date)));
export const clampSolarDate = date => Math.max(MIN_SOLAR_DATE, Math.min(MAX_SOLAR_DATE, Number(date)));
export const usesLongTermModel = date => Number(date)<MIN_DATE||Number(date)>MAX_DATE;
// JPL Tables 2a and 2b include the outer-planet correction terms required over 3000 BCE to 3000 CE.
const longTermElements=[
  [[.38709843,.20563661,7.00559432,252.25166724,77.45771895,48.33961819],[0,.00002123,-.00590158,149472.67486623,.15940013,-.12214182]],
  [[.72332102,.00676399,3.39777545,181.9797085,131.76755713,76.67261496],[-.00000026,-.00005107,.00043494,58517.81560260,.05679648,-.27274174]],
  [[1.00000018,.01673163,-.00054346,100.46691572,102.93005885,-5.11260389],[-.00000003,-.00003661,-.01337178,35999.37306329,.31795260,-.24123856]],
  [[1.52371243,.09336511,1.85181869,-4.56813164,-23.91744784,49.71320984],[.00000097,.00009149,-.00724757,19140.29934243,.45223625,-.26852431]],
  [[5.20248019,.04853590,1.29861416,34.33479152,14.27495244,100.29282654],[-.00002864,.00018026,-.00322699,3034.90371757,.18199196,.13024619]],
  [[9.54149883,.05550825,2.49424102,50.07571329,92.86136063,113.63998702],[-.00003065,-.00032044,.00451969,1222.11494724,.54179478,-.25015002]],
  [[19.18797948,.04685740,.77298127,314.20276625,172.43404441,73.96250215],[-.00020455,-.00001550,-.00180155,428.49512595,.09266985,.04240589]],
  [[30.06952752,.00895439,1.77005520,304.22289287,46.68158724,131.78635853],[.00006447,.00000818,.000224,.21846515314e3,.01009938,-.00606302]]
];
const outerCorrections={jupiter:[-.00012452,.06064060,-.35635438,38.35125],saturn:[.00025899,-.13434469,.87320147,38.35125],uranus:[.00058331,-.97731848,.17689245,7.67025],neptune:[-.00041348,.68346318,-.10162547,7.67025]};
export function calendarYear(year,era='CE'){
  if(!Number.isInteger(year)||year<1||year>3000||!['BCE','CE'].includes(era))throw new RangeError('Choose a year from 1 to 3000 BCE or CE.');
  const date=new Date(0);date.setUTCFullYear(era==='BCE'?1-year:year,0,1);date.setUTCHours(0,0,0,0);return Number(date);
}
const elements = [
  [[.38709927,.20563593,7.00497902,252.25032350,77.45779628,48.33076593],[.00000037,.00001906,-.00594749,149472.67411175,.16047689,-.12534081]],
  [[.72333566,.00677672,3.39467605,181.97909950,131.60246718,76.67984255],[.00000390,-.00004107,-.00078890,58517.81538729,.00268329,-.27769418]],
  [[1.00000261,.01671123,-.00001531,100.46457166,102.93768193,0],[.00000562,-.00004392,-.01294668,35999.37244981,.32327364,0]],
  [[1.52371034,.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891],[.00001847,.00007882,-.00813131,19140.30268499,.44441088,-.29257343]],
  [[5.202887,.04838624,1.30439695,34.39644051,14.72847983,100.47390909],[-.00011607,-.00013253,-.00183714,3034.74612775,.21252668,.20469106]],
  [[9.53667594,.05386179,2.48599187,49.95424423,92.59887831,113.66242448],[-.00125060,-.00050991,.00193609,1222.49362201,-.41897216,-.28867794]],
  [[19.18916464,.04725744,.77263783,313.23810451,170.95427630,74.01692503],[-.00196176,-.00004397,-.00242939,428.48202785,.40805281,.04240589]],
  [[30.06992276,.00859048,1.77004347,-55.12002969,44.96476227,131.78422574],[.00026291,.00005105,.00035372,218.45945325,-.32241464,-.00508664]]
];
// Rounded physical values from https://ssd.jpl.nasa.gov/planets/phys_par.html
export const planets = [
  { id:'mercury', name:'Mercury', type:'Terrestrial planet', color:'#b9b4ac', radius:2439.4, mass:.330103, gravity:3.70, period:87.969, day:1407.5, tagline:'Small world. Extraordinary extremes.', description:'A cratered world close to the Sun, racing around its orbit in just 88 Earth days. Its almost nonexistent atmosphere leaves the surface exposed to space.', fact:'Mercury turns just three times for every two trips around the Sun.' },
  { id:'venus', name:'Venus', type:'Terrestrial planet', color:'#dfb57a', radius:6051.8, mass:4.86731, gravity:8.87, period:224.701, day:5832.4, tagline:'Our brilliant, cloud-wrapped neighbor.', description:'Similar in size to Earth, but wrapped in a dense atmosphere of carbon dioxide. A powerful greenhouse effect makes Venus the hottest planet.', fact:'Venus rotates backward. From its surface, the Sun would rise in the west.' },
  { id:'earth', name:'Earth', type:'Terrestrial planet', color:'#8bc8c8', radius:6371.0084, mass:5.97217, gravity:9.80, period:365.256, day:23.9345, tagline:'Our small corner of everything.', description:'An ocean world with a thin veil of atmosphere. The only place we know where the universe has come alive and begun to wonder about itself.', fact:'Every person you have ever known has lived beneath this same sky.' },
  { id:'mars', name:'Mars', type:'Terrestrial planet', color:'#d88d6b', radius:3389.5, mass:.641691, gravity:3.71, period:686.98, day:24.623, tagline:'A world of rust and possibility.', description:'A cold desert with a history written in ancient riverbeds. Its dusty landscape holds towering volcanoes, deep canyons, and the next chapter of exploration.', fact:'A day on Mars lasts only about 40 minutes longer than a day on Earth.' },
  { id:'jupiter', name:'Jupiter', type:'Gas giant', color:'#cda988', radius:69911, mass:1898.125, gravity:24.79, period:4332.59, day:9.925, tagline:'A giant with a world of its own.', description:'Bands of cloud swirl around the largest planet. Beneath them lies a vast envelope of hydrogen and helium, compressed by immense gravity.', fact:'Jupiter has more than twice the mass of all the other planets combined.' },
  { id:'saturn', name:'Saturn', type:'Gas giant', color:'#d7c391', radius:58232, mass:568.317, gravity:10.44, period:10759.22, day:10.656, tagline:'The solar system’s quiet showstopper.', description:'A pale gas giant surrounded by countless pieces of ice and rock. Its delicate-looking rings stretch across an enormous expanse of space.', fact:'Saturn’s average density is lower than that of liquid water.' },
  { id:'uranus', name:'Uranus', type:'Ice giant', color:'#a0d2d4', radius:25362, mass:86.8099, gravity:8.87, period:30688.5, day:17.24, tagline:'A pale blue world, turned sideways.', description:'Methane gives this distant ice giant its blue-green color. An extreme axial tilt makes it roll around the Sun, creating decades-long seasons.', fact:'Uranus rotates on its side, with an axial tilt of about 98 degrees.' },
  { id:'neptune', name:'Neptune', type:'Ice giant', color:'#799fe4', radius:24622, mass:102.4092, gravity:11.15, period:60182, day:16.11, tagline:'At the edge of the planetary realm.', description:'Cold, distant, and swept by powerful winds. Neptune travels a long, slow path around the Sun, completing one orbit in nearly 165 Earth years.', fact:'Neptune was predicted using mathematics before it was observed through a telescope.' }
].map((p,i) => ({...p, elements:elements[i]}));

export function solveKepler(meanAnomaly, eccentricity) {
  let E = meanAnomaly;
  for (let i = 0; i < 20; i++) {
    const delta = (E - eccentricity * Math.sin(E) - meanAnomaly) / (1 - eccentricity * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return E;
}
export function orbitalElements(planet, date) {
  if(!Number.isFinite(Number(date))||Number(date)<MIN_SOLAR_DATE||Number(date)>MAX_SOLAR_DATE)throw new RangeError('Date is outside the JPL orbital model.');
  const T = (julianDate(date) - 2451545) / 36525;
  const coefficients=usesLongTermModel(date)?longTermElements[planets.indexOf(planet)]:planet.elements;
  return coefficients[0].map((n,i) => n + coefficients[1][i] * T);
}
export function meanAnomaly(planet,date){
  const values=orbitalElements(planet,date),T=(julianDate(date)-2451545)/36525;
  let M=values[3]-values[4];
  if(usesLongTermModel(date)&&outerCorrections[planet.id]){const [b,c,s,f]=outerCorrections[planet.id];M+=b*T*T+c*Math.cos(f*T*RAD)+s*Math.sin(f*T*RAD);}
  return (wrap(M+180)-180)*RAD;
}
export function orbitalPosition(planet, date, eccentricAnomaly) {
  const [a,e,inc,L,peri,node] = orbitalElements(planet,date);
  const E = eccentricAnomaly ?? solveKepler(meanAnomaly(planet,date),e);
  const x = a*(Math.cos(E)-e), y = a*Math.sqrt(1-e*e)*Math.sin(E);
  const w = (peri-node)*RAD, O=node*RAD, I=inc*RAD;
  const cw=Math.cos(w), sw=Math.sin(w), co=Math.cos(O), so=Math.sin(O), ci=Math.cos(I);
  const pos = { x:(cw*co-sw*so*ci)*x+(-sw*co-cw*so*ci)*y, y:(cw*so+sw*co*ci)*x+(-sw*so+cw*co*ci)*y, z:sw*Math.sin(I)*x+cw*Math.sin(I)*y };
  return {...pos, r:Math.hypot(pos.x,pos.y,pos.z), a, e, E};
}
export function planetMetrics(planet,date) {
  const pos=orbitalPosition(planet,date);
  const earth=orbitalPosition(planets[2],date);
  return {...pos, earthDistance:Math.hypot(pos.x-earth.x,pos.y-earth.y,pos.z-earth.z), lightSeconds:pos.r*AU_KM/C_KM_S, speed:Math.sqrt(1.32712440018e11*(2/(pos.r*AU_KM)-1/(pos.a*AU_KM)))};
}
export function siderealDegrees(date,longitude=0) {
  const jd=julianDate(date), T=(jd-2451545)/36525;
  return wrap(280.46061837+360.98564736629*(jd-2451545)+.000387933*T*T-T*T*T/38710000+longitude);
}
export function horizontalCoordinates(raHours,decDegrees,date,latitude,longitude) {
  const H=(siderealDegrees(date,longitude)-raHours*15)*RAD, dec=decDegrees*RAD, lat=latitude*RAD;
  const altitude=Math.asin(Math.max(-1,Math.min(1,Math.sin(dec)*Math.sin(lat)+Math.cos(dec)*Math.cos(lat)*Math.cos(H))))/RAD;
  const azimuth=wrap(Math.atan2(-Math.sin(H)*Math.cos(dec),Math.sin(dec)*Math.cos(lat)-Math.cos(dec)*Math.sin(lat)*Math.cos(H))/RAD);
  return {altitude,azimuth};
}
// Approximate precession of J2000 catalog coordinates; proper motion is omitted.
export function precess(ra,dec,date) {
  const t=(julianDate(date)-2451545)/36525;
  const zeta=(2306.2181*t+.30188*t*t+.017998*t*t*t)/3600*RAD;
  const z=(2306.2181*t+1.09468*t*t+.018203*t*t*t)/3600*RAD;
  const theta=(2004.3109*t-.42665*t*t-.041833*t*t*t)/3600*RAD;
  const a=ra*15*RAD, d=dec*RAD;
  const A=Math.cos(d)*Math.sin(a+zeta), B=Math.cos(theta)*Math.cos(d)*Math.cos(a+zeta)-Math.sin(theta)*Math.sin(d);
  const C=Math.sin(theta)*Math.cos(d)*Math.cos(a+zeta)+Math.cos(theta)*Math.sin(d);
  return {ra:wrap((Math.atan2(A,B)+z)/RAD)/15,dec:Math.asin(C)/RAD};
}
export function starPosition(star,date,lat,lon) {
  const p=precess(star.ra,star.dec,date);
  return horizontalCoordinates(p.ra,p.dec,date,lat,lon);
}
export function sunEquatorial(date) {
  const earth=orbitalPosition(planets[2],date), eps=23.43928*RAD;
  const x=-earth.x,y=-earth.y*Math.cos(eps)+earth.z*Math.sin(eps),z=-earth.y*Math.sin(eps)-earth.z*Math.cos(eps);
  return precess(wrap(Math.atan2(y,x)/RAD)/15,Math.atan2(z,Math.hypot(x,y))/RAD,date);
}
export function sunAltitude(date,lat,lon) {
  const eq=sunEquatorial(date);
  return horizontalCoordinates(eq.ra,eq.dec,date,lat,lon).altitude;
}
// The point with the Sun straight overhead. horizontalCoordinates puts the hour angle
// at zero exactly here, so its longitude is the right ascension carried into the
// rotating frame, and every other place on Earth is an angular distance from it.
export function subsolarPoint(date) {
  const eq=sunEquatorial(date);
  return {lat:eq.dec, lon:wrap(eq.ra*15-siderealDegrees(date)+180)-180};
}
// Solar altitude from a subsolar point already computed for that instant. Shading a
// globe needs one of these per pixel per frame, which rules out solving the Sun's
// position again for each of them.
export function altitudeFrom(sun,lat,lon) {
  const a=lat*RAD, b=sun.lat*RAD, H=(lon-sun.lon)*RAD;
  return Math.asin(Math.max(-1,Math.min(1,Math.sin(a)*Math.sin(b)+Math.cos(a)*Math.cos(b)*Math.cos(H))))/RAD;
}
// Names for the light, using the thresholds the planner already reports against:
// golden hour reaches a little above the horizon, blue hour sits below it, and
// astronomical twilight ends at -18.
export function lightPhase(altitude) {
  return altitude>6?'day':altitude>-4?'golden':altitude>-6?'blue':altitude>-18?'twilight':'night';
}
// Bright-star J2000 coordinates, rounded; distance in light-years, magnitude in V.
export const stars = [
  ['Sirius',6.7525,-16.7161,-1.46,8.6,'Canis Major'],['Canopus',6.3992,-52.6957,-.74,310,'Carina'],['Arcturus',14.261,19.1824,-.05,36.7,'Boötes'],['Vega',18.6156,38.7837,.03,25,'Lyra'],['Capella',5.2782,45.998,.08,42.9,'Auriga'],['Rigel',5.2423,-8.2016,.13,860,'Orion'],['Procyon',7.655,5.225,.34,11.5,'Canis Minor'],['Betelgeuse',5.9195,7.4071,.5,550,'Orion'],['Achernar',1.6286,-57.2368,.46,139,'Eridanus'],['Hadar',14.0637,-60.373,.61,390,'Centaurus'],['Altair',19.8464,8.8683,.76,16.7,'Aquila'],['Acrux',12.4433,-63.099,.76,321,'Crux'],['Aldebaran',4.5987,16.5093,.85,65,'Taurus'],['Antares',16.4901,-26.432,1.06,550,'Scorpius'],['Spica',13.4199,-11.1613,.98,250,'Virgo'],['Pollux',7.7553,28.0262,1.14,33.8,'Gemini'],['Fomalhaut',22.9608,-29.6222,1.16,25.1,'Piscis Austrinus'],['Deneb',20.6905,45.2803,1.25,2600,'Cygnus'],['Regulus',10.1395,11.9672,1.35,79,'Leo'],['Castor',7.5767,31.8883,1.58,51,'Gemini'],['Polaris',2.5303,89.2641,1.98,447,'Ursa Minor'],['Dubhe',11.0621,61.7508,1.79,123,'Ursa Major'],['Merak',11.0307,56.3824,2.37,79.7,'Ursa Major'],['Phecda',11.8972,53.6948,2.44,83.2,'Ursa Major'],['Megrez',12.2571,57.0326,3.31,80.5,'Ursa Major'],['Alioth',12.9005,55.9598,1.77,81,'Ursa Major'],['Mizar',13.3987,54.9254,2.27,83,'Ursa Major'],['Alkaid',13.7923,49.3133,1.86,104,'Ursa Major'],['Bellatrix',5.4189,6.3497,1.64,250,'Orion'],['Saiph',5.7959,-9.6696,2.06,650,'Orion'],['Alnitak',5.6793,-1.9426,1.74,1260,'Orion'],['Alnilam',5.6036,-1.2019,1.69,2000,'Orion'],['Mintaka',5.5334,-.2991,2.23,1200,'Orion'],['Sadr',20.3705,40.2567,2.23,1800,'Cygnus'],['Albireo',19.512,27.9597,3.05,430,'Cygnus'],['Gienah',20.7702,33.9703,2.48,73,'Cygnus'],['Delta Cygni',19.7496,45.1308,2.87,165,'Cygnus'],['Schedar',.6751,56.5373,2.24,228,'Cassiopeia'],['Caph',.1529,59.1498,2.28,55,'Cassiopeia'],['Gamma Cassiopeiae',.9451,60.7167,2.47,550,'Cassiopeia'],['Ruchbah',1.4303,60.2353,2.68,99,'Cassiopeia'],['Segin',1.9066,63.6701,3.35,410,'Cassiopeia'],['Alpheratz',.1398,29.0904,2.06,97,'Andromeda'],['Mirach',1.1622,35.6206,2.05,197,'Andromeda'],['Almach',2.0649,42.3297,2.1,350,'Andromeda'],['Denebola',11.8177,14.5721,2.14,36,'Leo'],['Elnath',5.4382,28.6074,1.65,134,'Taurus'],['Rasalhague',17.5822,12.56,2.07,49,'Ophiuchus'],['Shaula',17.5601,-37.1038,1.62,570,'Scorpius'],['Alpha Centauri',14.6601,-60.8339,-.27,4.37,'Centaurus']
].map(([name,ra,dec,mag,distance,constellation])=>({id:name.toLowerCase().replaceAll(' ','-'),name,ra,dec,mag,distance,constellation}));
export const constellationLines = [
  ['Dubhe','Merak','Phecda','Megrez','Dubhe'],['Megrez','Alioth','Mizar','Alkaid'],['Betelgeuse','Bellatrix','Mintaka','Rigel','Saiph','Alnitak','Betelgeuse'],['Mintaka','Alnilam','Alnitak'],['Deneb','Sadr','Albireo'],['Gienah','Sadr','Delta Cygni'],['Caph','Schedar','Gamma Cassiopeiae','Ruchbah','Segin'],['Alpheratz','Mirach','Almach'],['Castor','Pollux']
];
export const scaleStops = [
  {name:'Earth',km:12742,label:'Our home planet',text:'Start with the diameter of the world beneath your feet.',unit:'12,742 km'},
  {name:'Earth → Moon',km:384400,label:'Our nearest neighbor',text:'About 30 Earth diameters fit into the average distance to the Moon.',unit:'384,400 km'},
  {name:'The Sun',km:1392700,label:'Our star, edge to edge',text:'About 109 Earths could line up across the diameter of the Sun.',unit:'1.39 million km'},
  {name:'Earth → Sun',km:AU_KM,label:'One astronomical unit',text:'This mean Earth–Sun distance gives us a useful ruler for the solar system.',unit:'1 AU'},
  {name:'Sun → Neptune',km:30.07*AU_KM,label:'The planetary frontier',text:'Even sunlight takes more than four hours to reach Neptune’s average orbital distance.',unit:'30.07 AU'},
  {name:'One light-year',km:9460730472580.8,label:'Distance, measured in time',text:'The distance light travels through a vacuum in one Julian year.',unit:'9.46 trillion km'},
  {name:'Proxima Centauri',km:4.2465*9460730472580.8,label:'The nearest star beyond the Sun',text:'A beam of light takes over four years to cross this interstellar gap.',unit:'4.25 light-years'},
  {name:'The Milky Way',km:100000*9460730472580.8,label:'Our galactic neighborhood',text:'An approximate diameter of the Milky Way’s stellar disk. Its outer boundary is not a sharp edge.',unit:'~100,000 light-years'}
];
