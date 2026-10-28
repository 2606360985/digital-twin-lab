import * as THREE from 'three'
import { childrenOf,nodeById,worldPosition,type SceneLayout,type SceneNode } from './sceneGraph'
import type { Equipment } from './domain'
export interface SceneLabel { nodeId:string; canvas:HTMLCanvasElement; texture:THREE.CanvasTexture; sprite:THREE.Sprite }
export interface BuiltScene { root:THREE.Group; groups:Map<string,THREE.Group>; labels:SceneLabel[] }
function material(color:string,metalness=.25){return new THREE.MeshStandardMaterial({color,metalness,roughness:.55})}
function mesh(geometry:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,mat.clone());m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function box(parent:THREE.Object3D,w:number,h:number,d:number,color:string,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),material(color),parent,x,y,z)}
function cylinder(parent:THREE.Object3D,r:number,h:number,mat:THREE.Material,x=0,y=0,z=0,horizontal=false){const m=mesh(new THREE.CylinderGeometry(r,r,h,28),mat,parent,x,y,z);if(horizontal)m.rotation.z=Math.PI/2;return m}
function line(parent:THREE.Object3D,points:THREE.Vector3[],color='#82aaa2'){const g=new THREE.BufferGeometry().setFromPoints(points);parent.add(new THREE.Line(g,new THREE.LineBasicMaterial({color})))}
function makeLabel(node:SceneNode,parent:THREE.Group,labels:SceneLabel[],y:number,width:number){
 if(typeof document==='undefined')return
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=144
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,toneMapped:false}));sprite.position.set(0,y,0);sprite.scale.set(width,width*144/640,1);sprite.userData.nodeId=node.id;parent.add(sprite);labels.push({nodeId:node.id,canvas,texture,sprite})
}
function building(parent:THREE.Group,color:string){
 box(parent,12,.25,10,'#cfdbd6',0,.1);box(parent,10,4.8,8,color,0,2.6);box(parent,10.8,.35,8.8,'#51786e',0,5.1)
 box(parent,2.2,2.6,.08,'#45675d',0,1.6,4.05)
 for(const x of [-3.7,3.7]){box(parent,1.7,1.2,.1,'#b4d7d3',x,3.4,4.05);box(parent,.1,1.3,.13,'#77928b',x,3.4,4.1)}
 for(let x=-4;x<=4;x+=2)box(parent,.5,.12,.5,'#b6c7c0',x,5.37)
}
function decoration(parent:THREE.Group,resource:string,detail=false){
 const steel=material('#dae4df',.5),dark=material('#658078'),teal=material('#6aa69b')
 if(resource.includes('preprocess')){
  for(const x of [-4,0]){cylinder(parent,1.1,4,steel,x,2.1,-3);cylinder(parent,1.16,.2,teal,x,3.9,-3)}
  box(parent,7,.3,1.3,'#5b8175',2,.9,1);for(const x of [-.8,1.8,4.2])box(parent,.2,.8,1,'#81958b',x,.4,1)
 }else if(resource.includes('pyrolysis')){
  for(const x of [-3,1.5]){cylinder(parent,1.05,3.8,steel,x,2,-2);cylinder(parent,1.08,.22,teal,x,2.6,-2)}
  box(parent,7,.3,1.2,'#d6ae68',0,2.3,1);for(const x of [-3,3])box(parent,.2,2.4,.3,'#72867a',x,1.2,1)
 }else if(resource.includes('utilities')){
  for(const x of [-4,0,4]){cylinder(parent,1.3,3.5,steel,x,1.9,-1);cylinder(parent,1.35,.15,teal,x,3.7,-1)}
  box(parent,9,.2,.45,'#d9ae66',0,1.2,2.3)
 }else if(detail){box(parent,14,.1,1,'#c2d4ca',0,.15,-5);for(let i=0;i<7;i++)box(parent,.2,.15,.9,'#7caa97',i*2-6,.24,-5)}
 void dark
}
function makeEquipment(node:SceneNode,layout:SceneLayout):THREE.Group {
 const g=new THREE.Group();g.userData.nodeId=node.id;g.position.set(...worldPosition(layout,node.id));const id=node.assetId!
 const white=material('#f7fafa',.5),dark=material('#426369',.6),teal=material('#4faaa6',.5),steel=material('#b9cccd',.65),yellow=material('#e9b557',.2)
 box(g,3.6,.2,3.8,'#cddddd')
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

 return g
}
export function buildFactoryScene(layout:SceneLayout,levelId:string,positions?:Partial<Record<Equipment,[number,number,number]>>):BuiltScene {
 const root=new THREE.Group(),groups=new Map<string,THREE.Group>(),labels:SceneLabel[]=[]
 let scope=nodeById(layout,levelId)??layout.nodes[0]!
 if(scope.kind==='equipment')scope=nodeById(layout,scope.parentId!)!
 const add=(node:SceneNode)=>{const g=new THREE.Group();g.userData.nodeId=node.id;g.position.set(...worldPosition(layout,node.id));root.add(g);groups.set(node.id,g);return g}
 if(scope.kind==='workshop'){
  const room=add(scope);box(room,21,.15,17,'#e1eae4',0,-.15,2);box(room,21,.5,.25,'#b3c9ba',0,.1,-6.5);for(const x of [-10,10]){box(room,.25,.5,17,'#c4d7ca',x,.1,2);box(room,.2,4.5,.2,'#adbdaf',x,2.1,-6.5)}
  for(let x=-10;x<=10;x+=2)line(room,[new THREE.Vector3(x,-.06,-6),new THREE.Vector3(x,-.06,10)],'#cfddd3')
  for(let z=-6;z<=10;z+=2)line(room,[new THREE.Vector3(-10,-.06,z),new THREE.Vector3(10,-.06,z)],'#cfddd3')
  decoration(room,scope.modelRef,true)
  const equipment=childrenOf(layout,scope.id).filter(n=>n.kind==='equipment')
  for(const node of equipment){const g=makeEquipment(node,layout);const offset=positions?.[node.assetId!];if(offset)g.position.add(new THREE.Vector3(...offset));root.add(g);groups.set(node.id,g);makeLabel(node,g,labels,node.assetId==='tank'?4.4:3.4,3.8)}
  if(!equipment.length)makeLabel(scope,room,labels,5.3,10)
 }else{
  if(scope.kind==='factory'){
   const base=add(scope);box(base,128,.25,69,'#e6ede6',0,-.35,1);box(base,128,.03,6,'#c4cec7',0,-.19,24);box(base,5,.03,61,'#c4cec7',-19,-.18,0);box(base,5,.03,61,'#c4cec7',19,-.18,0)
   for(let x=-60;x<=60;x+=8)box(base,2,.035,.12,'#f2f5e9',x,-.16,24)
   for(let x=-62;x<=62;x+=4){box(base,.15,1.2,.15,'#9db6a2',x,.2,-30);box(base,.15,1.2,.15,'#9db6a2',x,.2,32)}
   box(base,15,1.4,1.5,'#95b9a2',0,.3,32)
  }
  const areas=scope.kind==='factory'?childrenOf(layout,'factory'):[scope]
  for(const area of areas){
   const a=add(area),color=area.id==='area-preprocess'?'#dbe9df':area.id==='area-pyrolysis'?'#e7e5d4':'#dbe7e9'
   box(a,33,.2,42,color,0,-.13,0);box(a,32,.04,.25,'#a7c2ac',0,.02,-20)
   makeLabel(area,a,labels,2.4,14);labels.at(-1)?.sprite.position.set(0,2.4,-16)
   for(const workshop of childrenOf(layout,area.id)){
    const g=add(workshop);building(g,workshop.modelRef.includes('monitoring')?'#f4f8f0':'#dae4df');
    decoration(g,workshop.modelRef);if(scope.kind!=='factory')makeLabel(workshop,g,labels,7,12)
   }
  }
 }
 return {root,groups,labels}
}
export function disposeSceneGraph(root:THREE.Object3D){
 const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>()
 root.traverse(obj=>{if(obj instanceof THREE.Mesh||obj instanceof THREE.Line){geometries.add(obj.geometry);const list=Array.isArray(obj.material)?obj.material:[obj.material];list.forEach(m=>materials.add(m))}else if(obj instanceof THREE.Sprite)materials.add(obj.material)})
 materials.forEach(m=>{const map=(m as THREE.MeshBasicMaterial).map;if(map)textures.add(map)});textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());root.clear();return {geometries:geometries.size,materials:materials.size,textures:textures.size}
}
