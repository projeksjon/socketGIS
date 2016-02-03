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

    var view = new ol.View({
        center: ol.proj.transform([10.3933, 63.4297], 'EPSG:4326', 'EPSG:3857'),
        zoom: 13
    });

    var map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            }),
            vector, saved],
        view: view
    });

    var geolocation = new ol.Geolocation({
        projection: view.getProjection()
    });

    var accuracyFeature = new ol.Feature();
    geolocation.on('change:accuracyGeometry', function() {
        accuracyFeature.setGeometry(geolocation.getAccuracyGeometry());
    });

    var positionFeature = new ol.Feature();
    positionFeature.setStyle(new ol.style.Style({
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: '#3399CC'
            }),
            stroke: new ol.style.Stroke({
                color: '#fff',
                width: 2
            })
        })
    }));

    var coordinates = geolocation.getPosition();
    positionFeature.setGeometry(coordinates ?
        new ol.geom.Point(coordinates) : null);

    new ol.layer.Vector({
        map: map,
        source: new ol.source.Vector({
            features: [accuracyFeature, positionFeature]
        })
    });

    return map;
}