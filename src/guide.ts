import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { coreCorrect } from './domain'
import { fresh, type LabSession } from './store'
import { defaultSceneNavigation } from './sceneGraph'
export const GUIDE_KEY='twin-workshop:onboarding:v2'
export interface GuideStep { title:string; text:string; target:string }
export const guideSteps:GuideStep[]=[
 {title:'认识工厂层级与实验入口',text:'三维窗口内的场景树按工厂、区域、车间、设备组织。先进入热解与冷凝区，再进入设备监测教学车间；也可使用“定位当前实验”。外侧是课程目录，右侧是学习提示。本演练与正式记录分开。',target:'scene-navigation'},
 {title:'配置对象与测点，预设一个错误',text:'先将储罐模型关联储罐、换热器模型关联换热器。为学习排错，暂将泵模型关联储罐；泵数据字段选择motor_i。展开字典可查看字段和单位。',target:'configuration'},
 {title:'先保存你的预测',text:'预测错绑的泵模型将显示谁的数据、什么单位，填写后点击“保存预测”。开始仿真会锁定这份预测与配置。',target:'prediction'},
 {title:'开始仿真并体验控制',text:'窗口顶部点击“开始仿真”，依次体验暂停、单步、继续及快速完成。窄窗口的单步和快速完成在“更多操作”中。只有开始仿真才新建记录，其余按钮控制同一轮。',target:'simulation'},
 {title:'实际点选三维泵',text:'点击三维场景中的泵实体。其外形仍是泵，但绑定的资产是储罐；后续观察实际数据来源。',target:'scene'},
 {title:'记录错误的实际后果',text:'右侧“关联链检查与记录”上半部是自动读数，不用手工修改。先核对实际资产、源字段、单位和时间，再在下方填写观察并保存。',target:'observation-entry'},
 {title:'修复配置',text:'在高亮的“泵模型关联资产”下拉框中选择离心泵。其余设置保持不变，只修改这一项，便于比较。',target:'pump-binding'},
 {title:'再次仿真，形成对照',text:'点击“开始仿真”建立新记录，然后快速完成本轮。旧记录仍保留，并且新一轮从相同输入起点开始。',target:'simulation'},
 {title:'保存修复后的观察',text:'用修复后的本轮结果再记录一次。核对自动显示的关联链，在下方输入变化和依据，点击保存；看到已保存提示后再继续。',target:'observation-entry'},
 {title:'比较结果并填写结论',text:'对比两轮仿真记录，填写错配前后发生什么、哪些证据支持修复有效。正式实验还需要完成其他对照和迁移任务。',target:'practice-conclusion'},
 {title:'体验提交并进入正式实验',text:'点击“提交演练”，完成这次流程练习。演练不需要正式70分、不计成绩，也不会进入教师批阅列表。',target:'practice-submit'}
]

