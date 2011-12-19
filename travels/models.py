import cgi
import httplib
import settings
import urllib
import urlparse

from django.core import cache
from django.core.urlresolvers import reverse
from django.db import models
from django.contrib.gis.db import models as gismodels
from django.contrib.gis.db.models.manager import GeoManager
from django.utils import simplejson
from django.utils.translation import ugettext_lazy as _

from locast.api import datetostr
from locast.models import interfaces, modelbases, managers
from locast.models import ModelBase

from sorl.thumbnail import get_thumbnail

# DEPENDENCIES

class Tag(interfaces.Tag): pass

class Comment(interfaces.Comment,
        interfaces.Flaggable): 

    # TODO: this should be more generic incase anything else becomes commentable
    @models.permalink
    def get_api_uri(self):
        return ('cast_comments_api_single', [self.content_object.id, self.id])

    def get_absolute_url(self):
        return self.content_object.get_absolute_url()

class Flag(interfaces.Flag): pass

class UserActivity(modelbases.UserActivity): pass

class Boundry(modelbases.Boundry): pass

# MAIN MODELS

class TravelsUserManager(GeoManager, 
        managers.LocastUserManager,
        managers.FacebookUserManager): pass

class TravelsUser(modelbases.LocastUser, 
        interfaces.FacebookUser,
        interfaces.Locatable):

    @models.permalink
    def get_api_uri(self):
        return ('user_api_single', [str(self.id)])

    def __unicode__(self):
        if self.email:
            return u'%s' % self.email
        else:
            return u'%s' % self.username

    def api_serialize(self, request):
        d = {}

        if self.is_facebook_user():
            d['user_image'] = 'http://graph.facebook.com/%s/picture?type=large' % self.facebook_id
        elif self.user_image:
            d['user_image'] = self.user_image.url

        if self.profile:
            d['profile'] = self.profile

        if self.personal_url:
            d['personal_url'] = self.personal_url

        if self.hometown:
            d['hometown'] = self.hometown

        return d

    objects = TravelsUserManager()

    user_image = models.ImageField(upload_to='user_images/%Y/%m/', null=True, blank=True)
    
    personal_url = models.URLField(null=True, blank=True)

    hometown = models.CharField(max_length=128, null=True, blank=True)


class Itinerary(ModelBase,
        interfaces.Authorable,
        interfaces.Titled,
        interfaces.Taggable, 
        interfaces.Favoritable):

    @models.permalink
    def get_api_uri(self):
        return ('itinerary_api_single', [str(self.id)])

    class Meta:
        verbose_name = _('itinerary')
        verbose_name_plural = _('itineraries')

    def __unicode__(self):
        return u'(id: %s) %s' % (str(self.id), self.title)

    def api_serialize(self, request):
        d = {}
        if self.path:
            d['path'] = self.path.coords
        d['casts'] = reverse('itinerary_cast_api', kwargs={'itin_id':self.id})

        d['casts_ids'] = []
        for c in self.related_casts.all():
            d['casts_ids'].append(c.id)

        d['casts_count'] = self.related_casts.count()
        if self.preview_image:
            d['preview_image'] = self.preview_image.url
            d['thumbnail'] = self.thumbnail.url

        return d

    def geojson_properties(self, request):
        d = {}
        d['id'] = self.id
        d['title'] = self.title
        d['casts_count'] = self.related_casts.count()
        d['favorites'] = self.favorited_by.count()

        if self.preview_image:
            d['preview_image'] = self.preview_image.url
            d['thumbnail'] = self.thumbnail.url

        return d

    objects = GeoManager() 

    related_casts = models.ManyToManyField('Cast', null=True, blank=True)
    
    path = gismodels.LineStringField(null=True,blank=True,srid=4326)  

    preview_image = models.ImageField(upload_to='content_images', null=True, blank=True)

    @property
    def thumbnail(self):
        return get_thumbnail(self.preview_image, '600', quality=75)


