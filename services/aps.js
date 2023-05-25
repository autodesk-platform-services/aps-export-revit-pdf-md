const APS = require('forge-apis');
// mod.cjs
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, INTERNAL_TOKEN_SCOPES, PUBLIC_TOKEN_SCOPES } = require('../config.js');

const internalAuthClient = new APS.AuthClientThreeLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, INTERNAL_TOKEN_SCOPES);
const publicAuthClient = new APS.AuthClientThreeLegged(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_CALLBACK_URL, PUBLIC_TOKEN_SCOPES);

const service = module.exports = {};

service.getAuthorizationUrl = () => internalAuthClient.generateAuthUrl();

service.authCallbackMiddleware = async (req, res, next) => {
  const internalCredentials = await internalAuthClient.getToken(req.query.code);
  const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
  req.session.public_token = publicCredentials.access_token;
  req.session.internal_token = internalCredentials.access_token;
  req.session.refresh_token = publicCredentials.refresh_token;
  req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
  next();
};

service.authRefreshMiddleware = async (req, res, next) => {
  const { refresh_token, expires_at } = req.session;
  if (!refresh_token) {
    res.status(401).end();
    return;
  }

  if (expires_at < Date.now()) {
    const internalCredentials = await internalAuthClient.refreshToken({ refresh_token });
    const publicCredentials = await publicAuthClient.refreshToken(internalCredentials);
    req.session.public_token = publicCredentials.access_token;
    req.session.internal_token = internalCredentials.access_token;
    req.session.refresh_token = publicCredentials.refresh_token;
    req.session.expires_at = Date.now() + internalCredentials.expires_in * 1000;
  }
  req.internalOAuthToken = {
    access_token: req.session.internal_token,
    expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
  };
  req.publicOAuthToken = {
    access_token: req.session.public_token,
    expires_in: Math.round((req.session.expires_at - Date.now()) / 1000)
  };
  next();
};

service.getUserProfile = async (token) => {
  const resp = await new APS.UserProfileApi().getUserProfile(internalAuthClient, token);
  return resp.body;
};

service.getHubs = async (token) => {
  const resp = await new APS.HubsApi().getHubs(null, internalAuthClient, token);
  return resp.body.data;
};

service.getProjects = async (hubId, token) => {
  const resp = await new APS.ProjectsApi().getHubProjects(hubId, null, internalAuthClient, token);
  return resp.body.data;
};

service.getProjectContents = async (hubId, projectId, folderId, token) => {
  if (!folderId) {
    const resp = await new APS.ProjectsApi().getProjectTopFolders(hubId, projectId, internalAuthClient, token);
    return resp.body.data;
  } else {
    const resp = await new APS.FoldersApi().getFolderContents(projectId, folderId, null, internalAuthClient, token);
    return resp.body.data;
  }
};

service.getItemVersions = async (projectId, itemId, token) => {
  const resp = await new APS.ItemsApi().getItemVersions(projectId, itemId, null, internalAuthClient, token);
  return resp.body.data;
};

service.getManifest = async (version_id, token) => {
  const resp = await new APS.DerivativesApi().getManifest(version_id.replace('-', '/'), null, internalAuthClient, token);
  return resp.body;
  let derivatives = resp.body.derivatives[0].children;
  let twoDimensionsViews = derivatives.filter(v => v.role == '2d');
}

service.getAECModelData = async (version_id, aec_model_data_guid) => {
  let aecModelDataJSON = await new APS.DerivativesApi().getDerivativeManifest(version_id.replace('-', '/'), aecModelData.urn, null, internalAuthClient, token);
  return aecModelDataJSON;
}

service.getDownloadUrls = async (version_id, token) => {
  const resp = await new APS.DerivativesApi().getManifest(version_id.replace('-', '/'), null, internalAuthClient, token);
  let derivatives = resp.body.derivatives[0].children;
  let pdfViews = derivatives.filter(v => v.role == '2d' && !!v.properties['Print Setting']);
  let pdfDerivatives = pdfViews.map(v => v.children.find(d => d.role == "pdf-page"));
  let downloadUrls = [];
  for (const derivative of pdfDerivatives) {
    let newDerivativeUrl = await getSignedUrlFromDerivative(version_id.replace('-', '_'), derivative, token);
    downloadUrls.push(newDerivativeUrl);
  }
  // return downloadUrls;
  return { "derivatives": downloadUrls, "RVTVersion": resp.body.derivatives[0].properties["Document Information"].RVTVersion };
};

async function getSignedUrlFromDerivative(urn, derivative, token) {
  let url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn}/manifest/${derivative.urn}/signedcookies`;

  let options = {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token.access_token
    }
  };

  let resp = await fetch(url, options);
  let respJSON = await resp.json();
  let policy = resp.headers.raw()['set-cookie'][0].split('=')[1].split(';')[0];
  let keypair = resp.headers.raw()['set-cookie'][1].split('=')[1].split(';')[0];
  let signature = resp.headers.raw()['set-cookie'][2].split('=')[1].split(';')[0];
  let data = {
    "name": derivative.urn.split('/').slice(-1)[0],
    "url": respJSON.url,
    "CloudFront-Policy": policy,
    "CloudFront-Key-Pair-Id": keypair,
    "CloudFront-Signature": signature
  };

  return data;
}