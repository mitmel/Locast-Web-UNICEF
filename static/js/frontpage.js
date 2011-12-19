var main_map = null;

/********/
/* INIT */
/********/

$(function() {
    // map
    on_resize();
    setup_map();
    itinerary_list_refresh();

    // dhtml
    activateDHTML();
    fix_openlayers_zoombar();

    //fancybox for bottom links
    $('#footer-links a').fancybox();

    on_filter_checkboxes(false);

    // async call
    map_cast_list_refresh();

    // sync call. This turns off the loader box on callbackself.map.setBaseLayer(self.gterrainLayer);

    map_refresh(true);

    // from frontpage_views.js
    frontpage_app.run();

    //check chrome frame
    CFInstall.check({ 
        mode:'overlay'
    });
});

function on_resize() {

    var height = $(window).height();
    var width = $(window).width(); 

    //if we are on a static form then make the page the height of the form so that scrolling works on mobile
    if($('#main-content .static-form').length == 0) {
         $('#main-map').add('#content-details').height(height);
    }
    else {
        $('#footer').add('#fdbk_tab').addClass('form');
        var min_height = height
            - parseInt($('#main-content .static-form').css('margin-top')) 
            - $('#header').height()
            - 10;
        $('#main-content .static-form').css('min-height',min_height);    
        $('body').height($('#main-content .static-form').height()).css('overflow', 'auto');
    }

    $('#main-map').width(width);
    $('#map-list').height(height-100);
    map_cast_list_height();
}

$(window).resize(on_resize);

function map_cast_list_height() {
    /*var height = $(window).height() 
        - $('#map-cast-list-title').height() -2
        - parseInt( $('#map-cast-list-title').css('margin-top')) 
        - parseInt( $('#map-cast-list-title').css('padding-top')) 
        - parseInt( $('#map-cast-list-title').css('padding-bottom')) 
        - parseInt( $('#map-cast-list-title').css('padding-top')); 

    $('#map-cast-list .locast-list').add('#map-cast-list').height(height);
    refresh_custom_scroll();*/

    var height = $(window).height - parseInt( $('#footer').height());
    $('#map-info-container').height(height);
}

function activateDHTML(){

    activate_search_bar();
 

    // map reset button
    $('#map-reset').click(function() {
        reset_map();
    });

    //view switcher
    //
    
    $('#map-info-container').click(function(e){
            if($(e.target).is('#map-cast-list-title a')||$(e.target).is('#map-cast-list-title li')){
                return;
            }     
                $('#view-switch-map').addClass('selected');
                $('#view-switch-list').removeClass('selected');
                $('#map-info-container').fadeOut(100);
    });

    $('#view-switcher a').click(function(e){
        var isMap = $(this).hasClass('map');
        if(isMap){
            $('#view-switch-map').addClass('selected');
            $('#view-switch-list').removeClass('selected');
            $('#map-info-container').fadeOut(100);
        }else{
            $('#view-switch-map').removeClass('selected');
            $('#view-switch-list').addClass('selected');
            $('#map-info-container').fadeIn(100);
        }
        return false;
    });

    $('#add-cast-button').click(function() {
        if (!TRAVELS_USER) {
            prompt_login();
        }
        else {
            activate_cast_add();
        }
    });

    // activate top nav lists
    $('#content-lists').find('h3').click(
        function(event){ 
            toggle_nav_list(event);
        }
    );

    // activate login button at top
    $('#login-link').add('#login-container-close').click(function() {
        $('#login-container').toggleClass('hidden');
        return false;
    });

    //activate map filters 
    $('#content-lists .checkbox').click(
        function(e){
            var checkbox = $('input',this);           
            if(checkbox.attr('checked')){ 
                checkbox.removeAttr('checked');
                $(this).removeClass('checked');
            }else{
                checkbox.attr('checked', true);
                $(this).addClass('checked');
            }
            on_filter_checkboxes(true); 
        }
    );

    //activate disabling map filters in map-title
    $('.filter-title', '#map-title').click(function(event){
        var filter_type = $(this).attr('id');
        switch(filter_type) {
            case 'o-filter-title':
                $('.checkbox' , '#official-cast-list-container').click();    
                break;
            case 'c-filter-title':
                $('.checkbox' , '#community-cast-list-container').click();    
                break;
            case 'e-filter-title':
                $('.checkbox' , '#event-list-container').click();    
                break;
            case 'i-filter-title':
                $('.checkbox' , '#itinerary-list-container').click();    
                break; 
        }
        return false;
    });


    // Flowplayer overlay interactions
    $('#flowplayer-close').click(function() {
        $('#flowplayer-container').addClass('hidden');
        $('#flowplayer-player').html('');
        return false;
    });

    // Itinerary and user box draggable
    $('#cast-add-container').draggable({containment:'#main-map'});

    // orderby switchers
    $('#cast-list-sort a').click(function() {
        $(this).siblings('.selected').removeClass('selected');
        $(this).addClass('selected');
        map_cast_list_refresh();
    });

}    