export interface GuideTask { label:string; done:boolean; target:string }
function tutorialTrials(lab:LabSession){
 const bad=lab.saved.trials.filter(t=>t.complete&&t.config.bindings.pump==='tank')
 const good=lab.saved.trials.filter(t=>t.complete&&coreCorrect(t.config)&&bad.some(b=>t.id>b.id))
 return {bad,good}
}
export function observationGuide(lab:LabSession,index:number){
 const {bad,good}=tutorialTrials(lab),expected=index===5?'tank':'pump',candidates=index===5?bad:good
 const evidence=[...candidates].reverse().find(t=>t.observations.some(o=>o.model==='pump'&&o.asset===expected&&(expected==='tank'||o.quality==='有效')))
 const runReady=!!lab.active?.complete&&lab.currentMatches&&candidates.some(t=>t.id===lab.active?.id)
 const clicked=lab.sceneReady&&lab.sceneSelected==='pump'&&lab.saved.sceneSelections.includes('pump')
 const target=evidence?'observation-entry':!runReady?'simulation':!clicked?'scene':'observation-entry'
 const message=evidence?'已保存到仿真记录 #'+evidence.id+'，可以点击“下一步”。':!runReady?'尚缺：与本步骤配置一致的完整仿真。请开始新一轮并快速完成；配置改动后旧结果不能代替复测。':!clicked?'尚缺：实际点选三维泵。点击下方“定位”返回三维窗口，再点击泵实体，树选择和快捷定位不能代替。':!lab.observationDraft.trim()?'下一步：在“观察与解释”输入框写出实际资产、字段/单位、读数/时间，以及与预测的比较。':'下一步：点击输入框下方的“保存关联链与观察”，不要只点击引导中的“下一步”。'
 const tasks:GuideTask[]=[
  {label:'完成本步骤的一轮40秒仿真'+(evidence?'（#'+evidence.id+'）':runReady?'（#'+lab.active!.id+'）':''),done:!!evidence||runReady,target:'simulation'},
  {label:'实际点选三维泵，核对自动关联链',done:!!evidence||clicked,target:clicked?'observation-chain':'scene'},
  {label:'在“观察与解释”输入框填写实际现象',done:!!evidence||!!lab.observationDraft.trim(),target:'observation-note'},
  {label:'点击“保存关联链与观察”保存本轮证据',done:!!evidence,target:'observation-save'}
 ]
 return {evidence,target,message,tasks}
}
export function guideTasks(lab:LabSession,index:number):GuideTask[]{
 if(index===5||index===8)return observationGuide(lab,index).tasks
 const {bad,good}=tutorialTrials(lab)
 switch(index){
  case 0:return [{label:'进入设备监测教学车间，或点击“定位当前实验”',done:lab.sceneView.levelId===lab.sceneLayout.nodes.find(n=>n.assetId==='pump')!.parentId,target:'scene-navigation'}]
  case 1:return [{label:'储罐关联储罐、换热器关联换热器',done:lab.saved.config.bindings.tank==='tank'&&lab.saved.config.bindings.exchanger==='exchanger',target:'configuration'},{label:'泵模型暂时关联储罐，泵字段选择motor_i',done:lab.saved.config.bindings.pump==='tank'&&lab.saved.config.point.field==='motor_i',target:'configuration'}]
  case 2:return [{label:'填写预测后点击“保存预测”',done:!!lab.saved.predictions.mapping.trim(),target:'prediction'}]
  case 3:return [{label:'点击“开始仿真”，完成错误配置的一轮运行',done:bad.length>0,target:'simulation'},...(['pause','step','resume','finish'] as const).map(action=>({label:({pause:'点击暂停仿真',step:'暂停后前进1秒',resume:'点击继续仿真',finish:'点击快速完成本轮'})[action],done:lab.controlHistory.includes(action),target:'simulation'}))]
  case 4:return [{label:'点击三维画面中的泵实体（不是下方快捷按钮）',done:lab.saved.sceneSelections.includes('pump'),target:'scene'}]
  case 6:return [{label:'只将泵模型关联资产改为离心泵，其余保持不变',done:coreCorrect(lab.saved.config),target:'pump-binding'}]
  case 7:return [{label:'点击“开始仿真”新建修复后的记录，再快速完成',done:good.length>0,target:'simulation'}]
  case 9:return [{label:'在“演练结论”填写两轮变化及证据',done:!!lab.saved.conclusions.mapping.trim(),target:'practice-conclusion'}]
  default:return [{label:'点击页面的“提交演练”，再返回正式实验',done:false,target:'practice-submit'}]
 }
}

