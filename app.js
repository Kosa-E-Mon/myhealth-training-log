'use strict';
const $ = s => document.querySelector(s);
const config = window.TRAINING_CONFIG;
const day = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date());
let date=day(), session=null, busy=false, rows=[], manualId=crypto.randomUUID();
const msg=t=>$('#message').textContent=t;
const exercises={pushup:['pushup','プッシュアップ',10,2],bulgarian:['bulgarian','ブルガリアンスクワット（左右各）',15,2],roller:['roller','腹筋ローラー',6,2],legraise:['legraise','足上げ腹筋',10,2]};
const weeklyPlans={0:['roller','legraise'],1:['pushup','roller'],2:['bulgarian','legraise'],3:['pushup','roller'],4:['bulgarian','legraise'],5:['pushup','bulgarian'],6:[]};
const defaultsForToday=()=>weeklyPlans[new Date(day()+'T12:00:00+09:00').getUTCDay()].map(key=>exercises[key]);
const efforts={easy:'🙂 余裕あり',good:'👍 ちょうどいい',hard:'😮‍💨 きつい',near_limit:'🥵 限界近い',fatigued:'😴 疲労あり'};
function configured(){
 let publicKey=config.key?.startsWith('sb_publishable_');
 if(config.key?.split('.').length===3)try{publicKey=JSON.parse(atob(config.key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{}
 return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url) && publicKey;
}
async function request(path,method='GET',body,prefer='return=representation'){
 const response=await fetch(config.url+path,{method,headers:{apikey:config.key,'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.access_token}:{}),Prefer:prefer},...(body?{body:JSON.stringify(body)}:{})});
 if(!response.ok) throw new Error(response.status===401?'ログインの有効期限が切れました。再ログインしてください。':'保存・読み込みに失敗しました。通信と設定を確認して再試行してください。');
 return response.status===204?null:response.json();
}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){msg(e.message);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);document.querySelectorAll('[data-locked]').forEach(b=>b.disabled=true);}}
function rowData(id,name,reps,sets,key){return {user_id:session.user.id,training_date:date,exercise_id:id,exercise_name:name,planned_reps:reps,planned_sets:sets,instance_key:key};}
async function insert(data){return request('/rest/v1/training_logs?on_conflict=user_id,training_date,instance_key','POST',data,'resolution=ignore-duplicates,return=representation');}
async function load(){
 date=day();$('#date').textContent=date;
 // Saturday starts empty. Stable keys keep the same day's default quests on reload.
 const defaults=defaultsForToday();if(defaults.length)await insert(defaults.map(d=>rowData(...d,'default:'+d[0])));
 rows=await request('/rest/v1/training_logs?training_date=eq.'+date+'&deleted_at=is.null&order=created_at.asc');render();
 const review=await request('/rest/v1/daily_reviews?training_date=eq.'+date);
 $('#daily').elements.comment.value=review[0]?.comment||'';$('#daily').elements.fatigue.value=review[0]?.fatigue||'';
 await loadBody();
}
const valueOrNull=v=>v===''?null:Number(v);
async function loadBody(){
 const measurements=await request('/rest/v1/body_measurements?select=*&order=measured_at.desc&limit=180');measurements.reverse();
 const profiles=await request('/rest/v1/health_profiles?select=height_cm');
 const height=profiles[0]?.height_cm?Number(profiles[0].height_cm):null;
 $('#profileForm').elements.height.value=height||'';
 $('#bodyForm').elements.date.value=date;$('#bodyForm').elements.time.value=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
 renderBody(measurements,height);renderStrategist(measurements,height);
}
function renderStrategist(items,height){
 const latest=items.at(-1),previous=items.at(-2),reasons=[];let changeText='比較できる測定がまだありません。';
 if(latest&&previous){const diff=Number(latest.weight_kg)-Number(previous.weight_kg);changeText=Math.abs(diff)<.2?`直近の体重はほぼ横ばい（${diff>0?'+':''}${diff.toFixed(2)}kg）です。`:`直近の体重は${diff<0?'減少':'増加'}（${diff>0?'+':''}${diff.toFixed(2)}kg）です。`;reasons.push('一回の増減だけで負荷を急に変えず、継続しやすさを優先します。');}
 else reasons.push(changeText);
 const planned=rows.filter(r=>r.status==='planned').map(r=>r.exercise_name),fatigue=$('#daily').elements.fatigue.value;
 if(latest&&height){const bmi=Number(latest.weight_kg)/((height/100)**2);reasons.unshift(`最新値は${Number(latest.weight_kg).toFixed(2)}kg、BMI ${bmi.toFixed(1)}。${latest.body_fat_percent!=null?`体脂肪率 ${Number(latest.body_fat_percent).toFixed(1)}%。`:''}`);}
 reasons.push(fatigue==='high'?'疲労が強いため、回数を半分にするか見送る判断を優先します。':fatigue==='low'?'疲労は少なめ。フォームを崩さない範囲で予定どおり進めます。':'疲労が未評価または普通のため、予定量を上限として開始します。');
 $('#strategistComment').textContent=`${changeText} 今日は${planned.length?planned.join('と'):'休養'}を提案します。昨日の未記録分は持ち越さず、今日から新しい作戦として扱います。`;
 const list=$('#strategistReasons');list.replaceChildren();for(const text of reasons){const div=document.createElement('div');div.className='reason';div.textContent=text;list.append(div);}
}
function renderBody(items,height){
 const box=$('#bodySummary'),svg=$('#weightChart');box.replaceChildren();svg.replaceChildren();
 if(!items.length){box.innerHTML='<p>まだ身体データがありません。「体組成を記録」から追加できます。</p>';$('#bodyUpdated').textContent='';$('#weightTrend').textContent='';return;}
 const latest=items.at(-1),weight=Number(latest.weight_kg),bmi=height&&weight?weight/((height/100)**2):null;
 for(const [label,value] of [['体重',Number.isFinite(weight)?weight.toFixed(2)+' kg':'—'],['BMI',bmi?bmi.toFixed(1):'身長未設定'],['体脂肪率',latest.body_fat_percent!=null?Number(latest.body_fat_percent).toFixed(1)+' %':'—']]){const item=document.createElement('div');item.className='metric';item.innerHTML='<small></small><strong></strong>';item.querySelector('small').textContent=label;item.querySelector('strong').textContent=value;box.append(item);}
 $('#bodyUpdated').textContent=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',...(latest.source==='healthplanet_graph_date_only'?{}:{hour:'2-digit',minute:'2-digit'})}).format(new Date(latest.measured_at));
 const points=items.filter(x=>x.weight_kg!=null).slice(-30);drawChart(svg,points);const first=Number(points[0]?.weight_kg),diff=weight-first;$('#weightTrend').textContent=points.length<2?'比較用のデータが増えると変化を表示します。':`表示期間の変化 ${diff>0?'+':''}${diff.toFixed(2)} kg（${points.length}回）`;
}
function drawChart(svg,points){
 if(points.length<2)return;const ns='http://www.w3.org/2000/svg',weights=points.map(x=>Number(x.weight_kg)),min=Math.min(...weights),max=Math.max(...weights),range=Math.max(max-min,.5),coords=weights.map((w,i)=>[18+i*(284/(weights.length-1)),94-(w-min)*70/range]);
 for(const y of [24,59,94]){const line=document.createElementNS(ns,'line');line.setAttribute('x1','18');line.setAttribute('x2','302');line.setAttribute('y1',y);line.setAttribute('y2',y);line.setAttribute('class','chart-grid');svg.append(line);}
 const path=document.createElementNS(ns,'polyline');path.setAttribute('points',coords.map(p=>p.join(',')).join(' '));path.setAttribute('class','chart-line');svg.append(path);coords.forEach(([x,y])=>{const c=document.createElementNS(ns,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r','3.5');c.setAttribute('class','chart-dot');svg.append(c);});
 for(const [text,x,anchor] of [[min.toFixed(1),4,'start'],[max.toFixed(1),316,'end']]){const t=document.createElementNS(ns,'text');t.textContent=text+'kg';t.setAttribute('x',x);t.setAttribute('y','114');t.setAttribute('text-anchor',anchor);t.setAttribute('class','chart-label');svg.append(t);}
}
function render(){
 $('#quests').replaceChildren();$('#progress').textContent=`${rows.filter(r=>r.status==='completed').length} / ${rows.length} 完了`;
 if(!rows.length){const p=document.createElement('p');p.textContent='今日は予定なし。休養するか、必要なら手動で追加してください。';$('#quests').append(p);}
 for(const r of rows){const card=document.createElement('article');card.className=r.status==='completed'?'done':'';
 card.innerHTML='<h3></h3><p class="plan"></p><div class="controls"></div><button class="primary">👍 ちょうどいい・完了</button><details><summary>別の体感・コメント・見送り</summary><div class="ratings"></div><label>コメント<textarea maxlength="4000"></textarea></label><button class="note secondary">コメント保存</button> <button class="skip secondary">今日は見送る</button></details>';
 card.querySelector('h3').textContent=r.exercise_name;card.querySelector('.plan').textContent=`予定 ${r.planned_reps}回 × ${r.planned_sets}セット`;
 for(const [key,label,max] of [['reps','回数',1000],['sets','セット',100]]){const wrap=document.createElement('label');wrap.textContent=label;const counter=document.createElement('div');counter.className='counter';const input=document.createElement('input');input.type='number';input.min=1;input.max=max;input.value=r['actual_'+key]??r['planned_'+key];input.dataset.field=key;input.setAttribute('aria-label',r.exercise_name+' '+label);
 for(const delta of [-1,1]){const b=document.createElement('button');b.textContent=delta<0?'−':'＋';b.setAttribute('aria-label',label+(delta<0?'を減らす':'を増やす'));b.onclick=()=>input.value=Math.min(max,Math.max(1,Number(input.value)+delta));counter.append(b);if(delta===-1)counter.append(input);}
 wrap.append(counter);card.querySelector('.controls').append(wrap);}
 const note=card.querySelector('textarea');note.value=r.comment;
 const finish=(effort,status='completed')=>action(async()=>{
 if(date!==day()){await load();throw new Error('日付が変わりました。今日の予定を確認してください。');}
 const reps=Number(card.querySelector('[data-field=reps]').value),sets=Number(card.querySelector('[data-field=sets]').value);
 if(!Number.isInteger(reps)||reps<1||reps>1000||!Number.isInteger(sets)||sets<1||sets>100)throw new Error('回数1〜1000、セット1〜100を整数で入力してください。');
 msg('保存中…');const hour=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:'Asia/Tokyo'}).format(new Date()));
 await request('/rest/v1/training_logs?id=eq.'+r.id+'&status=eq.planned','PATCH',{status,actual_reps:status==='completed'?reps:null,actual_sets:status==='completed'?sets:null,effort_level:effort,comment:note.value,completed_at:status==='completed'?new Date().toISOString():null,time_slot:hour<12?'morning':hour<18?'daytime':'evening'});
 await load();msg('保存済み。再読み込みしても記録が残ります。');});
 card.querySelector('.primary').onclick=()=>finish('good');
 for(const [key,label] of Object.entries(efforts).filter(([k])=>k!=='good')){const b=document.createElement('button');b.textContent=label;b.onclick=()=>finish(key);card.querySelector('.ratings').append(b);}
 card.querySelector('.skip').onclick=()=>finish(null,'skipped');
 card.querySelector('.note').onclick=()=>action(async()=>{await request('/rest/v1/training_logs?id=eq.'+r.id,'PATCH',{comment:note.value});r.comment=note.value;msg('コメントを保存しました。');});
 if(r.status!=='planned'){card.querySelector('.primary').textContent=r.status==='completed'?`✓ 達成済み ${r.actual_reps}回 × ${r.actual_sets}セット / ${efforts[r.effort_level]}`:'見送り済み';card.querySelectorAll('.controls button,.controls input,.primary,.ratings button,.skip').forEach(el=>{el.disabled=true;el.dataset.locked='true';});}
 $('#quests').append(card);}
}
$('#login').onsubmit=e=>{e.preventDefault();action(async()=>{if(!configured())throw new Error('最初に mobile/config.js にSupabase URLと公開キーを設定してください。');session=null;session=await request('/auth/v1/token?grant_type=password','POST',{email:$('#email').value,password:$('#password').value});$('#password').value='';$('#login').hidden=true;$('#workspace').hidden=false;await load();msg('読み込みました。');});};
$('#logout').onclick=()=>action(async()=>{if(session)try{await request('/auth/v1/logout','POST');}catch{}session=null;rows=[];$('#quests').replaceChildren();$('#workspace').hidden=true;$('#login').hidden=false;msg('ログアウトしました。');});
$('#refresh').onclick=()=>action(async()=>{await load();msg('最新の記録です。');});
$('#manual').onsubmit=e=>{e.preventDefault();action(async()=>{if(date!==day()){await load();throw new Error('日付が変わりました。再入力してください。');}const f=e.target.elements;await insert(rowData('manual',f.exercise.value.trim(),Number(f.reps.value),Number(f.sets.value),'manual:'+manualId));manualId=crypto.randomUUID();e.target.reset();await load();msg('追加しました。実施後に体感ボタンを押してください。');});};
$('#daily').onsubmit=e=>{e.preventDefault();action(async()=>{if(date!==day())throw new Error('日付が変わりました。内容を控えて再読込してください。');await request('/rest/v1/daily_reviews?on_conflict=user_id,training_date','POST',{user_id:session.user.id,training_date:date,fatigue:e.target.elements.fatigue.value||null,comment:e.target.elements.comment.value},'resolution=merge-duplicates,return=representation');await loadBody();msg('一日のコメントを保存し、軍師の判断を更新しました。');});};
$('#bodyForm').onsubmit=e=>{e.preventDefault();action(async()=>{const f=e.target.elements,measuredAt=new Date(`${f.date.value}T${f.time.value}:00+09:00`);if(Number.isNaN(measuredAt.getTime()))throw new Error('測定日時を確認してください。');await request('/rest/v1/body_measurements?on_conflict=user_id,measured_at,source','POST',{user_id:session.user.id,measured_at:measuredAt.toISOString(),weight_kg:Number(f.weight.value),body_fat_percent:valueOrNull(f.fat.value),muscle_mass_kg:valueOrNull(f.muscle.value),visceral_fat_level:valueOrNull(f.visceral.value),source:'manual'},'resolution=merge-duplicates,return=representation');await loadBody();msg('身体データを保存しました。');});};
$('#profileForm').onsubmit=e=>{e.preventDefault();action(async()=>{await request('/rest/v1/health_profiles?on_conflict=user_id','POST',{user_id:session.user.id,height_cm:Number(e.target.elements.height.value)},'resolution=merge-duplicates,return=representation');await loadBody();msg('身長を保存し、BMIを更新しました。');});};
$('#date').textContent=date;msg(configured()?'ログインして今日の予定を表示します。':'接続設定前です。READMEの手順でSupabaseを設定してください。');
