<script setup lang="ts">
import { computed,nextTick,onBeforeUnmount,onMounted,ref,shallowRef,watch } from 'vue'
import { useGuide,guideSteps,guideTasks,observationGuide } from '../guide'
import { visibleGuideRect,type GuideRect,type GuideClip } from '../guideGeometry'
import type { LabSession } from '../store'
const props=defineProps<{session:LabSession}>(),emit=defineEmits<{exit:[];restart:[]}>(),guide=useGuide()
const rect=ref<GuideRect|null>(null),bubble=ref<HTMLElement>(),portalTarget=shallowRef<HTMLElement|string>('body'),highlightTarget=ref(''),measured=ref(false),viewport=ref({width:1280,height:720})
const allowed=computed(()=>guide.allowed(props.session)),isObservation=computed(()=>guide.step===5||guide.step===8)
const observation=computed(()=>observationGuide(props.session,guide.step))
const automaticTarget=computed(()=>isObservation.value?observation.value.target:guide.current.target)
const tasks=computed(()=>guideTasks(props.session,guide.step).map(task=>guide.step===10?{...task,done:guide.completed}:task))
const status=computed(()=>allowed.value?(guide.step===10?'✓ 演练已提交，点击“完成并返回正式实验”。':'✓ 本步骤已满足，可以点击“下一步”。'):isObservation.value?observation.value.message:'请按下方清单完成实际操作；“定位”会带你到对应位置。')
const right=computed(()=>rect.value?rect.value.left+rect.value.width/2<viewport.value.width/2:guide.current.target==='scene-navigation')
const maskPath=computed(()=>{const {width:w,height:h}=viewport.value,r=rect.value;return `M0 0H${w}V${h}H0Z`+(r?`M${r.left} ${r.top}V${r.top+r.height}H${r.left+r.width}V${r.top}Z`:'')})
let frame=0,observer:ResizeObserver|undefined,disposed=false,locateVersion=0
function find(target=highlightTarget.value||automaticTarget.value){return document.querySelector<HTMLElement>(`[data-guide="${target}"]`)}
function measure(){
 if(disposed)return
 viewport.value={width:innerWidth,height:innerHeight}
 const node=find();measured.value=true
 if(!node||!node.getClientRects().length){rect.value=null;return}
 const clips:GuideClip[]=[]
 for(let parent=node.parentElement;parent&&parent!==document.body;parent=parent.parentElement){
  const style=getComputedStyle(parent),r=parent.getBoundingClientRect(),clip:GuideClip={}
  if(/hidden|clip|scroll|auto/.test(style.overflowX)){clip.left=r.left;clip.right=r.right}
  if(/hidden|clip|scroll|auto/.test(style.overflowY)){clip.top=r.top;clip.bottom=r.bottom}
  if(Object.keys(clip).length)clips.push(clip)
 }
 const r=node.getBoundingClientRect(),next=visibleGuideRect(r,viewport.value,clips)
 if(JSON.stringify(rect.value)!==JSON.stringify(next))rect.value=next
}
function observeTarget(){observer?.disconnect();observer?.observe(document.body);const node=find();if(node)observer?.observe(node);if(bubble.value)observer?.observe(bubble.value)}
function schedule(){if(frame||disposed)return;frame=requestAnimationFrame(()=>{frame=0;measure()})}
async function locate(target=automaticTarget.value){
 const version=++locateVersion;highlightTarget.value=target
 await nextTick();if(disposed||version!==locateVersion)return
 let node=find(target);if(!node)return
 if(document.fullscreenElement&&!document.fullscreenElement.contains(node)){try{await document.exitFullscreen()}catch{/* The browser may already be leaving fullscreen. */}}
 if(target==='scene-navigation'||target==='scene'){
  node.dispatchEvent(new CustomEvent('scene-guide',{bubbles:true,detail:target==='scene-navigation'?'open-tree':'locate-experiment'}));await nextTick();node=find(target);if(!node)return
 }
 for(let p:HTMLElement|null=node;p;p=p.parentElement)if(p instanceof HTMLDetailsElement)p.open=true
 node.querySelectorAll<HTMLDetailsElement>('details[data-guide-expand]').forEach(panel=>panel.open=true)
 node.scrollIntoView({block:node.getBoundingClientRect().height>innerHeight*.7?'start':'center',behavior:'instant'})
 measure();await nextTick();if(disposed||version!==locateVersion)return
 const targetRect=node.getBoundingClientRect(),bubbleRect=bubble.value?.getBoundingClientRect()
 if(bubbleRect&&targetRect.left<bubbleRect.right&&targetRect.right>bubbleRect.left&&targetRect.bottom>bubbleRect.top&&targetRect.top<bubbleRect.bottom){
  const desiredTop=Math.max(16,(bubbleRect.top-24-targetRect.height)/2)
  window.scrollBy({top:targetRect.top-desiredTop,behavior:'instant'})
 }
 const focus=node.matches('button,input,select,textarea,summary,a')?node:node.querySelector<HTMLElement>('[data-guide-focus]')??Array.from(node.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,a')).find(el=>el.getClientRects().length&&!(el as HTMLButtonElement).disabled&&!el.classList.contains('directory-close'))
 focus?.focus({preventScroll:true});observeTarget();schedule()
}
function fullChanged(){portalTarget.value=document.fullscreenElement as HTMLElement??'body';nextTick(()=>{observeTarget();schedule()})}
function escape(e:KeyboardEvent){if(e.key==='Escape'){e.preventDefault();emit('exit')}}
watch(()=>guide.step,()=>locate(),{flush:'post'})
watch(automaticTarget,(next,previous)=>{if(previous==='scene'&&next==='observation-entry'){locate();return}highlightTarget.value=next;nextTick(()=>{observeTarget();schedule()})},{flush:'post'})
onMounted(()=>{observer=new ResizeObserver(schedule);fullChanged();locate();document.addEventListener('scroll',schedule,true);window.addEventListener('scroll',schedule,true);window.addEventListener('wheel',schedule,{passive:true,capture:true});window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);document.addEventListener('fullscreenchange',fullChanged);document.addEventListener('keydown',escape)})
onBeforeUnmount(()=>{disposed=true;locateVersion++;cancelAnimationFrame(frame);observer?.disconnect();document.removeEventListener('scroll',schedule,true);window.removeEventListener('scroll',schedule,true);window.removeEventListener('wheel',schedule,true);window.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);document.removeEventListener('fullscreenchange',fullChanged);document.removeEventListener('keydown',escape)})
</script>
<template><Teleport :to="portalTarget"><div v-if="portalTarget==='body'" class="guide-scroll-reserve" aria-hidden="true"></div><svg class="guide-mask" aria-hidden="true" :viewBox="`0 0 ${viewport.width} ${viewport.height}`" preserveAspectRatio="none"><path :d="maskPath" fill-rule="evenodd"/></svg><div v-if="rect" class="guide-spotlight" :style="{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'}" aria-hidden="true"></div><section ref="bubble" class="guide-bubble guide-action-bubble" :class="{'on-right':right}" role="region" aria-label="操作引导步骤"><div class="guide-top"><span>独立演练 · {{ guide.step+1 }}/{{ guideSteps.length }}</span><button aria-label="退出操作引导" @click="emit('exit')">×</button></div><h2>{{ guide.current.title }}</h2><div class="guide-body"><p>{{ guide.current.text }}</p><p class="guide-condition" role="status">{{ status }}</p><p v-if="measured&&!rect" class="guide-offscreen" role="status">当前操作已滚出可视区。点击下方“定位当前操作”即可回到高亮位置，已完成的操作会保留。</p><ol class="guide-checklist" aria-label="本步骤操作清单"><li v-for="(task,i) in tasks" :key="i" :class="{done:task.done}"><span class="guide-check-symbol" aria-hidden="true">{{ task.done?'✓':i+1 }}</span><span>{{ task.label }}</span><button v-if="!task.done" class="core-link" :aria-label="'定位：'+task.label" @click="locate(task.target)">定位</button></li></ol></div><div class="guide-buttons"><button class="btn" :disabled="guide.step===0" @click="guide.back(session)">上一步</button><button v-if="guide.step<guideSteps.length-1" class="btn primary" :disabled="!allowed" @click="guide.next(session)">下一步</button><button v-else class="btn primary" :disabled="!guide.completed" @click="emit('exit')">完成并返回正式实验</button><button class="core-link" @click="locate()">定位当前操作</button><button class="core-link" @click="emit('restart')">重新演练</button></div><p class="guide-small">Esc可退出。演练不会修改正式实验记录。</p></section></Teleport></template>
