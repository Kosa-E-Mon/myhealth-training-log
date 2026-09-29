'use strict';
// Measurements stay in the private database; this module contains generic interpretation rules only.
const BodyInsights=(()=>{
 const localDay=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date(value));
 const average=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
 function summarize(items,date){
  const eligible=items.filter(item=>item.weight_kg!=null&&localDay(item.measured_at)<date).sort((a,b)=>new Date(a.measured_at)-new Date(b.measured_at));
  const latest=eligible.at(-1);
  if(!latest)return {latest:null,text:'前日以前の測定値がまだありません。測定の有無を確認してから判断します。',details:[]};
  const latestDay=localDay(latest.measured_at),age=Math.round((new Date(date+'T00:00:00+09:00')-new Date(latestDay+'T00:00:00+09:00'))/86400000);
  const recent=eligible.filter(item=>new Date(latest.measured_at)-new Date(item.measured_at)<=6*86400000);
  const prior=eligible.filter(item=>{const gap=new Date(latest.measured_at)-new Date(item.measured_at);return gap>6*86400000&&gap<=13*86400000;});
  const details=[];
  if(age>2)details.push(`最後に確認できた測定は${latestDay}です。以降の未同期分がある可能性があるため、現在の変化は判定できません。`);
  else if(age===2)details.push('前日の測定がないため、直近の記録を参考にしています。');
  let weightDelta=null,fatDelta=null,muscleDelta=null;
  if(recent.length>=2&&prior.length>=2){
   const delta=average(recent.map(x=>Number(x.weight_kg)))-average(prior.map(x=>Number(x.weight_kg)));weightDelta=delta;
   details.push(`直近7日とその前7日の記録平均の差は${delta>=0?'+':''}${delta.toFixed(2)}kgです。${Math.abs(delta)<.3?'大きな変化はまだ見えませんが、継続の途中経過です。':'単日ではなく複数回の値で確認します。'}`);
  }else details.push('週単位の比較には測定回数が足りません。1日の上下だけでは進み具合を決めません。');
  const fatRecent=recent.filter(x=>x.body_fat_percent!=null),fatPrior=prior.filter(x=>x.body_fat_percent!=null);
  if(fatRecent.length>=2&&fatPrior.length>=2){const delta=average(fatRecent.map(x=>Number(x.body_fat_percent)))-average(fatPrior.map(x=>Number(x.body_fat_percent)));fatDelta=delta;details.push(`体脂肪率の週平均差は${delta>=0?'+':''}${delta.toFixed(1)}ポイント。家庭用体組成計は水分や測定条件で揺れるため、これだけで脂肪の増減は断定しません。`);}
  const muscleRecent=recent.filter(x=>x.muscle_mass_kg!=null),musclePrior=prior.filter(x=>x.muscle_mass_kg!=null);
  if(muscleRecent.length>=2&&musclePrior.length>=2){const delta=average(muscleRecent.map(x=>Number(x.muscle_mass_kg)))-average(musclePrior.map(x=>Number(x.muscle_mass_kg)));muscleDelta=delta;details.push(`筋肉量の週平均差は${delta>=0?'+':''}${delta.toFixed(2)}kg。ただし推定値なので、筋肉が確実に増減したという意味ではありません。`);}
  let text='まだ経過観察の段階です。体重の一日変動に振り回されず、続けられる運動量を大切にします。';
  if(weightDelta!=null){
   if(weightDelta<=-.3)text='週平均の体重は前の週より下向きです。急がず今の運動を継続し、測定条件もそろえて確かめましょう。';
   else if(Math.abs(weightDelta)<.3&&fatDelta!=null&&fatDelta<-.3&&muscleDelta!=null&&muscleDelta>-.2)text='体重は横ばいでも、体脂肪率は低めで筋肉量の推定値は大きく下がっていません。体づくりの途中を示す可能性がありますが、短期の測定誤差もあるため断定せず見守ります。';
   else if(Math.abs(weightDelta)<.3)text='体重の週平均はほぼ横ばいです。これは失敗の判定ではありません。体脂肪率・筋肉量の推定値、運動の継続も合わせて見て、負荷を急に上げずに進めましょう。';
   else text='週平均の体重は上向きですが、服装・水分・食事時刻でも変わります。すぐ運動を増やさず、同条件で次の週も確認しましょう。';
  }
  if(age>2)text='記録が追いついていないため、今の身体変化を断定せず、まず未同期分の確認を優先します。';
  return {latest,text,details};
 }
 return {summarize};
})();
if(typeof module!=='undefined')module.exports=BodyInsights;
