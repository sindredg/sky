let pixels=null;
export let earthTextureVersion=0;
export let earthTextureStatus='loading';
const width=2700,height=1350;
const image=new Image();
image.onload=()=>{
  try{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,width,height);
    pixels=ctx.getImageData(0,0,width,height).data;earthTextureVersion++;earthTextureStatus='ready';
  }catch{earthTextureStatus='fallback';}
  window.dispatchEvent(new Event('earth-texture-ready'));
};
image.onerror=()=>{earthTextureStatus='fallback';window.dispatchEvent(new Event('earth-texture-ready'));};
image.src=new URL('./assets/earth-blue-marble.jpg',import.meta.url).href;
export function earthSurface(lat,lon){
  if(!pixels)return null;
  const u=((lon+180)%360+360)%360/360*width,v=Math.max(0,Math.min(height-1,(90-lat)/180*height));
  const x=Math.floor(u),y=Math.floor(v),dx=u-x,dy=v-y,result=[0,0,0];
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){
    const offset=(Math.min(height-1,y+j)*width+(x+i)%width)*4,weight=(i?dx:1-dx)*(j?dy:1-dy);
    for(let channel=0;channel<3;channel++)result[channel]+=pixels[offset+channel]*weight;
  }
  return result;
}