class Event(ModelBase,
        interfaces.Locatable,
        interfaces.Authorable,
        interfaces.Taggable,
        interfaces.Titled):

    class Meta:
        verbose_name = _('event')

    def __unicode__(self):
        return u'%s (%s)' % (self.title, self.start_date)

    @models.permalink
    def get_api_uri(self):
        return ('event_api_single', [str(self.id)])

    objects = GeoManager()

    def api_serialize(self, request):
        d = {}
        d['start_date'] = datetostr(self.start_date)
        d['end_date'] = datetostr(self.end_date)

        return d

    def geojson_properties(self, request):
        d = {}
        d['id'] = self.id
        d['title'] = self.title
        d['start_date'] = datetostr(self.start_date)
        d['end_date'] = datetostr(self.end_date)

        return d

    start_date = models.DateTimeField('start_date')
    end_date = models.DateTimeField('end_date')


class Cast(ModelBase,
        interfaces.PrivatelyAuthorable, 
        interfaces.Titled, 
        interfaces.Commentable,
        interfaces.Favoritable,
        interfaces.Flaggable, 
        interfaces.Locatable, 
        interfaces.Taggable):

    @models.permalink
    def get_api_uri(self):
        return ('cast_api_single', [str(self.id)])

    def get_absolute_url(self):
        return reverse('frontpage') + '#!cast/' + str(self.id) + '/'

    class Meta:
        verbose_name = _('cast')

    def __unicode__(self):
        return u'%s (id: %s)' % (self.title, str(self.id))

    objects = GeoManager()

    def api_serialize(self, request):
        d = {}

        d['itineraries_ids'] = []
        for i in self.itinerary_set.all():
            d['itineraries_ids'].append(i.id)

        d['media'] = reverse('cast_media_api', kwargs={'cast_id':self.id})
        d['comments'] = reverse('cast_comments_api', kwargs={'cast_id':self.id})

        d['featured'] = self.is_featured
        d['promotional'] = self.is_promotional
        d['official'] = self.author.is_staff

        if self.preview_image:
            d['preview_image'] = self.preview_image

        return d

    def geojson_properties(self, request):
        d = {}
        d['id'] = self.id
        d['title'] = self.title
        d['author'] = {'id' : self.author.id, 'display_name' : self.author.display_name }
        
        d['featured'] = self.is_featured
        d['promotional'] = self.is_promotional
        d['official'] = self.author.is_staff

        if self.preview_image:
            d['preview_image'] = self.preview_image

        d['favorites'] = self.favorited_by.count()

        return d

    @property
    def is_featured(self):
        return (not self.get_tag_by_name('_featured') == None)

    @property
    def is_promotional(self):
        return (not self.get_tag_by_name('_promotional') == None)

    @property
    def preview_image(self):
        if len(self.imagemedia):
            image = self.imagemedia[0].content
            if image and image.file:
                return image.thumbnail.url

        elif len(self.videomedia):
            vid = self.videomedia[0].content
            if vid and vid.screenshot:
                return vid.screenshot.url

        elif len(self.linkedmedia):
            vid = self.linkedmedia[0].content
            if vid and vid.screenshot:
                return vid.screenshot

        return None

    @property
    def videomedia(self):
        return self.media_set.filter(content_type_model='videomedia')

    @property
    def imagemedia(self):
        return self.media_set.filter(content_type_model='imagemedia')

    @property
    def linkedmedia(self):
        return self.media_set.filter(content_type_model='linkedmedia')


class Media(modelbases.LocastContent,
        interfaces.Authorable,
        interfaces.Titled,
        interfaces.Locatable):

    @models.permalink
    def get_api_uri(self):
        return ('cast_media_api_single', [str(self.cast.id), str(self.id)])

    def api_serialize(self, request):
        d = {}
        d['language'] = self.language
        if self.cast:
            d['cast'] = self.cast.get_api_uri()

        return d 

    objects = GeoManager()

    language = models.CharField(max_length=90,choices=settings.LANGUAGES, default='en')

    cast = models.ForeignKey(Cast, null=True, blank=True)

    