export const useGuide=defineStore('onboarding',()=>{
 const seen=ref(false),completed=ref(false),step=ref(0),checked=ref<number[]>([]),active=ref(false),error=ref(''),controls=ref<string[]>([])
 try{const text=localStorage.getItem(GUIDE_KEY);if(text){const s=JSON.parse(text);if(s.version===1&&typeof s.seen==='boolean'&&typeof s.completed==='boolean'&&Number.isInteger(s.step)&&s.step>=0&&s.step<guideSteps.length&&Array.isArray(s.checked)&&s.checked.every((n:number)=>Number.isInteger(n)&&n>=0&&n<guideSteps.length)){seen.value=s.seen;completed.value=s.completed;step.value=s.step;checked.value=s.checked}}}catch{error.value='操作引导进度无法读取，可重新演练。'}
 try { const text=localStorage.getItem(GUIDE_KEY);const state=text?JSON.parse(text):null;if(Array.isArray(state?.controls)&&state.controls.every((x:unknown)=>typeof x==='string'))controls.value=state.controls } catch { /* Invalid progress is already reported above. */ }
 watch([seen,completed,step,checked,controls],()=>{try{localStorage.setItem(GUIDE_KEY,JSON.stringify({version:1,seen:seen.value,completed:completed.value,step:step.value,checked:checked.value,controls:controls.value}))}catch{error.value='演练进度无法保存，正式存档不受影响。'}},{deep:true})
 if(!localStorage.getItem(GUIDE_KEY)){try{const legacy=JSON.parse(localStorage.getItem('twin-workshop:onboarding:v1')??'null');if(legacy?.seen)seen.value=true}catch{/* Keep old progress untouched. */}}
 const current=computed(()=>guideSteps[step.value]!)
 function start(lab:LabSession,restart=false){seen.value=true;active.value=true;if(restart||(!checked.value.length&&step.value===0)||completed.value){lab.pause();lab.saved=fresh();lab.sceneView=defaultSceneNavigation();lab.observationDraft='';lab.saved.config.assets.forEach(a=>a.code=({tank:'DEMO-T1',pump:'DEMO-P1',exchanger:'DEMO-H1'})[a.id]);controls.value=[];step.value=0;checked.value=[];completed.value=false}lab.controlHistory=[...controls.value];lab.page=step.value>=9?'report':'lab';lab.saved.phase=0;lab.saved.kind='mapping';if(step.value===0)lab.enterSceneNode('factory');else lab.locateExperiment()}
 function allowed(lab:LabSession,index=step.value):boolean {
  const {bad,good}=tutorialTrials(lab)
  if(checked.value.includes(index))return true
  switch(index){case 0:return lab.sceneView.levelId===lab.sceneLayout.nodes.find(n=>n.assetId==='pump')!.parentId&&lab.sceneView.visited.length>0;case 1:return lab.saved.config.bindings.tank==='tank'&&lab.saved.config.bindings.pump==='tank'&&lab.saved.config.bindings.exchanger==='exchanger'&&lab.saved.config.point.field==='motor_i';case 2:return !!lab.saved.predictions.mapping.trim();case 3:return bad.length>0&&['pause','resume','step','finish'].every(a=>lab.controlHistory.includes(a));case 4:return lab.saved.sceneSelections.includes('pump');case 5:return !!observationGuide(lab,5).evidence;case 6:return coreCorrect(lab.saved.config);case 7:return good.length>0;case 8:return !!observationGuide(lab,8).evidence;case 9:return !!lab.saved.conclusions.mapping.trim();case 10:return completed.value;default:return false}
 }
 function next(lab:LabSession){if(!allowed(lab))return false;if(!checked.value.includes(step.value))checked.value.push(step.value);if(step.value<guideSteps.length-1)step.value++;lab.pause();lab.page=step.value>=9?'report':'lab';if(step.value===1||step.value===4||step.value===8)lab.locateExperiment();return true}
 function back(lab:LabSession){lab.pause();step.value=Math.max(0,step.value-1);lab.page=step.value>=9?'report':'lab'}
 function submit(lab:LabSession){if(step.value!==10||![3,5,8,9].every(n=>checked.value.includes(n))||!allowed(lab,8)||!lab.saved.conclusions.mapping.trim())return false;completed.value=true;if(!checked.value.includes(10))checked.value.push(10);lab.pause();return true}
 function rememberControls(value:string[]){if(active.value)controls.value=[...value]}
 function close(lab:LabSession){rememberControls(lab.controlHistory);lab.pause();active.value=false;seen.value=true}
 return{seen,completed,step,checked,active,error,current,start,allowed,next,back,submit,close,rememberControls}
})
