BASECOORDS = [40.7057, -73.9205];

var crashes = [];
var stations = L.layerGroup()
var boroughName = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]

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

function renderStation() {
    $.getJSON("/stations", function(obj) {
        obj.map(function(arr) {
            return L.marker([arr['latitude'], arr['longitude']], {icon: stationIcon})
            .bindPopup('Station Name: '+arr['stationName']+'</br>Status: '+arr['statusValue']
                        +'</br>Available Docks: ' +arr['availableDocks']
                        +'</br>Available Bikes: ' +arr['availableBikes'])
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


$(function() {
    for (index in boroughName){
        renderCrash(boroughName[index]);
    }
    renderStation();
    makeMap();
    //todo seperate geojson to layerGroup, or use different tile
//    L.geoJson(boroughData, {style: style}).addTo(mymap);
    crashes["<span style='color: blue'>Citibike Station</span>"] = stations
    L.control.layers(null, crashes,{collapsed:false}).addTo(mymap);
})
