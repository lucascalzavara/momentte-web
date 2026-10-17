import {brandHref} from '../lib/brand-href'
import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'
@customElement('site-footer')
export class SiteFooter extends LitElement {
 protected createRenderRoot() { return this }
 render() { return html`<footer class="footer"><div><a class="brand" href=${brandHref()} aria-label="Momentte, início"><img src="/brand/icon.svg" alt=""><img src="/brand/wordmark.svg" alt="Momentte"></a><p>Os melhores momentos merecem ser compartilhados.</p></div><div class="footer-links"><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a><a href="#faq">Dúvidas frequentes</a></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Momentte.</span><span>Feito para celebrar. E lembrar.</span></div></footer>` }
}
