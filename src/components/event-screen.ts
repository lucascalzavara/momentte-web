import {LitElement,html,css} from 'lit'
import {customElement,property,state} from 'lit/decorators.js'
import {businessRequest as request} from '../api/business-api'
import type {EventItem,Submission} from '../types/events'
import {fonts} from '../types/events'
import './event-qr'
@customElement('event-screen')
export class EventScreen extends LitElement {
 @property() eventId=''
 @state() private event?:EventItem
 @state() private item?:Submission
 @state() private image=''
 @state() private logo=''
 @state() private error=''
 @state() private controlsVisible=false
 private idleTimer=0
 private showControls=()=>{this.controlsVisible=true;window.clearTimeout(this.idleTimer);this.idleTimer=window.setTimeout(()=>this.controlsVisible=false,3000)}
 private async fullscreen(event:MouseEvent){
  const button=event.currentTarget as HTMLButtonElement|null
  const pointer=event.detail>0
  try{if(!document.fullscreenElement)await this.requestFullscreen();else await document.exitFullscreen()}catch{this.error='Não foi possível abrir em tela cheia. Use o modo de tela cheia do navegador.'}
  if(pointer)button?.blur();this.showControls()
 }
 private timer=0;private index=0
 connectedCallback(){super.connectedCallback();void this.frame()}
 disconnectedCallback(){window.clearTimeout(this.timer);window.clearTimeout(this.idleTimer);if(this.image)URL.revokeObjectURL(this.image);if(this.logo)URL.revokeObjectURL(this.logo);super.disconnectedCallback()}
 private async frame(){
  try{
   const events=await request<EventItem[]>('GET','/api/v1/events');const e=events.find(item=>item.id===this.eventId);if(!e)throw new Error('Evento não encontrado ou sem acesso de organizador.');if(!this.isConnected)return;this.event=e;document.title='Telão · '+e.name+' — Momentte'
   if(e.state!=='active'){this.item=undefined;this.error='Este evento não está ativo. O telão não recebe novos conteúdos.';return}
   if(e.paid&&e.hasCustomLogo&&!this.logo){const blob=await request<Blob>('GET',`/api/v1/events/${e.id}/logo`,undefined,true);if(this.isConnected)this.logo=URL.createObjectURL(blob)}
   const media=await request<Submission[]>('GET',`/api/v1/events/${e.id}/feed`);const next=media.length?media[this.index++%media.length]:undefined
   let url='';if(next?.hasImage){const blob=await request<Blob>('GET',`/api/v1/events/${e.id}/submissions/${next.id}/preview`,undefined,true);url=URL.createObjectURL(blob)}
   if(!this.isConnected){if(url)URL.revokeObjectURL(url);return}if(this.image)URL.revokeObjectURL(this.image);this.image=url;this.item=next;this.error=''
  }catch(error){this.error=error instanceof Error?error.message:'Não foi possível atualizar o telão.'}
  if(this.isConnected)this.timer=window.setTimeout(()=>{void this.frame()},5000)
 }
 render(){const e=this.event;const url=e?location.origin+'/e/'+e.publicCode:'';return html`<main class=${this.controlsVisible?'':'idle'} @pointermove=${this.showControls} @pointerdown=${this.showControls} @keydown=${this.showControls} style=${`background:${e?.effectiveBackground??'#2f241e'};color:${e?.effectiveTextColor??'#fffaf1'};font-family:${fonts[e?.effectiveFont??'sans']}`}><header><img src=${this.logo||'/brand/wordmark.svg'} alt=${this.logo?'Logo do evento':'Momentte'}><h1>${e?.name??'Telão Momentte'}</h1><div class=${this.controlsVisible?'controls visible':'controls'} @focusin=${this.showControls}><a href="/conta">Voltar à gestão</a><button @click=${this.fullscreen}>Tela cheia</button></div></header><div class=${e?.state!=='active'||e.showQrCode===false?'layout no-qr':'layout'}><section>${this.error?html`<p role="status">${this.error}</p>`:this.item?html`${this.image?html`<img class="photo" src=${this.image} alt="Imagem aprovada para o telão">`:''}${this.item.text?html`<p class=${e?.effectiveScale??'medium'}>${this.item.text}</p>`:''}${this.item.authorName?html`<small>— ${this.item.authorName}</small>`:''}`:html`<span class="spark">✧</span><h2>A história começa com seu olhar.</h2><p>Aguardando os primeiros envios aprovados.</p>`}</section>${e?.state==='active'&&e.showQrCode!==false?html`<aside><event-qr .url=${url} .displayOnly=${true}></event-qr></aside>`:''}</div></main>`}
 static styles=css`:host{display:block}main{min-height:100svh;padding:25px;box-sizing:border-box}main.idle{cursor:none}.controls{position:fixed;right:20px;top:20px;z-index:10;display:flex;gap:10px;background:#211b16e8;color:#fffaf1;border-radius:10px;padding:10px;opacity:0;pointer-events:none;transition:opacity .2s}.controls.visible,.controls:focus-within{opacity:1;pointer-events:auto}.idle:has(.controls:focus-within){cursor:auto}.layout.no-qr{grid-template-columns:1fr}header{display:flex;gap:20px;align-items:center}header img{width:130px;height:60px;object-fit:contain;background:#fffaf1;padding:8px;border-radius:6px}h1{font-size:22px;font-weight:500;flex:1}header a,header button{font:12px Arial;color:inherit;border:1px solid #ffffff50;border-radius:6px;padding:9px;background:transparent;cursor:pointer;text-decoration:none}.layout{display:grid;grid-template-columns:1fr 260px;gap:30px;min-height:calc(100svh - 135px);align-items:center}section{text-align:center;min-width:0}.photo{max-width:100%;max-height:65svh;object-fit:contain;border-radius:8px}p{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.4}.small{font-size:clamp(20px,2vw,35px)}.medium{font-size:clamp(24px,3vw,50px)}.large{font-size:clamp(30px,4vw,65px)}small{opacity:.8}.spark{font-size:100px;color:#b99251}aside{font:12px Arial;color:#302b24;background:#faf6ed;padding:18px;border-radius:12px}button:focus-visible,a:focus-visible{outline:3px solid #b99251}@media(max-width:750px){main{padding:15px}header{flex-wrap:wrap;gap:10px}.layout{grid-template-columns:1fr;gap:20px}aside{max-width:260px;margin:auto}header img{width:80px;height:40px}h1{font-size:18px}.photo{max-height:45svh}}`
}
