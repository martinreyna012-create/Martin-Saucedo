export const colors = [
  {id:'rojo',name:'Rojo',plural:'rojos',fill:'#e65b58',wing:'#b63c43',light:'#f79888'},
  {id:'azul',name:'Azul',plural:'azules',fill:'#469ada',wing:'#2778b5',light:'#8ac7ee'},
  {id:'amarillo',name:'Amarillo',plural:'amarillos',fill:'#f5c84b',wing:'#d8a52a',light:'#ffe79b'},
  {id:'verde',name:'Verde',plural:'verdes',fill:'#62aa70',wing:'#3c8254',light:'#a0d69a'},
  {id:'morado',name:'Morado',plural:'morados',fill:'#9970c8',wing:'#7350a1',light:'#c3a4e7'},
  {id:'naranja',name:'Naranja',plural:'naranjas',fill:'#ee9348',wing:'#cb6b2f',light:'#ffc18a'}
];
export function flyingBirdSVG(id='azul'){
  const c=colors.find(c=>c.id===id)||colors[1];
  return `<svg class="flying-bird-art" viewBox="0 0 160 136" fill="none" aria-hidden="true"><g class="flight-wing wing-back"><path d="M83 73Q60 56 43 19Q68 25 101 63Z" fill="${c.light}"/></g><path d="m53 80-32-15 7 23-12 11 42 2" fill="${c.wing}"/><path d="M47 83c0-21 15-33 35-31 10-21 37-20 46-4 6 10 8 23 2 36-8 22-33 29-53 25-19-3-30-12-30-26Z" fill="${c.fill}"/><path d="M66 100q27 13 48-1-20 6-34-4" fill="${c.light}"/><path d="m130 58 21 9-22 8" fill="#e8b251"/><circle cx="116" cy="54" r="4.5" fill="#243d35"/><circle cx="117" cy="53" r="1.3" fill="white"/><path d="M93 37q-5-12 2-18" stroke="${c.fill}" stroke-width="5" stroke-linecap="round"/><g class="flight-wing wing-front"><path d="M88 71Q65 59 42 25Q39 67 62 87Q78 99 88 71Z" fill="${c.wing}"/><path d="M72 75Q58 62 50 44" stroke="${c.light}" stroke-width="3" stroke-linecap="round"/></g></svg>`;
}
// All birds share a silhouette: color is the only relevant visual cue.
export function birdSVG(id='azul') {
  const c=colors.find(c=>c.id===id)||colors[1];
  return `<svg class="bird-art" viewBox="0 0 160 136" fill="none" aria-hidden="true"><path d="m48 85-29-5 17 27 28-6" fill="${c.wing}"/><path d="m35 94-13 1 12 12 19-5" fill="${c.fill}"/><path d="M44 84c0-29 19-51 48-51 23 0 40 15 40 37 0 34-22 52-51 52-23 0-37-14-37-38Z" fill="${c.fill}"/><path d="M56 82c3 24 24 28 44 11-9-22-32-29-44-11Z" fill="${c.wing}"/><path d="M64 79c5-3 16-3 24 4" stroke="${c.light}" stroke-width="3" stroke-linecap="round"/><path d="m129 67 20 9-19 8" fill="#e8b251"/><path d="m85 118-3 12m19-13 2 12m-27 1h13m7-1h13" stroke="#795a3d" stroke-width="3" stroke-linecap="round"/><circle cx="113" cy="61" r="4.5" fill="#243d35"/><circle cx="114" cy="60" r="1.3" fill="white"/><path d="M76 36q-4-15 6-21m5 19q1-14 10-17" stroke="${c.fill}" stroke-width="6" stroke-linecap="round"/><path d="M99 84q11 8 20 0" stroke="${c.light}" stroke-width="3" stroke-linecap="round"/></svg>`;
}

export function flockArt(){return `<svg viewBox="0 0 360 190" fill="none" aria-hidden="true"><path d="M30 148q71-17 129 0t170-3" stroke="#9eaf91" stroke-width="4" stroke-linecap="round"/><path d="m275 144 10-20m-9 12q-15-3-14-14 16-1 14 14m6-6q14 0 15-13-14-4-15 13" fill="#9fb68e"/>${[['azul',25,30,123],['amarillo',118,10,145],['rojo',235,46,100]].map(([c,x,y,w])=>`<g transform="translate(${x} ${y}) scale(${w/160})">${birdSVG(c).replace('<svg ','<svg width="160" height="136" ')}</g>`).join('')}</svg>`;}

export function featherSVG(id='azul'){
  const c=colors.find(c=>c.id===id)||colors[1];
  return `<svg class="feather-art" viewBox="0 0 32 70" fill="none" aria-hidden="true"><path d="M12 58C-1 48 0 19 22 5c15 17 9 39-10 53Z" fill="${c.fill}" stroke="${c.wing}" stroke-width="1.3"/><path d="M10 67 24 13M9 27l10 8m-13 2 10 7m1-17 10-5m-13 22 11-6m-13 14 8-4" stroke="${c.light}" stroke-width="1.5" stroke-linecap="round"/><path d="m10 67 4-15" stroke="${c.wing}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
}
