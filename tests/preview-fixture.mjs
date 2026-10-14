// Fixture de QA visual, loopback, sem banco ou pagamentos reais.
import {createServer} from 'node:http'
import pngjs from 'pngjs'
const owner='11111111-1111-1111-1111-111111111111',guest='22222222-2222-2222-2222-222222222222'
const users={[owner]:{id:owner,name:'Organizador de teste',email:'owner@example.com'},[guest]:{id:guest,name:'Participante de teste',email:'visitor@example.com'}}
const image=new pngjs.PNG({width:120,height:80});for(let i=0;i<image.data.length;i+=4){image.data[i]=185;image.data[i+1]=146;image.data[i+2]=81;image.data[i+3]=255}const png=pngjs.PNG.sync.write(image)
const end=new Date(Date.now()+4*3600000).toISOString(),start=new Date(Date.now()-60000).toISOString()
let credits=1
const events=[{id:owner,ownerId:owner,name:'Celebração de teste',publicCode:'1234567890abcdef1234567890abcdef',startsAt:start,endsAt:end,activatedAt:null,endedAt:null,paid:false,hasCustomLogo:false,storageLimitBytes:1000000000,storageUsedBytes:0,themeColor:'#234556',textColor:'#ffffff',fontFamily:'serif',textScale:'medium',mediaMode:'both',moderationEnabled:true}]
const members=new Map(),submissions=[]
function eventView(e){const deadline=e.endedAt??e.endsAt;const state=!e.activatedAt?'organization':Date.now()<Date.parse(deadline)?'active':Date.now()<Date.parse(deadline)+(e.paid?72:24)*3600000?'awaiting_download':'finalized';return {...e,state,canDownload:state==='awaiting_download',downloadUntil:e.activatedAt?new Date(Date.parse(deadline)+(e.paid?72:24)*3600000).toISOString():null,effectiveBackground:e.paid?e.themeColor:'#2f241e',effectiveTextColor:e.paid?e.textColor:'#fffaf1',effectiveFont:e.paid?e.fontFamily:'sans',effectiveScale:e.paid?e.textScale:'medium'}}
function publicView(e){const v=eventView(e);return {name:e.name,publicCode:e.publicCode,startsAt:e.startsAt,endsAt:e.endedAt??e.endsAt,state:v.state,mediaMode:e.mediaMode,moderationEnabled:e.moderationEnabled,backgroundColor:v.effectiveBackground,textColor:v.effectiveTextColor,fontFamily:v.effectiveFont,textScale:v.effectiveScale,hasCustomLogo:e.paid&&e.hasCustomLogo}}
createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname
  let raw='';for await(const chunk of req)raw+=chunk
  const body=raw&&req.headers['content-type']?.includes('application/json')?JSON.parse(raw):{}
  const user=req.headers.authorization==='Bearer preview-visitor'?guest:owner
  const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
  const empty=()=>{res.writeHead(204);res.end()}
  const picture=()=>{res.writeHead(200,{'Content-Type':'image/png'});res.end(png)}
  if(path.endsWith('/auth/login')||path.endsWith('/auth/register')){const id=String(body.email).includes('visitor')?guest:owner;return json({accessToken:id===guest?'preview-visitor':'preview-owner',refreshToken:'preview-refresh',refreshExpiresAt:new Date(Date.now()+86400000).toISOString(),tokenType:'Bearer',expiresIn:3600,expiresAt:end,user:users[id]})}
  if(path==='/api/v1/billing'||path==='/api/v1/billing/reconcile')return json({plan:{code:'professional',name:'Profissional',priceCents:9900},cycle:{activationsUsed:8,endsAt:end},availableEventCredits:credits,orders:[],contract:null,checkoutAvailable:false})
  if(path==='/api/v1/events'){
   if(req.method==='POST'){const id=crypto.randomUUID();const e={...events[0],...body,id,ownerId:user,publicCode:id.replaceAll('-',''),hasCustomLogo:false};events.push(e);return json(eventView(e),201)}
   return json(events.filter(e=>e.ownerId===user).map(eventView))
  }
  if(path==='/api/v1/participation')return json(events.filter(e=>e.ownerId!==user&&members.get(e.id)?.has(user)).map(publicView))
  if(path.startsWith('/api/v1/events/')){
   const id=path.split('/')[4];const e=events.find(e=>e.id===id&&e.ownerId===user);if(!e)return json({detail:'Evento não encontrado.'},404)
   const action=path.split('/').slice(5)
   if(!action.length&&req.method==='PUT'){Object.assign(e,body);return json(eventView(e))}
   if(action[0]==='activate'){if(!e.activatedAt){if(body.source==='purchase')credits--;e.activatedAt=new Date().toISOString();e.paid=body.source!=='free';e.storageLimitBytes=e.paid?10000000000:1000000000}return json(eventView(e))}
   if(action[0]==='end'){e.endedAt=new Date().toISOString();return empty()}
   if(action[0]==='logo'){if(req.method==='POST'){e.hasCustomLogo=true;return json({bytes:png.length})}if(req.method==='DELETE'){e.hasCustomLogo=false;return empty()}return picture()}
   if(action[0]==='texts'){res.writeHead(200,{'Content-Type':'text/csv'});return res.end('Texto\nMemória de teste')}
   if(action[0]==='media')return action.length>1?picture():json(submissions.filter(m=>m.eventId===id&&m.status==='approved'))
   if(action[0]==='submissions'&&action[2]==='preview')return picture()
   if(action[0]==='submissions'&&action[2]==='moderation'){const m=submissions.find(m=>m.id===action[1]);if(m)m.status=body.status;return empty()}
   if(action[0]==='submissions'||action[0]==='feed')return json(submissions.filter(m=>m.eventId===id&&(action[0]!=='feed'||m.status==='approved')))
  }
  if(path.startsWith('/api/v1/participation/')){
   const code=path.split('/')[4];const e=events.find(e=>e.publicCode===code);if(!e)return json({detail:'Convite não encontrado.'},404)
   const action=path.split('/').slice(5)
   if(!action.length)return json(publicView(e))
   if(action[0]==='join'){if(!members.has(e.id))members.set(e.id,new Set());members.get(e.id).add(user);return json(publicView(e))}
   if(action[0]==='logo'||action[2]==='preview')return picture()
   if(action[0]==='submissions'){
    if(req.method==='POST'){const text=raw.match(/name="text"\r\n\r\n([\s\S]*?)\r\n--/)?.[1]??null;const m={id:crypto.randomUUID(),eventId:e.id,authorId:user,authorName:users[user].name,hasImage:raw.includes('filename='),text,status:e.moderationEnabled?'pending':'approved',createdAt:new Date().toISOString(),bytes:0};submissions.push(m);return json(m,201)}
    return json(submissions.filter(m=>m.eventId===e.id&&m.authorId===user))
   }
  }
  return json({detail:'Rota não incluída na fixture.'},404)
 }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({detail:'Erro da fixture de QA.'}))}
}).listen(5062,'127.0.0.1',()=>console.log('Fixture local em http://127.0.0.1:5062'))
