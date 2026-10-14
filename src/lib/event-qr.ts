import QRCode from 'qrcode'
export function eventQrSvg(url:string):string {
  const {modules}=QRCode.create(url,{errorCorrectionLevel:'H'})
  const size=modules.size, unit=8, margin=4, width=(size+margin*2)*unit
  let shapes=''
  for(let row=0;row<size;row++)for(let col=0;col<size;col++)if(modules.get(row,col)){
    const finder=modules.isReserved(row,col)
    const x=(col+margin)*unit,y=(row+margin)*unit,r=finder?0:2.3
    shapes+=`M${x+r} ${y}H${x+unit-r}Q${x+unit} ${y} ${x+unit} ${y+r}V${y+unit-r}Q${x+unit} ${y+unit} ${x+unit-r} ${y+unit}H${x+r}Q${x} ${y+unit} ${x} ${y+unit-r}V${y+r}Q${x} ${y} ${x+r} ${y}Z`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}" viewBox="0 0 ${width} ${width}"><rect width="${width}" height="${width}" fill="#fff"/><path fill="#2f241e" d="${shapes}"/></svg>`
}
export const downloadBlob=(blob:Blob,name:string)=>{const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}
export async function qrPng(svg:string):Promise<Blob>{
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode()
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível gerar o PNG.')
  ctx.fillStyle='#fff';ctx.fillRect(0,0,1024,1024);ctx.drawImage(image,0,0,1024,1024)
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Falha ao gerar QR.')),'image/png'))
}
