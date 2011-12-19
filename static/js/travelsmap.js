
SHADOW_Z_INDEX = 10;
MARKER_Z_INDEX = 11;

CLUSTER_DISTANCE = 30;
CLUSTER_THRESHOLD = 2;

CAST_STYLE = {
    backgroundGraphic: '${getBackground}',
    backgroundGraphicZIndex: SHADOW_Z_INDEX,
    backgroundHeight:'${getBHeight}',    
    backgroundWidth:'${getBWidth}',
    backgroundXOffset:'${getBXOffset}',
    backgroundYOffset: '${getBYOffset}',
    cursor: 'pointer',
    externalGraphic: '${getIcon}',
    fontSize: '14px',
    fontFamily: 'Arial',
    fontColor: 'white',
    fontWeight: 'bold',
    graphicWidth:'${getWidth}',
    graphicHeight:'${getHeight}',    
    graphicXOffset:'${getXOffset}',    
    graphicYOffset:'${getYOffset}',
    graphicZIndex: MARKER_Z_INDEX,
    labelXOffset: 0,
    labelYOffset: 0,
    label: '${getLabel}',
    fontColor: 'white',
}

CAST_HOVER_STYLE = {
    externalGraphic: '${getIcon}',
    backgroundGraphic: '${getBackground}'
}

EVENT_STYLE = {
    cursor: 'pointer',
    externalGraphic: MEDIA_URL + 'img/eventGreenPuck.png',
    backgroundGraphic: MEDIA_URL + 'img/blank.png',
    graphicWidth:26,
    graphicHeight:39,    
    backgroundWidth:0,
    backgroundHeight:0,    
    graphicXOffset:-2,    
    graphicYOffset:-19,
    backgroundXOffset: 1,
    backgroundYOffset: -6,
    graphicZIndex: MARKER_Z_INDEX,
    backgroundGraphicZIndex: SHADOW_Z_INDEX,
    fontSize: '14px',
    fontFamily: 'Arial',
    fontColor: 'white',
    fontWeight: 'bold',
}


EVENT_HOVER_STYLE = {
    cursor: 'pointer',
    externalGraphic: MEDIA_URL + 'img/eventGreen.png',
    backgroundGraphic: MEDIA_URL + 'img/eventShadow.png',
    graphicWidth:25,
    graphicHeight:60,    
    backgroundWidth:44,
    backgroundHeight:24,    
    graphicXOffset:0,    
    graphicYOffset:-40,
    backgroundXOffset: 1,
    backgroundYOffset: -6,
    graphicZIndex: MARKER_Z_INDEX,
    backgroundGraphicZIndex: SHADOW_Z_INDEX,
    fontSize: '14px',
    fontFamily: 'Arial',
    fontColor: 'white',
    fontWeight: 'bold',
}
//'#A58F2D'

ITINERARY_STYLE = {
    cursor: 'pointer',
    strokeWidth: 0,
    strokeOpacity: 1,
    strokeColor: '#fff',
    strokeDashstyle: 'dash'
}

ITINERARY_HOVER_STYLE = {
    strokeWidth: 0,
    strokeOpacity: .9,
    strokeColor: '#E9AB1A',
    strokeDashstyle: 'solid',
}

ITINERARY_SELECT_STYLE = {
    strokeWidth: 0,
    strokeOpacity: .8,
    strokeColor: '#FFAC0A',
    strokeDashstyle: 'solid',
}

BOUNDRY_STYLE = {
    fillOpacity: 0.0,
    strokeWidth: 6,
    strokeOpacity: .8,
    strokeColor:'#fff',
    strokeDashstyle: 'solid'
}

// allow styling of the zoombar
function fix_openlayers_zoombar() {
    $('#map-controls').children().each(function(index) {
        var id = $(this).attr('id');
        var classname = id.substring(id.lastIndexOf('_')+1, id.length);
        if ( classname == '4' ) {
            // horrible hack. openlayers, you crazy sometime.
            if (id.indexOf('ZoombarOpenLayers') == -1 ) {
                $(this).addClass('map-controls-slider');
            }
            else {
                $(this).addClass('map-controls-zoombar');
            }
        }
        else {
            classname = 'map-controls-' + classname;
            $(this).addClass(classname);
        }
    });
}

