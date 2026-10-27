<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useLabSession } from '../session'
import type { Equipment } from '../domain'
import { RotateCcw, Move, MousePointer2, Expand } from 'lucide-vue-next'
const props = defineProps<{ hero?: boolean }>()
const lab = useLabSession(); const host = ref<HTMLDivElement>(); const error = ref('')
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, controls: OrbitControls, observer: ResizeObserver, frame = 0
const groups = new Map<Equipment, THREE.Group>(), rings = new Map<Equipment, THREE.Mesh>(), labels = new Map<Equipment, { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture; sprite: THREE.Sprite }>()
const positions = { tank: -4.4, pump: 0, exchanger: 4.4 }
function material(color: string, metalness = .25) { return new THREE.MeshStandardMaterial({ color, metalness, roughness: .48 }) }
function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geometry, mat.clone()); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m }
function cylinder(parent: THREE.Object3D, r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0, horizontal = false) { const m = mesh(new THREE.CylinderGeometry(r, r, h, 40), mat, parent, x, y, z); if (horizontal) m.rotation.z = Math.PI / 2; return m }
function pipe(points: number[][], color: string, radius = .09) { const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])), false, 'catmullrom', .15); mesh(new THREE.TubeGeometry(curve, 60, radius, 10, false), material(color, .5), scene) }
function resetView() { if (!controls) return; camera.position.set(12, 9, 13); controls.target.set(0, .7, 0); controls.update() }
function focus(id: Equipment) { if (!controls || props.hero) return; controls.target.set(positions[id] * .55, 1, 0); controls.update() }
function updateLabels() {
  if (!renderer) return
  for (const [id, item] of labels) {
    const ctx = item.canvas.getContext('2d')!; ctx.clearRect(0, 0, 480, 130)
    ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.beginPath(); ctx.roundRect(8, 8, 464, 108, 18); ctx.fill();
    ctx.strokeStyle = lab.sceneSelected === id && !props.hero ? '#0d918a' : '#d4e2e1'; ctx.lineWidth = 3; ctx.stroke()
    const model = lab.saved.config.assets.find(a => a.id === id)!; const info = lab.modelInfo(id); const asset = info.asset; const bound = lab.saved.config.bindings[id]
    const value = info.reading
    ctx.font = 'bold 25px "Microsoft YaHei", sans-serif'; ctx.fillStyle = '#203b43'; ctx.fillText(`${model.name}模型 → ${asset?.code ?? '未绑定'}`, 30, 48)
    ctx.font = '22px "Microsoft YaHei", sans-serif'; ctx.fillStyle = value?.valid || props.hero ? '#527177' : '#a47931'
    ctx.fillText(props.hero ? '数字对象 · 教学模型' : bound ? `${asset?.name ?? ''} ${value ? value.value.toFixed(2) + ' ' + value.unit + (value.valid ? '' : ' 无效') : '等待数据'}` : '尚未绑定资产 · 无数据', 30, 88)
    item.texture.needsUpdate = true
    groups.get(id)!.traverse(obj => { if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) obj.material.emissive.set(lab.modelActive(id) ? '#602010' : '#000000') }); rings.get(id)!.visible = !props.hero && lab.sceneSelected === id
    if (id === 'pump') {
      const signal = groups.get(id)!.getObjectByName('signal') as THREE.Mesh
      const mat = signal.material as THREE.MeshStandardMaterial
      mat.color.set(lab.modelActive(id) ? '#e2714f' : '#24b6a5'); mat.emissive.copy(mat.color).multiplyScalar(.2)
    }
  }
}
let down = { x: 0, y: 0 }
function onDown(e: PointerEvent) { down = { x: e.clientX, y: e.clientY } }
function onClick(e: PointerEvent) {
  if (props.hero || Math.hypot(down.x - e.clientX, down.y - e.clientY) > 5) return
  const rect = renderer.domElement.getBoundingClientRect(); const pointer = new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1)
  const ray = new THREE.Raycaster(); ray.setFromCamera(pointer, camera)
  const hit = ray.intersectObjects([...groups.values()], true).find(h => h.object.type === 'Mesh')
  if (hit) { let node: THREE.Object3D | null = hit.object; while (node && !node.userData.asset) node = node.parent; if (node?.userData.asset) lab.choose(node.userData.asset, 'scene') }
}
onMounted(() => {
  try {
    scene = new THREE.Scene(); scene.background = new THREE.Color('#edf3f3'); scene.fog = new THREE.Fog('#edf3f3', 28, 65)
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3
    host.value!.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-label', '可旋转和点击的三维教学设备场景')
    camera = new THREE.PerspectiveCamera(36, 1, .1, 100); controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.1; controls.minDistance = 7; controls.maxDistance = 30; resetView()
    scene.add(new THREE.HemisphereLight('#ecffff', '#a4aaa7', 3)); const light = new THREE.DirectionalLight('#fff9ef', 4); light.position.set(4, 12, 5); light.castShadow = true; light.shadow.mapSize.set(2048, 2048); Object.assign(light.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12 }); light.shadow.bias = -.001; scene.add(light)
    const floor = mesh(new THREE.PlaneGeometry(120, 120), material('#e7eeee', 0), scene); floor.rotation.x = -Math.PI / 2; floor.position.y = -.15
    const grid = new THREE.GridHelper(40, 40, '#c6d8d7', '#dce5e4'); grid.position.y = -.14; scene.add(grid)
    const white = material('#f7fafa', .5), dark = material('#426369', .6), teal = material('#4faaa6', .5), steel = material('#b9cccd', .65), yellow = material('#e9b557', .2)
    for (const id of ['tank', 'pump', 'exchanger'] as Equipment[]) {
      const g = new THREE.Group(); g.position.x = positions[id]; g.userData.asset = id; groups.set(id, g); scene.add(g)
      mesh(new THREE.BoxGeometry(3.6, .2, 3.8), material('#cddddd', .1), g, 0, 0, 0)
      const border = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.6, .2, 3.8)); const line = new THREE.LineSegments(border, new THREE.LineBasicMaterial({ color: '#b2c9c7' })); g.add(line)
      const ring = mesh(new THREE.RingGeometry(1.7, 1.76, 64), new THREE.MeshBasicMaterial({ color: '#0d9990', side: THREE.DoubleSide, transparent: true, opacity: .8 }), g, 0, .12, 0); ring.rotation.x = -Math.PI / 2; rings.set(id, ring)
      if (id === 'tank') {
        for (const x of [-.65, .65]) for (const z of [-.65, .65]) cylinder(g, .09, .65, dark, x, .4, z)
        cylinder(g, 1.02, 2.4, white, 0, 1.85); cylinder(g, 1.06, .1, steel, 0, .7); cylinder(g, 1.06, .1, steel, 0, 3.05)
        const lid = mesh(new THREE.SphereGeometry(1.02, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), white, g, 0, 3.05); lid.scale.y = .28
        cylinder(g, .24, .3, steel, 0, 3.45); cylinder(g, 1.026, .22, teal, 0, 1.7)
        mesh(new THREE.BoxGeometry(.15, 1.5, .07), dark, g, .7, 1.95, .76); mesh(new THREE.BoxGeometry(.08, 1, .08), yellow, g, .7, 1.75, .81)
      } else if (id === 'pump') {
        mesh(new THREE.BoxGeometry(2.9, .25, 1.3), dark, g, 0, .28)
        cylinder(g, .5, 1.3, teal, -.55, 1, 0, true)
        for (let x = -1; x < -.1; x += .13) cylinder(g, .54, .045, dark, x, 1, 0, true)
        cylinder(g, .61, .65, white, .6, 1, 0, true); cylinder(g, .2, .55, steel, .65, 1.7); cylinder(g, .19, .5, steel, 1.1, 1, 0, true)
        mesh(new THREE.BoxGeometry(.48, .3, .48), dark, g, -.65, 1.65)
        const signal = cylinder(g, .095, .13, material('#24b6a5'), -.65, 1.88); signal.name = 'signal'
      } else {
        for (const x of [-1, 1]) mesh(new THREE.BoxGeometry(.28, .7, 1), dark, g, x, .5)
        cylinder(g, .65, 2.6, white, 0, 1.3, 0, true)
        for (const x of [-1.35, 1.35]) { cylinder(g, .75, .15, teal, x, 1.3, 0, true); for (let k = 0; k < 8; k++) { const t = k * Math.PI / 4; cylinder(g, .05, .22, dark, x, 1.3 + Math.sin(t) * .64, Math.cos(t) * .64, true) } }
        cylinder(g, .2, .5, steel, -.7, 2.1); cylinder(g, .2, .5, steel, .7, 2.1)
      }
      const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 130; const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false })); sprite.scale.set(3.4, .92, 1); sprite.position.set(0, id === 'tank' ? 4.4 : 3.2, .2); g.add(sprite); labels.set(id, { canvas, texture, sprite })
    }
    pipe([[-3.4, .95, 0], [-2.7, .95, 0], [-2.7, .45, 1.1], [-1.5, .45, 1.1], [-1.5, 1, 0], [-1.2, 1, 0]], '#6baaa5', .13)
    pipe([[.65, 1.95, 0], [.65, 2.4, 0], [2.4, 2.4, 0], [2.4, 1.3, 0], [3, 1.3, 0]], '#e9b557', .12)
    pipe([[5.1, 2.35, 0], [5.1, 2.7, 0], [6.6, 2.7, 0], [6.6, .4, 1.2], [6.6, .4, 3.5]], '#6baaa5', .1)
    renderer.domElement.addEventListener('pointerdown', onDown); renderer.domElement.addEventListener('pointerup', onClick)
    observer = new ResizeObserver(() => { if (!host.value) return; const { width, height } = host.value.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix() }); observer.observe(host.value!)
    updateLabels(); if (!props.hero) lab.sceneReady = true
    function render() { frame = requestAnimationFrame(render); controls.update(); renderer.render(scene, camera) }; render()
  } catch (e) { error.value = '当前浏览器无法创建WebGL三维场景。请启用硬件加速并使用Chrome或Edge；三维相关任务暂不能通过。'; if (!props.hero) lab.sceneReady = false; console.warn(e) }
})
watch(() => [lab.sceneSelected, lab.selected, lab.latest, lab.saved.config.bindings, lab.saved.config.assets, lab.saved.config.point, lab.currentMatches, lab.active?.detector.active], updateLabels, { deep: true })
watch(() => lab.sceneSelected, focus)
onBeforeUnmount(() => {
  cancelAnimationFrame(frame); observer?.disconnect(); controls?.dispose()
  renderer?.domElement.removeEventListener('pointerdown', onDown); renderer?.domElement.removeEventListener('pointerup', onClick)
  scene?.traverse(obj => { if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) { obj.geometry?.dispose(); const mats = Array.isArray(obj.material) ? obj.material : [obj.material]; mats.forEach(m => m.dispose()) } })
  labels.forEach(x => { x.texture.dispose(); (x.sprite.material as THREE.Material).dispose() }); renderer?.dispose(); renderer?.forceContextLoss(); if (!props.hero) lab.sceneReady = false
})
</script>
<template>
  <div class="scene-view" :class="{ hero }">
    <div ref="host" class="scene-canvas"></div>
    <div v-if="error" class="scene-error">{{ error }}</div>
    <div class="scene-corner"><span class="live-dot"></span>{{ hero ? '自主构建的教学场景' : '教学监测区 A' }}<span class="subtle">/ 3 个数字对象</span></div>
    <div class="scene-tools"><button @click="resetView" title="恢复默认视角" aria-label="恢复默认视角"><RotateCcw :size="16" /></button><button @click="host?.parentElement?.requestFullscreen?.()" title="全屏场景" aria-label="全屏场景"><Expand :size="16" /></button></div>
    <div class="scene-help"><span><MousePointer2 :size="12" /> 点击选择</span><span><Move :size="12" /> 拖动旋转 · 滚轮缩放</span></div>
    <span class="scene-tag">THREE.JS · 3D WORKSPACE</span>
  </div>
</template>