/*******
 * MAP *
 *******/

function setup_map() {
    main_map = new Map(MAP_DEFAULTS);
    main_map.init('main-map');
    main_map.map.events.on({'moveend' : on_map_move });
    
    //checkbox for aerial map
    $('#pl-checkbox').click(function(){
        var is_checked = $(this).attr('checked');
        if(is_checked == 'checked'){
            main_map.tmsOverlayVisible(true);
            $('#osm-checkbox').removeAttr('checked');
        }else{
            main_map.tmsOverlayVisible(false);
        } 
    });
    //checkbox for osm
    $('#osm-checkbox').click(function(){
        var is_checked = $(this).attr('checked');
        if(is_checked == 'checked'){
            main_map.osmLayerSwitcher(true);
            $('#pl-checkbox').removeAttr('checked');
        }else{
            main_map.osmLayerSwitcher(false);
        } 
    });
}

function reset_map() {
    var center = MAP_DEFAULTS['center'];
    main_map.setCenter(center[0], center[1]);
    main_map.map.zoomTo(MAP_DEFAULTS['zoom']);
}

CAST_FADE_IN = false;
function on_map_move() {
    if ( CAST_FADE_IN ) {
        // see: frontpage_views.cast_single_view
        cast_fade_in();
        CAST_FADE_IN = false;
    }
}

MAP_REFRESH_ACTIVE = false;
MAP_LIST_REFRESH_ACTIVE = false;

function check_map_loader() {
    if ( MAP_REFRESH_ACTIVE || MAP_LIST_REFRESH_ACTIVE ) {
        $('#map-loader').fadeIn();
    }
    else {
        $('#map-loader').fadeOut();
    }
}

function map_refresh(disable_async) {

    // this looks dumb but i think its cleaner.
    var async = true;
    if ( disable_async ) {
        async = false;
    }

    main_map.clearPopups();    

    var query = get_cast_filter_query();

    MAP_REFRESH_ACTIVE = true;
    check_map_loader();

    // refresh the map

    $.ajax({
        async: async,
        cache: false,
        url: FEATURES_API_URL + query,
        success: map_refresh_cb
    })
    
    // refresh the sidebar list of casts
    // only on an asynchronous call.
    if ( async ) {
        map_cast_list_refresh();
    }
}

function map_refresh_cb(data) {
    main_map.clearFeatures();
    main_map.renderFeatures(data); 
    if ( ITIN_ID_FILTER ) {
        highlightItinerary( ITIN_ID_FILTER );
    }

    MAP_REFRESH_ACTIVE = false;
    check_map_loader();
}

var map_cast_list_page = 1;
var pagesize = 9;

function map_cast_list_refresh(maintain_page) {
    if ( !maintain_page ) {
        map_cast_list_page = 1;
    }

    var query = get_cast_filter_query();
    var orderby = $('.selected', '#cast-list-sort')
        .attr('id').split('_')[1];

    if ( query ) { query += '&'; }
    query += 'page=' + map_cast_list_page + '&pagesize=' + pagesize + '&orderby=' + orderby;

    MAP_LIST_REFRESH_ACTIVE = true;
    check_map_loader();
   
    var resp = $.ajax({
        url: CAST_API_URL + query,
        cache: false,
        success: function(data) {
            var page = resp.getResponseHeader('X-Page-Number');
            var total = 
                Math.ceil(resp.getResponseHeader('X-Object-Total')/pagesize);

            map_cast_list_cb(data, page, total);
        }
    });
}

