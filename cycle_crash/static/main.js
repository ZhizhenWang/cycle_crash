myToken = 'pk.eyJ1IjoiemhpemhlbmdpdCIsImEiOiJjazM3c3g4aGkwMjVxM2RvdnhpcWxxYTY4In0.jDvET27hbKAGDRSB2r1xIw';
//map center point
BASECOORDS = [40.7057, -73.9205];
//crash marker default distance for color
DEFAULT_DIST = -1
//crash layerGroup which store markers, index by borough
var crashes = [];
var crashMarkers = []
//crash distance from the bike station
var distanceCrash = [];
//bikestation layerGroup
var stations = L.featureGroup();
var boroughName = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

//marker icon class
var AwesomeIcon = L.DivIcon.extend({
  options: {
    className: 'custom-div-icon',
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -50]
  }
});
var stationIcon = new AwesomeIcon({
  html: `<span class='fa-stack fa-2x'>
          <i class='fas fa-map-marker fa-stack-2x' style='color: #192486'></i>
          <i class='fas fa-biking fa-stack-1x' style='font-size: .7em;'></i>
        </span>`
})

var crashIcon = function (color) {
  return new AwesomeIcon({
    html: `<span class='fa-stack fa-2x'>
          <i class='fas fa-map-marker fa-stack-2x' style='color:` +
      color +
      `;'></i>
          <i class='fas fa-car-crash fa-stack-1x fa-inverse'></i>
        </span>`
  })
}

// crash color icon function
var logistic = function (x) {
  x = x / 1000;
  return 100 * (1.0 * (1 / (1 + Math.exp(-0.1 * x))) - 0.2);
};
var step = function (x) {
  return x > 20000 ? 80 :
    x > 10000 ? 50 :
      x > 5000 ? 40 :
        20;
}
var redDynamic = function (x) {
  return x > 0 ? "hsl(8, 76%," + step(x) + "%)" : "#eab35a"
};

function makeMap() {
  var TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  var MB_ATTR = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';

  street = L.tileLayer(TILE_URL, { attribution: MB_ATTR })
  mymap = L.map('imap', {
    layers: Object.values(crashes).concat(street)
  }).setView(BASECOORDS, 11);
}

function updateCrashMarkers(target) {
  if (target) {
    var stationLatLng = target.getLatLng();
  }
  crashMarkers.forEach(function (crashMarker) {
    if (target) {
      var radius = stationLatLng.distanceTo(crashMarker.getLatLng());
      distanceCrash[crashMarker._leaflet_id] = _round(radius, 1);
      crashMarker.setIcon(crashIcon(redDynamic(radius)));
    } else {
      crashMarker.setIcon(crashIcon(redDynamic(DEFAULT_DIST)));
      distanceCrash = [];
    }
  });
}

function stationClickEvent(e) {
  this._bringToFront()
  updateCrashMarkers(this);
  mymap.removeLayer(stations)
  mymap.addLayer(stations.getLayer(this._leaflet_id))
}

function renderStation() {
  $.getJSON("/stations", function (obj) {
    obj.map(function (arr) {
      return L.marker([arr['latitude'], arr['longitude']], {
        icon: stationIcon
      })
        .bindPopup('Station Name: ' + arr['stationName'] + '</br>Status: ' + arr['statusValue'] +
          '</br>Available Docks: ' + arr['availableDocks'] +
          '</br>Available Bikes: ' + arr['availableBikes'])
        .on('click', stationClickEvent)
        .addTo(stations);

    });
  });
}

function showDistance() {
  distanceInfo.update(distanceCrash[this._leaflet_id])
}
var crashEvent = {
  mouseover: showDistance,
  click: function () {
    this._bringToFront()
  }
}

function renderCrash(borough) {
  crashes[borough] = L.featureGroup();
  $.getJSON("/crash/" + borough, function (obj) {
    obj.map(function (arr) {
      var markerTmp = L.marker([arr['LATITUDE'], arr['LONGITUDE']], {
        icon: crashIcon(redDynamic(DEFAULT_DIST))
      })
        .bindPopup('Collision ID: ' + arr['COLLISION_ID'] + '</br>Date: ' +
          arr['ACCIDENT DATE'] + '</br>Time: ' + arr['ACCIDENT TIME'] + '</br>Injured: ' +
          arr['NUMBER OF CYCLIST INJURED'] + '</br>Killed: ' + arr['NUMBER OF CYCLIST KILLED'])
        .on(crashEvent)
        .addTo(crashes[borough]);
      crashMarkers.push(markerTmp);
      return markerTmp;
    });
  });
}

