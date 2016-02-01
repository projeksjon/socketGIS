/**
 * Created by rubenschmidt on 01.02.2016.
 */

socketGis.controller("mapController", function ($scope, $http) {
    var map = init();

});

function init() {
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
    return map;
}