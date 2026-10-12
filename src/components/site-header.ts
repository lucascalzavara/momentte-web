import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
@customElement('site-header')
export class SiteHeader extends LitElement {
 @state() private open = false
 protected createRenderRoot() { return this }
 render() { return html`<header class="header"><a class="brand" href="#" aria-label="Momentte, início"><img src="/brand/icon.svg" alt=""><img src="/brand/wordmark.svg" alt="Momentte"></a><button class="menu-toggle" aria-label="Abrir navegação" aria-expanded=${this.open} @click=${() => this.open = !this.open}>☰</button><nav class=${this.open ? 'nav open' : 'nav'} aria-label="Principal" @click=${() => this.open = false}><a href="#como-funciona">Como funciona</a><a href="#para-quem">Para quem</a><a href="#planos">Planos</a><button class="text-button" @click=${() => window.dispatchEvent(new CustomEvent('momentte-action', {detail:'login'}))}>Entrar ↗</button><button class="button small" @click=${() => window.dispatchEvent(new CustomEvent('momentte-action', {detail:'create'}))}>Criar evento ↗</button></nav></header>` }
}
