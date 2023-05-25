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

async function downloadpdfs(id) {
  const pdfsUrlObjects = await getJSON(`/api/derivatives/${window.btoa(id).replace('/', '-')}/downloadurls?format=pdf`);
  showToast(`${pdfsUrlObjects.derivatives.length} PDF sheets found!`);

  if (parseInt(pdfsUrlObjects.rvtversion) < 2022)
    showToast(`Only 2022 or later models generate PDFs for 2d views`);
  for (const pdfUrlObject of pdfsUrlObjects.derivatives) {
    await downloadpdf(pdfUrlObject);
  }
}

async function downloadpdf(pdfUrlObject) {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = `${pdfUrlObject.url}?Policy=${pdfUrlObject['CloudFront-Policy']}&Key-Pair-Id=${pdfUrlObject['CloudFront-Key-Pair-Id']}&Signature=${pdfUrlObject['CloudFront-Signature']}`;
  // the filename you want
  a.download = pdfUrlObject.name;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function showToast(message) {
  Swal.fire({
    title: message,
    timer: 5000,
    toast: true,
    position: 'top',
    showConfirmButton: false
  })
}