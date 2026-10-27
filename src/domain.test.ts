import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { achievements, advanceTrial, assetReading, clone, coreCorrect, initialConfig, metrics, modelReading, newTrial, sampleAt, type LabConfig, type TrialKind } from './domain'
import { LEGACY_KEY, STORAGE_KEY, parseSnapshot, useLab } from './store'
let storage: Map<string,string>
beforeEach(() => { storage = new Map(); vi.stubGlobal('localStorage', {getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}); setActivePinia(createPinia()); vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
function validConfig(): LabConfig { const c=initialConfig(); c.bindings={tank:'tank',pump:'pump',exchanger:'exchanger'}; c.point.field='motor_i'; return c }
function replay(c=validConfig(),kind:TrialKind='strategy',id=1) { const t=newTrial(id,kind,c,'比较输入和输出，检验规则。'); while(!t.complete) advanceTrial(t); return t }
function run(lab:ReturnType<typeof useLab>,kind:TrialKind) { lab.saved.kind=kind; lab.editPrediction('预计本轮结果与固定输入和所选策略一致，运行后核对。'); expect(lab.startTrial()).toBe(true); lab.finish(); lab.sceneReady=true; lab.choose('pump','scene'); expect(lab.observe('记录实际资产、字段、单位及事件时间，与预测核对。')).toBe(true); return lab.active! }
function fullCourse() {
 const lab=useLab(); lab.saved.config=validConfig()
 lab.saved.config.bindings.pump='tank'; run(lab,'mapping'); lab.saved.config.bindings.pump='pump'; run(lab,'mapping')
 lab.saved.config.point.field='tank_level'; run(lab,'mapping'); lab.saved.config.point.field='motor_i'; run(lab,'mapping')
 run(lab,'period'); lab.saved.config.period=3; run(lab,'period'); lab.saved.config.period=1
 for(const strategy of ['threshold','persistence','hysteresis'] as const) {lab.saved.config.strategy=strategy; run(lab,'strategy')}
 for(const e of lab.active!.incidents) {lab.acknowledge(e.id); expect(lab.closeIncident(e.id)).toBe(true)}
 lab.assignTransfer(); lab.saved.config.bindings.pump='pump'; lab.saved.config.point.field='motor_i'; run(lab,'transfer')
 Object.keys(lab.saved.conclusions).forEach(k=>{lab.saved.conclusions[k as keyof typeof lab.saved.conclusions]='见实际试验编号和数据，解释配置效果及模拟适用范围。'})
 return lab
}
describe('关联与数据质量',()=>{
 it('未绑定无数据；泵模型绑定储罐后显示储罐真实液位和单位',()=>{const c=validConfig(); c.bindings.pump=''; expect(modelReading(c,'pump',sampleAt(5)).reading).toBeNull(); c.bindings.pump='tank'; const r=modelReading(c,'pump',sampleAt(5)); expect(r.asset?.id).toBe('tank'); expect(r.reading?.unit).toBe('%'); expect(r.reading?.value).toBe(60.5)})
 it('错字段保留真实源单位但禁止告警，单位和类型错误同样禁止',()=>{for(const change of [{field:'tank_level'},{unit:'mA'},{type:'string' as const}]){const c=validConfig(); Object.assign(c.point,change); const t=replay(c); expect(t.detections).toHaveLength(0); expect(assetReading(c,'pump',sampleAt(5))?.valid).toBe(false)} })
 it('配置正确及无意义文字不能在未试验时得分',()=>{const lab=useLab();lab.saved.config=validConfig();Object.keys(lab.saved.conclusions).forEach(k=>lab.saved.conclusions[k as keyof typeof lab.saved.conclusions]='不知道不知道不知道'); expect(lab.autoScore).toBe(0); expect(lab.teacherScore).toBe(0); expect(lab.submit()).toBe(false)})
})
describe('可重复回放与对照',()=>{
 it('相同输入配置重复运行输出完全一致，参数更改不改写历史快照',()=>{const c=validConfig();const a=replay(c),b=replay(c);expect(a.samples).toEqual(b.samples);expect(a.detections).toEqual(b.detections); c.rule.duration=6;expect(a.config.rule.duration).toBe(3)})
 it('1秒40点、3秒14点且漏掉尖峰，源检测输出一致',()=>{const c=validConfig(),a=replay(c);c.period=3;const b=replay(c);expect(a.samples).toEqual(b.samples);expect(metrics(a).published).toBe(40);expect(metrics(b).published).toBe(14);expect(metrics(a).visibleSpike).toBe(true);expect(metrics(b).visibleSpike).toBe(false);expect(a.detections).toEqual(b.detections)})
 it('三策略分别呈现尖峰误触发、延迟和滞回减少切换',()=>{const c=validConfig();c.strategy='threshold';const a=replay(c);c.strategy='persistence';const b=replay(c);c.strategy='hysteresis';const d=replay(c);expect(a.detections.map(e=>e.tick)).toEqual([5,7,11,19,23,27,31,35]);expect(b.detections.map(e=>e.tick)).toEqual([14,21,26,29,34,37]);expect(d.detections.map(e=>e.tick)).toEqual([14,37]);expect(metrics(a).falseTriggers).toBe(1);expect(metrics(b).delay).toBe(3);expect(metrics(d).switches).toBe(2)})
 it('恰等于阈值不触发，连续计时按事件时间差',()=>{const c=validConfig();c.rule.high=10.6;expect(replay(c).detections).toHaveLength(0);expect(replay().detections[0]?.tick).toBe(14)})
 it('比较只有一个研究变量，其他参数变化不能混入周期得分',()=>{const c=validConfig();const a=replay(c,'period',1);c.period=3;c.rule.high=9;const b=replay(c,'period',2);for(const t of [a,b])t.observations.push({tick:40,model:'pump',asset:'pump',code:'P-001',field:'motor_i',unit:'A',value:5.2,quality:'有效',note:'核对'});expect(achievements([a,b],c,null).find(a=>a.id==='period')?.earned).toBe(0)})
 it('未保存预测无法开始；暂停和刷新导入不会补算离线时间',()=>{const lab=useLab();lab.saved.config=validConfig();expect(lab.startTrial()).toBe(false);lab.editPrediction('预计持续条件能够抑制尖峰');lab.startTrial();vi.advanceTimersByTime(4000);expect(lab.active?.tick).toBe(4);lab.pause();vi.advanceTimersByTime(8000);expect(lab.active?.tick).toBe(4);lab.restore(lab.exportJson());expect(lab.running).toBe(false);lab.play();vi.advanceTimersByTime(1000);expect(lab.active?.tick).toBe(5);lab.pause()})
})
describe('证据与事件处置',()=>{
 it('稀疏发布观察同时保存源时间和屏幕时间，不把旧发布值当作当前源值',()=>{const lab=useLab();lab.saved.config=validConfig();lab.saved.config.period=3;lab.saved.config.bindings.pump='tank';lab.editPrediction('核对源与发布的时间差');lab.startTrial();lab.pause();lab.step();lab.step();lab.sceneReady=true;lab.choose('pump','scene');expect(lab.observe('显示仍为第1秒发布值')).toBe(true);const o=lab.active!.observations[0]!;expect(o.tick).toBe(2);expect(o.displayTick).toBe(1);expect(o.value).toBe(60.1);expect(o.sourceValue).toBe(60.2);const restored=parseSnapshot(lab.exportJson());expect(restored.trials[0]?.observations[0]).toEqual(o)})
 it('空白数字草稿不能开始试验，也不清除上次有效存档',async()=>{const lab=useLab();lab.saved.config=validConfig();lab.editPrediction('有效配置预测');const text=lab.exportJson();storage.set(STORAGE_KEY,text);(lab.saved.config.rule as unknown as Record<string,unknown>).high='';expect(lab.startTrial()).toBe(false);await nextTick();expect(storage.get(STORAGE_KEY)).toBe(text);expect(lab.saved.trials).toHaveLength(0)})
 it('真实点选及观察缺失时不计分，修改配置后禁止把旧试验记成新证据',()=>{const lab=useLab();lab.saved.config=validConfig();lab.editPrediction('预计能观察到实际输入');lab.startTrial();lab.finish();expect(lab.observe('观察')).toBe(false);expect(lab.autoScore).toBe(0);lab.sceneReady=true;lab.choose('pump','scene');expect(lab.observe('观察')).toBe(true);lab.saved.config.rule.duration=5;lab.changed();expect(lab.currentAccepted).toBe(false);expect(lab.observe('旧证据')).toBe(false);expect(lab.active?.config.rule.duration).toBe(3)})
 it('待复核事件不阻止再次越限，不同事件分别确认和关闭',()=>{const lab=useLab();lab.saved.config=validConfig();lab.saved.config.strategy='persistence';const t=run(lab,'strategy');expect(t.incidents).toHaveLength(3);expect(lab.closeIncident(1)).toBe(false);lab.acknowledge(1);expect(lab.closeIncident(1)).toBe(true);expect(t.incidents[1]?.acknowledgedAt).toBeNull()})
 it('恢复前即使已确认也不能关闭',()=>{const lab=useLab();lab.saved.config=validConfig();lab.editPrediction('观察持续越限');lab.startTrial();lab.pause();for(let i=0;i<15;i++)lab.step();lab.acknowledge(1);expect(lab.closeIncident(1)).toBe(false)})
 it('全流程可获得70分，论证30分只能由教师明确录入，修改结论使复核失效',()=>{const lab=fullCourse();expect(coreCorrect(lab.saved.config)).toBe(true);expect(lab.autoScore).toBe(70);expect(lab.teacherScore).toBe(0);expect(lab.submit()).toBe(true);expect(lab.review({reviewer:'试教教师',explanation:18,limits:8,feedback:'依据试验记录复核，需补充延迟权衡。',trialIds:[1,5,9,10]})).toBe(true);expect(lab.totalScore).toBe(96);const text=lab.exportJson();lab.restore(text);expect(lab.totalScore).toBe(96);lab.saved.conclusions.limits+='补充';expect(lab.reviewValid).toBe(false);expect(lab.teacherScore).toBe(0);expect(lab.saved.review?.explanation).toBe(18)})
 it('无效教师分值、不存在的证据引用或未提交报告均不能录入',()=>{const lab=fullCourse();const r={reviewer:'教师',explanation:20,limits:10,feedback:'已核对',trialIds:[1]};expect(lab.review(r)).toBe(false);lab.submit();expect(lab.review({...r,explanation:21})).toBe(false);expect(lab.review({...r,trialIds:[999]})).toBe(false)})
})
describe('存档兼容和重算',()=>{
 it('损坏导入原子失败；源数据及输出从快照重算，不能信任上传分数',()=>{const lab=useLab();lab.saved.config=validConfig();run(lab,'strategy');const old=lab.exportJson();expect(()=>lab.restore('{bad')).toThrow();expect(lab.exportJson()).toBe(old);const s=JSON.parse(old);s.trials[0].samples[0].motor_i=999;s.trials[0].detections=[];const restored=parseSnapshot(JSON.stringify(s));expect(restored.trials[0]?.samples[0]?.motor_i).toBe(5.2);expect(restored.trials[0]?.detections).toHaveLength(2);s.trials[0].id=NaN;expect(()=>parseSnapshot(JSON.stringify(s))).toThrow()})
 it('未知版本、缺字段、重复ID和伪造关闭时间被拒绝',()=>{const lab=useLab();lab.saved.config=validConfig();run(lab,'strategy');for(const mutate of [(s:any)=>s.version=3,(s:any)=>delete s.config.bindings,(s:any)=>s.trials.push(clone(s.trials[0])),(s:any)=>s.trials[0].incidents[0].closedAt=1]){const s=JSON.parse(lab.exportJson());mutate(s);expect(()=>parseSnapshot(JSON.stringify(s))).toThrow()}})
 it('v1只读保留原始存储，不迁移配置或成绩',()=>{const v1=JSON.stringify({version:1,scenarioId:'monitoring-cell',config:{assets:[{code:'OLD',name:'旧设备'}]},events:[],reflection:'旧记录'});storage.set(LEGACY_KEY,v1);const lab=useLab();expect(lab.legacy?.assets[0]?.code).toBe('OLD');lab.importArchive(v1);expect(lab.saved.version).toBe(2);expect(lab.saved.trials).toHaveLength(0);expect(lab.autoScore).toBe(0);expect(storage.get(LEGACY_KEY)).toBe(v1);expect(STORAGE_KEY).not.toBe(LEGACY_KEY)})
})

