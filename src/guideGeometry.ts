export interface GuideRect { left:number; top:number; width:number; height:number }
export interface GuideClip { left?:number; right?:number; top?:number; bottom?:number }

/** Visible intersection, including nested scrolling containers. Offscreen targets have no hole. */
export function visibleGuideRect(target:GuideRect,viewport:{width:number;height:number},clips:GuideClip[]=[]):GuideRect|null {
  let left=Math.max(6,target.left-4),top=Math.max(6,target.top-4)
  let right=Math.min(viewport.width-6,target.left+target.width+4),bottom=Math.min(viewport.height-6,target.top+target.height+4)
  for(const clip of clips){left=Math.max(left,clip.left??-Infinity);right=Math.min(right,clip.right??Infinity);top=Math.max(top,clip.top??-Infinity);bottom=Math.min(bottom,clip.bottom??Infinity)}
  return right>left&&bottom>top?{left,top,width:right-left,height:bottom-top}:null
}
