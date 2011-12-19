from django.conf.urls.defaults import *

urlpatterns = patterns('travels.api',

    # CAST
    url(r'^cast/(?P<cast_id>\d+)/media/(?P<media_id>\d+)/$', 'cast.CastAPI', name='cast_media_api_single', kwargs={'method':'media_content'}),
    url(r'^cast/(?P<cast_id>\d+)/media/$', 'cast.CastAPI', name='cast_media_api', kwargs={'method':'media'}),

    # comments
    url(r'^cast/(?P<cast_id>\d+)/comments/(?P<comment_id>\d+)/flag/$', 'cast.CastAPI', name='cast_comments_api_single', kwargs={'method':'comments_flag'}),
    url(r'^cast/(?P<cast_id>\d+)/comments/(?P<comment_id>\d+)/$', 'cast.CastAPI', name='cast_comments_api_single', kwargs={'method':'comments'}),
    url(r'^cast/(?P<cast_id>\d+)/comments/$', 'cast.CastAPI', name='cast_comments_api', kwargs={'method':'comments'}),
    
    url(r'^cast/(?P<cast_id>\d+)/favorite/$', 'cast.CastAPI', kwargs={'method':'favorite'}),
    url(r'^cast/(?P<cast_id>\d+)/flag/$', 'cast.CastAPI', kwargs={'method':'flag'}),

    url(r'^cast/(?P<cast_id>\d+)/geofeature/$', 'cast.CastAPI', kwargs={'method':'geofeature'}),

    url(r'^cast/(?P<cast_id>\d+)(?P<format>\.\w*)/$', 'cast.CastAPI'),
    url(r'^cast/(?P<cast_id>\d+)/$', 'cast.CastAPI', name='cast_api_single'),
    url(r'^cast/$', 'cast.CastAPI', name='cast_api'),

    # USER
    url(r'^user/(?P<user_id>\d+)/$', 'user.UserAPI', name='user_api_single'),
    url(r'^user/me$', 'user.UserAPI', kwargs={'method':'me'}),
    url(r'^user/$', 'user.UserAPI', name='user_api'),

    # ITINERARY
    url(r'^itinerary/(?P<itin_id>\d+)/favorite/$', 'itinerary.ItineraryAPI', kwargs={'method':'favorite'}),

    url(r'^itinerary/(?P<itin_id>\d+)/cast/(?P<cast_id>\d+)/$', 'cast.CastAPI', name='itinerary_api_cast_single'),
    url(r'^itinerary/(?P<itin_id>\d+)/cast/$', 'cast.CastAPI', name='itinerary_cast_api'),

    url(r'^itinerary/(?P<itin_id>\d+)/$', 'itinerary.ItineraryAPI', name='itinerary_api_single'),
    url(r'^itinerary/$', 'itinerary.ItineraryAPI', name='itinerary_api'),

    # EVENT
    url(r'^event/(?P<event_id>\d+)/geofeature/$', 'event.EventAPI', kwargs={'method':'geofeature'}),
    url(r'^event/(?P<event_id>\d+)/$', 'event.EventAPI', name='event_api_single'),
    url(r'^event/$', 'event.EventAPI', name='event_api'),

    # SEARCH
    url(r'^search/$', 'search.unified_search_api', name='search_api'),

    # get_features
    url(r'^geofeatures/$', 'geofeatures.get_geofeatures', name='geofeatures_api'),

)
