import { initTree, getJSON } from './sidebar.js';

const login = document.getElementById('login');
try {
    const resp = await fetch('/api/auth/profile');
    if (resp.ok) {
        const user = await resp.json();
        login.innerText = `Logout (${user.name})`;
        login.onclick = () => window.location.replace('/api/auth/logout');
        initTree('#tree', downloadpdfs);
    } else {
        login.innerText = 'Login';
        login.onclick = () => window.location.replace('/api/auth/login');
    }
    login.style.visibility = 'visible';
} catch (err) {
    alert('Could not initialize the application. See console for more details.');
    console.error(err);
}

async function downloadpdfs(id){
  const pdfsUrlObjects = await getJSON(`/api/derivatives/${window.btoa(id).replace('/','-')}/downloadurls?format=pdf`);
  for(const pdfUrlObject of pdfsUrlObjects.derivatives){
    await downloadpdf(pdfUrlObject);
  }
}

async function downloadpdf(pdfUrlObject){
  let resp = await fetch(`${pdfUrlObject.url}?Policy=${pdfUrlObject['CloudFront-Policy']}&Key-Pair-Id=${pdfUrlObject['CloudFront-Key-Pair-Id']}&Signature=${pdfUrlObject['CloudFront-Signature']}`);
  let respblob = await resp.blob();
  const url = window.URL.createObjectURL(respblob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  // the filename you want
  a.download = pdfUrlObject.name;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}