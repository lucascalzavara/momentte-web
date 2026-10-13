// API simulada, exclusiva para QA visual. Não faz pagamentos nem grava dados.
// Bind restrito a loopback; encerre após o teste. Não use em produção.
import { createServer } from 'node:http'
const end = new Date(Date.now() + 3600000).toISOString()
const user = { id: '11111111-1111-1111-1111-111111111111', name: 'Pessoa de teste', email: 'preview@example.com', role: 'ADMIN' }
const token = { accessToken: 'preview-only', refreshToken: 'preview-refresh', refreshExpiresAt: new Date(Date.now()+86400000).toISOString(), tokenType: 'Bearer', expiresIn:3600, expiresAt:end, user, company: { id:user.id, name:'Empresa de teste',taxId:null } }
const momentte = [{code:'free',name:'Gratuito',priceCents:0,activeWorks:null,csvExport:false,eventActivations:0},{code:'professional',name:'Profissional',priceCents:9900,activeWorks:null,csvExport:false,eventActivations:8}]
const alicerce = [{code:'free',name:'Gratuito',priceCents:0,activeWorks:2,csvExport:false,eventActivations:0},{code:'starter',name:'Inicial',priceCents:1500,activeWorks:5,csvExport:true,eventActivations:0},{code:'business',name:'Intermediário',priceCents:3000,activeWorks:20,csvExport:true,eventActivations:0},{code:'unlimited',name:'Completo',priceCents:9900,activeWorks:null,csvExport:true,eventActivations:0}]
const events = [{ id:user.id,name:'Celebração de teste',endsAt:end,state:'organization',paid:false,downloadUntil:null,canDownload:false,storageLimitBytes:1000000000,storageUsedBytes:0,themeColor:null,hasCustomLogo:false }]
createServer(async (req,res) => {
  const alice = req.url.startsWith('/alicerce/')
  const path = req.url.replace('/alicerce','').split('?')[0].toLowerCase()
  let json = {}
  if (path.endsWith('/auth/login')) json = alice ? { requiresCompanySelection:false,auth:token } : token
  else if (path.endsWith('/auth/refresh-token')) json = token
  else if (path.endsWith('/billing') || path.endsWith('/billing/reconcile')) {
    const plans=alice?alicerce:momentte
    json={plan:plans[alice?0:1],plans,cycle:alice?null:{activationsUsed:8,endsAt:end},contract:alice?null:{pendingPlan:null,cancelled:false,checkoutUrl:null},orders:[],checkoutAvailable:false}
  }
  else if (path.endsWith('/events')) {
    if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;const value=JSON.parse(body);events.push({...events[0],id:crypto.randomUUID(),name:value.name,endsAt:value.endsAt})}
    json=events
  }
  else if(path.endsWith('/works')) json={works:[{id:user.id,name:'Obra de teste',status:'active'}],activeCount:2,activeLimit:2,canCreate:false,canExportCsv:false}
  else {res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({detail:'Rota não incluída na API de QA.'}));return}
  res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(json))
}).listen(5052,'127.0.0.1',()=>console.log('API de QA em http://127.0.0.1:5052'))
