// Register with the server response lifecycle; never await analytics in /go.
export function scheduleClick(after,writeEvent,writeHealth,snapshot){
 const recordFailure=async()=>{try{await writeHealth('analytics','统计写入失败，跳转仍正常；需要核对缺失点击');}catch{console.error('Click analytics health record unavailable');}};
 try{after(async()=>{try{await writeEvent(snapshot);}catch{await recordFailure();}});}
 catch{console.error('Click analytics task registration failed');}
}
