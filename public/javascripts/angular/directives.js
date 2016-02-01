/**
 * Created by valdemarrolfsen on 01.02.16.
 */
'use strict';

socketGis.directive('map', function() {

    return {
        restrict: 'E',
        link: function(scope, element, attr) {

            var map = new ol.Map({
                target: element[0],
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

        }
    }
});