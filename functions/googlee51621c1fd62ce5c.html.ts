// Google Search Console verification. Cloudflare Pages would redirect the static
// .html file to an extension-less URL, which Google may not accept — serve it here directly.
export const onRequest = () =>
  new Response('google-site-verification: googlee51621c1fd62ce5c.html', {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