function map_cast_list_cb(data, page, total) {
    var ca_data = {
        casts: data
    }

    $('#map-cast-list-pager').pager({ 
        pagenumber: page,
        pagecount: total,
        buttonClickCallback: function (pgnum) {
            map_cast_list_page = pgnum;
            map_cast_list_refresh(true);
        }
    });

    var html = '<h3 class="alert">' + gettext('No Casts on Map') + '</h3>';
    //if there are no casts then insert some html 
    if( ca_data['casts'].length > 0 ) {
        html = render_to_string('mapCastList.js.html', ca_data);
    }

    $('#map-cast-list .list-content').html(html);
    map_cast_list_height();
    $('#map-cast-list').hide().fadeIn(200);
   
    MAP_LIST_REFRESH_ACTIVE = false;
    check_map_loader();
}


/**********
 * HEADER *
 **********/

// called when something is done that requires login
function prompt_login() {
    $('#login-container').removeClass('hidden');
    $('#login-alert').fadeIn(300);
    $('#login-alert').delay(6000).fadeOut(300);
}

function official_cast_list_refresh() {
    $.ajax({
        url: CAST_API_URL + '?official=true',
        success: official_cast_list_cb
    });
}

function official_cast_list_cb(data){
    var ca_data = {
        casts: data
    }

    var html = render_to_string('castHeaderList.js.html', ca_data);
    $('#official-cast-list').html(html);
    page_header_list($('#official-cast-list'));
}

function community_cast_list_refresh() {
    $.ajax({
        url: CAST_API_URL + '?official=false',
        success: community_cast_list_cb
    });
}

function community_cast_list_cb(data){
    var ca_data = {
        casts: data
    }

    var html = render_to_string('castHeaderList.js.html', ca_data);
    $('#community-cast-list').html(html);
    page_header_list($('#community-cast-list'));
}

function event_list_refresh() {
    $.ajax({
        url: EVENT_API_URL,
        success: event_list_cb
    });
}

function event_list_cb(data){
    var ca_data = {
        casts: data
    }

    var html = render_to_string('eventHeaderList.js.html', ca_data);
    $('#event-list').html(html);

    format_date($('.date', '#event-list-container'), false);
    $('.event-dates', '#event-list-container').each(function() {
        var same_day = is_same_day(
            $('.event-start-date', this).attr('title'),
            $('.event-end-date', this).attr('title'));

        if(same_day) {
            $('.date-range',this).addClass('hidden')
        }
    });

    page_header_list($('#event-list'));
}

function itinerary_list_refresh() {
    $.ajax({
        url:  BASE_URL + '/api/itinerary/', 
        success: itinerary_list_cb
    });
}

function itinerary_list_cb(data) { 
    var it_data={
        itineraries: data    
    } 

    var html = render_to_string('itinHeaderList.js.html', it_data);
    $('#map-list').add('#intro-map-list').html(html); 

    //map list reveal 
    $('#map-title').add('#map-list a').click(function(){
        $('#map-list').slideToggle(100);
        var right = $('#current-map .arrow').hasClass('right');
        if(right){ 
            $('#current-map .arrow').removeClass('right').addClass('down');
        }else{
             $('#current-map .arrow').removeClass('down').addClass('right');
        }
        //return false;
    }); 
}

function page_header_list(target_list) { 
       $('.locast-list',target_list).quickPager({
            pageSize: 9,
            pagerLocation: 'before',
            onPage: function(){
            }
       });

       //refresh_custom_scroll();               
}

function toggle_nav_list(e){
    //ignore if the element clicked in the header is a checkbox
    if($(e.target).hasClass('checkbox') == true){ return; }

    //get the locast-block (holds the nav list)
    var tog_tar = $(e.target).siblings('.locast-block');
    $(tog_tar).toggleClass('closed', 0); 

    // refresh the content
    if ( !$(tog_tar).hasClass('closed') ) {
        refresh_nav_list(tog_tar);
    }

    //unset map filter when content list is opened
    var checkbox = $('.checkbox input', e.target);
    if(checkbox.attr('checked') == undefined && 
       $(tog_tar).hasClass('closed') == false) {

        checkbox.attr('checked', true);
        $('.checkbox', e.target).addClass('checked');
        on_filter_checkboxes(true); 
    }

    // close all nav lists except target
    close_nav_list(tog_tar);

    //format dates in event lists
    
    // TODO: find a better place than this
    //refresh_custom_scroll($('#content-lists')); 
}

