import { clone, equipmentIds, type Equipment } from './domain'
import { defaultSceneLayout, validateSceneLayout, type SceneLayout } from './sceneGraph'
export const FULL_DATASET = 'full-course-stage1-v1'
export function fullJson(value:unknown,pretty=false){return JSON.stringify(value,(_key,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v,pretty?2:undefined)}
export function fullClone<T>(value:T):T{return JSON.parse(fullJson(value)) as T}
export const requirementKinds = ['对象','数据','交互','AI'] as const
export const componentNames = {source:'生产数据源',gateway:'教学采集与治理',storage:'教学历史存储',twin:'孪生应用',knowledge:'技术知识库',ai:'AI辅助'}
export type ComponentId = keyof typeof componentNames
export const expectedPoints = {
 tank:{field:'tank_level',unit:'%',min:0,max:100,name:'储罐液位'},
 pump:{field:'motor_i',unit:'A',min:0,max:12,name:'泵电流'},
 exchanger:{field:'outlet_temp',unit:'℃',min:0,max:120,name:'出口温度'}
}
export type NumericDraft = number|string
export interface PointDefinition { field:string; type:string; unit:string; min:NumericDraft; max:NumericDraft; qualityCodes:string }
export interface ArchitectureEdge { from:ComponentId; to:ComponentId; access:'read'|'write' }
export interface FullConfig {
 requirements:{kind:string;need:string;acceptance:string}[];
 architecture:{scopes:Record<ComponentId,'production'|'teaching'>;edges:ArchitectureEdge[];rationale:string};
 layout:SceneLayout;
 assets:{id:Equipment;name:string;code:string}[];
 dictionary:Record<Equipment,PointDefinition>;
 positions:Record<Equipment,[NumericDraft,NumericDraft,NumericDraft]>;
 mappings:Record<Equipment,{assetId:Equipment|'';field:string;sourceId:string}>;
}
export interface StepInput { prediction:string; observation:string }
export interface SceneProof { step:6|7;model:Equipment;basis:string;at:string }
export interface ValidationRecord {
 id:number;step:number;at:string;dataset:typeof FULL_DATASET;config:FullConfig;
 inputs:StepInput[];clicks:SceneProof[];
}
export interface FullSaved {
 version:1;courseId:'full-course';dataset:typeof FULL_DATASET;config:FullConfig;inputs:StepInput[];
 records:ValidationRecord[];clicks:SceneProof[];step:number;page:'overview'|'task'|'report'|'resources';
}
export interface Finding { code:string;message:string }
const issue=(code:string,message:string):Finding=>({code,message})
export function freshFull():FullSaved {
 const dictionary=Object.fromEntries(equipmentIds.map(id=>[id,{field:expectedPoints[id].field,type:'number',unit:expectedPoints[id].unit,min:0,max:expectedPoints[id].max,qualityCodes:'good,bad,missing,stale'}])) as FullConfig['dictionary']
 return {version:1,courseId:'full-course',dataset:FULL_DATASET,step:1,page:'overview',inputs:Array.from({length:7},()=>({prediction:'',observation:''})),records:[],clicks:[],config:{
  requirements:requirementKinds.map(kind=>({kind,need:'',acceptance:''})),
  architecture:{scopes:{source:'production',gateway:'teaching',storage:'teaching',twin:'teaching',knowledge:'teaching',ai:'teaching'},edges:[],rationale:''},
  layout:defaultSceneLayout(),assets:[{id:'tank',name:'储罐',code:'T-001'},{id:'pump',name:'离心泵',code:'P-001'},{id:'exchanger',name:'换热器',code:'HX-001'}],dictionary,
  positions:{tank:[0,0,0],pump:[0,0,0],exchanger:[0,0,0]},
  mappings:{tank:{assetId:'',field:'',sourceId:''},pump:{assetId:'',field:'',sourceId:''},exchanger:{assetId:'',field:'',sourceId:''}}
 }}
}
export const requiredEdges:ArchitectureEdge[]=[
 {from:'source',to:'gateway',access:'read'},{from:'gateway',to:'storage',access:'write'},
 {from:'storage',to:'twin',access:'read'},{from:'knowledge',to:'ai',access:'read'},
 {from:'storage',to:'ai',access:'read'},{from:'ai',to:'twin',access:'read'}
]
export function validLayout(config:FullConfig):SceneLayout { return validateSceneLayout({...config.layout,revision:Math.max(1,config.layout.revision)}) }
function digest(text:string){let a=2166136261,b=5381;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i)}return `${text.length}:${a>>>0}:${b>>>0}`}
export function configVersion(config:FullConfig){return digest(fullJson(config))}
export function sceneBasis(config:FullConfig,step:6|7) {
 return digest(fullJson([config.layout,config.positions,...(step===7?[config.assets,config.dictionary,config.mappings]:[])]))
}
export function taskBasis(step:number,config:FullConfig,inputs:StepInput[]) {
 const parts:unknown[]=[config.requirements]
 if(step>=2)parts.push(config.architecture)
 if(step>=3)parts.push(config.layout)
 if(step>=4)parts.push(config.assets)
 if(step>=5)parts.push(config.dictionary)
 if(step>=6)parts.push(config.positions)
 if(step>=7)parts.push(config.mappings)
 return digest(fullJson([parts,inputs.slice(0,step)]))
}
export function inspectConfig(step:number,c:FullConfig,clicks:SceneProof[]=[]):Finding[] {
 const out:Finding[]=[]
 if(step===1){
  for(const r of c.requirements)if(!r.need.trim()||!r.acceptance.trim())out.push(issue('requirement',`${r.kind}需求和验收条件尚未填写。`))
 }
 if(step===2){
  for(const [id,scope]of Object.entries(c.architecture.scopes))if(scope!==(id==='source'?'production':'teaching'))out.push(issue('scope',`${componentNames[id as ComponentId]}的环境边界不符合只读生产输入、教学侧处理的约束。`))
  for(const e of requiredEdges)if(!c.architecture.edges.some(x=>x.from===e.from&&x.to===e.to&&x.access===e.access))out.push(issue('dependency',`缺少${componentNames[e.from]} → ${componentNames[e.to]}的${e.access==='read'?'读取':'写入'}连接。`))
  const edgeKeys=c.architecture.edges.map(e=>`${e.from}:${e.to}`)
  if(new Set(edgeKeys).size!==edgeKeys.length)out.push(issue('duplicate-edge','连接重复，请保留每对组件的一条明确连接。'))
  for(const e of c.architecture.edges){if(e.from===e.to)out.push(issue('self-edge','组件不能与自身连接。'));if(e.access==='write'&&(c.architecture.scopes[e.to]==='production'||c.architecture.scopes[e.from]==='production'))out.push(issue('production-write','生产侧只允许读取，教学写操作不能连接生产组件。'))}
  if(!c.architecture.rationale.trim())out.push(issue('rationale','请说明组件依赖和读写隔离的设计理由。'))
 }
 if(step===3||step===6){
  try{validLayout(c)}catch(error){out.push(issue('hierarchy',error instanceof Error?error.message:'层级无效。'))}
 }
 if(step===4){
  if(c.assets.some(a=>!a.name.trim()||!/^[A-Za-z][A-Za-z0-9_-]{1,23}$/.test(a.code)))out.push(issue('code-format','名称不能为空；编码须为2—24位，以字母开头，只含字母、数字、下划线和连字符。'))
  if(new Set(c.assets.map(a=>a.code.toUpperCase())).size!==3)out.push(issue('code-duplicate','资产编码重复（唯一性不区分大小写）。'))
 }
 if(step===5){for(const id of equipmentIds){const p=c.dictionary[id],e=expectedPoints[id],name=e.name
  if(p.field!==e.field||p.type!=='number'||p.unit!==e.unit)out.push(issue('dictionary-type-unit',`${name}应为${e.field} / number / ${e.unit}。`))
  if(typeof p.min!=='number'||typeof p.max!=='number'||!Number.isFinite(p.min)||!Number.isFinite(p.max)||p.min>e.min||p.max<e.max||p.min>=p.max||p.min< -1000||p.max>10000)out.push(issue('dictionary-range',`${name}量程须覆盖${e.min}—${e.max} ${e.unit}，且上下限为合理有限数。`))
  const q=p.qualityCodes.split(',').map(s=>s.trim());if(['good','bad','missing','stale'].some(s=>!q.includes(s)))out.push(issue('dictionary-quality',`${name}须包含good,bad,missing,stale四种质量码。`))
 }}
 if(step===6){for(const id of equipmentIds){const p=c.positions[id];if(!p.every((v,i)=>typeof v==='number'&&Number.isFinite(v)&&v>=(i===1?0:-3)&&v<=(i===1?2:3)))out.push(issue('position',`${expectedPoints[id].name}局部位移越界：x、z为−3至3，y为0至2，必须是有限数。`))}}
 if(step===7){for(const id of equipmentIds){const m=c.mappings[id],e=expectedPoints[id];if(!m.assetId||!m.field||!m.sourceId)out.push(issue('mapping-missing',`${e.name}关联链存在漏配。`));else if(m.assetId!==id||m.field!==e.field||m.sourceId!==`teaching-${id}`)out.push(issue('mapping-mismatch',`${e.name}模型、资产、字段或教学数据源错配。`))}}
 if(step===6||step===7){for(const id of equipmentIds)if(!clicks.some(p=>p.step===step&&p.model===id&&p.basis===sceneBasis(c,step)))out.push(issue('canvas',`请在当前配置的三维画布上实际点选${c.assets.find(a=>a.id===id)?.name}实体；定位按钮不计入证据。`))}
 return out
}
const requiredFaults:Record<number,string[][]>={3:[['hierarchy']],4:[['code-format'],['code-duplicate']],5:[['dictionary-type-unit','dictionary-range','dictionary-quality']],6:[['position']],7:[['mapping-missing'],['mapping-mismatch']]}
export function recordFindings(record:ValidationRecord,prior:ValidationRecord[]):Finding[] {
 const out=inspectConfig(record.step,record.config,record.clicks)
 const input=record.inputs[record.step-1]!
 if(!input.prediction.trim()||!input.observation.trim())out.push(issue('explanation','请填写本步预测与实际观察；文字只用于证据完整性，不自动评价理解水平。'))
 for(const codes of requiredFaults[record.step]??[]){
  if(out.some(f=>codes.includes(f.code)))continue
  const upstream=record.step-1
  const fault=prior.some(p=>p.step===record.step&&taskBasis(upstream,p.config,p.inputs)===taskBasis(upstream,record.config,record.inputs)&&inspectConfig(p.step,p.config).some(f=>codes.includes(f.code)))
  if(!fault)out.push(issue('fault-evidence',`需要先校验并保存${({hierarchy:'非法层级或循环','code-format':'非法编码格式','code-duplicate':'重复编码','dictionary-type-unit':'错误字典','position':'越界位置','mapping-missing':'漏配','mapping-mismatch':'错配'} as Record<string,string>)[codes[0]!]}的反馈，再修复并复测。`))
 }
 return out
}
export function successfulRecords(records:ValidationRecord[]):ValidationRecord[] {
 const passed:ValidationRecord[]=[],prior:ValidationRecord[]=[]
 for(const r of records){const ready=r.step===1||passed.some(p=>p.step===r.step-1&&taskBasis(p.step,p.config,p.inputs)===taskBasis(p.step,r.config,r.inputs));if(ready&&!recordFindings(r,prior).length)passed.push(r);prior.push(r)}
 return passed
}
export function progressOf(s:FullSaved) {
 const passed=successfulRecords(s.records)
 return Array.from({length:7},(_,i)=>{const step=i+1,success=[...passed].reverse().find(p=>p.step===step&&taskBasis(step,p.config,p.inputs)===taskBasis(step,s.config,s.inputs));return {step,success,stale:!success&&passed.some(p=>p.step===step),attempted:s.records.some(r=>r.step===step)}})
}
export function fullAutomaticScore(s:FullSaved) {const maxima=[0,0,3,2,3,3,3];return progressOf(s).reduce((n,p,i)=>n+(p.success?maxima[i]!:0),0)}
export function stageReady(s:FullSaved){return progressOf(s).every(p=>!!p.success)}
export function fullBasis(s:FullSaved){return digest(fullJson([s.config,s.inputs,s.records,s.clicks]))}

