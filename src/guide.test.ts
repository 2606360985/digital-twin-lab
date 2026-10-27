import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest'
import {createPinia,setActivePinia} from 'pinia'
import {useLab,useTutorialLab} from './store'
import {useGuide,observationGuide,guideTasks} from './guide'
import {visibleGuideRect} from './guideGeometry'
let disk:Map<string,string>
beforeEach(()=>{disk=new Map();vi.stubGlobal('localStorage',{getItem:(k:string)=>disk.get(k)??null,setItem:(k:string,v:string)=>disk.set(k,v)});setActivePinia(createPinia());vi.useFakeTimers()})
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
function setup(){const lab=useTutorialLab(),guide=useGuide();guide.start(lab,true);lab.saved.config.bindings={tank:'tank',pump:'tank',exchanger:'exchanger'};lab.saved.config.point.field='motor_i';lab.editPrediction('比较真实资产字段与单位');return {lab,guide}}
function run(lab:ReturnType<typeof useTutorialLab>){lab.startTrial();lab.finish()}
describe('观察操作引导回归',()=>{
 it('重复错误配置仿真后，保存最新一轮能解锁，不依赖第一轮',()=>{const {lab,guide}=setup();run(lab);run(lab);guide.step=5;expect(guide.allowed(lab)).toBe(false);lab.sceneReady=true;lab.choose('pump','scene');lab.observe('第二轮实际为液位');expect(lab.saved.trials[0]!.observations).toHaveLength(0);expect(observationGuide(lab,5).evidence?.id).toBe(2);expect(guide.next(lab)).toBe(true)})
 it('修复后重复运行，最新一轮有效观察同样可以继续',()=>{const {lab,guide}=setup();run(lab);lab.saved.config.bindings.pump='pump';lab.changed();run(lab);run(lab);guide.step=8;expect(guide.allowed(lab)).toBe(false);lab.sceneReady=true;lab.choose('pump','scene');lab.observe('第三轮修复后显示泵电流A');expect(observationGuide(lab,8).evidence?.id).toBe(3);expect(guide.next(lab)).toBe(true)})
 it('明确区分未运行、未真实点选、未填写和未保存',()=>{const {lab}=setup();expect(observationGuide(lab,5).target).toBe('simulation');run(lab);expect(observationGuide(lab,5).target).toBe('scene');lab.sceneReady=true;lab.locateEquipment('pump');expect(observationGuide(lab,5).target).toBe('scene');lab.choose('pump','scene');expect(observationGuide(lab,5).target).toBe('observation-entry');expect(observationGuide(lab,5).message).toContain('输入框');lab.observationDraft='已填写，但还没点保存';const state=observationGuide(lab,5);expect(state.tasks[2]?.done).toBe(true);expect(state.tasks[3]?.done).toBe(false);expect(state.message).toContain('不要只点击');expect(state.evidence).toBeUndefined()})
 it('保存失败的原因与操作卡一致，文字草稿不会自动形成证据',()=>{const {lab}=setup();expect(lab.observationIssue).toContain('仿真结果');run(lab);expect(lab.observationIssue).toContain('实际点选');lab.sceneReady=true;lab.choose('pump','scene');expect(lab.observe(' ')).toBe(false);expect(lab.lastMessage).toBe(lab.observationIssue);lab.observationDraft='填写后等待保存';expect(lab.observationIssue).toBe('');expect(lab.active?.observations).toHaveLength(0);expect(lab.autoScore).toBe(0);expect(lab.observe(lab.observationDraft)).toBe(true);expect(guideTasks(lab,5).every(t=>t.done)).toBe(true)})
 it('未完成、错模型或错误质量的观察不能解锁',()=>{const {lab,guide}=setup();run(lab);lab.sceneReady=true;lab.choose('tank','scene');lab.observe('储罐不替代三维泵观察');guide.step=5;expect(guide.allowed(lab)).toBe(false);lab.saved.config.bindings.pump='pump';lab.changed();lab.startTrial();lab.step();lab.choose('pump','scene');lab.observe('只有一秒的未完成轮次');guide.step=8;expect(guide.allowed(lab)).toBe(false)})
 it('提示草稿和演练推进不改变正式存档或成绩',()=>{const formal=useLab(),before=formal.exportJson(),{lab,guide}=setup();run(lab);guide.step=5;lab.observationDraft='演练文本';expect(formal.exportJson()).toBe(before);expect(formal.observationDraft).toBe('');guide.close(lab);guide.start(lab);expect(guide.step).toBe(5);expect(lab.saved.trials).toHaveLength(1);expect(lab.observationDraft).toBe('演练文本')})
})
describe('滚动高亮可视几何',()=>{
 it('页面滚动后使用新坐标，无动画累计偏差',()=>{const viewport={width:1280,height:720};expect(visibleGuideRect({left:932,top:200,width:298,height:300},viewport)).toEqual({left:928,top:196,width:306,height:308});expect(visibleGuideRect({left:932,top:500,width:298,height:300},viewport)).toEqual({left:928,top:496,width:306,height:218})})
 it('目标完全出屏时没有错误洞口，滚回后恢复',()=>{const v={width:390,height:844};expect(visibleGuideRect({left:20,top:900,width:350,height:200},v)).toBeNull();expect(visibleGuideRect({left:20,top:-300,width:350,height:200},v)).toBeNull();expect(visibleGuideRect({left:20,top:90,width:350,height:200},v)).toEqual({left:16,top:86,width:358,height:208})})
 it('嵌套抽屉按各轴裁剪，滚出内部容器后不高亮被遮挡内容',()=>{const v={width:1280,height:720},t={left:30,top:100,width:200,height:150};expect(visibleGuideRect(t,v,[{top:180,bottom:300},{left:50,right:200}])).toEqual({left:50,top:180,width:150,height:74});expect(visibleGuideRect(t,v,[{top:300,bottom:400}])).toBeNull()})
})