function refresh_nav_list(target) {
    var id = $(target).parent().attr('id');
    $('.locast-block', '#' + id).html('loading...');

    switch(id) {
        case 'itinerary-list-container':
            itinerary_list_refresh();
            break;

        case 'official-cast-list-container':
            official_cast_list_refresh();
            break;

        case 'community-cast-list-container':
            community_cast_list_refresh();
            break;

        case 'event-list-container':
            event_list_refresh();   
            break;
    }
}

function close_nav_list(target) {
    if(typeof(target) == 'undefined') {
        $('#content-lists .locast-block').addClass('closed',0);
    }
    else {  
        $('#content-lists .locast-block').not(target).addClass('closed',0);
    }
}

function slideToPreview(e){ 
    locastScrollBar('.locast-preview-description' , e.target);
    $(e.target).closest('li')
        .find('.locast-content-preview')
        .toggleClass('closed', 300);
    $(e.target).closest('.locast-list').add('#itinerary-list .simplePagerNav').toggleClass('closed', 300); 
}

/* SEARCH BAR */

function activate_search_bar() {
    var default_val = gettext('search for maps, casts or people');
    var search_input = $('#search-input');
    var search_results = $('#search-results');    
   
    // keep track if search is active
    var search_active = false;

    search_input.val(default_val);

    var reset_search = function(){
        search_input.val(default_val);
        search_active = false;
        search_results.fadeOut();
    };
   
    //fade out results when they lose focus
    search_results.attr('tabindex', -1).focusout( function(e){ 
        search_results.fadeOut();
    });
    
    //on keypress return focus to search input
    search_results.keydown(function(e){
         if(e.keyCode == 13 || e.keyCode == 8){
            e.preventDefault();
            return false;
        } else{
            search_input.focus();
        }
    });
 
    //set timeout to reset search input when it loses focus
    search_input.focusout(function(e){ 
        var reset = setTimeout(reset_search, 3000);
        $(search_input).data('timer', reset);
    });

    //remove timeout and clear search input when it gains focus
    search_input.focusin(function() { 
        clearTimeout($(search_input).data('timer'));
        if(search_active == false){
            $(this).val('');
            search_active = true;
        }
    });

    //execute search on pressing enter
    search_input.keydown(function(e) {
        if(e.keyCode == 13){
            e.preventDefault();
            universal_search(search_input.val());
            return false;
        }   
    });

    search_input.keyup(function() {
        clearTimeout($(search_input).data('timer'));

        var do_search = function() {
            universal_search(search_input.val());
        }

        var wait = setTimeout(do_search, 500);
        $(search_input).data('timer', wait);
    });
}

var last_search = '';

function universal_search(keyword) {
    if ( keyword.length && !(keyword == last_search) ) {
        last_search = keyword;
        $.ajax({
            url: SEARCH_API_URL,
            data: {q:keyword},
            type: 'GET',
            success: function(result) { 
                var html = render_to_string('searchResults.js.html', result);
                $('#search-results').fadeIn(15).html(html).focus();
            }
        });
    }
}

/***********
 * FILTERS *
 ***********/

var ITIN_ID_FILTER = '';
var AUTHOR_FILTER = '';
var CAST_TYPE_FILTER = '';
var TAG_FILTER = '';

function get_cast_filter_query() {
    // this is set by the checkboxes.
    var query = CAST_TYPE_FILTER;

    if ( ITIN_ID_FILTER ) {
        if ( query ) { query += '&'; }
        query += 'itinerary=' + ITIN_ID_FILTER;
    }

    if ( AUTHOR_FILTER ) {
        if ( query ) { query += '&'; }
        query += AUTHOR_FILTER;
    }

    if ( TAG_FILTER ) {
        if ( query ) { query += '&'; }
        query += 'tags=' + TAG_FILTER;
    }

    query = '?' + query;
    return query;
}

function clear_cast_filters() {
    ITIN_ID_FILTER = '';
    AUTHOR_FILTER = '';
    CAST_TYPE_FILTER = '';
    TAG_FILTER = '';
}

