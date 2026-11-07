// Changes are distributed over preparation progress/time, never emitted by Serve.
export function noticeDue({eventIndex,eventCount,serviceMs,budgetMs,lastNoticeMs=0,actions=0,lastNoticeActions=0,preparedFillings=0,targetFillings=1}){
 if(eventIndex>=eventCount||eventCount<1)return false;
 if(serviceMs-lastNoticeMs<(eventIndex===0?1200:2000))return false;
 const threshold=(eventIndex+1)/(eventCount+1);
 const progress=preparedFillings/Math.max(1,targetFillings);
 const timed=serviceMs/Math.max(1,budgetMs)>=threshold*.85;
 return timed||(actions>lastNoticeActions&&progress>=threshold);
}
