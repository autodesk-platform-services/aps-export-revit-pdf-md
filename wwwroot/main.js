import { initTree, getJSON } from './sidebar.js';

const login = document.getElementById('login');
const clearLog = document.getElementById('clearlog');
const help = document.getElementById('help');
try {
  clearLog.onclick = () => {
    document.getElementById('logs').innerHTML = '';
  }
  const resp = await fetch('/api/auth/profile');
  if (resp.ok) {
    const user = await resp.json();
    login.innerText = `Logout (${user.name})`;
    login.onclick = () => window.location.replace('/api/auth/logout');
    initTree('#tree', downloadpdfs);
    help.onclick = showHelpDialog;
  } else {
    login.innerText = 'Login';
    login.onclick = () => window.location.replace('/api/auth/login');
  }
  login.style.visibility = 'visible';
} catch (err) {
  alert('Could not initialize the application. See console for more details.');
  console.error(err);
}

async function showHelpDialog() {
  Swal.fire({
    title: '<strong>Prerequisites</strong>',
    html:
      "<ul style='list-style-type:none;'> <li><a target='_blank' href='//tutorials.autodesk.io/#provision-access-in-other-products'>Provision</a> the client id:<input type='text' style='font-weight:bold' value='7VEOXjbrMmv5xQEx724X2f6gI6GwjYza' disabled></input> in your hub.</li> <li>Revit Model from <a target='_blank' href='//aps.autodesk.com/blog/advanced-option-rvtdwg-2d-views-svf2-post-job'>Version 2022 or later</a></li> <li>Model Translated from <a target='_blank' href='//aps.autodesk.com/blog/check-version-revit-file-hosted-cloud'>November 4th of 2021</a></li> </ul>",
    showCloseButton: true,
    showCancelButton: false,
    focusConfirm: false,
    width: 600,
    confirmButtonText:
      '<i class="fa fa-thumbs-up"></i> All set!',
  })
}

async function downloadpdfs(id, itemName) {
  Swal.fire({
    title: 'Want to download your 2d views as pdfs?',
    cancelButtonText: 'No, thanks!',
    showCancelButton: true,
    confirmButtonText: 'Yes, please!',
    showLoaderOnConfirm: true,
    preConfirm: async () => {
      const pdfsUrlObjects = await getJSON(`/api/derivatives/${window.btoa(id).replace('/', '-')}/downloadurls`);
      return pdfsUrlObjects;
    },
    allowOutsideClick: () => !Swal.isLoading()
  }).then(async (pdfsUrlObjects) => {
    const logsContainer = document.getElementById('logs');
    if (pdfsUrlObjects.isConfirmed) {
      const newExtractLogDetails = document.createElement('details');
      newExtractLogDetails.classList = 'log-details';
      logsContainer.appendChild(newExtractLogDetails);
      const newExtractLogSummary = document.createElement('summary');
      newExtractLogSummary.innerHTML = `${itemName} - ${id.split('?')[1].replace('=', ' ')}`;
      newExtractLogDetails.appendChild(newExtractLogSummary);
      const totalSheetsFoundMessage = `${pdfsUrlObjects.value.derivatives.length} PDF sheets found!`;
      showToast(totalSheetsFoundMessage);
      addLog(newExtractLogDetails, totalSheetsFoundMessage);
      if (parseInt(pdfsUrlObjects.value.RVTVersion) < 2022) {
        const versionmessage = `Only 2022 or later models generate PDFs for 2d views`;
        addLog(newExtractLogDetails, versionmessage);
        showToast(versionmessage);
      }
      else if (!pdfsUrlObjects.value.RVTVersion) {
        const versionmessage = `Revit Version not available for this derivative`;
        addLog(newExtractLogDetails, versionmessage);
        showToast(versionmessage);
      }
      else {
        for (const pdfUrlObject of pdfsUrlObjects.value.derivatives) {
          try {
            await downloadpdf(pdfUrlObject);
            addLog(newExtractLogDetails, `Sheet ${pdfUrlObject.name} downloaded!`);
          }
          catch (error) {
            addLog(newExtractLogDetails, `Error downloading ${pdfUrlObject.name} sheet!`);
            addLog(newExtractLogDetails, error);
          }
        }
      }
    }
  })
}

async function addLog(container, message) {
  const newParagraph = document.createElement('p');
  newParagraph.innerHTML = message;
  container.appendChild(newParagraph);
}

async function downloadpdf(pdfUrlObject) {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = `${pdfUrlObject.url}?Policy=${pdfUrlObject['CloudFront-Policy']}&Key-Pair-Id=${pdfUrlObject['CloudFront-Key-Pair-Id']}&Signature=${pdfUrlObject['CloudFront-Signature']}`;
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