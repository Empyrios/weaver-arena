import {writeFileSync} from 'node:fs';
import {starter} from '../dist/data.js';
import {createBattle,step,ai} from '../dist/engine.js';
const results=[];
for(const [challenger,opponent] of [['intermediate','beginner'],['advanced','beginner'],['expert','beginner'],['advanced','intermediate'],['expert','intermediate'],['expert','advanced']]){let wins=0,losses=0,draws=0,turns=0;const count=40;for(let i=0;i<count;i++){const d=starter(),side=i%2;let b=createBattle(d,[d.teams[0],{...d.teams[0],members:d.teams[0].members.slice().reverse()}],d.formats[0],100+i);while(b.winner===null){b=step(b,[ai(b,0,side===0?challenger:opponent),ai(b,1,side===1?challenger:opponent)]);}if(b.winner===side)wins++;else if(b.winner===2)draws++;else losses++;turns+=b.turn;}results.push({challenger,opponent,matches:count,wins,losses,draws,averageTurns:Math.round(turns/count)});}
writeFileSync('docs/ai-benchmark.json',JSON.stringify({seeds:'100-139',sideAlternation:true,results},null,2));console.table(results);
