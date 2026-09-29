(function () {
  var canvas = document.getElementById("city");
  var ctx = canvas.getContext("2d");
  var speechLayer = document.getElementById("speech");
  var PLACES = {
    park: { x: 70, y: 280, w: 160, h: 220, label: "park" },
    square: { x: 280, y: 210, w: 280, h: 200, label: "square" },
    cafe: { x: 600, y: 80, w: 140, h: 110, label: "cafe" },
    hall: { x: 430, y: 40, w: 140, h: 100, label: "hall" },
    market: { x: 760, y: 220, w: 150, h: 130, label: "market" },
    workshop: { x: 760, y: 380, w: 150, h: 110, label: "workshop" },
    arcade: { x: 280, y: 450, w: 180, h: 110, label: "arcade" },
    stop: { x: 70, y: 80, w: 120, h: 80, label: "stop" }
  };
  console.log("city engine loaded", canvas && ctx && speechLayer && Object.keys(PLACES).length);
})();
