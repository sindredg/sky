export const UNIVERSE_AGE=13.8e9;
export const epochs=[
  {id:'bang',age:0,name:'The Big Bang',when:'About 13.8 billion years ago',tag:'SPACE ITSELF BEGINS TO EXPAND',kind:'plasma',description:'Our observable universe traces back to a hot, dense early state. Expansion happened everywhere, not from a central explosion into empty space.',fact:'There were no stars, planets, or atoms yet. The very first instant is beyond our tested physics.',contents:'Hot early universe'},
  {id:'first-light',age:380000,name:'The first free light',when:'About 380,000 years after the Big Bang',tag:'THE UNIVERSE BECOMES TRANSPARENT',kind:'afterglow',description:'As the universe cooled, nuclei captured electrons to form neutral atoms. Light could finally travel freely. We detect this ancient afterglow today as the cosmic microwave background.',fact:'The colors in this scene are an illustration, not a photograph of the early universe.',contents:'Hydrogen and helium'},
  {id:'dark-ages',age:1e7,name:'The cosmic dark ages',when:'Before the first stars',tag:'GRAVITY IS QUIETLY AT WORK',kind:'dark',description:'The young universe held neutral gas and dark matter, but no stars lit the sky. Gravity slowly gathered matter into denser regions.',fact:'Our Sun and Earth would not form for billions of years.',contents:'Gas and dark matter'},
  {id:'first-stars',age:2e8,name:'The first stars',when:'Illustrated at 200 million years',tag:'DARKNESS GIVES WAY TO STARLIGHT',kind:'stars',description:'Dense gas clouds collapsed and the first stars began to shine. Their exact formation time remains uncertain; this scene represents the early era of star formation.',fact:'Inside stars, nuclear reactions began building heavier elements from lighter ones.',contents:'The earliest stars'},
  {id:'galaxies',age:5e8,name:'Galaxies take shape',when:'Illustrated at 500 million years',tag:'SMALL BEGINNINGS, VAST STRUCTURES',kind:'galaxies',description:'Stars and gas assembled into early galaxies. Over billions of years, gravity, star formation, and mergers transformed them into the universe we see today.',fact:'These galaxies are illustrative. Their positions are not reconstructed historical coordinates.',contents:'Young galaxies'},
  {id:'solar-birth',age:9.2e9,name:'Our solar system forms',when:'About 4.6 billion years ago',tag:'A CLOUD BECOMES OUR NEIGHBORHOOD',kind:'disk',description:'A cloud of gas and dust collapsed into a spinning disk. The Sun formed near the center while material around it began assembling into planets.',fact:'A formation illustration replaces calculated modern orbits. Those cannot be extrapolated back billions of years.',contents:'Sun and planet-forming disk'},
  {id:'today',age:UNIVERSE_AGE,name:'And here we are',when:'The present universe',tag:'A SMALL WORLD THAT LOOKS BACK',kind:'today',description:'After billions of years of cosmic evolution, we can stand on Earth and ask where it all came from. Return to orbital time to explore our solar system at a specific date.',fact:'Cosmic ages are rounded estimates. The orbital simulator uses a separate, bounded astronomical model.',contents:'Our celestial neighborhood'}
];
// Piecewise interpolation gives short early epochs and long late epochs usable space.
export function historyAge(position){
  const p=Math.max(0,Math.min(6,Number(position))),i=Math.min(5,Math.floor(p));
  return epochs[i].age+(epochs[i+1].age-epochs[i].age)*(p-i);
}
export function historyEpoch(position){return epochs[Math.min(6,Math.max(0,Math.floor(Number(position))))];}
export function cosmicDuration(years){
  if(years===0)return 'The beginning';
  if(years>=1e9)return `${(years/1e9).toFixed(2)} billion years`;
  if(years>=1e6)return `${(years/1e6).toFixed(1)} million years`;
  return `${Math.round(years).toLocaleString('en-US')} years`;
}