var distanceInfo = L.control({
  position: 'bottomright'
});
distanceInfo.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info legend'); // create a div with a class "info"
  this.update();
  return this._div;
}
// method that we will use to update the control based on feature properties passed
distanceInfo.update = function (dis) {
  grades = [0, 5, 10, 20]
  legendHTML = '<h4>Distance to Bike Station</h4>'
  // loop through our density intervals and generate a label with a colored square for each interval
  for (var i = 0; i < grades.length; i++) {
    legendHTML +=
      '<i style="background:' + redDynamic(grades[i] * 1000 + 1) + '"></i> ' +
      grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] : '+') + 'km<br>';
  }
  this._div.innerHTML = legendHTML + '<p>' + (dis ? 'Current distance:<br>' + dis + ' m' :
    'Click one station, and hover over a crash location') + '</p>';
};

function addOverlay() {
  var groupedOverlays = {
    'Crash Location': crashes,
    "Bike Station": {
      "Citibike": stations
    },
    "Borough": {
      "On/Off": L.geoJson(boroughData, { style: style })
    }
  };

  var baseMaps = {
    "Street": L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}?access_token='+myToken),
    "Light View": L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/256/{z}/{x}/{y}?access_token='+myToken),
    "OpenStreetMap": street,
  };
  L.control.groupedLayers(baseMaps, groupedOverlays, { collapsed: true }).addTo(mymap);
}

// Below are Draw layout
// Truncate value based on number of decimals
var _round = function (num, len) {
  return Math.round(num * (Math.pow(10, len))) / (Math.pow(10, len));
};
// Helper method to format LatLng object (x.xxxxxx, y.yyyyyy)
var strLatLng = function (latlng) {
  return "(" + _round(latlng.lat, 6) + ", " + _round(latlng.lng, 6) + ")";
};
// Generate popup content based on layer type
// - Returns HTML string, or null if unknown object
var getPopupContent = function (layer) {
  if (layer instanceof L.Circle) {
    var center = layer.getLatLng(),
      radius = layer.getRadius();
    return "Center: " + strLatLng(center) + "<br />" +
      "Radius: " + _round(radius, 2) + " m";
    // Polyline - distance
  } else if (layer instanceof L.Polyline) {
    var latlngs = layer._defaultShape ? layer._defaultShape() : layer.getLatLngs(),
      distance = 0;
    if (latlngs.length < 2) {
      return "Distance: N/A";
    } else {
      for (var i = 0; i < latlngs.length - 1; i++) {
        distance += latlngs[i].distanceTo(latlngs[i + 1]);
      }
      return "Distance: " + _round(distance, 2) + " m";
    }
  }
  return null;
};

function addDrawPlugin() {
  // FeatureGroup is to store editable layers
  var drawnItems = new L.FeatureGroup();
  mymap.addLayer(drawnItems);

  var drawControl = new L.Control.Draw({
    draw: {
      polyline: {
        icon: new L.DivIcon({
          iconSize: new L.Point(6, 6),
          className: 'leaflet-div-icon leaflet-editing-icon'
        }),
        shapeOptions: {
          opacity: 0.8,
        },
      },
      circle: {
        shapeOptions: {
          opacity: 0.8,
        },
      },
      polygon: false,
      rectangle: false,
      marker: false,
      circlemarker: false
    },
    edit: {
      //         edit: false,
      featureGroup: drawnItems,
    }
  });
  mymap.addControl(drawControl);
  mymap.on(L.Draw.Event.CREATED, function (e) {
    var layer = e.layer;
    var content = getPopupContent(layer);
    if (content !== null) {
      layer.bindPopup(content);
    }
    drawnItems.addLayer(layer);
  });
  // Object(s) edited - update popups
  mymap.on(L.Draw.Event.EDITED, function (e) {
    var layers = e.layers,
      content = null;
    layers.eachLayer(function (layer) {
      content = getPopupContent(layer);
      if (content !== null) {
        layer.setPopupContent(content);
      }
    });
  });
}
//callback function for geojson style
function style(feature) {
  return {
    fillColor: feature.properties.fill,
    weight: feature.properties.stroke_width,
    opacity: feature.properties.stroke_opacity,
    color: feature.properties.stroke,
    dashArray: '3',
    fillOpacity: feature.properties.fill_opacity
  };
}

$(function () {

  for (var index in boroughName) {
    renderCrash(boroughName[index]);
  }
  renderStation();

  makeMap();
  mymap.addControl(new L.Control.Fullscreen());

  addOverlay()
  addDrawPlugin()

  distanceInfo.addTo(mymap)
  mymap.on('click', function (e) {
    updateCrashMarkers();
    stations.addTo(mymap);
    distanceInfo.update();
  });
  mymap.on('overlayadd', function (e) {
    if (e.name === 'Citibike') {
      updateCrashMarkers();
      distanceInfo.update();
    }
  })
})
