export const ttt=((t,e=-1,l=0)=>t.filter((t,l)=>e<0||l==e).map(e=>{let h=0,i=document.createElement("canvas"),a=i.getContext("2d"),r=t=>"rgba("+[17*(t>>12&15),17*(t>>8&15),17*(t>>4&15),(15&t)/15].join()+")",f=(t,e,l,h,...i)=>i.map((i,f)=>{a.fillStyle=r(i),a.fillRect(t+[-1,1,0][f],e+[-1,1,0][f],l,h)});for(i.width=e[h++],i.height=e[h++],f(0,0,i.width,i.height,0,0,e[h++]);h<e.length;){let g=[(t,e,l,h,i,a,r)=>{f(t,e,l,h,i,a,r)},(t,e,l,h,a,r,g,n,o)=>{for(let d=t;d<i.width;d+=a)for(let t=e;t<i.height;t+=r)f(d,t,l,h,g,n,o)},(t,e)=>{for(let l=0;l<i.width;l+=e)for(let h=0;h<i.height;h+=e)f(l,h,e,e,0,0,(65520&t)+Math.random()*(15&t))},(t,e,l,h,i,f)=>{a.fillStyle=r(l),a.font=i+"px "+["sans-",""][h]+"serif",a.fillText(f,t,e)},(e,h,i,r,f,g)=>{a.globalAlpha=g/15,e<t.length&&l<16&&a.drawImage(ttt(t,e,l+1)[0],h,i,r,f),a.globalAlpha=1}][e[h++]];g(...e.slice(h,h+=g.length))}return i}));