function get_cluster_icon_style(cluster) {
    var or_all = false;
    var and_all = true;

    for ( i in cluster ) {
        and_all = cluster[i].attributes.official && and_all;
        or_all = cluster[i].attributes.official || or_all;
    }

    if ( and_all == true ) {
        // all official
        return 'official';
    }

    else {
        if ( or_all == true ) {
            // mixed
            return 'both';
        }
        if ( or_all == false ) {
            // all community
            return 'community'; 
        }
    }
}

function highlightItinerary(it_id) {
    var vector = main_map.itineraryLayer.getFeatureByFid(it_id);
    if ( vector ) {
        main_map.highlightCtrl.highlight(vector);
    }
}

// override default popup behavior
OpenLayers.Popup.FramedCloud.prototype.fixedRelativePosition = true;
OpenLayers.Popup.FramedCloud.prototype.relativePosition = 'br';

Map = function(defaults) {

var self = this;

self.map = null;
self.projection = new OpenLayers.Projection('EPSG:900913');
self.displayProjection = new OpenLayers.Projection('EPSG:4326');

self.gterrainLayer = null;
self.gstreetLayer = null;
self.tmsoverlay = null;

self.publiclabOverlayURL = 'http://cartagen.org/tms/2011-08-25-brasil-rio-prazeres/';

self.castLayer = null;
self.itineraryLayer = null;

self.boundryLayer = null;

self.highlightCtrl = null;

self.defaults = defaults;

self.geojson_format = new OpenLayers.Format.GeoJSON({ 
    internalProjection: self.projection, 
    externalProjection: self.displayProjection
});

// Turn on the map
self.init = function(div) {
     
    OpenLayers.Util.onImageLoadErrorColor = "transparent";
  
    var zoombar = new OpenLayers.Control.PanZoomBar(
        {'div': OpenLayers.Util.getElement('map-controls')}
    );

    /*var layerswitcher = new OpenLayers.Control.LayerSwitcher(
            {'div': OpenLayers.Util.getElement('map-layer-switcher')}
            );*/

    var ol_options = {
        controls: [
            zoombar, 
            new OpenLayers.Control.Navigation()
        ],
        projection: self.projection,
        displayProjection: self.displayProjection,
        units: 'm',
        maxResolution: 156543.0339,
        maxExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34, 20037508.34, 20037508.34),
        panDuration: 20
    };

     
    self.map = new OpenLayers.Map(div, ol_options);

    // STYLE
    
    // cast
    
    strategy = new OpenLayers.Strategy.Cluster();
    strategy.distance = CLUSTER_DISTANCE;
    strategy.threshold = CLUSTER_THRESHOLD;
    
    var CAST_ICON = { 
            width: 25,
            height: 25,
            xOffset: -12,
            yOffset: -12,
            bWidth:35,
            bHeight: 21,
            bxOffset: 0,
            byOffset: -14
    }
    
    function calc_cluster_icon(c_length){
        var size = mapValue(c_length, 2, 60, 40,90);
        var x_off = -size*.5;
        var y_off = -size*.5-(size*.01);
        var bx_off = -size*.2;
        var by_off = -size*.5;
        var output =  {
             dimension : size,
             xOffset: x_off,
             yOffset: y_off,
             bxOffset: bx_off,
             byOffset: by_off
        };
        return output;
    }

    var cast_context = {
        getIcon: function(feature) {
                    
            if ( feature.cluster ) {
                var style = get_cluster_icon_style(feature.cluster);
                
                return MEDIA_URL + 'img/castCluster.png';

                /*switch(style){
                    case 'official':
                    return MEDIA_URL + 'img/castClusterBlue.png';
                    break;
                    case 'community':
                    return MEDIA_URL + 'img/castClusterRed.png';
                    break;
                    case 'both':
                    return MEDIA_URL + 'img/castClusterMixed.png';
                    break;
                }*/
            }
            else {
                var official = feature.attributes.official;
                var featured = feature.attributes.featured;
                var promotional = feature.attributes.promotional;

                if (official) {
                    return MEDIA_URL+'img/castMarker.png';
                    /*if (featured) { return MEDIA_URL+'img/castBlueFeatured.png'; }
                    if (promotional) { return MEDIA_URL+'img/castBluePromotional.png'; }
                    else { return MEDIA_URL+'img/castBluePuck.png'; }*/
                }
                else {
                    return MEDIA_URL+'img/castMarker.png';
                    /*if (featured) { return MEDIA_URL+'img/castRedFeatured.png'; }
                    if (promotional) { return MEDIA_URL+'img/castRedPromotional.png'; }
                    else { return MEDIA_URL+'img/castRedPuck.png'; }*/
                }
            }
        },

        getLabel: function(feature) {
            if ( feature.cluster ) {
                return feature.cluster.length;
            } 
            else {
                return '';
            }
        },

        getBackground: function(feature) {
            if(feature.cluster){
                return MEDIA_URL + 'img/blank.png';
            }
            else{
                return MEDIA_URL+'img/blank.png';
                //castShadowShort2.png
            }
        },

        getWidth: function(feature){
            if(feature.cluster){
               var calc = calc_cluster_icon(feature.cluster.length);
               return calc.dimension;
            }
            else{
               return CAST_ICON.width;
            }
        },

        getHeight: function(feature){
            if(feature.cluster){
               var calc = calc_cluster_icon(feature.cluster.length);
               return calc.dimension;
            }
            else{
               return CAST_ICON.height; 
            }
        },

        getXOffset: function(feature){
            if(feature.cluster){
               var calc = calc_cluster_icon(feature.cluster.length);
               return calc.xOffset;
            }
            else{
               return CAST_ICON.xOffset;
            }
        },

        getYOffset: function(feature){
            if(feature.cluster){
               var calc = calc_cluster_icon(feature.cluster.length);
               return calc.yOffset;
            }
            else{
               return CAST_ICON.yOffset; 
            }
        },

        getBWidth: function(feature){
            if(feature.cluster){
               var calc = calc_cluster_icon(feature.cluster.length);
               return calc.dimension;
            }
            else{
               return CAST_ICON.bWidth;
            }
        },

        getBHeight: function(feature){
            if(feature.cluster){
               var calc = calc_cluster_icon(feature.cluster.length);
               return calc.dimension;
            }
            else{
               return CAST_ICON.bHeight; 
            }
        },

        getBXOffset: function(feature){
            if(feature.cluster){
               var calc = calc_cluster_icon(feature.cluster.length);
               return calc.bxOffset;
            }
            else{
               return CAST_ICON.bxOffset;
            }
        },

        getBYOffset: function(feature){
            if(feature.cluster){
               var calc = calc_cluster_icon(feature.cluster.length);
               return calc.byOffset;
            }
            else{
               return CAST_ICON.byOffset; 
            }
        }
    }
    
    var cast_hover_context = {
        getIcon: function(feature) { 
            if ( feature.cluster ) {
                var style = get_cluster_icon_style(feature.cluster);
                

                return MEDIA_URL + 'img/castClusterHover.png';

                /*switch(style){
                    case 'official':
                    return MEDIA_URL + 'img/castClusterBlue.png';
                    break;
                    case 'community':
                    return MEDIA_URL + 'img/castClusterRed.png';
                    break;
                    case 'both':
                    return MEDIA_URL + 'img/castClusterMixed.png';
                    break;
                }*/
            }
            else {
                var official = feature.attributes.official;
                var featured = feature.attributes.featured;
                var promotional = feature.attributes.promotional;
                
                if (official) {
                    return MEDIA_URL+'img/castMarkerHover.png';
                    /*if (featured) { return MEDIA_URL+'img/castBlueFeatured.png'; }
                    if (promotional) { return MEDIA_URL+'img/castBluePromotional.png'; }
                    else { return MEDIA_URL+'img/castBluePuck.png'; }*/
                }
                else {
                    return MEDIA_URL+'img/castMarkerHover.png';
                    /*if (featured) { return MEDIA_URL+'img/castRedFeatured.png'; }
                    if (promotional) { return MEDIA_URL+'img/castRedPromotional.png'; }
                    else { return MEDIA_URL+'img/castRedPuck.png'; }*/
                }
            }
        },
        getBackground: function(feature) {
            if( feature.cluster ) {
                return MEDIA_URL + 'img/blank.png';
            }
            else {
                return MEDIA_URL+'img/blank.png';
            }
        }
    }
    
    var cast_style = new OpenLayers.Style(CAST_STYLE, {context : cast_context });
    var cast_hover_style = new OpenLayers.Style(CAST_HOVER_STYLE, {context : cast_hover_context});
    
    var cast_stylemap = new OpenLayers.StyleMap({
        'default' : cast_style,
        'select' : cast_hover_style,
        'hover' : cast_hover_style,
    });

    // event
    var event_style = new OpenLayers.Style(EVENT_STYLE);
    var event_hover_style = new OpenLayers.Style(EVENT_HOVER_STYLE);

    var event_stylemap = new OpenLayers.StyleMap({
        'default' : event_style,
        'select' : event_hover_style,
        'hover' : event_hover_style
    });

    // itinerary 
    var itin_context = {
        getStroke: function(feature){
            var max = 10;
            var itin_range = 100;
            var stroke = feature.attributes.casts_count;
            if(stroke >= itin_range){
                return max;
            }
            else{
                return mapValue(stroke, 0, 200 ,2,max);
            }
        },
 
        getColor: function(feature) {
            return '#C09E2A';
        }
    }
    
    var itin_style = new OpenLayers.Style(ITINERARY_STYLE, {context: itin_context});
    var itin_select_style = new OpenLayers.Style(ITINERARY_HOVER_STYLE);
    var itin_hover_style = new OpenLayers.Style(ITINERARY_HOVER_STYLE);

    var itin_stylemap = new OpenLayers.StyleMap({
        'default' : itin_style,
        'select' : itin_select_style,
        'hover' : itin_hover_style
    });

    // LAYERS

    self.gterrainLayer = new OpenLayers.Layer.Google('Google Terrain', {
        type: G_PHYSICAL_MAP,
        sphericalMercator: true,
        maxZoomLevel: 20,
        minZoomLevel: 7,
    });

    self.gstreetLayer = new OpenLayers.Layer.Google('Google Streets', {
        type: G_NORMAL_MAP,
        sphericalMercator: true,
        maxZoomLevel: 20,
        minZoomLevel: 7,
    });

    self.gsatelliteLayer = new OpenLayers.Layer.Google('Google Streets', {
        type: G_SATELLITE_MAP,
        sphericalMercator: true,
        maxZoomLevel: 20,
        minZoomLevel: 7,
    });

    self.osmLayer = new OpenLayers.Layer.OSM(
        "Open Street Map", 
        "", 
        {zoomOffset: 8, resolutions: [611.496226171875, 305.7481130859375, 152.87405654296876, 76.43702827148438, 38.21851413574219, 19.109257067871095, 9.554628533935547, 4.777314266967774, 2.388657133483887,1.1943285667419434, 0.597164283]}
    );
    
    self.tmsOverlay = new OpenLayers.Layer.TMS( 'TMS Overlay', '',{  
        // url: '', serviceVersion: '.', layername: '.', 
        type: 'png', 
        getURL: self.overlay_getTileURL, 
        alpha: true,
        visibility: false, 
        isBaseLayer: false
    });

    if (OpenLayers.Util.alphaHack() == false) { self.tmsOverlay.setOpacity(1.0); }

    self.addCastPoint = null;
    self.addCastLayer = new OpenLayers.Layer.Vector('Add Cast', { 
        styleMap: cast_stylemap,
        isBaseLayer: false,
    });

    self.addCastLayer.events.on({
        'sketchstarted' : function(){
            if ( self.addCastPoint ) {
                self.addCastPoint.destroy();
            } 
        },
        'featureadded' : function(evt) {
            var feature = evt.feature;
            self.addCastPoint = feature;
            var ll = new OpenLayers.LonLat(feature.geometry.x, feature.geometry.y);
        }
    });
    
    // "hidden" style
    self.openCastLayer= new OpenLayers.Layer.Vector('Open Cast', {
        styleMap: new OpenLayers.StyleMap({
            pointRadius: 5,
            strokeOpacity: 0.0,
            fillOpacity: 0.0,
            strokeColor: '#000000'
        }),
        isBaseLayer: false
    });

    self.castLayer = new OpenLayers.Layer.Vector('Casts', {
        styleMap: cast_stylemap,
        strategies: [strategy],
        isBaseLayer: false,
        rendererOptions: {yOrdering: true}
    });

    self.eventLayer = new OpenLayers.Layer.Vector('Events', {
        styleMap: event_stylemap,
        isBaseLayer: false,
        rendererOptions: {yOrdering: true}
    });

    self.itineraryLayer = new OpenLayers.Layer.Vector('Itineraries', {
        styleMap: itin_stylemap,
        isBaseLayer: false
    });

    self.boundryLayer = new OpenLayers.Layer.Vector('Boundry', {
        styleMap: new OpenLayers.StyleMap(BOUNDRY_STYLE),   
        isBaseLayer: false 
    });

    // CONTROLS
    
    self.addCastControl = new OpenLayers.Control.DrawFeature(self.addCastLayer, OpenLayers.Handler.Point);

    var highlight_control = {
        hover: true,
        highlightOnly: true,
        renderIntent: 'hover',
        eventListeners: {

            beforefeaturehighlighted: function (evt){
                          
                   //set up tooltip                       
                   $('#main-map').tooltip({
                    track: true,
                    delay: 0,
                    showURL: false, 
                    bodyHandler:function() {
                       //console.log(this); 
                        return '<br />';
                    }
                    });

            },

            featurehighlighted: function(evt) {
                var html = '';

              
            
                if ( evt.feature.cluster ) {
                    var features = evt.feature.cluster;
                    var num_features = features.length;
                   
                     if (num_features > 6){

                        var short_features = features.slice(0,5);

                        // create a fake placeholder feature to render the 
                        // "more casts" box
                        
                        short_features[5] = { 'attributes' : {
                            'placeholder' : true,
                            'num_left' : num_features - 5,
                        }};
                        
                        html = render_to_string('castClusterPopup.js.html', 
                            {
                                'features' : short_features,
                            });
                    }
                    else{
                        html = render_to_string('castClusterPopup.js.html',
                            {'features':features});
                    }
                }
                else {
                    var layer = evt.feature.layer.name; 
                    var obj = evt.feature.attributes; 
                    var tooltip_data = {
                        body: obj,
                        tooltip: true
                    }                        

                    switch(layer) {
                        case 'Casts':
                            html = render_to_string('castPopup.js.html',tooltip_data);
                            break;
                        case 'Itineraries':
                            html = render_to_string('itinPopup.js.html',tooltip_data);
                            break;
                        case 'Events':
                            var same_day = is_same_day(obj.start_date, obj.end_date);
                            tooltip_data.same = same_day;      
                            html = render_to_string('eventPopup.js.html',tooltip_data);
                            break;   
                    }
                }

                $('#tooltip .body').html(html);                 
                format_date($('.date', '#tooltip'), false);
            },

            featureunhighlighted: function(evt) {
                if (evt.feature.layer.name
                    == 'Itineraries') {
                    if ( ITIN_ID_FILTER ) {
                        highlightItinerary( ITIN_ID_FILTER );
                    }
                }
            }
        }
    }

    self.highlightCtrl = new OpenLayers.Control.SelectFeature(
        [self.castLayer, self.eventLayer, self.itineraryLayer],
        highlight_control
    );

    self.selectCast = new OpenLayers.Control.SelectFeature(self.castLayer, { 
          clickout: true,
          onSelect: function(feature){
            self.clearPopups();

            if ( feature.cluster ) {
                var features = feature.cluster;
                 
                var num_features = features.length;
                if (num_features > 6){ 
                    var scrolling = true;
                }
                else{
                    var scrolling = false;
               }
                
                var html = render_to_string('castClusterPopup.js.html', {
                    'features': features,
                    'scrolling': scrolling  
                });

                var lonlat = feature.geometry.getBounds().getCenterLonLat();
                var popup = new OpenLayers.Popup.FramedCloud('cast_cluster', 
                    lonlat, null, html, null, true, self.clearPopups);

                self.map.addPopup(popup);
                refresh_custom_scroll();                
                $('#' + popup.id).addClass('official');
            }
            else {
                var cast = feature.attributes;
                var cast_data = {
                    body: cast
                }
                var html = render_to_string('castPopup.js.html', cast_data);

                var lonlat = feature.geometry.getBounds().getCenterLonLat();
                var popup = new OpenLayers.Popup.FramedCloud('cast_popup_' + cast.id, 
                    lonlat, null, html, null, true, self.clearPopups);

                self.map.addPopup(popup);

                if ( cast.official ) {
                    $('#' + popup.id).addClass('official');
                }
                else {
                    $('#' + popup.id).addClass('community');
                }
            }
        }, 
        onUnselect: function(feature){
            self.clearPopups();
        }
    });

    self.selectEvent = new OpenLayers.Control.SelectFeature(self.eventLayer, {
        onSelect: function(feature){
            var event = feature.attributes;
            var lonlat = feature.geometry.getBounds().getCenterLonLat();
            var event_data = {
                body : event
            }                
            
            var same_day = is_same_day(event.start_date, event.end_date);
            event_data.same = same_day;      
            var html = render_to_string('eventPopup.js.html', event_data);

            var popup = new OpenLayers.Popup.FramedCloud('event_popup_' + event.id, 
                lonlat, null, html, null, true, self.clearPopups);

            self.clearPopups();
            self.map.addPopup(popup);

            format_date($('.date', '#' + popup.id), false);
            $('#' + popup.id).addClass('event');
        }, 
        onUnselect: function(feature){
            self.clearPopups();
        }
    });

    self.selectItinerary = new OpenLayers.Control.SelectFeature(self.itineraryLayer, {
        onSelect: function(feature, evt){
            var itin = feature.attributes;
            
            // 'this' is the select feature control or something. I have no idea. thanks firebug!
            var pixel = this.handlers.feature.down;
            var lonlat = self.map.getLonLatFromPixel(pixel);

            var itinerary_data = {
                body: itin
            }

            var html = render_to_string('itinPopup.js.html',itinerary_data);
            var popup = new OpenLayers.Popup.FramedCloud('itinerary_popup_' + itin.id, 
                lonlat, null, html, null, true, self.clearPopups);

            self.clearPopups();
            self.map.addPopup(popup);
            $('#' + popup.id).addClass('itinerary');
        }, 
        onUnselect: function(e){
            self.clearPopups();
        }
    });

    // SETUP

    self.gstreetLayer.events.on({moveend: self.baseLayerSwitcher});
    self.gterrainLayer.events.on({moveend: self.baseLayerSwitcher});

    self.map.addLayers([self.gterrainLayer, self.gstreetLayer, self.osmLayer, self.gsatelliteLayer]);
    self.map.addLayers([self.tmsOverlay, self.itineraryLayer, self.castLayer, self.eventLayer, self.boundryLayer, self.addCastLayer, self.openCastLayer]);

    self.map.addControls([self.addCastControl, self.highlightCtrl, self.selectCast, self.selectEvent, self.selectItinerary]);

    self.highlightCtrl.activate();
    self.selectCast.activate();
    self.selectEvent.activate();
    self.selectItinerary.activate();

   
    var map_center = defaults['center'];
    self.setCenter(map_center[0], map_center[1]);
    self.map.zoomTo(defaults['zoom']);

    fix_openlayers_zoombar();

    // draw the boundry
    if ( MAP_BOUNDRY ) {
        var boundry = self.geojson_format.read(MAP_BOUNDRY);
        self.boundryLayer.addFeatures(boundry);
    }
}
// END INIT

