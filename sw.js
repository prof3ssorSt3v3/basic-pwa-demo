'use strict';
let staticName = `static-cache-2`;
let dynamicName = 'dynamic-cache-1';
let listOfStaticFiles = [
  '/',
  '/index.html',
  '/404.html',
  '/css/app.css',
  '/js/app.js',
  '/favicon.ico',
  '/img/icon-144x144.png',
  '/img/icon-192x192.png',
  '/img/icon-512x512.png',
  '/img/offline.png',
  '/manifest.json',
  'https://picsum.photos/id/1/300/300',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://fonts.gstatic.com/s/materialicons/v50/flUhRq6tzZclQEJ-Vdg-IuiaDsNcIhQ8tQ.woff2',
];
//we can add the materialize css and js too
let baseURL = null;

//listen for SW events
self.addEventListener('install', onInstall); // installing the service worker
self.addEventListener('activate', onActivate); // activating the service worker after install
self.addEventListener('message', onMessage); //isOnline, isLoggedIn
self.addEventListener('fetch', onFetch); //request from webpage

function onInstall(ev) {
  ev.waitUntil(
    caches.open(staticName).then((cache) => {
      console.log('saving all the static files');
      cache.addAll(listOfStaticFiles);
    })
  );
  //don't wait for the old SW to stop working before installing
  //self.skipWaiting();
  console.log(`Service Worker installed`);
}

function onActivate(ev) {
  ev.waitUntil(
    caches.keys().then((keys) => {
      //console.log(keys);
      return Promise.all(
        keys
          .filter((key) => key !== staticName && key !== dynamicName)
          .map((key) => caches.delete(key))
      );
    })
  );
  console.log(`Service Worker activated`);
}

function onFetch(ev) {
  //the webpage has asked for a resource
  //ev.request is the request for the resource
  console.log(`Webpage asked for ${ev.request.url}`);
  ev.respondWith(
    caches
      .match(ev.request)
      .then((cacheRes) => {
        //we are checking ALL the static and dynamic caches
        //cacheRes could be "undefined"

        return (
          cacheRes ||
          fetch(ev.request).then((fetchRes) => {
            //url is the full URL, not just the path
            console.log('was not in cache', ev.request);
            if (fetchRes.status != 404) {
              return caches.open(dynamicName).then((cache) => {
                if (
                  ev.request.url.indexOf('giftr.mad9124.rocks/') == -1 ||
                  (ev.request.url.indexOf('giftr.mad9124.rocks/api/people') >
                    -1 &&
                    ev.request.method == 'GET')
                ) {
                  //cache the request if it does NOT come from our API
                  //OR it comes from our API and uses 'GET'
                  console.log('PUTTING IN DYNAMIC', ev.request.url);
                }

                //need to use clone if we are going to return the file to the browser
                cache.put(ev.request.url, fetchRes.clone());
                //check the headers for a content-type for custom responses
                return fetchRes;
              });
            } else {
              //failed to fetch
              console.log('fetch failing', fetchRes);
              throw new Error('failed to fetch');
            }
          })
        );
      })
      .catch((err) => {
        //offline handler
        console.warn(err); //failed to fetch
        let url = new URL(ev.request.url);
        console.log(url);
        if (url.hostname == 'picsum.photos') {
          //return our image with id 1 from our static cache if we are offline
          return caches.match('https://picsum.photos/id/1/300/300');
        }
        if (url.pathname.indexOf('.html') > -1) {
          return caches.match('/404.html');
        }
        return caches.match('/index.html');
        //handle other stuff...
      })
  );
}

async function sendMessage(msg) {
  //send the message to all clients (tabs) using this service worker
  var allClients = await clients.matchAll({ includeUncontrolled: true });
  return Promise.all(
    allClients.map(function sendTo(client) {
      var chan = new MessageChannel();
      chan.port1.onmessage = onMessage;
      return client.postMessage(msg, [chan.port2]);
    })
  );
}

function onMessage({ data }) {
  //received a message from the webpage
  //probably just updating our online status
  if ('statusUpdate' in data) {
    console.log(`Service Worker receiving message ${data}`);
  }
  if ('baseURL' in data) {
    baseURL = data.baseURL;
  }
}
