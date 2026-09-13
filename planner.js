'use strict';
// Generic rules only. Personal measurements and history remain in the private database.
const TrainingPlanner = (() => {
 const catalog={
  bulgarian:['bulgarian','ブルガリアンスクワット（左右各）',12,2,'reps'],
  koshiwari:['koshiwari','腰割り',30,1,'seconds'],
  pushup:['pushup','プッシュアップ',10,2,'reps'],
  plank:['plank','プランク',20,2,'seconds'],
  birdDog:['birdDog','バードドッグ（左右各）',6,2,'reps'],
  proneW:['proneW','うつ伏せW（肩甲骨寄せ）',8,2,'reps']
 };
 const parts={bulgarian:'太もも・お尻・片脚の安定性。あと2〜3回できる余裕を残します。',koshiwari:'内もも・お尻・股関節周辺。浅い姿勢で30秒、息を止めず、膝とつま先の向きをそろえます。',pushup:'胸・腕・肩。難しければ壁や安定した台を使います。',plank:'体幹の安定性。腰を反らさず、呼吸できる姿勢で。',birdDog:'体幹・背中・お尻の協調。四つ這いで対角の手足をゆっくり伸ばします。',proneW:'肩甲骨周りの軽い補助運動。うつ伏せで肘をW字にし、腰を反らさず肩甲骨を寄せます。本格的な引く運動の代わりではありません。'};
 function build(date,history=[],reviews=[]){
  const weekday=new Date(date+'T12:00:00+09:00').getUTCDay();
  const completed=history.filter(r=>r.training_date<date&&r.status==='completed'&&!r.deleted_at).sort((a,b)=>b.training_date.localeCompare(a.training_date));
  const lastDate=completed[0]?.training_date;
  const last=completed.filter(r=>r.training_date===lastDate);
  const elapsed=lastDate?(new Date(date+'T00:00:00+09:00')-new Date(lastDate+'T00:00:00+09:00'))/86400000:Infinity;
  const review=reviews.filter(r=>r.training_date<=date).sort((a,b)=>b.training_date.localeCompare(a.training_date))[0];
  const reviewAge=review?(new Date(date+'T00:00:00+09:00')-new Date(review.training_date+'T00:00:00+09:00'))/86400000:Infinity;
  const high=reviewAge<=1&&review?.fatigue==='high';
  const legs=elapsed<2&&last.some(r=>/ブルガリアン|スクワット|腰割り/.test(r.exercise_name));
  const upper=elapsed<2&&last.some(r=>/プッシュアップ|腕立て/.test(r.exercise_name));
  const core=elapsed<2&&last.some(r=>/プランク|腹筋|ローラー/.test(r.exercise_name));
  const hard=elapsed<=1&&last.some(r=>['hard','near_limit','fatigued'].includes(r.effort_level));
  const reasons=[lastDate?`参照した運動実績：${lastDate}、${last.map(r=>r.exercise_name).join('・')}。${elapsed>1?'前日実績がないため直近の記録を参照。未記録は未実施と断定しません。':''}`:'参照期間内に完了実績がありません。未記録を未実施と断定せず、控えめな量から開始します。'];
  if(weekday===6||high){reasons.push(high?'直近の疲労が強いため休養を提案します。':'土曜朝は英語コーチのため休養日です。');return {exercises:[],reasons};}
  let keys=[1,3,5].includes(weekday)?['koshiwari','bulgarian','pushup']:['birdDog','proneW','plank'];
  if(legs){keys=keys.filter(k=>!['koshiwari','bulgarian'].includes(k));reasons.push('前日に下半身の実績があるため、今日は脚の主運動を休みます。腰割りも脚を使うので回復日に追加しません。');}
  if(upper)keys=keys.filter(k=>k!=='pushup');
  if(core){keys=keys.filter(k=>!['plank','birdDog'].includes(k));reasons.push('前日に腹筋・体幹の実績があるため、プランクや腹筋ローラーの追加を避けます。プッシュアップは壁を使い軽めにします。');}
  if(!keys.length)keys=['proneW'];
  if(keys.length<3&& !keys.includes('proneW'))keys.push('proneW');
  reasons.push('ブルガリアンスクワットと腰割りは週3回を基本枠にし、実績・疲労で間隔を調整します。強い負荷を同じ部位へ連日かけません。');
  if(hard)reasons.push('直近の体感がきつめなので各1セットへ減らします。');
  return {exercises:keys.map(k=>{const item=[...catalog[k]];if(hard)item[3]=1;if(core&&k==='pushup'){item[1]='壁プッシュアップ';item[2]=8;item[3]=1;}return item;}),reasons};
 }
 return {build,parts};
})();
if(typeof module!=='undefined')module.exports=TrainingPlanner;
