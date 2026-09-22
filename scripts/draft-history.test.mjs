import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyHistory,recordEdit,travel,packHistory,unpackHistory,HISTORY_BYTES} from '../src/lib/draft-history.ts';

test('dependent changes, arrays and absent values undo/redo atomically without mutation',()=>{
 const before={name:'A',attributes:[1,2],nested:{optional:null}};
 const after={name:'Élf',attributes:[3,4],nested:{newValue:5}};
 const h=recordEdit(emptyHistory(),before,after,'Generate');
 const u=travel(after,h,'undo');assert.deepEqual(u.value,before);
 assert.deepEqual(travel(u.value,u.history,'redo').value,after);
 assert.deepEqual(after,{name:'Élf',attributes:[3,4],nested:{newValue:5}});
});
test('no-op preserves redo; new edit clears redo',()=>{
 const h=recordEdit(emptyHistory(),{n:0},{n:1});const u=travel({n:1},h,'undo');
 assert.equal(recordEdit(u.history,u.value,u.value),u.history);
 assert.equal(recordEdit(u.history,u.value,{n:2}).future.length,0);
});
test('persistence round-trips both directions and rejects stale identities/content',()=>{
 let h=recordEdit(emptyHistory(),{n:0},{n:1});h=recordEdit(h,{n:1},{n:2});
 const u=travel({n:2},h,'undo');const {text}=packHistory('a',u.value,u.history);
 assert.deepEqual(unpackHistory(text,'a',u.value),u.history);
 assert.deepEqual(unpackHistory(text,'b',u.value),emptyHistory());
 assert.deepEqual(unpackHistory(text,'a',{n:7}),emptyHistory());
});
test('Unicode and oversized portraits respect byte budget, preserve in-memory history',()=>{
 const before={portrait:''},after={portrait:'🌍'.repeat(6000)};
 const h=recordEdit(emptyHistory(),before,after);const packed=packHistory('a',after,h);
 assert.ok(new TextEncoder().encode(packed.text).length<HISTORY_BYTES);assert.equal(packed.truncated,true);
 assert.equal(h.past.length,1);assert.deepEqual(travel(after,h,'undo').value,before);
});
test('trimming retains contiguous usable chains',()=>{
 let h=emptyHistory(),v={n:0,text:''};
 for(let i=1;i<=50;i++){const next={n:i,text:'é'.repeat(i*10)};h=recordEdit(h,v,next);v=next;}
 const packed=packHistory('a',v,h);let restored=unpackHistory(packed.text,'a',v);
 assert.ok(restored.past.length>0&&restored.past.length<50);
 while(restored.past.length){const u=travel(v,restored,'undo');v=u.value;restored=u.history;}
 assert.ok(v.n>0);
});
test('malformed and unsafe history rejected; application failures leave input untouched',()=>{
 const value={n:1};const h=recordEdit(emptyHistory(),{n:0},value);const p=JSON.parse(packHistory('a',value,h).text);
 p.past[0].patches[0].path=['__proto__','polluted'];assert.deepEqual(unpackHistory(JSON.stringify(p),'a',value),emptyHistory());
 assert.deepEqual(unpackHistory('{','a',value),emptyHistory());
 assert.throws(()=>travel({n:9},h,'undo'));assert.deepEqual(value,{n:1});assert.equal({}.polluted,undefined);
});
