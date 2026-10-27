import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { coreCorrect } from './domain'
import { fresh, type LabSession } from './store'
export const GUIDE_KEY='twin-workshop:onboarding:v1'
export interface GuideStep { title:string; text:string; target:string }
export const guideSteps:GuideStep[]=[
 {title:'认识课程与学习目标',text:'左侧是课程目录与建设状态，右侧说明实验目的、知识、观察重点及成果。这里是独立演练，不影响正式记录。',target:'directory'},
 {title:'配置对象与测点，预设一个错误',text:'先将储罐模型关联储罐、换热器模型关联换热器。为学习排错，暂将泵模型关联储罐；泵数据字段选择motor_i。展开字典可查看字段和单位。',target:'configuration'},
 {title:'先保存你的预测',text:'预测错绑的泵模型将显示谁的数据、什么单位，填写后点击“保存预测”。开始仿真会锁定这份预测与配置。',target:'prediction'},
 {title:'开始仿真并体验控制',text:'点击“开始仿真”，再依次体验“暂停仿真”“前进1秒”“继续仿真”，最后“快速完成本轮”。每个按钮控制同一轮，开始仿真才新建记录。',target:'simulation'},
 {title:'实际点选三维泵',text:'点击三维场景中的泵实体。其外形仍是泵，但绑定的资产是储罐；后续观察实际数据来源。',target:'scene'},
 {title:'记录错误的实际后果',text:'核对关联链的实际资产、源字段和单位，填写看到的现象，再点击“保存关联链与观察”。文字不会自动获得理解分。',target:'observation'},
 {title:'修复配置',text:'将泵模型改为关联离心泵，其他设置保持不变。这一次只修改绑定，便于判断变化原因。',target:'configuration'},
 {title:'再次仿真，形成对照',text:'点击“开始仿真”建立新记录，然后快速完成本轮。旧记录仍保留，并且新一轮从相同输入起点开始。',target:'simulation'},
 {title:'保存修复后的观察',text:'再次点选三维泵并核对资产、字段和单位；保存修复后的关联链与观察，形成一对完整证据。',target:'observation'},
 {title:'比较结果并填写结论',text:'对比两轮仿真记录，填写错配前后发生什么、哪些证据支持修复有效。正式实验还需要完成其他对照和迁移任务。',target:'practice-conclusion'},
 {title:'体验提交并进入正式实验',text:'点击“提交演练”，完成这次流程练习。演练不需要正式70分、不计成绩，也不会进入教师批阅列表。',target:'practice-submit'}
]
export const useGuide=defineStore('onboarding',()=>{
 const seen=ref(false),completed=ref(false),step=ref(0),checked=ref<number[]>([]),active=ref(false),error=ref(''),controls=ref<string[]>([])
 try{const text=localStorage.getItem(GUIDE_KEY);if(text){const s=JSON.parse(text);if(s.version===1&&typeof s.seen==='boolean'&&typeof s.completed==='boolean'&&Number.isInteger(s.step)&&s.step>=0&&s.step<guideSteps.length&&Array.isArray(s.checked)&&s.checked.every((n:number)=>Number.isInteger(n)&&n>=0&&n<guideSteps.length)){seen.value=s.seen;completed.value=s.completed;step.value=s.step;checked.value=s.checked}}}catch{error.value='操作引导进度无法读取，可重新演练。'}
 try { const text=localStorage.getItem(GUIDE_KEY);const state=text?JSON.parse(text):null;if(Array.isArray(state?.controls)&&state.controls.every((x:unknown)=>typeof x==='string'))controls.value=state.controls } catch { /* Invalid progress is already reported above. */ }
 watch([seen,completed,step,checked,controls],()=>{try{localStorage.setItem(GUIDE_KEY,JSON.stringify({version:1,seen:seen.value,completed:completed.value,step:step.value,checked:checked.value,controls:controls.value}))}catch{error.value='演练进度无法保存，正式存档不受影响。'}},{deep:true})
 const current=computed(()=>guideSteps[step.value]!)
 function start(lab:LabSession,restart=false){seen.value=true;active.value=true;if(restart||(!lab.saved.trials.length&&!checked.value.length)||completed.value){lab.pause();lab.saved=fresh();lab.saved.config.assets.forEach(a=>a.code=({tank:'DEMO-T1',pump:'DEMO-P1',exchanger:'DEMO-H1'})[a.id]);controls.value=[];step.value=0;checked.value=[];completed.value=false}lab.controlHistory=[...controls.value];lab.page=step.value>=9?'report':'lab';lab.saved.phase=0;lab.saved.kind='mapping'}
 function allowed(lab:LabSession,index=step.value):boolean {
  const bad=lab.saved.trials.find(t=>t.complete&&t.config.bindings.pump==='tank'),good=lab.saved.trials.find(t=>t.complete&&coreCorrect(t.config)&&!!bad&&t.id>bad.id)
  if(checked.value.includes(index))return true
  switch(index){case 0:return true;case 1:return lab.saved.config.bindings.tank==='tank'&&lab.saved.config.bindings.pump==='tank'&&lab.saved.config.bindings.exchanger==='exchanger'&&lab.saved.config.point.field==='motor_i';case 2:return !!lab.saved.predictions.mapping.trim();case 3:return !!bad&&['pause','resume','step','finish'].every(a=>lab.controlHistory.includes(a));case 4:return lab.saved.sceneSelections.includes('pump');case 5:return !!bad?.observations.some(o=>o.model==='pump'&&o.asset==='tank');case 6:return coreCorrect(lab.saved.config);case 7:return !!good;case 8:return !!good?.observations.some(o=>o.model==='pump'&&o.asset==='pump'&&o.quality==='有效');case 9:return !!lab.saved.conclusions.mapping.trim();case 10:return completed.value;default:return false}
 }
 function next(lab:LabSession){if(!allowed(lab))return false;if(!checked.value.includes(step.value))checked.value.push(step.value);if(step.value<guideSteps.length-1)step.value++;lab.pause();lab.page=step.value>=9?'report':'lab';return true}
 function back(lab:LabSession){lab.pause();step.value=Math.max(0,step.value-1);lab.page=step.value>=9?'report':'lab'}
 function submit(lab:LabSession){if(step.value!==10||![3,5,8,9].every(n=>checked.value.includes(n))||!allowed(lab,8)||!lab.saved.conclusions.mapping.trim())return false;completed.value=true;if(!checked.value.includes(10))checked.value.push(10);lab.pause();return true}
 function rememberControls(value:string[]){if(active.value)controls.value=[...value]}
 function close(lab:LabSession){rememberControls(lab.controlHistory);lab.pause();active.value=false;seen.value=true}
 return{seen,completed,step,checked,active,error,current,start,allowed,next,back,submit,close,rememberControls}
})
