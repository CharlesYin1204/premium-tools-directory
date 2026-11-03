export function adMaterialSpec(ad,device){
 const banner=ad.template==='banner';const dimensions=banner?({landing:{pc:[1200,240],h5:[750,150]},home_banner:{pc:[1200,240],h5:[750,150]},mobile_search_below:{h5:[750,120]},category:{pc:[1200,200],h5:[750,150]},detail:{pc:[600,400],h5:[750,150]}})[ad.location]?.[device]:[512,512];
 if(!dimensions)return null;const [width,height]=dimensions;return {width,height,ratio:width/height,minWidth:banner?Math.ceil(width/2):64,minHeight:banner?Math.ceil(height/2):64,maxBytes:(banner?5:2)*1024*1024};
}
export function adMaterialProblem(info,ad,device){
 const spec=adMaterialSpec(ad,device);if(!spec)return '此位置不支持该终端';
 if(!['png','jpeg','webp'].includes(info.format)||info.pages>1)return '仅支持静态 PNG、JPEG、WebP 图片';
 if(info.bytes>spec.maxBytes)return `图片不能超过 ${spec.maxBytes/1024/1024} MiB`;
 if(info.width<spec.minWidth||info.height<spec.minHeight)return `素材至少 ${spec.minWidth} × ${spec.minHeight} px，建议 ${spec.width} × ${spec.height} px`;
 if((ad.image_fit||'cover')==='cover'&&Math.abs(info.width/info.height/spec.ratio-1)>0.02&&!ad.crop_verified)return '素材比例与模板不一致，请预览裁切并确认重要文字未被裁掉，或选择完整展示';
 return null;
}
