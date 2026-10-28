<script setup lang="ts">
import { computed,watch } from 'vue'
import { useFullCourse } from '../fullCourseStore'
import { equipmentIds,type Equipment } from '../domain'
import { nodeById } from '../sceneGraph'
import { sceneBasis } from '../fullCourseDomain'
import { fullModelPresentation } from '../fullScenePresentation'
import { fullSceneAdapter } from '../fullSceneAdapter'
import SceneWorkbench from './SceneWorkbench.vue'
const emit=defineEmits<{ 'edit-object':[id:Equipment] }>()
const course=useFullCourse(),adapter=fullSceneAdapter(course)
const selected=computed(()=>nodeById(course.previewLayout,course.sceneView.selectedId))
const presentation=computed(()=>selected.value?.assetId?fullModelPresentation(course.saved.config,course.saved.page==='task'?course.saved.step:0,selected.value.assetId):null)
const clicked=(id:Equipment)=>course.saved.page==='task'&&[6,7].includes(course.saved.step)&&course.saved.clicks.some(p=>p.step===course.saved.step&&p.model===id&&p.basis===sceneBasis(course.saved.config,course.saved.step as 6|7))
watch(()=>[course.saved.page,course.saved.step],()=>{if(course.saved.page==='task')course.locate(selected.value?.assetId??'pump')},{immediate:true})
</script>
<template><section class="full-course-scene" aria-label="完整课程三维对象工作区">
 <SceneWorkbench :adapter="adapter"/>
 <div v-if="!course.layoutValid" class="core-warning">层级草稿无效，画面暂用初始示意布局；请按校验反馈修复后核对实体。</div>
 <div class="full-scene-inspector" :class="{invalid:presentation?.invalid}"><div><strong>{{ selected?.name??'选择一个场景对象' }}</strong><span v-if="presentation">{{ presentation.status }}</span><p v-if="selected" class="core-small">{{ course.path(selected.id) }}</p></div><template v-if="selected?.assetId"><p>{{ presentation?.title }}<br>{{ presentation?.detail }}</p><p class="core-small">模型ID {{ selected.id }} · 局部位置 {{ course.saved.config.positions[selected.assetId].join(' / ') }} m</p><button v-if="adapter.canEdit" class="btn" @click="emit('edit-object',selected.assetId)">编辑此对象的当前配置 →</button></template><p v-else class="core-small">通过窗口内的层级树、模型信息、显隐、隔离和定位工具探索工厂。</p></div>
 <p v-if="course.saved.page==='task'&&[6,7].includes(course.saved.step)" class="full-scene-evidence">当前配置实体核对：<span v-for="id in equipmentIds" :key="id">{{ course.saved.config.assets.find(a=>a.id===id)?.name }} {{ clicked(id)?'✓ 已点选':'待点选' }}　</span></p>
 <p class="full-scene-boundary">与试课共用三维窗口功能框架。当前阶段验证对象、空间及关联；时序仿真按后续课程模块接入。浏览与定位不计完成。</p>
</section></template>
