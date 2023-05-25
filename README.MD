# Revit PDFs Exporter MD

This sample shows a way to export PDFs from a Revit designs using Model Derivative.

### DEMO: 

### Introduction

When you submit a translation for a Revit 2022 file or later, it generates the 2D views as PDFs (refer [here](https://aps.autodesk.com/blog/advanced-option-rvtdwg-2d-views-svf2-post-job)).
We can take advantage of this fact to download these PDFs wherever they're available (Bucket, ACC, BIM 360...).
Many workflows are possible in this scenarion, integrating with Webhooks, 3rd party services, other products...

![thumbnail]()

### The approach

We are basically take advantage of the [manifest](https://aps.autodesk.com/en/docs/model-derivative/v2/reference/http/manifest/urn-manifest-GET/) in order to list and filter all the 2D views, and from there we can download the derivative using the [Derivative Download endpoint](https://aps.autodesk.com/en/docs/model-derivative/v2/reference/http/urn-manifest-derivativeUrn-signedcookies-GET/), just like in the snippet below:

```js
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
  let url = `https://developer.api.autodesk.com/modelderivative/v2/designdata/${urn.replaceAll('=', '')}/manifest/${derivative.urn}/signedcookies?useCdn=true`;

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
```

In this case, we're downloading the PDFs from BIM 360/ACC, so we just need a version id.

### Limitations

For this workflow to work, your Revit file needs to be from version 2022 or later, and it needs to be published after November 4th of 2021.
This last restriction is because only after this date the extractor started adding the Revit version in the manifest (refer to [this blog](https://aps.autodesk.com/blog/check-version-revit-file-hosted-cloud)).

Also, for it to download the PDFs you might need to change your browser settings.

Here's the way to do it in Chrome
You can go to `Settings > Privacy and Security > Additional Content Settings > PDF documents > Download PDFs`

![chrome_setting](./images/chrome_setting.png)
