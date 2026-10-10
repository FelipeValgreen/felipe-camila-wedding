import test from 'node:test';
import assert from 'node:assert/strict';
import { publicStagePayload } from '../api/_lib/plot-twist-engine.js';

test('redacts nested answer keys from guest stage payload', () => {
 const input={title:'Pregunta',correctAnswer:'A',answer_key:'B',options:[{value:'A',label:'Sí',isCorrect:true},{value:'B',label:'No'}],metadata:{solution:'oculta',round:2}};
 const safe=publicStagePayload(input);
 assert.deepEqual(safe,{title:'Pregunta',options:[{value:'A',label:'Sí'},{value:'B',label:'No'}],metadata:{round:2}});
 assert.equal(input.correctAnswer,'A');
});
test('retains normal stage prompts and choice values',()=>{
 assert.deepEqual(publicStagePayload({prompt:'¿Dónde?',options:['A','B'],closes_at:null}),{prompt:'¿Dónde?',options:['A','B'],closes_at:null});
});

test('redacts correct-option aliases in nested objects',()=>{
 const safe=publicStagePayload({correctOption:'B',correct_option:'C',options:[{value:'A',correctOption:true}],scoring_key:'private',title:'Trivia'});
 assert.deepEqual(safe,{options:[{value:'A'}],title:'Trivia'});
});
