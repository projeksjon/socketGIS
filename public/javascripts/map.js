/**
 * Created by rubenschmidt on 07.12.2015.
 */

var drawSource = new ol.source.Vector({wrapX: false});
var vectorSource = new ol.source.Vector({wrapX: false});

//Layer for dbFeatures
var saved = new ol.layer.Vector({
    source: vectorSource
});

//Layer for drawing
var vector = new ol.layer.Vector({
    source: drawSource,
    style: new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(255, 255, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#ffcc33',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({
                color: '#ffcc33'
            })
        })
    })
});

var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        }),
        vector, saved],
    view: new ol.View({
        center: ol.proj.transform([10.3933, 63.4297], 'EPSG:4326', 'EPSG:3857'),
        zoom: 13
    })
});

// a normal select interaction to handle click on features
var select = new ol.interaction.Select();
map.addInteraction(select);

//Get the selected features
var selectedFeatures = select.getFeatures();

// a DragBox interaction used to select features by drawing boxes while holding, cmd og ctrl
var dragBox = new ol.interaction.DragBox({
    condition: ol.events.condition.platformModifierKeyOnly
});

map.addInteraction(dragBox);


dragBox.on('boxend', function(e) {
    // features that intersect the box are added to the collection of
    // selected features
    var extent = dragBox.getGeometry().getExtent();
    vectorSource.forEachFeatureIntersectingExtent(extent, function(feature) {
        selectedFeatures.push(feature);
    });

});

// clear selection when drawing a new box and when clicking on the map
dragBox.on('boxstart', function(e) {
    selectedFeatures.clear();
});
map.on('click', function() {
    selectedFeatures.clear();
});

//Create the sidebar
var sidebar = $('#sidebar').sidebar();


//Create GeoJSON parsers
var geoJSONFormat = new ol.format.GeoJSON();

//Add reference to drawing select
/*
var typeSelect = document.getElementById('type');

typeSelect.onchange = function(e) {
    map.removeInteraction(draw);
    addInteraction();
};
*/

var draw; // global so we can remove it later
function addInteraction() {
    var value = 'Point';
    if (value !== 'None') {
        var geometryFunction, maxPoints;
        if (value === 'Square') {
            value = 'Circle';
            geometryFunction = ol.interaction.Draw.createRegularPolygon(4);
        } else if (value === 'Box') {
            value = 'LineString';
            maxPoints = 2;
            geometryFunction = function(coordinates, geometry) {
                if (!geometry) {
                    geometry = new ol.geom.Polygon(null);
                }
                var start = coordinates[0];
                var end = coordinates[1];
                geometry.setCoordinates([
                    [start, [start[0], end[1]], end, [end[0], start[1]], start]
                ]);
                return geometry;
            };
        }
        draw = new ol.interaction.Draw({
            source: drawSource,
            type: /** @type {ol.geom.GeometryType} */ (value),
            geometryFunction: geometryFunction,
            maxPoints: maxPoints
        });
        map.addInteraction(draw);
        //When finished drawing
        draw.on('drawend', saveDrawing);
    }
}

function saveDrawing(event){
    var feature = event.feature;
    //Write the feature to a geojsonobject.
    var geoObject = geoJSONFormat.writeFeatureObject(feature, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
    switch (geoObject.geometry.type){
        case 'Point':
            socket.emit('add point',geoObject);
            break;
        case 'LineString':
            socket.emit('add line', geoObject);
            break;
        case 'Polygon':
            socket.emit('add poly', geoObject);
            break;
        case 'GeometryCollection':
            console.log('geometry collection not ready');
            break;
        default:
            console.log('Not defined feature');
    }
}

addInteraction();

//Listen for click on bufferbutton
$('#bufferButton').click(makeBuffer);
function makeBuffer(){
    var bufferDistance = $('#bufferDistance').val();

    selectedFeatures.forEach(function(feature){
        var geofeature = geoJSONFormat.writeFeature(feature);
        //Emit it in geojson to save size
        socket.emit('bufferFeature',{'feature':geofeature, 'distance': parseInt(bufferDistance, 10)});
    });
}

$('#deleteSelectedButton').click(deleteSelected);
function deleteSelected(){
    selectedFeatures.forEach(function(feature){
        var id = feature.getId();
        console.log(id);
        var type =  geoJSONFormat.writeFeatureObject(feature).geometry.type;
        switch (type){
            case 'Point':
                socket.emit('delete point',id);
                break;
            case 'LineString':
                socket.emit('delete line', id);
                break;
            case 'Polygon':
                socket.emit('delete poly', id);
                break;
            case 'GeometryCollection':
                console.log('geometry collection not ready');
                break;
            default:
                console.log('Not defined feature');
        }
        if(vectorSource.getFeatureById(id)) {
            vectorSource.removeFeature(feature);
        }
        if(drawSource.getFeatureById(id)){
            drawSource.removeFeature(feature);
        }
        selectedFeatures.clear();
    });
}


//WEBSOCKET ONS BELOW
//On start of connection, the server sends the stored points. TODO change this.
socket.on('all points', function(points){
    points.forEach(function(point){
        //Create valid geojson
        var p =  turf.point(point.loc.coordinates);
        //read the geojson and make a feature of it
        var feature = geoJSONFormat.readFeature(p, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
        feature.setId(point._id);
        //Add feature to vectorlayer drawSource
        vectorSource.addFeature(feature);
    })
});

socket.on('all lines', function(lines){
    lines.forEach(function(line){
        var l =  turf.linestring(line.loc.coordinates);
        var feature = geoJSONFormat.readFeature(l, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
        feature.setId(line._id);
        //Add feature to vectorlayer drawSource
        vectorSource.addFeature(feature);
    })
});

socket.on('all polys', function(polys){
   polys.forEach(function(poly){
       var p =  turf.polygon(poly.loc.coordinates);
       var feature = geoJSONFormat.readFeature(p, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
       feature.setId(poly._id);
       vectorSource.addFeature(feature);
   })
});


socket.on('new point', function(point){

});

socket.on('done buffering', function(geom){
    var geometry = geoJSONFormat.readGeometry(geom);
    console.log(geometry);
    var feature = new ol.Feature({'geometry': geometry});
    vectorSource.addFeature(feature);
    //Write the buffer in right format for database and send it.
    var geoObject = geoJSONFormat.writeFeatureObject(feature, {dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' });
    socket.emit('add poly', geoObject);
});
