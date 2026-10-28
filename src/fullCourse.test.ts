import { beforeEach,afterEach,describe,expect,it,vi } from 'vitest'
import { createPinia,setActivePinia,getActivePinia } from 'pinia'
import { nextTick,createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { clone,equipmentIds } from './domain'
import { fullSteps,fullStages,fullRubric } from './fullCurriculum'
import { freshFull,inspectConfig,requiredEdges,expectedPoints,parseFull,stageReady,fullAutomaticScore,progressOf,fullBasis,fullJson } from './fullCourseDomain'
import { useFullCourse,FULL_KEY } from './fullCourseStore'
import { useFullPortal,FULL_PORTAL_KEY,parseFullPortal } from './fullCoursePortal'
import { useLab,STORAGE_KEY } from './store'
import { usePortal } from './portal'
import { useCourseNavigation } from './courseNavigation'
import LearningApp from './LearningApp.vue'
import FullCourseWorkspace from './components/FullCourseWorkspace.vue'
import FullCourseTeacher from './components/FullCourseTeacher.vue'
import { buildFactoryScene,disposeSceneGraph } from './sceneModels'
import { defaultSceneLayout } from './sceneGraph'
import { fullModelPresentation } from './fullScenePresentation'
import browserSnapshot from '../verification/完整课程第一阶段-浏览器验收样例.json?raw'
import browserReviews from '../verification/完整课程第一阶段-批阅验收样例.json?raw'
let storage:Map<string,string>
beforeEach(()=>{storage=new Map();vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)});setActivePinia(createPinia())})
afterEach(()=>vi.unstubAllGlobals())
function stageOne(){
 const c=useFullCourse()
 function step(n:number){c.openStep(n);c.saved.inputs[n-1]={prediction:`步骤${n}的预测`,observation:`步骤${n}的实测反馈与解释`}}
 c.saved.config.requirements.forEach(r=>{r.need=`${r.kind}需求`;r.acceptance='输入后核对实际反馈与资产身份'})
 step(1);expect(c.validate()).toBe(true)
 step(2);c.saved.config.architecture.edges=clone(requiredEdges);c.saved.config.architecture.rationale='生产侧只读，写操作仅在教学沙盒，治理后的历史数据供孪生与AI读取。';expect(c.validate()).toBe(true)
 step(3);const pump=c.saved.config.layout.nodes.find(n=>n.id==='model-pump')!;pump.parentId='model-pump';expect(c.validate()).toBe(false);pump.parentId='workshop-monitoring';expect(c.validate()).toBe(true)
 step(4);c.saved.config.assets[1]!.code='t-001';expect(c.validate()).toBe(false);c.saved.config.assets[1]!.code='1';expect(c.validate()).toBe(false);c.saved.config.assets[1]!.code='P-001';expect(c.validate()).toBe(true)
 step(5);c.saved.config.dictionary.pump.unit='%';expect(c.validate()).toBe(false);c.saved.config.dictionary.pump.unit='A';expect(c.validate()).toBe(true)
 step(6);c.saved.config.positions.pump[0]=99;expect(c.validate()).toBe(false);c.saved.config.positions.pump[0]=1;c.sceneReady=true;equipmentIds.forEach(id=>c.selectNode('model-'+id,'canvas'));expect(c.validate()).toBe(true)
 step(7);expect(c.validate()).toBe(false);equipmentIds.forEach(id=>{c.saved.config.mappings[id]={assetId:id,field:expectedPoints[id].field,sourceId:'teaching-'+id}});c.saved.config.mappings.pump.assetId='tank';expect(c.validate()).toBe(false);c.saved.config.mappings.pump.assetId='pump';equipmentIds.forEach(id=>c.selectNode('model-'+id,'canvas'));expect(c.validate()).toBe(true)
 return c
}
describe('完整课程教学设计',()=>{
 it('28步、四阶段、时间及五维评分一致',()=>{expect(fullSteps).toHaveLength(28);expect(new Set(fullSteps.map(s=>s.id)).size).toBe(28);expect(fullSteps.reduce((n,s)=>n+s.minutes,0)).toBe(220);expect(fullSteps.reduce((n,s)=>n+s.points,0)).toBe(100);for(const stage of fullStages){const steps=fullSteps.filter(s=>s.stage===stage.id);expect(steps).toHaveLength(7);expect(steps.reduce((n,s)=>n+s.minutes,0)).toBe(55);expect(steps.reduce((n,s)=>n+s.points,0)).toBe(stage.points)}for(const rubric of fullRubric)expect(fullSteps.filter(s=>rubric.steps.includes(s.id)).reduce((n,s)=>n+s.points,0)).toBe(rubric.points);expect(fullSteps.filter(s=>s.available)).toHaveLength(7);expect(fullStages.length*90).toBe(360)})
 it('每步具有问题、原理、操作、证据和分级提示',()=>{for(const s of fullSteps){expect(s.question).toBeTruthy();expect(s.principle).toBeTruthy();expect(s.actions.length).toBeGreaterThanOrEqual(3);expect(s.evidence).toBeTruthy();expect(s.hints).toHaveLength(3)}})
})
describe('第一阶段实际成果与依赖',()=>{
 it('浏览和初始配置不得分，缺少前置成果不能验证，后续步骤没有运行入口',()=>{const c=useFullCourse();for(let n=1;n<=28;n++)c.openStep(n);expect(c.automatic).toBe(0);expect(c.saved.records).toHaveLength(0);expect(c.validate()).toBe(false);c.openStep(3);expect(c.validate()).toBe(false);expect(c.saved.records).toHaveLength(0)})
 it('完成七步错误、修复、实体点选可取得14分，10分仍由教师评价',()=>{const c=stageOne();expect(c.ready).toBe(true);expect(c.automatic).toBe(14);expect(c.progress.every(p=>p.success)).toBe(true);expect(useFullPortal().score(c.saved)).toBe(14)})
 it('上游变更使下游待复验，历史证据与提交副本保持冻结',()=>{const c=stageOne(),p=useFullPortal(),r=p.submit(c.saved)!;const snapshot=r.snapshotJson;c.saved.config.assets[1]!.code='P-203';expect(c.progress[2]!.success).toBeTruthy();expect(c.progress[3]!.stale).toBe(true);expect(c.progress[6]!.stale).toBe(true);expect(c.ready).toBe(false);expect(r.snapshotJson).toBe(snapshot);expect(p.current(c.saved)).toBeUndefined();expect(parseFull(snapshot).config.assets[1]!.code).toBe('P-001')})
 it('实际画布点选与定位、树选择有区别，改位置或映射使凭证失效',()=>{const c=stageOne();const before=c.saved.clicks.length;c.selectNode('model-pump','tree');c.locate('tank');expect(c.saved.clicks.length).toBe(before);c.saved.config.mappings.pump.sourceId='teaching-tank';expect(inspectConfig(7,c.saved.config,c.saved.clicks).some(x=>x.code==='canvas')).toBe(true);c.saved.config.positions.pump[0]=2;expect(inspectConfig(6,c.saved.config,c.saved.clicks).some(x=>x.code==='canvas')).toBe(true)})
 it('校验单位、类型、质量、量程、层级循环、边界和生产写入',()=>{const s=freshFull(),c=s.config;c.dictionary.pump.type='string';c.dictionary.pump.unit='mA';c.dictionary.pump.min='';c.dictionary.pump.qualityCodes='good';expect(inspectConfig(5,c).map(f=>f.code)).toEqual(expect.arrayContaining(['dictionary-type-unit','dictionary-range','dictionary-quality']));c.layout.nodes.find(n=>n.id==='model-pump')!.parentId='model-pump';expect(inspectConfig(3,c)[0]?.code).toBe('hierarchy');c.positions.pump=[0,-1,Infinity];expect(inspectConfig(6,c).some(f=>f.code==='position')).toBe(true);c.architecture.edges.push({from:'twin',to:'source',access:'write'});expect(inspectConfig(2,c).some(f=>f.code==='production-write')).toBe(true)})
 it('模型位移适配只影响完整课程，原场景位置保持兼容且资源可释放',()=>{const layout=defaultSceneLayout(),base=buildFactoryScene(layout,'workshop-monitoring'),moved=buildFactoryScene(layout,'workshop-monitoring',{pump:[1,0,2]});expect(moved.groups.get('model-pump')!.position.x-base.groups.get('model-pump')!.position.x).toBe(1);expect(moved.groups.get('model-pump')!.position.z-base.groups.get('model-pump')!.position.z).toBe(2);expect(disposeSceneGraph(base.root).geometries).toBeGreaterThan(0);disposeSceneGraph(moved.root)})
})
describe('独立存档、冻结批阅与导入',()=>{
 it('课程导出再导入恢复同样结果，忽略外部伪造分数',()=>{const c=stageOne(),text=JSON.stringify({...c.saved,automatic:999});const s=parseFull(text);expect(stageReady(s)).toBe(true);expect(fullAutomaticScore(s)).toBe(14);expect('automatic'in s).toBe(false);expect(fullBasis(s)).toBe(c.basis)})
 it('错误版本、断裂身份和伪造有效记录不能产生达成',()=>{const c=stageOne(),s=clone(c.saved);s.records[0]!.config.requirements[0]!.need='';expect(stageReady(parseFull(JSON.stringify(s)))).toBe(false);const bad=clone(c.saved);bad.config.layout.nodes[0]!.modelRef='foreign';expect(()=>parseFull(JSON.stringify(bad))).toThrow();expect(()=>parseFull(JSON.stringify({...c.saved,courseId:'pump-core'}))).toThrow();expect(()=>parseFull('{broken')).toThrow();expect(()=>parseFull(JSON.stringify({...c.saved,records:[...c.saved.records,c.saved.records[0]]}))).toThrow()})
 it('损坏导入不覆盖草稿，空白数字等错误草稿可备份恢复',()=>{const c=stageOne(),before=JSON.stringify(c.saved);expect(c.importJson('{broken')).toBe(false);expect(JSON.stringify(c.saved)).toBe(before);c.saved.config.positions.pump[0]='';const s=parseFull(JSON.stringify(c.saved));expect(s.config.positions.pump[0]).toBe('');expect(stageReady(s)).toBe(false)})
 it('试课与完整课程存储隔离，刷新恢复完整进度',async()=>{const core=useLab();core.saved.config.assets[0]!.name='试课专用';const c=stageOne();await nextTick();const raw=storage.get(FULL_KEY)!;expect(storage.get(STORAGE_KEY)).not.toBe(raw);setActivePinia(createPinia());expect(useFullCourse().ready).toBe(true);expect(useLab().saved.config.assets[0]!.name).toBe('试课专用')})
 it('损坏本地存档不被浏览动作覆盖，可导出原始诊断',async()=>{storage.set(FULL_KEY,'bad-original');setActivePinia(createPinia());const c=useFullCourse();c.openStep(2);await nextTick();expect(storage.get(FULL_KEY)).toBe('bad-original');expect(c.originalUnreadable).toBe('bad-original');expect(c.importJson(JSON.stringify(freshFull()))).toBe(true);await nextTick();expect(parseFull(storage.get(FULL_KEY)!).step).toBe(1)})
 it('提交无需教师满分；评分关联冻结版本，备份恢复批阅历史',()=>{const c=stageOne(),p=useFullPortal(),s=p.submit(c.saved)!;expect(p.submit(c.saved)?.id).toBe(s.id);usePortal().setRole('teacher');expect(p.grade(s.id,{reviewer:'测试教师',needs:4,architecture:3,feedback:'引用记录核对验收条件和隔离理由',recordIds:[1,2]})).toBe(true);expect(p.score(c.saved)).toBe(21);const imported=parseFullPortal(p.exportJson());expect(imported[0]!.reviews[0]!.needs).toBe(4);c.saved.inputs[0]!.observation+=' 新说明';expect(p.score(c.saved)).not.toBe(21);expect(s.reviews).toHaveLength(1);expect(p.importJson('{bad')).toBe(false);expect(p.submissions).toHaveLength(1)})
 it('教师分数范围、引用与损坏批阅存档有明确校验',async()=>{const c=stageOne(),p=useFullPortal(),s=p.submit(c.saved)!;usePortal().setRole('teacher');expect(p.grade(s.id,{reviewer:'教师',needs:6,architecture:3,feedback:'说明',recordIds:[1]})).toBe(false);expect(p.grade(s.id,{reviewer:'教师',needs:4,architecture:3,feedback:'说明',recordIds:[999]})).toBe(false);await nextTick();storage.set(FULL_PORTAL_KEY,'bad-review');setActivePinia(createPinia());const restored=useFullPortal();await nextTick();expect(restored.originalUnreadable).toBe('bad-review');expect(storage.get(FULL_PORTAL_KEY)).toBe('bad-review')})
})
describe('数值草稿与前置任务保护',()=>{
 it('真实浏览器导出的七步与批阅样例可重算恢复',()=>{const s=parseFull(browserSnapshot);expect(s.records).toHaveLength(14);expect(stageReady(s)).toBe(true);expect(fullAutomaticScore(s)).toBe(14);const r=parseFullPortal(browserReviews);expect(r).toHaveLength(1);expect(r[0]!.reviews[0]!.needs+r[0]!.reviews[0]!.architecture).toBe(9);expect(r[0]!.basis).toBe(fullBasis(s))})
 it('非有限数保存为明确无效文本，错误证据仍可备份导入',async()=>{const c=stageOne();c.openStep(6);c.saved.config.positions.pump[0]=Infinity;expect(c.validate()).toBe(false);await nextTick();const s=parseFull(fullJson(c.saved));expect(s.config.positions.pump[0]).toBe('Infinity');expect(stageReady(s)).toBe(false);expect(parseFull(storage.get(FULL_KEY)!).records.at(-1)?.config.positions.pump[0]).toBe('Infinity')})
 it('前置步骤未达成时实体回调不能创建凭证，填写预测显示进行中',()=>{const c=useFullCourse();c.openStep(6);c.sceneReady=true;c.selectNode('model-pump','canvas');expect(c.saved.clicks).toHaveLength(0);c.openStep(1);c.saved.inputs[0]!.prediction='预测';expect(c.status(1)).toBe('进行中');expect(c.status(2)).toBe('待开始')})
})
describe('双入口和教学页面',()=>{
 it('总览与受前置条件限制的步骤仍有一个三维窗口，报告不新建场景',async()=>{const pinia=createPinia(),c=useFullCourse(pinia);for(const page of ['overview','task','report'] as const){c.saved.page=page;c.saved.step=7;const html=await renderToString(createSSRApp(FullCourseWorkspace).use(pinia));expect((html.match(/aria-label="完整课程三维对象工作区"/g)??[]).length).toBe(page==='report'?0:1)}expect(c.saved.clicks).toHaveLength(0)})
 it('场景浏览不会补充步骤7点选证据或改变已提交依据',()=>{const c=stageOne();c.saved.page='overview';const before=c.basis,clicks=JSON.stringify(c.saved.clicks);c.selectNode('model-tank','canvas');c.locate('pump');expect(JSON.stringify(c.saved.clicks)).toBe(clicks);expect(c.basis).toBe(before)})
 it('三维台账预览不冒充实际绑定，元数据和错配提示随配置变化',()=>{const s=freshFull(),c=s.config;expect(fullModelPresentation(c,0,'pump').title).toContain('台账 P-001');expect(fullModelPresentation(c,0,'pump').detail).toContain('待绑定');c.assets[1]!.code='P-207';expect(fullModelPresentation(c,4,'pump').title).toContain('P-207');c.dictionary.pump.unit='%';expect(fullModelPresentation(c,5,'pump').invalid).toBe(true);c.mappings.pump={assetId:'tank',field:'tank_level',sourceId:'teaching-tank'};expect(fullModelPresentation(c,7,'pump').title).toContain('→ T-001');expect(fullModelPresentation(c,7,'pump').invalid).toBe(true);c.mappings.pump={assetId:'pump',field:'motor_i',sourceId:'teaching-pump'};expect(fullModelPresentation(c,7,'pump').invalid).toBe(false)})
 it('首页两入口清晰且不触发试课引导',async()=>{const html=await renderToString(createSSRApp(LearningApp).use(createPinia()));expect(html).toContain('选择你的学习路径');expect(html).toContain('进入试课体验');expect(html).toContain('进入完整课程');expect(html).not.toContain('首次使用操作引导')})
 it('28个教学页可阅读且有单一三维窗口；前置工具禁用；待建设无校验按钮',async()=>{const pinia=createPinia(),c=useFullCourse(pinia);for(let step=1;step<=28;step++){c.openStep(step);const html=await renderToString(createSSRApp(FullCourseWorkspace).use(pinia));expect(html).toContain(fullSteps[step-1]!.title);expect(html).toContain('必要原理');expect((html.match(/aria-label="完整课程三维对象工作区"/g)??[]).length).toBe(1);if(step>7){expect(html).toContain('交互待建设');expect(html).not.toContain('校验并保存本次证据')}else if(step>1)expect(html).toContain('<fieldset disabled>')}expect(c.automatic).toBe(0)})
 it('完整课程教师端展示快照，学生输入被转义，入口切换不改试课状态',async()=>{const c=stageOne(),p=useFullPortal();c.saved.inputs[6]!.observation='<script>bad()</script>';c.validate();p.submit(c.saved);const core=useLab(),before=JSON.stringify(core.saved);useCourseNavigation().entry='full';usePortal().setRole('teacher');const html=await renderToString(createSSRApp(FullCourseTeacher).use(getActivePinia()!));expect(html).toContain('第一阶段成果批阅');expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');c.saved.page='report';expect(JSON.stringify(core.saved)).toBe(before);const student=await renderToString(createSSRApp(FullCourseWorkspace).use(getActivePinia()!));expect(student).not.toContain('<script>bad()</script>')})
})
