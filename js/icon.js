// Icon helper: tries to use project icon if available, and provides simple uploader (visible if ?admin=1)
function setFavicon(href){
  let link = document.querySelector('link[rel~="icon"]');
  if(!link){ link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = href;
}

async function exists(url){
  try{
    const r = await fetch(url, {method:'HEAD'});
    return r.ok;
  }catch(e){return false}
}

async function initIcon(){
  const preferred = 'assets/images/bee-icon.png';
  const fallback = 'assets/images/bee.svg';
  if(await exists(preferred)){
    setFavicon(preferred);
  }else if(await exists(fallback)){
    setFavicon(fallback);
  }

  // Admin uploader UI (show only if ?admin=1 in URL)
  try{
    const params = new URLSearchParams(location.search);
    if(params.get('admin')==='1'){
      const admin = document.getElementById('iconAdmin');
      if(admin) admin.classList.remove('hidden');
      const input = document.getElementById('iconUpload');
      const dl = document.getElementById('downloadIcon');
      if(input){
        input.addEventListener('change', ()=>{
          const f = input.files && input.files[0];
          if(!f) return;
          const reader = new FileReader();
          reader.onload = function(ev){
            const dataUrl = ev.target.result;
            setFavicon(dataUrl);
            // enable download
            if(dl){ dl.style.display = 'inline-block'; dl.href = dataUrl; }
            // helpful note in console
            console.log('Favicon set for this session. To make permanent, save the file and place it in assets/images/bee-icon.png');
          };
          reader.readAsDataURL(f);
        });
      }
    }
  }catch(e){console.warn(e)}
}

initIcon();

export { setFavicon };
