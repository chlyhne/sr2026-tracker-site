const HANDICAP_TRACKS_KEY='sr2026-handicap-compensated-tracks',GHOST_FINISH_HOLD=300;
const ghostClocks=new Map();
let handicapTracksEnabled=false,handicapPreferenceError='';
// Prepare every boat before interaction. Selection and styling only read clocks.
const ghostCourses=new Map();
const handicapBoats=window.SR_EVENT.features.handicap?boats.filter(boat=>boat.handicapRule===undefined||boat.handicapRule==='GPH'):[];
const HANDICAP_COMMON_START=Math.max(...handicapBoats.map(boat=>boat.raceStartTime));
for(const boat of handicapBoats){
 let course=ghostCourses.get(boat.course);
 if(!course){course={handicap:0};ghostCourses.set(boat.course,course);}
 course.handicap=Math.max(course.handicap,boat.handicapSecondsPerNm||0);
}
for(const boat of handicapBoats){
 const course=ghostCourses.get(boat.course);
 ghostClocks.set(boat.id,prepareGhostClock(boat,HANDICAP_COMMON_START,course.handicap));
}
const handicapReplayEnd=Math.max(...[...ghostClocks.values()].filter(clock=>!clock.error).map(clock=>clock.end+GHOST_FINISH_HOLD));
const VIEWER_DATA_END=Math.ceil(Math.max(D.end,handicapReplayEnd));
if(window.SR_EVENT.features.handicap)try{
 const stored=JSON.parse(eventStorage.getItem(HANDICAP_TRACKS_KEY)??'false');
 if(typeof stored!=='boolean')throw Error(srText('Ugyldigt valg.'));
 handicapTracksEnabled=stored;
}catch(error){handicapPreferenceError=srText('Handicapkompenseret spor kunne ikke indlæses: ')+error.message;}
function trackUsesBoatColour(){return handicapTracksEnabled||comparison.boatColour;}
function trackUsesComparison(){return !handicapTracksEnabled&&comparison.enabled;}
function syncHandicapTracks(){
 $('handicapCompensatedTracks').checked=handicapTracksEnabled;
 const missing=handicapTracksEnabled?handicapBoats.filter(boat=>boatIsDisplayed(boat)&&ghostClocks.get(boat.id).error):[];
 const message=handicapPreferenceError||(missing.length?srText("Handicapkompensation mangler for {0}: {1}.",missing.map(boat=>boat.name).join(', '),[...new Set(missing.map(boat=>ghostClocks.get(boat.id).error))].join(' · ')):'');
 if($('ghostStatus').textContent!==message)$('ghostStatus').textContent=message;
 $('ghostStatus').hidden=!message;
}
function setHandicapTracks(enabled){
 if(!window.SR_EVENT.features.handicap)return false;
 return changeEventConfiguration(()=>{
  try{if(!openedEvent)eventStorage.setItem(HANDICAP_TRACKS_KEY,JSON.stringify(enabled));}
  catch{handicapPreferenceError=srText('Handicapkompenseret spor kunne ikke gemmes.');syncHandicapTracks();return false;}
  handicapTracksEnabled=enabled;handicapPreferenceError='';syncHandicapTracks();
  clearTrackHover();comparisonMessage('');syncNavigationControls();renderTrackSpeedLegend();
  if(!openedEvent)seekToReplayStart();
  updateTimeline();requestRender();return true;
 });
}
$('handicapCompensatedTracks').onchange=event=>setHandicapTracks(event.target.checked);
function handicapBoatPosition(boat,time){
 const clock=ghostClocks.get(boat.id);if(!clock||clock.error||time<clock.start||time>clock.end+GHOST_FINISH_HOLD)return null;
 const sourceTime=time>=clock.end?clock.sourceEnd:ghostSourceAtTime(clock,time);
 const position=trackPosition(boat.points,sourceTime);
 return position?{...position,replayTime:sourceTime,finished:time>=clock.end}:null;
}
function displayBoatPosition(boat,time){
 if(handicapTracksEnabled)return handicapBoatPosition(boat,time);
 const position=trackPosition(boat.points,time);return position?{...position,replayTime:time}:null;
}
function displayTrackWindow(boat,time){
 if(!tracksAreVisible())return null;
 const from=time-trackWindowSeconds();
 if(!handicapTracksEnabled)return {from,to:time};
 const clock=ghostClocks.get(boat.id);
 if(!clock||clock.error||time<clock.start||time>clock.end+GHOST_FINISH_HOLD)return null;
 return {from:ghostSourceAtTime(clock,trackLengthSeconds===0?clock.start:Math.min(clock.end,Math.max(clock.start,from))),
  to:ghostSourceAtTime(clock,Math.min(clock.end,time))};
}
function displayedTrackTime(boat,sourceTime){
 if(!handicapTracksEnabled)return sourceTime;
 const clock=ghostClocks.get(boat.id);return clock&&!clock.error?ghostClockAtSource(clock,sourceTime):null;
}
function viewerStartTime(){
 return handicapTracksEnabled&&Number.isFinite(handicapReplayEnd)?HANDICAP_COMMON_START:D.start;
}
function seekToReplayStart(){
 const start=viewerStartTime();
 if(currentTime()<start)setCurrentTime(start,{fractional:true,allowOutsideVisibleRanges:true,preservePlaybackGates:true});
}
function viewerEndTime(){
 // Both global limits are prepared before interaction, independent of filters.
 return handicapTracksEnabled?VIEWER_DATA_END:D.end;
}
syncNavigationControls();
