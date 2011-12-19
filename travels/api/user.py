from locast.api import *
from locast.api import rest, qstranslate, exceptions
from locast.auth.decorators import optional_http_auth, require_http_auth

from travels.models import TravelsUser

class UserAPI(rest.ResourceView):

    ruleset = {
        # Authorable
        'display_name'  :    { 'type' : 'string' },
        'created'       :    { 'type' : 'datetime' },
    }

    @optional_http_auth
    def get(request, user_id=None):

        # Single user
        if user_id:
            u = get_object(TravelsUser, id=user_id)
            content = api_serialize(u)
            return APIResponseOK(content=content, total=1)
        
        # Multiple users
        else:
            q = qstranslate.QueryTranslator(TravelsUser, UserAPI.ruleset)
            query = request.GET.copy()

            objs = total = pg = None
            try:
                objs = q.filter(query)
                objs, total, pg = paginate(objs, request.GET)
            except qstranslate.InvalidParameterException, e:
                raise exceptions.APIBadRequest(e.message)

            user_arr = []
            for m in objs:
                user_arr.append(api_serialize(m, request))

            return APIResponseOK(content=user_arr, total=total, pg=pg)

    @require_http_auth
    def get_me(request):
        return APIResponseOK(content=api_serialize(request.user))

