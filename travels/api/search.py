import settings

from locast.api import *
from locast.api import rest, qstranslate, exceptions

from django.db.models import Q
from django.utils import translation

from travels import models

# Returns casts, itineraries and users based on a keyword
def unified_search_api(request):

    content = {}

    keyword = request.GET.get('q')

    # short or empty keyword
    if not keyword or len(keyword) < 2:
        return APIResponseOK(content=content, total=0, pg=1)

    lang = translation.get_language()
    if not lang:
        lang = settings.LANGUAGE_CODE

    ## CASTS ##

    fields = ('title', 'description', 'title_' + lang, 'description_' + lang, 'author__display_name')

    casts = search(models.Cast, fields, keyword)
    casts, total, pg = paginate(casts, request.GET)

    cast_arr = []
    for c in casts:
        cast_arr.append(api_serialize(c, request))

    ## ITINERARY ##

    fields = ('title', 'description', 'title_' + lang, 'description_' + lang, 'author__display_name')

    itins = search(models.Itinerary, fields, keyword)
    itins, total, pg = paginate(itins, request.GET)

    itin_arr = []
    for i in itins:
        itin_arr.append(api_serialize(i, request))

    ## USERS ##

    fields = ('first_name', 'last_name', 'email')

    users = search(models.TravelsUser, fields, keyword)
    users, total, pg = paginate(users, request.GET)

    user_arr = []
    for u in users:
        user_arr.append(api_serialize(u, request))

    # Put it all together!
    content['casts'] = cast_arr
    content['itineraries'] = itin_arr
    content['users'] = user_arr

    return APIResponseOK(content=content, total=total, pg=pg)


def search(ctype, fields, keyword):
    q = Q()

    for field in fields: 
        q = q | Q(**{field + '__icontains': keyword})

    return ctype.objects.filter(q)