self.osmLayerSwitcher = function(on){
    if(on){
        self.map.setBaseLayer(self.gsatelliteLayer);
        fix_openlayers_zoombar();
    }
    else{
        self.map.setBaseLayer(self.gterrainLayer);
        fix_openlayers_zoombar();
        //self.baseLayerSwitcher();
    }    
}

self.tmsOverlayVisible = function(on) {   
    if(on){
        self.map.setBaseLayer(self.osmLayer);
        fix_openlayers_zoombar();
    }
    else{
        self.map.setBaseLayer(self.gterrainLayer);
        fix_openlayers_zoombar();
        //self.baseLayerSwitcher();
    }    

    //self.tmsOverlay.setVisibility(on);
}

self.baseLayerSwitcher = function(e) {
    if (e.zoomChanged) {
        self.clearPopups();
        var zoom = parseInt(self.map.zoom);
        if( zoom >= 9 ) {
            self.map.setBaseLayer(self.gstreetLayer);
            fix_openlayers_zoombar();
        }
        else {
            self.map.setBaseLayer(self.gterrainLayer);
            fix_openlayers_zoombar();
        }
    }
}

self.renderFeatures = function(features) {
    var casts = self.geojson_format.read(features['casts']);
    self.castLayer.addFeatures(casts)

    var events = self.geojson_format.read(features['events']);
    self.eventLayer.addFeatures(events)
        
    var itins = self.geojson_format.read(features['itineraries']);
    self.itineraryLayer.addFeatures(itins)
}