// Import checks structure first, then derive results from snapshots. Stored scores are never accepted.
const textValue=(v:unknown):v is string=>typeof v==='string'&&v.length<=10000
const numericDraft=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&v.length<=30
function assertConfig(c:FullConfig){
 if(!c||!Array.isArray(c.requirements)||c.requirements.length!==4||!c.requirements.every((r,i)=>r&&r.kind===requirementKinds[i]&&textValue(r.need)&&textValue(r.acceptance)))throw Error('需求结构不合法。')
 if(!c.architecture||!textValue(c.architecture.rationale)||!c.architecture.scopes||Object.keys(componentNames).some(k=>!['production','teaching'].includes(c.architecture.scopes[k as ComponentId]))||!Array.isArray(c.architecture.edges)||c.architecture.edges.length>40||!c.architecture.edges.every(e=>e&&Object.hasOwn(componentNames,e.from)&&Object.hasOwn(componentNames,e.to)&&['read','write'].includes(e.access)))throw Error('架构结构不合法。')
 const base=defaultSceneLayout();if(!c.layout||c.layout.version!==1||!Number.isInteger(c.layout.revision)||c.layout.revision<0||!Array.isArray(c.layout.nodes)||c.layout.nodes.length!==base.nodes.length||new Set(c.layout.nodes.map(n=>n.id)).size!==base.nodes.length)throw Error('层级结构不合法。')
 for(const d of base.nodes){const n=c.layout.nodes.find(n=>n.id===d.id);if(!n||n.kind!==d.kind||n.assetId!==d.assetId||n.modelRef!==d.modelRef||!textValue(n.name)||!(n.parentId===null||textValue(n.parentId)))throw Error('模型身份不合法。')}
 if(!Array.isArray(c.assets)||c.assets.length!==3||new Set(c.assets.map(a=>a.id)).size!==3||!c.assets.every(a=>equipmentIds.includes(a.id)&&textValue(a.name)&&textValue(a.code)))throw Error('资产结构不合法。')
 for(const id of equipmentIds){const d=c.dictionary?.[id],p=c.positions?.[id],m=c.mappings?.[id];if(!d||![d.field,d.type,d.unit,d.qualityCodes].every(textValue)||![d.min,d.max].every(numericDraft)||!Array.isArray(p)||p.length!==3||!p.every(numericDraft)||!m||!(m.assetId===''||equipmentIds.includes(m.assetId))||!textValue(m.field)||!textValue(m.sourceId))throw Error('字典、位置或映射结构不合法。')}
}
function assertInputs(inputs:StepInput[]){if(!Array.isArray(inputs)||inputs.length!==7||!inputs.every(i=>i&&textValue(i.prediction)&&textValue(i.observation)))throw Error('预测观察结构不合法。')}
function assertProofs(proofs:SceneProof[]){if(!Array.isArray(proofs)||proofs.length>100||!proofs.every(p=>p&&[6,7].includes(p.step)&&equipmentIds.includes(p.model)&&typeof p.basis==='string'&&p.basis.length<100000&&textValue(p.at)&&Number.isFinite(Date.parse(p.at))))throw Error('点选证据结构不合法。')}
export function parseFull(text:string):FullSaved {
 if(text.length>8_000_000)throw Error('完整课程备份不能超过8 MB。')
 try{
  const s=JSON.parse(text) as FullSaved
  if(!s||s.version!==1||s.courseId!=='full-course'||s.dataset!==FULL_DATASET||!Number.isInteger(s.step)||s.step<1||s.step>28||!['overview','task','report','resources'].includes(s.page)||!Array.isArray(s.records)||s.records.length>300)throw Error('课程版本或记录不合法。')
  assertConfig(s.config);assertInputs(s.inputs);assertProofs(s.clicks)
  const ids=new Set<number>()
  for(const r of s.records){if(!r||!Number.isInteger(r.id)||r.id<1||ids.has(r.id)||r.dataset!==FULL_DATASET||!Number.isInteger(r.step)||r.step<1||r.step>7||!textValue(r.at)||!Number.isFinite(Date.parse(r.at)))throw Error('验证记录不合法。');ids.add(r.id);assertConfig(r.config);assertInputs(r.inputs);assertProofs(r.clicks)}
  const clean=clone({version:s.version,courseId:s.courseId,dataset:s.dataset,config:s.config,inputs:s.inputs,records:s.records,clicks:s.clicks,step:s.step,page:s.page})
  progressOf(clean)
  return clean
 }catch(error){throw Error(`备份校验失败，当前课程未改变。${error instanceof Error?error.message:''}`)}
}
