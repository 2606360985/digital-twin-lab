<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useGuide, guideSteps } from '../guide'
import type { LabSession } from '../store'
const props=defineProps<{session:LabSession}>(),emit=defineEmits<{exit:[];restart:[]}>(),guide=useGuide()
const rect=ref({left:0,top:0,width:0,height:0}),ready=ref(false)
const allowed=computed(()=>guide.allowed(props.session)),right=computed(()=>guide.current.target==='directory')
let frame=0
function find(){return document.querySelector<HTMLElement>(`[data-guide="${guide.current.target}"]`)}
function measure(){const node=find();if(!node){ready.value=false;return}const r=node.getBoundingClientRect(),top=Math.max(8,r.top),bottom=Math.min(innerHeight-8,r.bottom);rect.value={left:Math.max(5,r.left-5),top,width:Math.min(r.width+10,innerWidth-10),height:Math.max(0,bottom-top)};ready.value=rect.value.height>0}
async function locate(){await nextTick();const node=find();if(!node)return;for(let p:HTMLElement|null=node;p;p=p.parentElement)if(p instanceof HTMLDetailsElement)p.open=true;node.querySelectorAll<HTMLDetailsElement>('details[data-guide-expand]').forEach(panel=>panel.open=true);node.scrollIntoView({block:node.getBoundingClientRect().height>innerHeight*.7?'start':'center',behavior:'instant'});await nextTick();measure();const focus=Array.from(node.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,a')).find(el=>el.getClientRects().length&&!(el as HTMLButtonElement).disabled&&!el.classList.contains('directory-close'));focus?.focus({preventScroll:true})}
function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(measure)}
function escape(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();emit('exit')}}
watch(()=>guide.step,locate,{flush:'post'})
onMounted(()=>{locate();window.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);document.addEventListener('keydown',escape)})
onBeforeUnmount(()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);document.removeEventListener('keydown',escape)})
</script>
<template><div v-if="ready" class="guide-spotlight" :style="{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'}" aria-hidden="true"></div><section class="guide-bubble" :class="{'on-right':right}" role="region" aria-label="操作引导步骤"><div class="guide-top"><span>独立演练 · {{ guide.step+1 }}/{{ guideSteps.length }} · 约5分钟</span><button aria-label="退出操作引导" @click="emit('exit')">×</button></div><h2>{{ guide.current.title }}</h2><p aria-live="polite">{{ guide.current.text }}</p><p class="guide-condition">{{ allowed?'✓ 本步骤已满足，可继续': '请完成高亮区域的实际操作后继续' }}</p><div v-if="guide.step===3" class="guide-control-status">{{ ['pause','step','resume','finish'].map(a=>({pause:'暂停',step:'单步',resume:'继续',finish:'快速完成'})[a as 'pause']+(session.controlHistory.includes(a)?' ✓':' ○')).join(' · ') }}</div><div class="guide-buttons"><button class="btn" :disabled="guide.step===0" @click="guide.back(session)">上一步</button><button v-if="guide.step<guideSteps.length-1" class="btn primary" :disabled="!allowed" @click="guide.next(session)">下一步</button><button v-else class="btn primary" :disabled="!guide.completed" @click="emit('exit')">完成并返回正式实验</button><button class="core-link" @click="locate">定位当前操作</button><button class="core-link" @click="emit('restart')">重新演练</button></div><p class="guide-small">Esc可退出。当前演练不修改正式配置、成绩或教师批阅记录。</p></section></template>
