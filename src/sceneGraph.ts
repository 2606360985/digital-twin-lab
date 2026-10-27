import type { Equipment } from './domain'
export type SceneKind = 'factory' | 'area' | 'workshop' | 'equipment'
export interface SceneNode { id:string; name:string; kind:SceneKind; parentId:string|null; modelRef:string; assetId?:Equipment }
export interface SceneLayout { version:1; revision:number; nodes:SceneNode[] }
export interface SceneNavigation { levelId:string; selectedId:string; hidden:string[]; isolatedId:string|null; visited:string[]; focusId:string; focusNonce:number }
export const kindLabels:Record<SceneKind,string>={factory:'工厂',area:'区域',workshop:'车间',equipment:'设备模型'}
const definitions:SceneNode[]=[
 {id:'factory',name:'废塑料热解炼油教学工厂',kind:'factory',parentId:null,modelRef:'teaching-factory-v1'},
 {id:'area-preprocess',name:'原料预处理区',kind:'area',parentId:'factory',modelRef:'preprocess-area-v1'},
 {id:'area-pyrolysis',name:'热解与冷凝区',kind:'area',parentId:'factory',modelRef:'pyrolysis-area-v1'},
 {id:'area-utilities',name:'储运及公用工程区',kind:'area',parentId:'factory',modelRef:'utilities-area-v1'},
 {id:'workshop-preprocess',name:'原料预处理车间',kind:'workshop',parentId:'area-preprocess',modelRef:'preprocess-workshop-v1'},
 {id:'workshop-pyrolysis',name:'热解工艺示意车间',kind:'workshop',parentId:'area-pyrolysis',modelRef:'pyrolysis-workshop-v1'},
 {id:'workshop-monitoring',name:'设备监测教学车间',kind:'workshop',parentId:'area-pyrolysis',modelRef:'monitoring-workshop-v1'},
 {id:'workshop-utilities',name:'储运与公用工程车间',kind:'workshop',parentId:'area-utilities',modelRef:'utilities-workshop-v1'},
 {id:'model-tank',name:'储罐模型',kind:'equipment',parentId:'workshop-monitoring',modelRef:'tank-v1',assetId:'tank'},
 {id:'model-pump',name:'离心泵模型',kind:'equipment',parentId:'workshop-monitoring',modelRef:'pump-v1',assetId:'pump'},
 {id:'model-exchanger',name:'换热器模型',kind:'equipment',parentId:'workshop-monitoring',modelRef:'exchanger-v1',assetId:'exchanger'}
]
export function defaultSceneLayout():SceneLayout{return {version:1,revision:0,nodes:definitions.map(n=>({...n}))}}
export function defaultSceneNavigation():SceneNavigation{return {levelId:'factory',selectedId:'factory',hidden:[],isolatedId:null,visited:[],focusId:'factory',focusNonce:0}}
export function nodeById(layout:SceneLayout,id:string){return layout.nodes.find(n=>n.id===id)}
export function childrenOf(layout:SceneLayout,id:string){return layout.nodes.filter(n=>n.parentId===id)}
export function nodePath(layout:SceneLayout,id:string):SceneNode[]{const path:SceneNode[]=[],seen=new Set<string>();let n=nodeById(layout,id);while(n&&!seen.has(n.id)){seen.add(n.id);path.unshift(n);n=n.parentId?nodeById(layout,n.parentId):undefined}return path}
export function equipmentNode(layout:SceneLayout,id:Equipment){return layout.nodes.find(n=>n.assetId===id)!}
export function parentOptions(layout:SceneLayout,node:SceneNode){const kind=({factory:null,area:'factory',workshop:'area',equipment:'workshop'} as const)[node.kind];return layout.nodes.filter(n=>n.kind===kind)}
export function validateSceneLayout(value:unknown):SceneLayout {
 const s=value as SceneLayout
 if(!s||s.version!==1||!Number.isInteger(s.revision)||s.revision<0||s.revision>1_000_000||!Array.isArray(s.nodes)||s.nodes.length!==definitions.length||new Set(s.nodes.map(n=>n.id)).size!==definitions.length)throw new Error('场景结构或修订号不合法。')
 const nodes=definitions.map(d=>{const n=s.nodes.find(n=>n.id===d.id);if(!n||n.kind!==d.kind||n.modelRef!==d.modelRef||n.assetId!==d.assetId||typeof n.name!=='string'||!n.name.trim()||n.name.trim().length>40)throw new Error('模型稳定ID、类型或资源引用不合法。');return {...d,name:n.name.trim(),parentId:n.parentId}})
 const result:SceneLayout={version:1,revision:s.revision,nodes}
 for(const n of nodes){if(n.kind==='factory'){if(n.parentId!==null)throw new Error('工厂根节点不能调整归属。')}else if(!parentOptions(result,n).some(p=>p.id===n.parentId))throw new Error('父节点不符合工厂、区域、车间、设备层级。');if(nodePath(result,n.id).length!==({factory:1,area:2,workshop:3,equipment:4})[n.kind])throw new Error('场景层级存在循环或断链。')}
 if(s.revision===0&&JSON.stringify(nodes)!==JSON.stringify(definitions))throw new Error('已编辑场景需要独立修订号。')
 return result
}
export function editedScene(layout:SceneLayout,id:string,name:string,parentId:string|null):SceneLayout {
 const n=nodeById(layout,id);if(!n)throw new Error('模型节点不存在。')
 const nodes=layout.nodes.map(n=>n.id===id?{...n,name:name.trim(),parentId}:({...n}))
 if(JSON.stringify(nodes)===JSON.stringify(layout.nodes))return layout
 return validateSceneLayout({version:1,revision:layout.revision+1,nodes})
}
export function nodeVisible(layout:SceneLayout,id:string,view:SceneNavigation):boolean {
 const path=nodePath(layout,id).map(n=>n.id)
 if(path.some(p=>view.hidden.includes(p)))return false
 return !view.isolatedId||path.includes(view.isolatedId)||nodePath(layout,view.isolatedId).some(n=>n.id===id)
}
export function worldPosition(layout:SceneLayout,id:string):[number,number,number]{
 const n=nodeById(layout,id);if(!n||n.kind==='factory')return [0,0,0]
 if(n.kind==='area')return [(['area-preprocess','area-pyrolysis','area-utilities'].indexOf(id)-1)*38,0,0]
 const parent=worldPosition(layout,n.parentId!),siblings=childrenOf(layout,n.parentId!).filter(c=>c.kind===n.kind),index=siblings.findIndex(c=>c.id===id)
 if(n.kind==='workshop'){const columns=Math.min(siblings.length,2);return [parent[0]+((index%2)-(columns-1)/2)*15,0,parent[2]+Math.floor(index/2)*16]}
 return [parent[0]+((index%3)-(Math.min(siblings.length,3)-1)/2)*4.4,0,parent[2]+(n.parentId==='workshop-monitoring'?0:3)+Math.floor(index/3)*5]
}

export function sceneOutline(layout:SceneLayout):SceneNode[]{const result:SceneNode[]=[];const visit=(id:string)=>{const node=nodeById(layout,id);if(!node)return;result.push(node);childrenOf(layout,id).forEach(child=>visit(child.id))};visit('factory');return result}