function on_filter_checkboxes(refresh_map) {
    var official_on = true;
    var community_on = true;
    var events_on = true;
    var itinerary_on = true;
    $('.filter-title' , '#map-title').add('#filter-desc').hide();
    $('#content-lists input:not(:checked)').each(function() {
        var name = $(this).attr('name');
        if (name == 'official-cast-filter') { 
            official_on = false;
            $('#o-filter-title').add('#filter-desc').show();
        }
        else if (name == 'community-cast-filter') { 
            community_on = false;
            $('#c-filter-title').add('#filter-desc').show();
        }
        else if ( name == 'itinerary-filter' ) {
            itinerary_on = false;
            $('#i-filter-title').add('#filter-desc').show();
        }
        // event checkbox
        else { 
            events_on = false;
            $('#e-filter-title').add('#filter-desc').show();
        }
    });

    main_map.eventLayer.setVisibility(events_on);
    main_map.itineraryLayer.setVisibility(itinerary_on);

    if ( official_on || community_on ) {
        main_map.castLayer.setVisibility(true);
        CAST_TYPE_FILTER = ''

        if ( official_on && !community_on ) {
            CAST_TYPE_FILTER = 'official=true'

        }
        else if ( community_on && !official_on ) {
            CAST_TYPE_FILTER = 'official=false'
        }
        if ( refresh_map ) {
            map_refresh();
        }
    }
    else {
        // clear the cast list
        $('#map-cast-list .list-content').html('<h3 class="alert">' + gettext('No Casts on Map') + '</h3>');
        main_map.castLayer.setVisibility(false);
    }
}

/***********
 * HELPERS *
 ***********/

function activate_cast_add() {
    var cast_add_container = $('#cast-add-container');
    var cast_add_html = render_to_string('castAddForm.js.html');
    cast_add_container.html(cast_add_html);

    var action = CAST_API_URL;

    // If there is an active itinerary, assume we are adding it to that.
    if ( ITIN_ID_FILTER ) {
        action = ITINERARY_API_URL + ITIN_ID_FILTER + '/cast/';
    }

    $('#cast-add-form').attr('action', action);

    $('#cancel-cast-add').click(function() {
        cast_add_form_clear(); 
        return false;
    });

    $('#cast-add-form').submit(cast_add_form_submit);

    cast_add_container.fadeIn();

    if ( ITIN_ID_FILTER ) {
        $('#add-cast-itinerary_' + ITIN_ID_FILTER)
        .add('#close-itinerary_' + ITIN_ID_FILTER)
        .add('.open-itinerary')
            .fadeOut(0);
    }

    $('#content-lists')
    .add('#map-title')
    .add('#map-info-container')
    .add('#add-cast-button-container')
    .add('#search-bar')
        .fadeOut(0);

    main_map.addCastControl.activate();

    return false;
}

function cast_add_form_clear() {
    var cast_add_container = $('#cast-add-container');
    cast_add_container.fadeOut();
    main_map.addCastControl.deactivate();
    if ( main_map.addCastPoint ) {
        main_map.addCastPoint.destroy();
        main_map.addCastPoint = null;
    }
    cast_add_container.html('');

    if ( ITIN_ID_FILTER ) {
        $('.itinerary-add-cast') 
        .add('#itinerary-info .locast-icon.close')
        .add('.open-itinerary')
            .fadeIn(200);
    }

    if($('#view-switch-list').hasClass('selected')){
        $('#map-info-container').fadeIn(200);
    }   

    $('#content-lists')
        .add('#map-title')
        .add('#add-cast-button-container')
        .add('#search-bar')
            .fadeIn(200);

}

function cast_add_form_submit(e) {
    if ( main_map.addCastPoint ) {
        var obj = $('#cast-add-form').serializeObject();
        var x = main_map.addCastPoint.geometry.x;
        var y = main_map.addCastPoint.geometry.y;
        var ll = main_map.get_disp_ll(x,y);
        obj['location'] = [ll.lon, ll.lat];

        var url = $('#cast-add-form').attr('action');
        var data = JSON.stringify(obj, null, 2);

        $.ajax({
            url: url, 
            data: data,
            contentType: 'application/json; charset=utf-8',
            type: 'POST',
            error: function(error){
                var message = jQuery.parseJSON(error.responseText);
                if(message.location != undefined){ 
                    $('#cast-add-error').text(gettext('The Location you Selected is Outside Abruzzo! Select a Location in Abruzzo.')).fadeIn();
                }
                if(message.title != undefined){
                    $('#cast-add-error').text(gettext('Enter a Title for Your Cast')).fadeIn();
                }
            },
            success: function(cast) { 
                cast_add_form_clear();
                map_refresh();
                frontpage_app.setLocation('#!cast/' + cast.id + '/'); 
            }
        });
    }

    else {
        $('#cast-add-error').text(gettext('Click the Map to Select a Location for Your Cast')).fadeIn();
    }

    // prevent default form handling
    e.returnValue = false;
    return false;
}

