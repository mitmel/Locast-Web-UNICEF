from locast.api import *
from locast.api import rest, qstranslate, exceptions
from locast.auth.decorators import require_http_auth, optional_http_auth

from travels.models import Event

class EventAPI(rest.ResourceView):

    ruleset = {
        # Authorable
        'author'        :    { 'type' : 'string', 'alias' : 'author__username' },
        'created'       :    { 'type' : 'datetime' },
        'modified'      :    { 'type' : 'datetime' },

        # Titled
        'title'         :    { 'type' : 'string' },
        'description'   :    { 'type' : 'string' },

        # Taggable
        'tags'          :    { 'type' : 'list' },

        # Locatable
        'dist'          :    { 'type': 'geo_distance', 'alias' : 'location__distance_lte' },
        'within'        :    { 'type': 'geo_polygon', 'alias' : 'location__within' },

        # event
        'start_date'    :    { 'type' : 'datetime' },
        'end_date'      :    { 'type' : 'datetime' },
    }


    @optional_http_auth
    def get(request, event_id=None):

        if event_id:
            event = get_object(Event, id=event_id)

            if not event.allowed_access(request.user):
                raise exceptions.APIForbidden
                
            event_dict = api_serialize(event, request)
            
            return APIResponseOK(content=event_dict, total=1)

        else:
            q = qstranslate.QueryTranslator(Event, EventAPI.ruleset)
            query = request.GET.copy()

            objs = total = pg = None
            try:
                objs = q.filter(query)
                objs, total, pg = paginate(objs, query)
            except qstranslate.InvalidParameterException, e:
                raise exceptions.APIBadRequest(e)

            event_arr = []
            for m in objs:
                event_arr.append(api_serialize(m, request))

            return APIResponseOK(content=event_arr, total=total, pg=pg)


    def get_geofeature(request, event_id):
        event = get_object(Event, id=event_id)

        if not event.allowed_access(request.user):
            raise exceptions.APIForbidden

        if event.location:
            geojson = geojson_serialize(event, event.location, request)
            return APIResponseOK(content=geojson)
        else:
            raise exceptions.APINotFound('No location')

