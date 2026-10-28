<script setup lang="ts">
import { onMounted,onBeforeUnmount,ref,watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useLabSession } from '../session'
import { buildFactoryScene,disposeSceneGraph,type BuiltScene } from '../sceneModels'
import { nodeById,nodePath,nodeVisible } from '../sceneGraph'
import { coreSceneAdapter,type SceneAdapter } from '../sceneAdapter'
const props=defineProps<{hero?:boolean;adapter?:SceneAdapter}>(),lab=props.adapter??coreSceneAdapter(useLabSession()),host=ref<HTMLDivElement>(),error=ref('')
let renderer:THREE.WebGLRenderer|undefined,scene:THREE.Scene,camera:THREE.PerspectiveCamera,controls:OrbitControls,observer:ResizeObserver,frame=0,built:BuiltScene|undefined
let down={x:0,y:0},alive=false
function scope(){return props.hero?'factory':lab.sceneView.levelId}
function fit(id?:string){
 if(!built||!renderer||!host.value)return
 built.root.updateMatrixWorld(true)
 const chosen=id?built.groups.get(id):null,box=new THREE.Box3()
 const include=(group:THREE.Group)=>group.traverse(object=>{if(object instanceof THREE.Mesh&&visibleAncestors(object))box.union(new THREE.Box3().setFromObject(object))})
 const devices=[...built.groups].filter(([key,group])=>group.visible&&nodeById(lab.sceneLayout,key)?.kind==='equipment')
 if(chosen?.visible&&nodeById(lab.sceneLayout,id!)?.kind==='equipment')include(chosen)
 else if(nodeById(lab.sceneLayout,scope())?.kind==='workshop'&&devices.length)devices.forEach(([,group])=>include(group))
 else if(chosen?.visible)include(chosen)
 else for(const group of built.groups.values())if(group.visible)include(group)
 if(devices.length&&nodeById(lab.sceneLayout,scope())?.kind==='workshop')box.max.y+=1.5
 if(box.isEmpty())box.setFromCenterAndSize(new THREE.Vector3(),new THREE.Vector3(12,6,12))
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),aspect=Math.max(.25,host.value.clientWidth/Math.max(1,host.value.clientHeight))
 const distance=Math.max(7,Math.max(size.y,size.x/aspect,size.z*.7)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))*1.5)
 camera.aspect=aspect;camera.far=Math.max(600,distance*10);camera.position.copy(center).add(new THREE.Vector3(1,1.1,1.25).normalize().multiplyScalar(distance));camera.updateProjectionMatrix();controls.target.copy(center);controls.minDistance=2;controls.maxDistance=Math.max(200,distance*4);controls.update()
}
function paint(){
 if(!built)return
 for(const [id,g]of built.groups){const node=nodeById(lab.sceneLayout,id)!;g.visible=props.hero||nodeVisible(lab.sceneLayout,id,lab.sceneView)
  const models=lab.sceneLayout.nodes.filter(n=>n.assetId&&nodePath(lab.sceneLayout,n.id).some(p=>p.id===id))
  const active=!props.hero&&models.some(n=>lab.modelActive(n.assetId!)),invalid=!props.hero&&models.some(n=>lab.modelPresentation?.(n.assetId!).invalid),selected=!props.hero&&lab.sceneView.selectedId===id
  g.traverse(obj=>{if(obj instanceof THREE.Mesh){const list=Array.isArray(obj.material)?obj.material:[obj.material];for(const m of list)if(m instanceof THREE.MeshStandardMaterial){m.emissive.set(invalid?'#d27624':active?'#c45e35':selected?'#246d4d':'#000000');m.emissiveIntensity=invalid ? .4 : active ? .28 : selected ? .15 : 0;if(obj.name==='signal')m.color.set(invalid||active?'#e3834d':'#24b6a5')}}})
  void node
 }
 for(const label of built.labels){const node=nodeById(lab.sceneLayout,label.nodeId)!;const ctx=label.canvas.getContext('2d')!;ctx.clearRect(0,0,640,144);ctx.fillStyle='#fffffff0';ctx.beginPath();ctx.roundRect(5,5,630,128,14);ctx.fill();ctx.strokeStyle=lab.sceneView.selectedId===node.id&&!props.hero?'#16856e':'#c3d5ca';ctx.lineWidth=3;ctx.stroke()
  let title=node.name,detail=node.kind==='area'?'教学区域 · 双击进入':'教学车间 · 双击进入'
  if(node.assetId){const info=lab.modelInfo(node.assetId);title=`${node.name} → ${info.asset?.code??'未绑定'}`;detail=info.asset?`${info.asset.name} · ${info.reading?info.reading.value.toFixed(2)+' '+info.reading.unit+(info.reading.valid?'':' · 无效'):'等待数据'}`:'尚未绑定资产 · 无数据'}
  else if(node.kind==='workshop'){const count=lab.sceneLayout.nodes.filter(n=>n.parentId===node.id&&n.assetId).length;detail=count?`${count}个实验设备模型 · 双击进入`:'示意模型 · 相关实验待建设'}
  const presentation=node.assetId?lab.modelPresentation?.(node.assetId):undefined
  if(presentation){title=presentation.title;detail=presentation.detail;if(presentation.invalid){ctx.strokeStyle='#c38442';ctx.stroke()}}
  const text=(value:string,y:number,bold=false)=>{let size=bold?44:36;ctx.font=`${bold?'bold ':''}${size}px Microsoft YaHei,sans-serif`;while(size>22&&ctx.measureText(value).width>595){size--;ctx.font=`${bold?'bold ':''}${size}px Microsoft YaHei,sans-serif`};ctx.fillStyle=bold?'#254f41':'#658471';ctx.fillText(value,22,y,595)}
  text(title,51,true);text(detail,101);label.texture.needsUpdate=true
 }
}
function rebuild(){if(!scene||!alive)return;if(built){scene.remove(built.root);disposeSceneGraph(built.root)}built=buildFactoryScene(lab.sceneLayout,scope(),lab.positions);scene.add(built.root);paint();fit();if(!props.hero)lab.sceneReady=true}
function pick(event:MouseEvent|PointerEvent){if(!renderer||!built)return null;const rect=renderer.domElement.getBoundingClientRect(),point=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(point,camera);const hit=ray.intersectObjects(built.root.children,true).find(h=>h.object instanceof THREE.Mesh&&h.object.visible&&visibleAncestors(h.object));let obj:THREE.Object3D|null=hit?.object??null;while(obj&&!obj.userData.nodeId)obj=obj.parent;return obj?.userData.nodeId as string|undefined}
function visibleAncestors(obj:THREE.Object3D){for(let p:THREE.Object3D|null=obj;p;p=p.parent)if(!p.visible)return false;return true}
function onDown(e:PointerEvent){down={x:e.clientX,y:e.clientY}}
function onUp(e:PointerEvent){if(props.hero||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const id=pick(e);if(id)lab.selectSceneNode(id,'canvas')}
function onDouble(e:MouseEvent){if(props.hero)return;const id=pick(e),n=id?nodeById(lab.sceneLayout,id):null;if(n&&(n.kind==='area'||n.kind==='workshop'))lab.enterSceneNode(n.id)}
onMounted(()=>{
 try{scene=new THREE.Scene();scene.background=new THREE.Color('#edf3ef');camera=new THREE.PerspectiveCamera(36,1,.1,1000);renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;host.value!.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','可旋转和点击的工厂三维场景')
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2.05;scene.add(new THREE.HemisphereLight('#f2fff5','#a4b7a4',1.4));const sun=new THREE.DirectionalLight('#fff9e8',2.5);sun.position.set(25,55,35);sun.castShadow=true;sun.shadow.bias=-.001;sun.shadow.normalBias=.08;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,far:200});scene.add(sun)
  alive=true;rebuild();renderer.domElement.addEventListener('pointerdown',onDown);renderer.domElement.addEventListener('pointerup',onUp);renderer.domElement.addEventListener('dblclick',onDouble)
  observer=new ResizeObserver(()=>{if(!renderer||!host.value)return;const {width,height}=host.value.getBoundingClientRect();renderer.setSize(Math.max(1,width),Math.max(1,height));camera.aspect=width/Math.max(1,height);camera.updateProjectionMatrix();fit(lab.sceneView.focusId)});observer.observe(host.value!)
  const render=()=>{if(!alive||!renderer)return;frame=requestAnimationFrame(render);controls.update();for(const label of built?.labels??[]){const world=new THREE.Vector3();label.sprite.getWorldPosition(world);const pixels=Math.min(180,(host.value?.clientWidth??640)*.25);const width=2*camera.position.distanceTo(world)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*pixels/Math.max(1,host.value?.clientHeight??1);label.sprite.scale.set(width,width*144/640,1)}renderer.render(scene,camera)};render()
 }catch(cause){error.value='当前浏览器无法创建WebGL三维场景，三维相关任务暂不能通过。请检查浏览器硬件加速。';if(!props.hero)lab.sceneReady=false;console.warn(cause)}
})
watch(()=>[lab.sceneLayout,lab.positions,scope()],rebuild,{deep:true})
watch(()=>[lab.paintKey,lab.sceneView.selectedId,lab.sceneView.hidden,lab.sceneView.isolatedId],paint,{deep:true})
watch(()=>lab.sceneView.focusNonce,()=>{if(!props.hero)fit(lab.sceneView.focusId)})
onBeforeUnmount(()=>{alive=false;cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();if(renderer){renderer.domElement.removeEventListener('pointerdown',onDown);renderer.domElement.removeEventListener('pointerup',onUp);renderer.domElement.removeEventListener('dblclick',onDouble)}if(built){scene.remove(built.root);disposeSceneGraph(built.root);built=undefined}renderer?.dispose();renderer?.forceContextLoss();renderer?.domElement.remove();renderer=undefined;if(!props.hero)lab.sceneReady=false})
defineExpose({resetView:()=>fit(),focusSelection:()=>fit(lab.sceneView.selectedId)})
</script>
<template><div class="scene-view factory-renderer" :class="{hero}" :data-scene-level="hero?'factory':lab.sceneView.levelId"><div ref="host" class="factory-render-host"></div><div v-if="error" class="scene-error">{{ error }}</div><span class="factory-model-note">程序化教学示意 · 非企业真实布局</span></div></template>
<style scoped>.factory-renderer{position:relative;overflow:hidden;min-width:0;min-height:0}.factory-renderer:not(.hero){height:100%!important;width:100%}.factory-render-host{position:absolute;inset:0}.factory-render-host :deep(canvas){display:block;width:100%;height:100%;touch-action:none}.factory-model-note{position:absolute;left:8px;bottom:5px;font-size:9px;color:#88a191;pointer-events:none}</style>
