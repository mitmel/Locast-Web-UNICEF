{# LOCAST VERSION, based off of django/contrib/gis/templates/gis/admin/openlayers.js #}

{# Author: Justin Bronn, Travis Pinney & Dane Springmeyer #}
{% block vars %}var {{ module }} = {};
{{ module }}.map = null; {{ module }}.controls = null; {{ module }}.panel = null; {{ module }}.re = new RegExp("^SRID=\d+;(.+)", "i"); {{ module }}.layers = {};
{{ module }}.modifiable = {{ modifiable|yesno:"true,false" }};
{{ module }}.wkt_f = new OpenLayers.Format.WKT();
{{ module }}.is_collection = {{ is_collection|yesno:"true,false" }};
{{ module }}.collection_type = '{{ collection_type }}';
{{ module }}.is_linestring = {{ is_linestring|yesno:"true,false" }};
{{ module }}.is_polygon = {{ is_polygon|yesno:"true,false" }};
{{ module }}.is_point = {{ is_point|yesno:"true,false" }};
{% endblock %}
{{ module }}.get_ewkt = function(feat){return 'SRID={{ srid }};' + {{ module }}.wkt_f.write(feat);}
{{ module }}.read_wkt = function(wkt){
  // OpenLayers cannot handle EWKT -- we make sure to strip it out.
  // EWKT is only exposed to OL if there's a validation error in the admin.
  var match = {{ module }}.re.exec(wkt);
  if (match){wkt = match[1];}
  return {{ module }}.wkt_f.read(wkt);
}

/* LOCAST ADDITIONS */

$(function() {
    $('.olControlNavigationItemInactive').tooltip({ 
        delay: 0, 
        showURL: false, 
        track: true,
        bodyHandler: function() { 
            return gettext('Move Map');
        } 
    });

    $('.olControlDrawFeaturePathItemInactive, .olControlDrawFeaturePathItemActive').tooltip({ 
        delay: 0, 
        showURL: false, 
        track: true,
        bodyHandler: function() { 
            return gettext('Create New Path');
        } 
    });

    $('.olControlDrawFeaturePointItemActive, .olControlDrawFeaturePointItemInactive').tooltip({ 
        delay: 0, 
        showURL: false, 
        track: true,
        bodyHandler: function() { 
            return gettext('Set Location');
        } 
    });

    $('.olControlModifyFeatureItemActive, .olControlModifyFeatureItemInactive').tooltip({ 
        delay: 0, 
        showURL: false, 
        track: true,
        bodyHandler: function() { 
            return gettext('Edit Existing Points');
        } 
    });

    $('.inline-group .vLargeTextField').attr('rows', 2) 
    $('.inline-group .vLargeTextField').css('width', '36em') 
});

var nav = null;

var admin_map = null; 
var marker_layer = null; 

var goog_proj = new OpenLayers.Projection('EPSG:900913');
var disp_proj = new OpenLayers.Projection('EPSG:4326');

function recenter_map() {
  admin_map.setCenter(get_proj_ll({{default_lon}}, {{default_lat}}), {{ default_zoom }});
}

function on_map_move() {
    var cur_bounds = get_bounds();
    $.ajax({
        url: '{% url cast_api %}?within=' + cur_bounds, 
        dataType: 'json',
        success: rai_map_cb
    });
}

function rai_map_cb(data) {
    for ( i in data ) {
        if ( data[i].location ) {
            var x = data[i].location[0];
            var y = data[i].location[1];

            marker = add_marker(x, y, data[i]);
            marker.events.register('mouseover', marker, function (evt) {
                var feature = evt.object.feature;
                var html = gettext('Title:') + ' <strong>' + feature.title + '</strong> (id: ' + feature.id + ')<br/><br/>';
                html += gettext('Description:') + '<br/>' + feature.description + '<br/><br/>';
                 
                $('#info_box').html(html);
            });

            marker.events.register('mouseout', marker, function (evt) {
                $('#info_box').html('');
            });

            checkMarkerZIndex();
        }
    }
}

function get_bounds() {
    var bounds = admin_map.calculateBounds();
    bounds.transform(goog_proj, disp_proj);

    var str = '';
    str += bounds.left + ',';
    str += bounds.bottom + ',';
    str += bounds.right + ',';
    str += bounds.top;  
    return str;
}

function add_marker(lon, lat, data) { 
    var marker = null;
    var ss = null;
    var size = new OpenLayers.Size(23, 20);
    // derived through trial and error.
    var offset = new OpenLayers.Pixel(-2, -16);
    var ll = get_proj_ll(lon,lat);
    
    ss = '{% url frontpage %}static/img/cCastClosed.png';

    var ol_icon = new OpenLayers.Icon(ss, size, offset);
    marker = new OpenLayers.Marker(ll, ol_icon);

    marker.feature = data;
    marker_layer.addMarker(marker);

    return marker;
}

function get_proj_ll(x,y) {
    var ll = new OpenLayers.LonLat(x,y);
    return ll.transform(disp_proj, goog_proj);
}

/*
Terrible hack, but apparently necessary.

Marker events don't work when a select feature control is present.

http://trac.osgeo.org/openlayers/ticket/2035
*/
function checkMarkerZIndex() {
    var olDivs = document.getElementById('{{id}}_map').getElementsByClassName('olLayerDiv');
    for(var i=0; i < olDivs.length;i++){
        if (olDivs[i].id.indexOf('OpenLayers.Layer.Markers') > -1) {
            /* TEMP - will need a dynamic method for this zIndex */
            olDivs[i].style.zIndex = '800';
        }
    }
}

/* END LOCAST */

{{ module }}.write_wkt = function(feat){
  if ({{ module }}.is_collection){ {{ module }}.num_geom = feat.geometry.components.length;}
  else { {{ module }}.num_geom = 1;}
  document.getElementById('{{ id }}').value = {{ module }}.get_ewkt(feat);
}
{{ module }}.add_wkt = function(event){

  // This function will sync the contents of the `vector` layer with the
  // WKT in the text field.
  if ({{ module }}.is_collection){
    var feat = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.{{ geom_type }}());
    for (var i = 0; i < {{ module }}.layers.vector.features.length; i++){
      feat.geometry.addComponents([{{ module }}.layers.vector.features[i].geometry]);
    }
    {{ module }}.write_wkt(feat);
  } else {
    // Make sure to remove any previously added features.
    if ({{ module }}.layers.vector.features.length > 1){
      old_feats = [{{ module }}.layers.vector.features[0]];
      {{ module }}.layers.vector.removeFeatures(old_feats);
      {{ module }}.layers.vector.destroyFeatures(old_feats);
    }
    {{ module }}.write_wkt(event.feature);
  }

    /* LOCAST ADDITION */
    nav.activate();
    /* END LOCAST */
}
{{ module }}.modify_wkt = function(event){
  if ({{ module }}.is_collection){
    if ({{ module }}.is_point){
      {{ module }}.add_wkt(event);
      return;
    } else {
      // When modifying the selected components are added to the
      // vector layer so we only increment to the `num_geom` value.
      var feat = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.{{ geom_type }}());
      for (var i = 0; i < {{ module }}.num_geom; i++){
	feat.geometry.addComponents([{{ module }}.layers.vector.features[i].geometry]);
      }
      {{ module }}.write_wkt(feat);
    }
  } else {
    {{ module }}.write_wkt(event.feature);
  }
}
// Function to clear vector features and purge wkt from div
{{ module }}.deleteFeatures = function(){
  {{ module }}.layers.vector.removeFeatures({{ module }}.layers.vector.features);
  {{ module }}.layers.vector.destroyFeatures();
}
{{ module }}.clearFeatures = function (){
  {{ module }}.deleteFeatures();
  document.getElementById('{{ id }}').value = '';
    // LOCAST ADDITION
    reset_map();
  //{{ module }}.map.setCenter(get_proj_ll({{default_lon}}, {{default_lat}}), {{ default_zoom }});
}
// Add Select control
{{ module }}.addSelectControl = function(){
  var select = new OpenLayers.Control.SelectFeature({{ module }}.layers.vector, {'toggle' : true, 'clickout' : true});
  {{ module }}.map.addControl(select);
  select.activate();
}
{{ module }}.enableDrawing = function(){ {{ module }}.map.getControlsByClass('OpenLayers.Control.DrawFeature')[0].activate();}
{{ module }}.enableEditing = function(){ {{ module }}.map.getControlsByClass('OpenLayers.Control.ModifyFeature')[0].activate();}
// Create an array of controls based on geometry type
{{ module }}.getControls = function(lyr){
  {{ module }}.panel = new OpenLayers.Control.Panel({'displayClass': 'olControlEditingToolbar'});
  nav = new OpenLayers.Control.Navigation();
  var draw_ctl;
  if ({{ module }}.is_linestring){
    draw_ctl = new OpenLayers.Control.DrawFeature(lyr, OpenLayers.Handler.Path, {'displayClass': 'olControlDrawFeaturePath'});
  } else if ({{ module }}.is_polygon){
    draw_ctl = new OpenLayers.Control.DrawFeature(lyr, OpenLayers.Handler.Polygon, {'displayClass': 'olControlDrawFeaturePolygon'});
  } else if ({{ module }}.is_point){
    draw_ctl = new OpenLayers.Control.DrawFeature(lyr, OpenLayers.Handler.Point, {'displayClass': 'olControlDrawFeaturePoint'});
  }
  if ({{ module }}.modifiable){
    var mod = new OpenLayers.Control.ModifyFeature(lyr, {'displayClass': 'olControlModifyFeature'});
    {{ module }}.controls = [nav, draw_ctl, mod];
  } else {
    if(!lyr.features.length){
      {{ module }}.controls = [nav, draw_ctl];
    } else {
      {{ module }}.controls = [nav];
    }
  }
}
{{ module }}.init = function(){
    {% block map_options %}// The options hash, w/ zoom, resolution, and projection settings.
    var options = {
        /* LOCAST ADDITION */
        displayProjection: new OpenLayers.Projection('EPSG:4326'),
        /* END LOCAST */
{% autoescape off %}{% for item in map_options.items %}      '{{ item.0 }}' : {{ item.1 }}{% if not forloop.last %},{% endif %}
{% endfor %}{% endautoescape %}    };{% endblock %}
    // The admin map for this geometry field.
    {{ module }}.map = new OpenLayers.Map('{{ id }}_map', options);
    // Base Layer
    {{ module }}.layers.base = {% block base_layer %}new OpenLayers.Layer.Google("Google Base Layer", {'type': G_NORMAL_MAP, 'sphericalMercator' : true});
    {% endblock %}
    {{ module }}.map.addLayer({{ module }}.layers.base);
    {% block extra_layers %}{% endblock %}
    /* LOCAST ADDITION */
    {% if is_linestring %}
        OpenLayers.Feature.Vector.style["default"]["strokeWidth"] = 4; // Default too thin for linestrings.
        OpenLayers.Feature.Vector.style["default"]["strokeColor"] = '#00AEEF'; 
    {% endif %}
    /* LOCAST ADDITION */

    {{ module }}.layers.vector = new OpenLayers.Layer.Vector(" {{ field_name }}");
    {{ module }}.map.addLayer({{ module }}.layers.vector);
    // Read WKT from the text field.
    var wkt = document.getElementById('{{ id }}').value;
    if (wkt){
      // After reading into geometry, immediately write back to
      // WKT <textarea> as EWKT (so that SRID is included).
      var admin_geom = {{ module }}.read_wkt(wkt);
      {{ module }}.write_wkt(admin_geom);
      if ({{ module }}.is_collection){
	// If geometry collection, add each component individually so they may be
	// edited individually.
	for (var i = 0; i < {{ module }}.num_geom; i++){
	  {{ module }}.layers.vector.addFeatures([new OpenLayers.Feature.Vector(admin_geom.geometry.components[i].clone())]);
	}
      } else {
	{{ module }}.layers.vector.addFeatures([admin_geom]);
      }
      // Zooming to the bounds.
      {{ module }}.map.zoomToExtent(admin_geom.geometry.getBounds());
      if ({{ module }}.is_point){
          {{ module }}.map.zoomTo({{ point_zoom }});
      }
    } else {
        // LOCAST ADDITION
        {{module}}.map.setCenter(get_proj_ll({{default_lon}}, {{default_lat}}), {{default_zoom}});
      //{{ module }}.map.setCenter(new OpenLayers.LonLat({{ default_lon }}, {{ default_lat }}), {{ default_zoom }});
    }
    // This allows editing of the geographic fields -- the modified WKT is
    // written back to the content field (as EWKT, so that the ORM will know
    // to transform back to original SRID).
    {{ module }}.layers.vector.events.on({"featuremodified" : {{ module }}.modify_wkt});
    {{ module }}.layers.vector.events.on({"featureadded" : {{ module }}.add_wkt});
    {% block controls %}
    // Map controls:
    // Add geometry specific panel of toolbar controls
    {{ module }}.getControls({{ module }}.layers.vector);
    {{ module }}.panel.addControls({{ module }}.controls);
    {{ module }}.map.addControl({{ module }}.panel);
    {{ module }}.addSelectControl();
    // Then add optional visual controls
    {% if mouse_position %}{{ module }}.map.addControl(new OpenLayers.Control.MousePosition());{% endif %}
    {% if scale_text %}{{ module }}.map.addControl(new OpenLayers.Control.Scale());{% endif %}
    {% if layerswitcher %}{{ module }}.map.addControl(new OpenLayers.Control.LayerSwitcher());{% endif %}
    // Then add optional behavior controls
    {% if not scrollable %}{{ module }}.map.getControlsByClass('OpenLayers.Control.Navigation')[0].disableZoomWheel();{% endif %}

    /* LOCAST ADDITIONS */
    admin_map = {{ module }}.map;
    admin_map.events.on({'moveend' : on_map_move})

    vector_layer = {{module}}.layers.vector;
    marker_layer = new OpenLayers.Layer.Markers('Markers');
    {{ module }}.map.addLayer(marker_layer);

    on_map_move();
    /* END LOCAST */

    {% endblock %}
    if (wkt){
      if ({{ module }}.modifiable){
        {{ module }}.enableEditing();
      }
    } else {
      {{ module }}.enableDrawing();
    }
}
