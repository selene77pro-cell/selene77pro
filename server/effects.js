export function effect(g,e){g.effects.push({id:String(g.nextId++),born:g.time,...e});if(g.effects.length>180)g.effects.splice(0,g.effects.length-180);}
