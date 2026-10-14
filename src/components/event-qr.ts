import {LitElement,html,css} from 'lit'
import {customElement,property,state} from 'lit/decorators.js'
import {eventQrSvg,qrPng,downloadBlob} from '../lib/event-qr'
@customElement('event-qr')
export class EventQr extends LitElement {
 @property() url=''
 @state() private message=''
 private key='';private svg=''
 private async save(png:boolean){try{if(png)downloadBlob(await qrPng(this.svg),'momentte-qr.png');else downloadBlob(new Blob([this.svg],{type:'image/svg+xml'}),'momentte-qr.svg')}catch{this.message='Não foi possível baixar o QR.'}}
 render(){if(!this.url)return '';if(this.key!==this.url){this.key=this.url;this.svg=eventQrSvg(this.url)}return html`<div class="qr"><span>COMPARTILHE SEU MOMENTO</span><img src=${'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(this.svg)} alt="QR code para entrar no evento"><strong>Seu olhar faz parte da história.</strong></div><label>Link do evento<input readonly .value=${this.url} aria-label="Link do evento"></label><div class="actions"><button @click=${async()=>{try{await navigator.clipboard.writeText(this.url);this.message='Link copiado.'}catch{this.message='Selecione o link para copiar.'}}}>Copiar link</button><button @click=${()=>this.save(false)}>Baixar SVG</button><button @click=${()=>this.save(true)}>Baixar PNG</button></div><p role="status">${this.message}</p>`}
 static styles=css`:host{display:block}.qr{background:#f1eadc;border:1px solid #dfd3bd;border-radius:18px;padding:22px;max-width:230px;text-align:center;margin:auto}.qr span{font-size:9px;letter-spacing:2px;color:#8d6a38}.qr img{display:block;width:200px;max-width:100%;margin:16px auto;border-radius:8px}.qr strong{font:italic 13px Georgia;color:#796238}label{display:grid;gap:8px;margin-top:18px;font-size:12px}input{padding:12px;border:1px solid #d9d0c1;border-radius:6px;font:inherit;min-width:0}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}button{border:1px solid #d9d0c1;border-radius:6px;padding:10px;background:#fffaf1;cursor:pointer;font:inherit;font-size:12px}p{font-size:11px;color:#796238}button:focus-visible,input:focus-visible{outline:3px solid #b99251}`
}