function activate_favorite_button(type, id, url) {
    $('#favorite-' + type + '_' + id).click(function() {
        if ( TRAVELS_USER ) {
            var _this = $(this);
            var data = null;

            var val = parseInt($('#favorite-count-' + type + '_' + id).html());

            // unfavorite
            if ( !_this.hasClass('favorited') ) {
                data = {'favorite' : true}
                val++;
            }
            else {
                data = {'favorite' : false}
                val--;
            }

            $('#favorite-count-' + type + '_' + id).html(val);

            _this.toggleClass('favorited');

            $.ajax({
                url: url, 
                data: data,
                contentType: 'application/json; charset=utf-8',
                type: 'POST',
                success: function(result) { 
                }
            });
        }
        else {
            prompt_login();
        }

        return false;
    });
}

function check_extension(filename, valid_extensions) {
    var ext = filename.split('.').pop().toLowerCase();;
    for ( i in valid_extensions ) {
        if ( valid_extensions[i] == ext ) {
            return true;
        }
    }
    return false;
}

function create_uploader(container, content_type, url, callback) {
    var file_list = container + '-list';
    var chooser = container + '-chooser';

    var filters = {};
    var max_file_size = '';
    var extensions = '';

    if ( content_type == 'videomedia' ) {
        filters = { 
            title: 'Video file', 
            extensions: '3gp,mp4,mov,mpg,mpeg',
        }
        max_file_size = '100mb';
    }
    else if ( content_type == 'imagemedia' ) {
        filters = { 
            title: 'Photo file', 
            extensions: 'jpg,jpeg,png' 
        }
        max_file_size = '1mb';
    }

    var extensions_arr = filters['extensions'].split(',');

    var uploader = new plupload.Uploader({
        runtimes : 'html5,flash',
        browse_button : chooser,
        container : container,
        max_file_size : max_file_size,
        url : url,
        filters : [
            filters
        ],

        // Flash settings
        urlstream_upload: true,
        flash_swf_url : MEDIA_URL + 'js/plupload/plupload.flash.swf',
    });

    var upload_info = $('#' + uploader.settings.container).parent().find('.upload-info');

    uploader.bind('Init', function(up, params) {
        //$('#upload-debug').html("<div>Current runtime: " + params.runtime + "</div>");
    });

    uploader.bind('FilesAdded', function(up, files) {
        $('#' + file_list).html('');

        $.each(files, function(i, file) {
            if ( check_extension(file.name, extensions_arr) ) {
                var html = '';
                html += '<h6 id="' + file.id + '" class="upload-file">';
                html += file.name + ' (' + plupload.formatSize(file.size) + ')';
                html += '<div class="upload-progress"></div>';
                html += '</h6>';

                $('#' + file_list).append(html);
                upload_info.removeClass('hidden');
            }
            else {
                $('#' + file_list).append('<h6 class="upload-file">' + 
                    gettext('Invalid file type!') + '</h6>');
                up.removeFile(file);
                upload_info.addClass('hidden');
            }
        });

        // only 1 file allowed
        if (up.files.length > 0) { 
            up.removeFile(up.files[0]);
        }

        up.refresh();
    });

    var uploading_txt = gettext('Uploading: ');

    uploader.bind('UploadProgress', function(up, file) {
        $('#' + file.id + ' .upload-progress').html(uploading_txt + file.percent + '%');
    });

    uploader.bind('FileUploaded', function(up, file) {
        $('#' + file.id + ' .upload-progress').html(uploading_txt + gettext('Done!'));
        if ( callback ) { 
            callback(); 
        }
    });

    uploader.bind('Error', function(up, error) {
        var msg = error.message;
        if ( error.code == -600 ) {
            //file size error
            msg = gettext('File too large.');
        }
        if ( error.code == -601 ) {
            //file type error, this is checked before hand
            msg = '';
        }
        upload_info.addClass('hidden');
        $('#' + file_list).append('<h6 class="upload-file">' + msg + '</h6>');
    });

    uploader.init();
    return uploader;
}

