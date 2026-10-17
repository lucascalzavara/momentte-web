export interface Appearance { themeColor: string|null; textColor:string; fontFamily:string; textScale:string; mediaMode:string; moderationEnabled:boolean; showQrCode:boolean; name:string }
export interface EventItem extends Appearance { id:string; publicCode:string; startsAt:string; endsAt:string; state:string; paid:boolean; hasCustomLogo:boolean; canDownload:boolean; downloadUntil:string|null; storageUsedBytes:number; storageLimitBytes:number; effectiveBackground:string; effectiveTextColor:string; effectiveFont:string; effectiveScale:string }
export interface PublicEvent { name:string; publicCode:string; startsAt:string; endsAt:string; state:string; mediaMode:string; moderationEnabled:boolean; backgroundColor:string; textColor:string; fontFamily:string; textScale:string; hasCustomLogo:boolean }
export interface Submission { id:string; eventId:string; hasImage:boolean; text:string|null; status:string; authorName:string|null; createdAt:string; bytes:number }
export interface Billing { plan:{code:string;name:string;priceCents:number}; cycle:{activationsUsed:number;endsAt:string}|null; availableEventCredits:number; checkoutAvailable:boolean; contract:{id:string;planCode:string;checkoutUrl:string|null;cancelled:boolean;pendingPlan:string|null}|null; orders:{id:string;kind:string;status:string;checkoutUrl:string|null;amountCents:number}[] }
export const stateNames:Record<string,string>={organization:'Organização',active:'Ativo',awaiting_download:'Aguardando download',finalized:'Finalizado'}
export const mediaNames:Record<string,string>={images:'Imagens',texts:'Textos',both:'Imagens e textos'}
export const statusNames:Record<string,string>={pending:'Aguardando aprovação',approved:'Aprovado',rejected:'Rejeitado'}
export const fonts:Record<string,string>={sans:'Manrope, Arial, sans-serif',serif:'Georgia, serif',rounded:'Trebuchet MS, sans-serif'}
export const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
export const date=(value:string)=>new Date(value).toLocaleString('pt-BR')
export const localDate=(value:string)=>new Date(new Date(value).getTime()-new Date(value).getTimezoneOffset()*60000).toISOString().slice(0,16)
