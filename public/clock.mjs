// Counts only active time. The clock can be paused repeatedly without using
// time spent in a guide, another tab, or the hub's exit confirmation.
export class ActiveCountdown {
  constructor(milliseconds,now=()=>performance.now()){
    if(!Number.isFinite(milliseconds)||milliseconds<0)throw new Error('Duración no válida');
    this.remainingMs=milliseconds;this.now=now;this.last=now();this.paused=false;
  }
  tick(){const now=this.now();if(!this.paused)this.remainingMs=Math.max(0,this.remainingMs-Math.max(0,now-this.last));this.last=now;return this.remainingMs;}
  pause(){this.tick();this.paused=true;return this.remainingMs;}
  resume(){this.last=this.now();this.paused=false;return this.remainingMs;}
}
