import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import App from './App.vue'
import { useLab } from './store'
import StepPanel from './components/StepPanel.vue'
beforeEach(()=>{vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{}});setActivePinia(createPinia())})
afterEach(()=>vi.unstubAllGlobals())
describe('课程页面与证据显示',()=>{
 it('三个页面及五个教学环节均可渲染',async()=>{const pinia=createPinia(),app=createSSRApp(App).use(pinia),lab=useLab(pinia);for(const page of ['overview','lab','report'] as const){lab.page=page;const html=await renderToString(app);expect(html).toContain(page==='overview'?'本例聚焦四个知识点':page==='lab'?'固定输入回放':'同输入实验对照')};for(let i=0;i<5;i++){lab.setPhase(i);const html=await renderToString(createSSRApp(StepPanel).use(pinia));expect(html).toContain('先预测，再运行');expect(html).toContain('保存关联链与观察')}})
 it('学生活动文本安全转义，报告明确等待人工论证分',async()=>{const pinia=createPinia(),app=createSSRApp(App).use(pinia),lab=useLab(pinia);lab.page='report';lab.saved.conclusions.limits='<script>malicious()</script>';const html=await renderToString(app);expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>malicious()');expect(html).toContain('待复核 / 30')})
})
