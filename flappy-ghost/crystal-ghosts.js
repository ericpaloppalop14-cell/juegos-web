// True rotating polyhedral gems projected into a cached sprite atlas.
// All geometry and facet sorting happen during preparation, never during play.
(() => {
  const hues=[194,153,268,337,40], frames=48, cell=128, columns=8;
  const atlases=[];
  function diamond(ctx,x,y,size,angle,hue) {
    const points=[[0,-1.05,0],[0,1.25,0]];
    for(let i=0;i<6;i++){const a=i*Math.PI/3;points.push([Math.cos(a),-.18,Math.sin(a)]);}
    const yaw=angle,pitch=.24+Math.sin(angle)*.18;
    const rotated=points.map(([x,y,z])=>{
      const rx=x*Math.cos(yaw)+z*Math.sin(yaw),rz=-x*Math.sin(yaw)+z*Math.cos(yaw);
      return [rx,y*Math.cos(pitch)-rz*Math.sin(pitch),y*Math.sin(pitch)+rz*Math.cos(pitch)];
    });
    const faces=[];
    for(let i=0;i<6;i++) {const a=2+i,b=2+(i+1)%6;faces.push([0,a,b],[1,b,a]);}
    faces.sort((a,b)=>a.reduce((s,i)=>s+rotated[i][2],0)-b.reduce((s,i)=>s+rotated[i][2],0));
    for(const face of faces) {
      const p=face.map(i=>rotated[i]);
      const u=p[1].map((v,i)=>v-p[0][i]),v=p[2].map((v,i)=>v-p[0][i]);
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
      const norm=Math.hypot(...n)||1;
      const lit=Math.abs((n[0]*-.4+n[1]*-.6+n[2]*.7)/norm);
      ctx.fillStyle=`hsl(${hue+lit*18} 85% ${28+lit*58}%)`;
      ctx.strokeStyle='rgba(245,252,255,.65)';ctx.lineWidth=.45;
      ctx.beginPath();p.forEach(([px,py,pz],i)=>{const perspective=1/(1-pz*.13);const dx=x+px*size*perspective,dy=y+py*size*perspective;i?ctx.lineTo(dx,dy):ctx.moveTo(dx,dy);});
      ctx.closePath();ctx.fill();ctx.stroke();
    }
  }
  window.CrystalGhosts={
    async prepare() {
      if(atlases.length)return;
      for(let id=0;id<5;id++) {
        const atlas=document.createElement('canvas');atlas.width=columns*cell;atlas.height=6*cell;
        const c=atlas.getContext('2d');
        for(let f=0;f<frames;f++) {
          c.save();c.translate(f%columns*cell+cell/2,Math.floor(f/columns)*cell+cell/2);c.scale(cell/96,cell/96);
          const t=f/frames*Math.PI*2;
          c.beginPath();c.ellipse(0,17,19,14,0,0,Math.PI*2);c.clip();
          const glow=c.createRadialGradient(0,17,0,0,17,19);
          glow.addColorStop(0,`hsla(${hues[id]},90%,75%,.45)`);glow.addColorStop(1,`hsla(${hues[id]},90%,75%,0)`);
          c.fillStyle=glow;c.fillRect(-22,0,44,36);
          diamond(c,0,16+Math.sin(t)*1.2,8.3,t,hues[id]);
          diamond(c,-12,20+Math.sin(t+2)*2,3.8,-t+.5,hues[id]+15);
          diamond(c,12,12+Math.sin(t+4)*2,4.2,t+2,hues[id]-15);
          c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=.8;c.beginPath();c.ellipse(0,17,17,12,0,.1,1.5);c.stroke();
          c.restore();
        }
        atlases[id]=atlas;
        await new Promise(requestAnimationFrame);
      }
    },
    draw(ctx,index,time) {
      const atlas=atlases[index-12];if(!atlas)return;
      const f=Math.floor(Math.max(0,time)*16)%frames;
      ctx.drawImage(atlas,f%columns*cell,Math.floor(f/columns)*cell,cell,cell,-48,-48,96,96);
    }
  };
})();
