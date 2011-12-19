from locast.api import *
from locast.api import rest, qstranslate, exceptions
from locast.auth.decorators import require_http_auth, optional_http_auth

from travels.models import Itinerary

class ItineraryAPI(rest.ResourceView):

    ruleset = {
        # Authorable
        'title'         :    { 'type' : 'string' },
        'description'   :    { 'type' : 'string' },

        # Taggable
        'tags'          :    { 'type' : 'list' },

        # Favoritable
        'favorited_by'  :    { 'type': 'int' },

        # Itinerary
        'within'        :    { 'type': 'geo_polygon', 'alias' : 'path__intersects' },
    }


    @optional_http_auth
    def get(request, itin_id = None):

        if itin_id:
            itinerary = get_object(Itinerary, id=itin_id)
            itinerary_dict = api_serialize(itinerary, request)
            
            return APIResponseOK(content=itinerary_dict, total=1)

        else:
            query = request.GET.copy()
            q = qstranslate.QueryTranslator(Itinerary, ItineraryAPI.ruleset)
            try:
                objs = q.filter(query)
            except qstranslate.InvalidParameterException, e:
                raise exceptions.APIBadRequest(e)

            objs, total, pg = paginate(objs, query)

            itinerary_arr = []
            for i in objs:
                itinerary_arr.append(api_serialize(i, request))

            return APIResponseOK(content=itinerary_arr, total=total, pg=pg)


    @require_http_auth
    def post_favorite(request, itin_id):
        itin = get_object(Itinerary, id=itin_id)
        favorite = get_param(request.POST, 'favorite')

        if favorite:
            itin.favorite(request.user)
        else:
            itin.unfavorite(request.user)

        return APIResponseOK(content='success')

