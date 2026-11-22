const trafficFeatures=D.traffic_separation.features.map(feature=>{
 if(feature.properties.kind!=='restricted_area')throw Error(srText('Trafikseparering mangler forberedt områdeflade.'));
 const geometry=feature.geometry;
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:null;
 if(!polygons)throw Error(srText('Ugyldig områdeflade for trafikseparering.'));
 const lines=polygons.flat();
 let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
 for(const line of lines)for(const [lon,lat] of line){west=Math.min(west,lon);east=Math.max(east,lon);south=Math.min(south,lat);north=Math.max(north,lat);}
 return {...feature,bounds:{west,east,south,north},d:lines.map(line=>path(line)+'Z').join(' ')};
});
let trafficKey=null;
function renderTraffic(){
 const layer=$('trafficSeparation'),enabled=sceneOverlays.traffic;
 setAttr(layer,'display',enabled?'inline':'none');
 if(!enabled)return;
 const bounds=visibleMapBounds();if(!bounds)return;
 const key=[bounds.west,bounds.east,bounds.south,bounds.north].join(':');
 if(key===trafficKey)return;
 trafficKey=key;
 for(const feature of trafficFeatures){
  const b=feature.bounds;
  if(b.east<bounds.west||b.west>bounds.east||b.north<bounds.south||b.south>bounds.north){feature.node?.remove();continue;}
  if(!feature.node){
   const group=feature.node=el('g',{'data-tss-id':feature.id,'data-tss-kind':'restricted_area'});
   el('title',{},group);
   el('path',{d:feature.d},group);
  }
  if(!feature.node.parentNode){
   layer.append(feature.node);
   srBind(feature.node.querySelector('title'),'textContent',()=>srText(feature.properties.name));
  }
 }
}
