import type { Equipment,Asset } from './domain'
import type { LabSession } from './store'
import type { SceneLayout,SceneNavigation } from './sceneGraph'
export interface SceneAdapter {
 readonly sceneLayout:SceneLayout; readonly sceneView:SceneNavigation;sceneReady:boolean;
 readonly positions?:Partial<Record<Equipment,[number,number,number]>>;
 readonly paintKey:unknown;
 modelActive(id:Equipment):boolean;
 modelPresentation?(id:Equipment):{title:string;detail:string;invalid:boolean};
 modelInfo(id:Equipment):{asset:{code:string;name:string}|null;reading:{value:number;unit:string;valid:boolean}|null};
 selectSceneNode(id:string,source:'canvas'|'tree'):void;enterSceneNode(id:string):void;
}
export interface SceneSimulation {
 running:boolean;activeId:number|null;tick:number;window:number;complete:boolean;currentMatches:boolean;
 control(action:'pause'|'resume'|'step'|'finish'):void;
}
/** Window capabilities are independent of a particular course's state or grading. */
export interface SceneWorkbenchAdapter extends SceneAdapter {
 readonly assets:Asset[];
 readonly primary:{label:string;enabled:boolean;reason:string;run():void};
 readonly simulation:SceneSimulation|null;
 readonly simulationUnavailableReason:string;
 readonly clockLabel:string;readonly stateLabel:string;readonly contextNote:string;
 readonly description:string;readonly recordSummary:string;
 readonly canEdit:boolean;readonly editReason:string;
 notify(message:string):void;
 locateEquipment(id:Equipment):void;locateExperiment():void;goSceneUp():void;
 revealSceneNode(id:string):void;toggleSceneNode(id:string):void;isolateSceneNode(id:string):void;
 restoreSceneVisibility():void;editSceneNode(id:string,name:string,parentId:string|null):boolean;
}
export function coreSceneAdapter(lab:LabSession):SceneWorkbenchAdapter {return {
 get sceneLayout(){return lab.sceneLayout},get sceneView(){return lab.sceneView},
 get sceneReady(){return lab.sceneReady},set sceneReady(value){lab.sceneReady=value},
 get paintKey(){return [lab.latest,lab.saved.config,lab.active?.detector.active,lab.currentMatches]},
 modelActive:id=>lab.modelActive(id),modelInfo:id=>lab.modelInfo(id),
 selectSceneNode:(id,source)=>lab.selectSceneNode(id,source),enterSceneNode:id=>lab.enterSceneNode(id),
 get assets(){return lab.saved.config.assets},
 get primary(){return {label:'开始仿真',enabled:true,reason:'',run:()=>{lab.startTrial()}}},
 get simulation(){return {running:lab.running,activeId:lab.active?.id??null,tick:lab.active?.tick??0,window:40,complete:!!lab.active?.complete,currentMatches:lab.currentMatches,control:lab.control}},
 simulationUnavailableReason:'',
 get clockLabel(){return `T+${String(lab.active?.tick??0).padStart(2,'0')}/40s`},
 get stateLabel(){return lab.active&&!lab.currentMatches?'配置或场景已变化 · 需新一轮仿真':lab.active?.complete?'本轮仿真完成':lab.running?'仿真运行中':'教学示意场景'},
 contextNote:'关联当前泵电流实验，可定位并继续配置。',
 description:'当前配置用于新一轮1—40秒仿真。规则逐源样本计算；宏观模型为教学示意，不计算热解工艺物理过程。',
 get recordSummary(){return `记录 #${lab.active?.id??'—'} · 场景修订 ${lab.sceneLayout.revision} · ${lab.currentAccepted?'当前方案已验收':'当前方案待复验'}`},
 canEdit:true,editReason:'仅改变本实例场景。结构调整会暂停仿真并要求复验；设备ID及数据绑定保持。',
 notify:message=>{lab.lastMessage=message},locateEquipment:lab.locateEquipment,locateExperiment:lab.locateExperiment,goSceneUp:lab.goSceneUp,
 revealSceneNode:lab.revealSceneNode,toggleSceneNode:lab.toggleSceneNode,isolateSceneNode:lab.isolateSceneNode,restoreSceneVisibility:lab.restoreSceneVisibility,editSceneNode:lab.editSceneNode
}}