function activate_upload_form(form_id, url, uploader) {
    $('#' + form_id).submit(function(event) { 
        var obj = $('#' + form_id).serializeObject();
        var data = JSON.stringify(obj, null, 2);

        $.ajax({
            url: url,
            data: data,
            type: 'POST',
            success: function(media) { 
                uploader.settings.url = url + media.id + '/'
                uploader.start();
                $('#' + form_id)[0].reset();
            }
        });

        // prevent default form handling
        event.returnValue = false;
        return false;
    });
}

function locastScrollBar(scroll_el){
$(scroll_el).each(function(){

    var viewport = $(this); 

    //check if target has scrollbar html already
    var has_scroll = $(viewport).hasClass('locast-scroll-container');

    //measure contents and viewport to see if it needs to scroll
    var init_h = $(viewport).height();
    var children = $(viewport).children();
    var child_h = 0;
    
    $(children).each(function(){
        child_h += $(this).height();
    });

    if( child_h > init_h ) {
        
        //if no scrollbar html, add it
        if (has_scroll == false) {
            $(viewport).children().wrapAll('<div class="locast-scroll-box cleared"></div>');
            $(viewport).addClass('locast-scroll-container').append('<div class="locast-scroll-bar-wrapper"><div class="locast-scroll-bar"></div></div>');
        }
        else {
            $('.locast-scroll-bar', $(viewport)).slider('destroy');
        }
        
        //re-measure and calculate scroll bar and scroll handle dimensions
        var content = $(viewport).find('.locast-scroll-box');
        var viewport_h = $(viewport).height();
        var content_h = $(content).height();

        var dif = content_h-viewport_h+70;

        var pro = dif/content_h;
        var handle_h = Math.round((1-pro)*viewport_h);
        var actual_range = viewport_h - handle_h; 
        var bar_padding = handle_h*.5;
        $('.locast-scroll-bar-wrapper', $(viewport)).height(viewport_h);
        $('.locast-scroll-bar', $(viewport)).height(actual_range).css('top',bar_padding);
        
        //handles scrollbar events
        function scrollContent(event, ui){
            var content_pos = -((100-ui.value)*dif/100)
            $(content).css('margin-top',content_pos+'px');
        }
        
        var slider_op = {
            max:100,
            min: 0,
            value:100,
            orientation:'vertical',
            create: function(event,ui){
                $('.ui-slider-handle', $(viewport)).height(handle_h).css('margin-bottom',-(handle_h*.5));
                scrollContent(event, ui);
            },
            slide: function(event,ui){
                scrollContent(event, ui);
            },
            change: function(event,ui){
                scrollContent(event, ui);
            }
        }
        
        $('.locast-scroll-bar', $(viewport)).slider(slider_op);

        //handle clicks on scrollbar
        $('.locast-scroll-bar-wrapper', $(viewport)).click(function(event){
            var offset =  $(event.target).offset();
            var y = event.pageY - offset.top;
            if(y <= bar_padding){
                $(event.target).children('.locast-scroll-bar').slider('value', 100);
            }
            if(y >= (actual_range+bar_padding)){
                $(event.target).children('.locast-scroll-bar').slider('value', 0);
            }
                
        });

        //code to make scroll responsive to mousewheel requires jquery mousewheel plugin
        $(viewport).mousewheel(function(event, delta){
            var speed = 4;
            var slider_val =  $(viewport).find('.locast-scroll-bar').slider('value');
            slider_val += (delta*speed);
                $(viewport).find('.locast-scroll-bar').slider('value', slider_val);
            event.preventDefault();
        });                  
    }     
});
}

function refresh_custom_scroll(scope) {
    if(typeof(scope) == 'undefined'){scope = $('body');}
       
    //recalculate scroll bars
    var scroll_elements = $('.scrolling', scope);
    locastScrollBar(scroll_elements);
}

function make_p (t){
    //check if text already has <p> tags
    if($('p', t).length == 0) {
        var raw_t = $(t).text();
        var new_t = p(raw_t); 
        $(t).html(new_t);
    } else { 
        return;
    }
}

