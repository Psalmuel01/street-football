export type Page='home'|'clubs'|'squad'|'setup'|'match'|'results';
const pages:Page[]=['home','clubs','squad','setup','match','results'];
export class Router {
  page:Page='home';
  constructor(private onChange:(page:Page,previous:Page)=>void){window.addEventListener('hashchange',()=>this.sync());}
  go(page:Page){if(location.hash===`#/${page}`)this.apply(page);else location.hash=`/${page}`;}
  sync(){const candidate=location.hash.replace('#/','') as Page;this.apply(pages.includes(candidate)?candidate:'home');}
  private apply(page:Page){const previous=this.page;this.page=page;document.body.dataset.page=page;this.onChange(page,previous);window.scrollTo({top:0,behavior:'instant'});}
}
