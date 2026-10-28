import type { Equipment } from './domain'
import { expectedPoints,inspectConfig,type FullConfig } from './fullCourseDomain'
export function fullModelPresentation(c:FullConfig,step:number,id:Equipment){
 const model=c.layout.nodes.find(n=>n.assetId===id)!,asset=c.assets.find(a=>a.id===id)!,mapping=c.mappings[id]
 const bound=c.assets.find(a=>a.id===mapping.assetId),point=bound?c.dictionary[bound.id]:c.dictionary[id]
 const invalidCode=!/^[A-Za-z][A-Za-z0-9_-]{1,23}$/.test(asset.code)||c.assets.some(a=>a.id!==id&&a.code.toUpperCase()===asset.code.toUpperCase())
 const invalidPoint=inspectConfig(5,c).some(f=>f.message.startsWith(expectedPoints[id].name))
 const invalidPosition=c.positions[id].some((v,i)=>typeof v!=='number'||!Number.isFinite(v)||v<(i===1?0:-3)||v>(i===1?2:3))
 const invalidMapping=mapping.assetId!==id||mapping.field!==expectedPoints[id].field||mapping.sourceId!==`teaching-${id}`
 const invalid=step===4?invalidCode:step===5?invalidPoint:step===6?invalidPosition:step===7?invalidMapping:false
 return {
  title:bound?`${model.name} → ${bound.code}`:`${model.name} · 台账 ${asset.code}`,
  detail:bound?`${mapping.field||'未选字段'} / ${point.unit} · ${mapping.sourceId||'未选源'}`:`${point.field} / ${point.unit} · 待绑定`,
  invalid,
  status:invalid?'配置需修复':bound?'已关联 · 源元数据':'台账预览 · 未绑定'
 }
}
