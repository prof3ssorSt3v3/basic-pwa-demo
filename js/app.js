const app = {
  SW: null,
  deferredPrompt: null,
  max: 10,
  init: () => {
    if ('serviceWorker' in navigator) {
      app.initServiceWorker().catch(console.error);

      document.getElementById('randImg').addEventListener('click', app.setImg);
    }
  },
  initServiceWorker: async () => {
    let swRegistration = await navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none',
      scope: '/',
    });
    app.SW =
      swRegistration.installing ||
      swRegistration.waiting ||
      swRegistration.active;
    //the registration object could be in any state

    // listen for new service worker to take over
    //could be first one or a new one taking over
    navigator.serviceWorker.addEventListener('controllerchange', async () => {
      app.SW = navigator.serviceWorker.controller;
    });
    navigator.serviceWorker.addEventListener('message', app.onMessage, false);
  },
  onMessage: (ev) => {
    //message from SW received
    let { data } = ev;
    console.log(ev.ports);
    console.log(data);
  },
  sendMessage: (msg) => {
    app.SW.postMessage(msg);
  },
  setImg: () => {
    let rand = Math.floor(Math.random() * 20) + 100;
    let url = `https://picsum.photos/id/${rand}/300/300`;
    let img = document.getElementById('randImg');
    img.addEventListener('error', (err) => {
      //error loading image
      //try again
      if (app.max > 0) {
        app.setImg();
      }
    });
    img.addEventListener('load', (ev) => {
      //img has loaded...
      //reset our max attempts to 10
      app.max = 10;
    });
    app.max--;
    img.src = url;
  },
};
document.addEventListener('DOMContentLoaded', app.init);
