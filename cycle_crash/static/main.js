//map center point
BASECOORDS = [40.7057, -73.9205];

//crash layerGroup which store markers
var crashes = [];
//bikestation layerGroup
var stations = L.layerGroup()
var boroughName = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]

//marker icon class
var LeafIcon = L.Icon.extend({
    options: {
        iconSize:     [40, 40],
        iconAnchor:   [20, 40],
        popupAnchor:  [0, -43]
    }
});
var stationIcon = new LeafIcon({iconUrl: 'static/icon/citibike.png'})
var crashIcon = new LeafIcon({iconUrl: 'static/icon/accident.png'})

function makeMap() {
    var TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    var MB_ATTR = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
    mymap = L.map('imap',{
                        layers: Object.values(crashes)
                 }).setView(BASECOORDS, 11);
    L.tileLayer(TILE_URL, {attribution: MB_ATTR}).addTo(mymap);
}

function onMarkClick() {
//    console.log(this._leaflet_id);
    mymap.removeLayer(stations)
    mymap.addLayer(stations.getLayer(this._leaflet_id))
}

function renderStation() {
    $.getJSON("/stations", function(obj) {
        obj.map(function(arr) {
            return L.marker([arr['latitude'], arr['longitude']], {icon: stationIcon})
            .bindPopup('Station Name: '+arr['stationName']+'</br>Status: '+arr['statusValue']
                        +'</br>Available Docks: ' +arr['availableDocks']
                        +'</br>Available Bikes: ' +arr['availableBikes'])
            .on('click', onMarkClick)
            .addTo(stations);

        });
    });
}

function renderCrash(borough) {
    crashes[borough] = L.layerGroup();
    $.getJSON("/crash/" + borough, function(obj) {
        obj.map(function(arr) {
            return L.marker([arr['LATITUDE'], arr['LONGITUDE']], {icon: crashIcon})
            .bindPopup('Collision ID: '+arr['COLLISION_ID']+'</br>Date: '
                        +arr['ACCIDENT DATE']+'</br>Time: '+arr['ACCIDENT TIME']+'</br>Injured: '
                        +arr['NUMBER OF CYCLIST INJURED']+'</br>Killed: '+arr['NUMBER OF CYCLIST KILLED'])
            .addTo(crashes[borough]);
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

function addOverlay(){
    var overlayMaps = [
    {
       group: "Crash Location",
       collapsed: true,
       layers: boroughName.map(function (id){ return {name: id, layer: crashes[id]}})
    },
    {
       group: "Bike Station",
       layers: [{name: "Citibike", layer: stations}]
    }
    ]

    L.control.panelLayers(null, overlayMaps,{
        collapsed:false,
//        collapsibleGroups: true,
        compact: true,}).addTo(mymap);
}

// Truncate value based on number of decimals
var _round = function(num, len) {
    return Math.round(num*(Math.pow(10, len)))/(Math.pow(10, len));
};
// Helper method to format LatLng object (x.xxxxxx, y.yyyyyy)
var strLatLng = function(latlng) {
    return "("+_round(latlng.lat, 6)+", "+_round(latlng.lng, 6)+")";
};
// Generate popup content based on layer type
// - Returns HTML string, or null if unknown object
var getPopupContent = function(layer) {
    if (layer instanceof L.Circle) {
        var center = layer.getLatLng(),
            radius = layer.getRadius();
        return "Center: "+strLatLng(center)+"<br />"
              +"Radius: "+_round(radius, 2)+" m";
    // Polyline - distance
    } else if (layer instanceof L.Polyline) {
        var latlngs = layer._defaultShape ? layer._defaultShape() : layer.getLatLngs(),
            distance = 0;
        if (latlngs.length < 2) {
            return "Distance: N/A";
        } else {
            for (var i = 0; i < latlngs.length-1; i++) {
                distance += latlngs[i].distanceTo(latlngs[i+1]);
            }
            return "Distance: "+_round(distance, 2)+" m";
        }
    }
    return null;
};

$(function() {
    for (index in boroughName){
        renderCrash(boroughName[index]);
    }
    renderStation();

    makeMap();
    //todo seperate geojson to layerGroup, or use different tile
//    L.geoJson(boroughData, {style: style}).addTo(mymap);

    addOverlay()

    // FeatureGroup is to store editable layers
    var drawnItems = new L.FeatureGroup();
    mymap.addLayer(drawnItems);

    var drawControl = new L.Control.Draw({
     draw:{
         polyline: {
                    icon: new L.DivIcon({
                        iconSize: new L.Point(6, 6),
                        className: 'leaflet-div-icon leaflet-editing-icon'
                    }),
                    shapeOptions: {
                        opacity: 0.8,
                    },
                },
        circle:{
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
         edit: false,
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
})
