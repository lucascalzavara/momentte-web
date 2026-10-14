import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import {Resvg} from '@resvg/resvg-js'
import pngjs from 'pngjs'
function load(file,deps={}){const source=readFileSync(new URL('../src/'+file,import.meta.url),'utf8');const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2023,esModuleInterop:true}}).outputText;const exports={};vm.runInNewContext(js,{exports,require:name=>deps[name],URLSearchParams});return exports}
const {eventQrSvg}=load('lib/event-qr.ts',{qrcode:QRCode})
for(const url of ['https://momentte.example/e/1234567890abcdef1234567890abcdef','http://127.0.0.1:5176/e/1234567890abcdef1234567890abcdef','https://eventos.momentte.example.com.br/e/abcdef1234567890abcdef1234567890']){
 const svg=eventQrSvg(url)
 for(const width of [200,400,1024]){
  const rendered=new Resvg(svg,{fitTo:{mode:'width',value:width}}).render().asPng()
  const image=pngjs.PNG.sync.read(rendered)
  const decoded=jsQR(new Uint8ClampedArray(image.data),image.width,image.height)
  assert.equal(decoded?.data,url,`QR estilizado precisa decodificar em ${width}px`)
 }
}
const {authReturn,invitationQuery}=load('lib/auth-return.ts')
const invite='/e/abcdef1234567890abcdef1234567890'
assert.equal(authReturn('?next='+encodeURIComponent(invite)),invite)
assert.equal(authReturn('?next=https://attacker.example'),'/conta')
assert.equal(authReturn('?next=//attacker.example'),'/conta')
assert.equal(authReturn('?next=/e/invalid'),'/conta')
assert.equal(invitationQuery('?next='+encodeURIComponent(invite)),'?next='+encodeURIComponent(invite))
console.log('OK: QR estilizado lido em 3 tamanhos para 3 URLs; retorno do convite preservado e redirects externos rejeitados.')