class VideoMedia(Media, 
        modelbases.VideoContent):

    class Meta:
        verbose_name = _('video')

    def pre_save(self):
        if self.content_state == Media.STATE_INCOMPLETE:
            if self.file and self.file.size:
                self.content_state = Media.STATE_COMPLETE

    def process(self, force_update=False, verbose=False):
        if self.content_state == Media.STATE_COMPLETE or force_update:
            self.content_state = Media.STATE_PROCESSING
            self.generate_screenshot(force_update=force_update, verbose=verbose)
            self.generate_web_stream(force_update=force_update, verbose=verbose)
            self.make_mobile_streamable()


class ImageMedia(Media, 
        modelbases.ImageContent):
    
    class Meta:
        verbose_name = _('photo')

    # Overwrite the ImageContent._content_api_serialize method to provide
    # thumbnails
    def _content_api_serialize(self, request=None):
        d = {}
        if self.file:
            d['resources'] = {}
            d['resources']['primary'] = self.serialize_resource(self.file.url)
            d['resources']['medium'] = self.serialize_resource(self.medium_file.url)
            d['resources']['thumbnail'] = self.serialize_resource(self.thumbnail.url)

        return d
    
    @property
    def thumbnail(self):
        return get_thumbnail(self.file, '150', quality=75)

    @property
    def medium_file(self):
        return get_thumbnail(self.file, '600', quality=75)

    def process(self):
        pass


CONTENT_PROVIDERS = (
    ('youtube.com', 'YouTube'),
    ('vimeo.com', 'Vimeo')
)

class LinkedMedia(Media):

    class Meta:
        verbose_name = _('link')

    url = models.URLField(verify_exists=True)

    screenshot = models.URLField(verify_exists=True, null=True, blank=True)

    content_provider = models.CharField(max_length=32, choices=CONTENT_PROVIDERS)

    video_id = models.CharField(max_length=32)
    
    def _content_api_serialize(self, request=None):
        d = dict(url=self.url)

        if self.screenshot:
            d['resources'] = {
                'screenshot' : self.serialize_resource(self.screenshot)
            }

        if self.content_provider:
            d['content_provider'] = self.content_provider

        return d

    def pre_save(self):
        if self.url and not self.video_id:
            self.process()

    def process(self):

        # Check if the link exists
        url_data = urlparse.urlparse(self.url)
        conn = httplib.HTTPConnection(url_data.hostname)

        full_path = url_data.path
        if url_data.query:
            full_path += '?' + url_data.query

        conn.request('HEAD', full_path)
        r1 = conn.getresponse()
        conn.close()

        # it exists! (302 is a redirect for sharing links i.e. youtu.be)
        if r1.status == 200 or r1.status == 302:
            self.content_provider = url_data.hostname.lstrip('www.')
            query = cgi.parse_qs(url_data.query)

            # youtube
            if self.content_provider == 'youtube.com' or self.content_provider == 'youtu.be':
                if self.content_provider == 'youtube.com':
                    self.video_id = query['v'][0]

                else:
                    self.video_id = self.url.split('/').pop()
                    self.content_provider = 'youtube.com'
                    self.url = 'http://www.youtube.com/watch?v=' + self.video_id

                data_url = 'http://gdata.youtube.com/feeds/api/videos/' + self.video_id + '?v=2&alt=json'
                youtube_data = simplejson.load(urllib.urlopen(data_url))

                thumbs = youtube_data['entry']['media$group']['media$thumbnail']
                if len(thumbs) > 1:
                    self.screenshot = thumbs[1]['url']
                elif len(thumbs):
                    self.screenshot = thumbs[0]['url']

                self.title = youtube_data['entry']['title']['$t']

            # vimeo
            elif self.content_provider == 'vimeo.com':
                self.video_id = url_data.path.lstrip('/')
                data_url = 'http://vimeo.com/api/v2/video/' + self.video_id + '.json'
                vimeo_data = simplejson.load(urllib.urlopen(data_url))

                self.screenshot = vimeo_data[0]['thumbnail_large']
                self.title = vimeo_data[0]['title']

