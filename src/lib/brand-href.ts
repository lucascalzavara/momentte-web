import {AsyncDirective} from 'lit/async-directive.js'
import {directive} from 'lit/directive.js'
import {authStore} from '../auth/auth-store'

class BrandHrefDirective extends AsyncDirective {
 private listening = false
 private destination = () => authStore.session ? '/conta' : '/'
 private changed = () => this.setValue(this.destination())
 private subscribe() {
  if (!this.listening && this.isConnected) {
   authStore.addEventListener('change', this.changed)
   this.listening = true
  }
 }
 render() { this.subscribe(); return this.destination() }
 protected disconnected() {
  authStore.removeEventListener('change', this.changed)
  this.listening = false
 }
 protected reconnected() { this.subscribe(); this.changed() }
}

export const brandHref = directive(BrandHrefDirective)
