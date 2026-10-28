import type { SceneWorkbenchAdapter } from './sceneAdapter'
import type { FullCourseSession } from './fullCourseStore'
import { fullModelPresentation } from './fullScenePresentation'
import { fullSteps } from './fullCurriculum'
export function fullSceneAdapter(course:FullCourseSession):SceneWorkbenchAdapter{return {
 get sceneLayout(){return course.previewLayout},get sceneView(){return course.sceneView},
 get sceneReady(){return course.sceneReady},set sceneReady(value){course.sceneReady=value},
 get positions(){return course.previewPositions},get paintKey(){return [course.saved.config,course.saved.step,course.saved.page]},
 modelActive:()=>false,modelPresentation:id=>fullModelPresentation(course.saved.config,course.saved.page==='task'?course.saved.step:0,id),
 modelInfo(id){const m=course.saved.config.mappings[id];return {asset:course.saved.config.assets.find(a=>a.id===m.assetId)??null,reading:null}},
 selectSceneNode:(id,source)=>course.selectNode(id,source),enterSceneNode:course.enterNode,
 get assets(){return course.saved.config.assets},
 get primary(){
  if(course.saved.page!=='task')return {label:'进入当前任务',enabled:true,reason:'',run:()=>course.openStep(course.progress.find(p=>!p.success)?.step??7)}
  const reason=course.saved.step>7?'当前步骤专项交互待建设。':course.missingPrerequisite(course.saved.step)
  return {label:course.saved.step>7?'当前步骤待建设':'验证当前配置',enabled:!reason,reason,run:()=>{course.validate()}}
 },
 simulation:null,simulationUnavailableReason:'第一阶段进行对象与空间配置验证。时序仿真控制将在数据接入与状态规则阶段接入，当前尚未启用。',
 get clockLabel(){return course.saved.page==='task'?'配置验证':'场景浏览'},
 get stateLabel(){return !course.layoutValid?'层级草稿无效 · 暂用初始示意布局':course.saved.page==='task'?`步骤${String(course.saved.step).padStart(2,'0')} · ${course.status(course.saved.step)}`:'完整课程 · 三维场景浏览'},
 get contextNote(){return `完整课程 · ${fullSteps[course.saved.step-1]?.title??'对象与空间验证'}。浏览与定位不计完成。`},
 description:'与试课共用三维窗口框架。第一阶段标签显示台账与源元数据，配置效果实时预览；时序数据、状态机及AI能力按阶段接入。',
 get recordSummary(){return `第一阶段成果 ${course.progress.filter(p=>p.success).length}/7 · ${course.saved.records.length}条验证记录 · ${course.layoutValid?'当前层级有效':'当前层级待修复'}`},
 get canEdit(){return course.canEditScene},
 editReason:'步骤03—07满足前置条件后可调整名称和归属；修改后相关步骤须复验，设备身份及已提交副本保持。',
 notify:message=>{course.message=message},locateEquipment:course.locate,locateExperiment:course.locateExperiment,goSceneUp:course.goSceneUp,
 revealSceneNode:course.revealNode,toggleSceneNode:course.toggleSceneNode,isolateSceneNode:course.isolateSceneNode,restoreSceneVisibility:course.restoreSceneVisibility,editSceneNode:course.editSceneNode
}}
