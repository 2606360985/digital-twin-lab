import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { clone, type Equipment } from './domain'
import { defaultSceneLayout, defaultSceneNavigation, nodeById, nodePath,editedScene } from './sceneGraph'
import { FULL_DATASET, freshFull, fullAutomaticScore, fullBasis, fullJson, fullClone, parseFull, progressOf, recordFindings, sceneBasis, stageReady, validLayout, type ValidationRecord } from './fullCourseDomain'
export const FULL_KEY='twin-workshop:full-course:v1'
export const useFullCourse=defineStore('full-course',()=>{
 const saved=ref(freshFull()),error=ref(''),message=ref(''),originalUnreadable=ref(''),storageHealthy=ref(true)
 try{const raw=localStorage.getItem(FULL_KEY);if(raw){originalUnreadable.value=raw;saved.value=parseFull(raw);originalUnreadable.value=''}}catch{storageHealthy.value=false;error.value='完整课程本地存档读取失败；原始内容已保留，请先导出诊断或导入有效备份。'}
 const sceneView=ref(defaultSceneNavigation()),sceneReady=ref(false)
 const progress=computed(()=>progressOf(saved.value)),automatic=computed(()=>fullAutomaticScore(saved.value)),ready=computed(()=>stageReady(saved.value)),basis=computed(()=>fullBasis(saved.value))
 const previewLayout=computed(()=>{try{return validLayout(saved.value.config)}catch{return defaultSceneLayout()}})
 const previewPositions=computed(()=>Object.fromEntries(Object.entries(saved.value.config.positions).map(([id,p])=>[id,p.map((v,i)=>typeof v==='number'&&Number.isFinite(v)&&v>=(i===1?0:-3)&&v<=(i===1?2:3)?v:0)])) as Record<Equipment,[number,number,number]>)
 const layoutValid=computed(()=>{try{validLayout(saved.value.config);return true}catch{return false}})
 watch(saved,()=>{if(!storageHealthy.value)return;try{localStorage.setItem(FULL_KEY,fullJson(saved.value));error.value=''}catch{error.value='完整课程保存失败，请导出备份；上次存档未被主动清除。'}},{deep:true,flush:'post'})
 function openStep(step:number){saved.value.step=step;saved.value.page='task';message.value=''}
 function missingPrerequisite(step:number){return step>1&&!progress.value[step-2]?.success?`请先完成步骤${String(step-1).padStart(2,'0')}的必要成果与验证；无需等待教师评分。`:''}
 function validate(){
  const step=saved.value.step
  if(step>7){message.value='本步教学内容可预览，交互待建设。';return false}
  const missing=missingPrerequisite(step);if(missing){message.value=missing;return false}
  if(saved.value.records.length>=300){message.value='已达到300条验证记录上限，请先导出备份。';return false}
  const r:ValidationRecord={id:(saved.value.records.at(-1)?.id??0)+1,step,at:new Date().toISOString(),dataset:FULL_DATASET,config:fullClone(saved.value.config),inputs:clone(saved.value.inputs),clicks:clone(saved.value.clicks)}
  const findings=recordFindings(r,saved.value.records);saved.value.records.push(r)
  message.value=findings.length?`记录#${r.id}已保存，当前尚未通过：${findings.map(f=>f.message).join('；')}`:`记录#${r.id}验证通过。${step<=2?'论证分等待教师评价。':'操作证据已达成。'}`
  return !findings.length
 }
 function revealNode(id:string){const path=nodePath(previewLayout.value,id).map(n=>n.id);sceneView.value.hidden=sceneView.value.hidden.filter(x=>!path.includes(x));sceneView.value.isolatedId=null}
 function enterNode(id:string){const node=nodeById(previewLayout.value,id);if(!node)return;revealNode(id);sceneView.value.levelId=node.kind==='equipment'?node.parentId!:id;sceneView.value.selectedId=id;sceneView.value.focusId=id;sceneView.value.focusNonce++;if(!sceneView.value.visited.includes(sceneView.value.levelId))sceneView.value.visited.push(sceneView.value.levelId)}
 function goSceneUp(){const node=nodeById(previewLayout.value,sceneView.value.levelId);if(node?.parentId)enterNode(node.parentId)}
 function toggleSceneNode(id:string){if(id==='factory')return;const hidden=sceneView.value.hidden;sceneView.value.hidden=hidden.includes(id)?hidden.filter(x=>x!==id):[...hidden,id]}
 function isolateSceneNode(id:string){if(!nodeById(previewLayout.value,id))return;enterNode(id);sceneView.value.isolatedId=id}
 function restoreSceneVisibility(){sceneView.value.hidden=[];sceneView.value.isolatedId=null}
 function locateExperiment(){const node=previewLayout.value.nodes.find(n=>n.assetId==='pump')!;enterNode(node.parentId!);selectNode(node.id,'tree')}
 const canEditScene=computed(()=>saved.value.page==='task'&&saved.value.step>=3&&saved.value.step<=7&&!missingPrerequisite(saved.value.step))
 function editSceneNode(id:string,name:string,parentId:string|null){
  if(!canEditScene.value){message.value='请在步骤03—07补齐前置成果后编辑场景。';return false}
  try{const next=editedScene(saved.value.config.layout,id,name,parentId);if(next===saved.value.config.layout)return true;saved.value.config.layout=next;enterNode(id);message.value='场景已更新。对象ID与绑定保持，相关步骤须重新验证；历史提交保持冻结。';return true}catch(e){message.value=e instanceof Error?e.message:'场景调整未通过校验。';return false}
 }
 function selectNode(id:string,source:'canvas'|'tree'){
  const node=nodeById(previewLayout.value,id);if(!node)return;sceneView.value.selectedId=id
  if(saved.value.page==='task'&&source==='canvas'&&node.assetId&&sceneReady.value&&layoutValid.value&&(saved.value.step===6||saved.value.step===7)&&!missingPrerequisite(saved.value.step)){
   const step=saved.value.step,basis=sceneBasis(saved.value.config,step)
   saved.value.clicks=saved.value.clicks.filter(p=>!(p.step===step&&p.model===node.assetId&&p.basis===basis)).slice(-99)
   saved.value.clicks.push({step,model:node.assetId,basis,at:new Date().toISOString()})
  }
 }
 function locate(id:Equipment){const node=previewLayout.value.nodes.find(n=>n.assetId===id)!;enterNode(node.id)}
 function path(id:string){return nodePath(previewLayout.value,id).map(n=>n.name).join(' / ')}
 function importJson(text:string){try{const parsed=parseFull(text);saved.value=parsed;storageHealthy.value=true;originalUnreadable.value='';error.value='';sceneView.value=defaultSceneNavigation();message.value='完整课程备份已校验并导入；可计算的达成与分数已重新推导。';return true}catch(e){message.value=e instanceof Error?e.message:'导入失败，当前课程未改变。';return false}}
 function status(step:number){if(step>7)return '交互待建设';const p=progress.value[step-1]!,input=saved.value.inputs[step-1]!;return p.success?'已验证':p.stale?'待复验':p.attempted||input.prediction.trim()||input.observation.trim()?'进行中':'待开始'}
 return {saved,error,message,originalUnreadable,sceneView,sceneReady,progress,automatic,ready,basis,previewLayout,previewPositions,layoutValid,openStep,missingPrerequisite,validate,enterNode,selectNode,locate,path,importJson,status,revealNode,goSceneUp,toggleSceneNode,isolateSceneNode,restoreSceneVisibility,locateExperiment,canEditScene,editSceneNode}
})
export type FullCourseSession=ReturnType<typeof useFullCourse>
