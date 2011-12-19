from locast.api import * 
from locast.api import qstranslate, exceptions 

from django.contrib.gis.geos import Polygon
from django.db.models import Q

from travels import models
from travels.api.cast import CastAPI

def get_geofeatures(request):
    bounds_param = get_param(request.GET, 'within')
    query = request.GET.copy()
    
    if bounds_param:
        pnts = bounds_param.split(',')

        bbox = (float(pnts[0]), float(pnts[1]), 
                float(pnts[2]), float(pnts[3]))

        poly = Polygon.from_bbox(bbox)
        poly.set_srid(4326)

        del query['within']

    base_query = Q()
    if bounds_param:
        base_query = base_query & Q(location__within=poly)

    # cast within bounds
    cast_base_query = models.Cast.get_privacy_q(request) & base_query

    q = qstranslate.QueryTranslator(models.Cast, CastAPI.ruleset, cast_base_query)
    casts = q.filter(query)

    cast_arr = []
    for c in casts:
        if c.location:
            cast_arr.append(geojson_serialize(c, c.location, request))

    #event within bounds
    events = models.Event.objects.filter(base_query)

    event_arr = []
    for e in events:
        if e.location:
            event_arr.append(geojson_serialize(e, e.location, request))

    # itinerary intersects bounds
    if bounds_param:
        base_query = Q(path__intersects = poly)

    itins = models.Itinerary.objects.filter(base_query)

    itin_arr = []
    for i in itins:
        if i.path:
            itin_arr.append(geojson_serialize(i, i.path, request))

    features_dict = {}
    features_dict['casts'] = dict(type='FeatureCollection', features=cast_arr)
    features_dict['events'] = dict(type='FeatureCollection', features=event_arr)
    features_dict['itineraries'] = dict(type='FeatureCollection', features=itin_arr)
    
    dict(casts = cast_arr, events = event_arr,
            itineraries = itin_arr)

    return APIResponseOK(content=features_dict)

