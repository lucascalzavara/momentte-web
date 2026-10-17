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
for (const route of ['moderacao','telao']) {
 const path='/'+route+'/11111111-1111-1111-1111-111111111111'
 assert.equal(authReturn('?next='+encodeURIComponent(path)),path)
 assert.equal(invitationQuery('?next='+encodeURIComponent(path)),'?next='+encodeURIComponent(path))
 assert.equal(authReturn('?next='+encodeURIComponent(path+'?redirect=https://attacker.example')),'/conta')
 assert.equal(authReturn('?next=/'+route+'/invalid'),'/conta')
}
assert.equal(invitationQuery('?next='+encodeURIComponent(invite)),'?next='+encodeURIComponent(invite))
console.log('OK: QR estilizado lido em 3 tamanhos para 3 URLs; retorno do convite preservado e redirects externos rejeitados.')

const {searchEvents}=load('lib/event-search.ts')
const events=[{name:'Celebração de Júlia',id:1},{name:'Evento Corporativo',id:2},{name:'Festa de João',id:3}]
assert.deepEqual(Array.from(searchEvents(events,'  JULIA celebracao  '),e=>e.id),[1])
assert.deepEqual(Array.from(searchEvents(events,'corpor'),e=>e.id),[2])
assert.equal(searchEvents(events,'  ').length,3)
assert.equal(searchEvents(events,'inexistente').length,0)
assert.equal(searchEvents([], 'Festa').length,0)
assert.equal(events.length,3)
console.log('OK: busca por nome ignora acentos/maiúsculas, aceita termos e preserva a lista original.')