self.clearFeatures = function() {
    self.clearCasts();
    self.clearEvents();
    self.clearItineraries();
}

self.clearCasts = function() {
    self.castLayer.removeFeatures(self.castLayer.features);
}

self.clearEvents = function() {
    self.eventLayer.removeFeatures(self.eventLayer.features);
}

self.clearItineraries = function() {
    self.itineraryLayer.removeFeatures(self.itineraryLayer.features);
}

self.clearPopups = function() {
    for (i in self.map.popups){
        self.map.popups[i].destroy();
    };
}

self.setCenter = function(x, y) {
    var center = self.get_proj_ll(x,y);
    self.map.setCenter(center);
}

self.getCenter = function() {
    var center = self.map.center.clone();
    center.transform(self.projection, self.displayProjection);
    return [center.lon, center.lat];
}

self.panTo = function(x, y) {
    var ll = self.get_proj_ll(x,y);
    self.map.panTo(ll);
}

// Helpers


self.overlay_getTileURL = function(bounds) {
            var mapMinZoom = 16;
		    var mapMaxZoom = 21;
	            var res = this.map.getResolution();
	            var x = Math.round((bounds.left - this.maxExtent.left) / (res * this.tileSize.w));
	            var y = Math.round((bounds.bottom - this.tileOrigin.lat) / (res * this.tileSize.h));
	            var z = self.map.getZoom()+7;
	            if (this.map.baseLayer.name == 'Virtual Earth Roads' || this.map.baseLayer.name == 'Virtual Earth Aerial' || this.map.baseLayer.name == 'Virtual Earth Hybrid') {
	               z = z + 1;
	            }
                        //console.log(self.getBounds(self.map.getCenter()));
                        var mapBounds = self.map.calculateBounds();
                        //console.log(bounds+','+mapBounds);
		      if (mapBounds.intersectsBounds( bounds ) && z >= mapMinZoom && z <= mapMaxZoom ) {
	               //console.log( self.publiclabOverlayURL + z + "/" + x + "/" + y + "." + this.type);
	               return self.publiclabOverlayURL + z + "/" + x + "/" + y + "." + this.type;
                } else {
                   return "http://www.maptiler.org/img/none.png";
                }
}

self.getBounds = function(str) { 
    var bounds = self.map.calculateBounds();
    bounds.transform(self.projection, self.displayProjection);

    if ( str ) {
        var str = '';
        str += bounds.left + ',';
        str += bounds.bottom + ',';
        str += bounds.right + ',';
        str += bounds.top;  
        return str;
    }
    else {
        return bounds;
    }
}

self.get_ll = function(x, y) {
    return new OpenLayers.LonLat(x,y);
}

self.get_disp_ll = function(x, y) {
    var ll = self.get_ll(x, y);
    ll.transform(self.projection, self.displayProjection);

    return ll;
}

self.get_proj_ll = function(x, y) {
    var ll = self.get_ll(x, y);
    ll.transform(self.displayProjection, self.projection);

    return ll;
}

}

