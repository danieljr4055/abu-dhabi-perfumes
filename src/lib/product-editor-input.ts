/** Client serialization only; server still validates every field independently. */
export function productEditorInput(row:Record<string,any>){
 const pick=(source:Record<string,unknown>,fields:string[])=>Object.fromEntries(fields.filter(k=>source[k]!==undefined).map(k=>[k,source[k]]));
 return {...pick(row,['code','slug','name','brandId','gender','description','state','concentration','performance','projection','occasion','season','featured','isNew','version','categoryIds']),
 featured:!!row.featured,isNew:!!row.isNew,
 notes:row.notes.map((n:Record<string,unknown>)=>pick(n,['noteId','phase','position'])),
 images:row.images.filter((i:Record<string,unknown>)=>typeof i.url==='string'&&i.url.trim()).map((i:Record<string,unknown>)=>pick(i,['url','alt','source','authorization'])),
 variants:row.variants.map((v:Record<string,unknown>)=>pick(v,['id','sku','kind','sizeMl','price','oldPrice','stock','active','commercialVerified','version']))};
}
